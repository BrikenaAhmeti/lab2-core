import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateInventoryCategoryCommand } from '../application/commands/create-inventory-category.command';
import { CreateInventoryItemCommand } from '../application/commands/create-inventory-item.command';
import { DeactivateInventoryCategoryCommand } from '../application/commands/deactivate-inventory-category.command';
import { DeactivateInventoryItemCommand } from '../application/commands/deactivate-inventory-item.command';
import { RecordInventoryTransactionCommand } from '../application/commands/record-inventory-transaction.command';
import { UpdateInventoryCategoryCommand } from '../application/commands/update-inventory-category.command';
import { UpdateInventoryItemCommand } from '../application/commands/update-inventory-item.command';
import { CreateInventoryCategoryHandler } from '../application/handlers/create-inventory-category.handler';
import { CreateInventoryItemHandler } from '../application/handlers/create-inventory-item.handler';
import { DeactivateInventoryCategoryHandler } from '../application/handlers/deactivate-inventory-category.handler';
import { DeactivateInventoryItemHandler } from '../application/handlers/deactivate-inventory-item.handler';
import { GetInventoryAlertsHandler } from '../application/handlers/get-inventory-alerts.handler';
import { GetInventoryCategoryByIdHandler } from '../application/handlers/get-inventory-category-by-id.handler';
import { GetInventoryItemByIdHandler } from '../application/handlers/get-inventory-item-by-id.handler';
import { ListInventoryCategoriesHandler } from '../application/handlers/list-inventory-categories.handler';
import { ListInventoryItemsHandler } from '../application/handlers/list-inventory-items.handler';
import { ListInventoryTransactionsHandler } from '../application/handlers/list-inventory-transactions.handler';
import { RecordInventoryTransactionHandler } from '../application/handlers/record-inventory-transaction.handler';
import { UpdateInventoryCategoryHandler } from '../application/handlers/update-inventory-category.handler';
import { UpdateInventoryItemHandler } from '../application/handlers/update-inventory-item.handler';
import { GetInventoryAlertsQuery } from '../application/queries/get-inventory-alerts.query';
import { GetInventoryCategoryByIdQuery } from '../application/queries/get-inventory-category-by-id.query';
import { GetInventoryItemByIdQuery } from '../application/queries/get-inventory-item-by-id.query';
import { ListInventoryCategoriesQuery } from '../application/queries/list-inventory-categories.query';
import { ListInventoryItemsQuery } from '../application/queries/list-inventory-items.query';
import { ListInventoryTransactionsQuery } from '../application/queries/list-inventory-transactions.query';
import { InventoryPrismaRepository } from '../infrastructure/inventory.prisma.repository';
import { NotificationInventoryEventPublisher } from '../infrastructure/notification-inventory-event.publisher';
import { InventoryService } from '../services/inventory.service';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid id'),
});

const booleanQuerySchema = z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
}, z.boolean().optional());

const nullableTextSchema = z.union([z.string().trim().max(1000), z.null()]).optional();
const nullableUuidSchema = z.union([z.string().uuid(), z.null()]).optional();
const dateSchema = z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
        return value === null ? null : undefined;
    }

    return value;
}, z.coerce.date().nullable().optional());

const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

const createCategoryBodySchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: nullableTextSchema,
    parentId: nullableUuidSchema,
    isActive: z.boolean().optional(),
});

const updateCategoryBodySchema = createCategoryBodySchema.partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one category field is required' },
);

const listCategoriesQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().max(100).optional(),
    isActive: booleanQuerySchema,
});

const itemBodySchema = z.object({
    categoryId: z.string().uuid('Invalid category id').optional(),
    inventoryCategoryId: z.string().uuid('Invalid category id').optional(),
    departmentId: nullableUuidSchema,
    sku: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(160),
    description: nullableTextSchema,
    unitOfMeasure: z.string().trim().min(1).max(50),
    currentStock: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().min(0).optional(),
    unitCost: z.coerce.number().min(0).nullable().optional(),
    expiryDate: dateSchema,
    isActive: z.boolean().optional(),
});

const createItemBodySchema = itemBodySchema.refine((body) => body.categoryId || body.inventoryCategoryId, {
    message: 'Category id is required',
});

const updateItemBodySchema = itemBodySchema.partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one item field is required' },
);


const listItemsQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().max(100).optional(),
    categoryId: z.string().uuid('Invalid category id').optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    belowReorderLevel: booleanQuerySchema,
    expiringSoon: z.coerce.number().int().min(1).max(365).optional(),
    expiringSoonDays: z.coerce.number().int().min(1).max(365).optional(),
    isActive: booleanQuerySchema,
    sortBy: z
        .enum(['name', 'sku', 'currentStock', 'reorderLevel', 'expiryDate', 'createdAt', 'updatedAt'])
        .optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
});

const transactionBodySchema = z.object({
    type: z.enum(['in', 'out', 'adjustment', 'transfer']),
    quantity: z.coerce.number().min(0),
    reason: z.string().trim().min(1).max(1000),
    unitCost: z.coerce.number().min(0).nullable().optional(),
    batchNumber: z.string().trim().max(100).nullable().optional(),
    expiryDate: dateSchema,
    referenceEntityType: z.string().trim().max(100).nullable().optional(),
    referenceEntityId: z.string().trim().max(120).nullable().optional(),
    reference: z
        .object({
            type: z.string().trim().min(1).max(100),
            id: z.string().trim().min(1).max(120),
        })
        .optional(),
    targetDepartmentId: z.string().uuid('Invalid target department id').nullable().optional(),
});

const alertsQuerySchema = z.object({
    expiringSoon: z.coerce.number().int().min(1).max(365).optional(),
    expiringSoonDays: z.coerce.number().int().min(1).max(365).optional(),
});

export class InventoryController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new InventoryService(
        new InventoryPrismaRepository(),
        new NotificationInventoryEventPublisher(),
    );
    private readonly createCategoryHandler = new CreateInventoryCategoryHandler(this.service);
    private readonly listCategoriesHandler = new ListInventoryCategoriesHandler(this.service);
    private readonly getCategoryByIdHandler = new GetInventoryCategoryByIdHandler(this.service);
    private readonly updateCategoryHandler = new UpdateInventoryCategoryHandler(this.service);
    private readonly deactivateCategoryHandler = new DeactivateInventoryCategoryHandler(this.service);
    private readonly createItemHandler = new CreateInventoryItemHandler(this.service);
    private readonly listItemsHandler = new ListInventoryItemsHandler(this.service);
    private readonly getItemByIdHandler = new GetInventoryItemByIdHandler(this.service);
    private readonly updateItemHandler = new UpdateInventoryItemHandler(this.service);
    private readonly deactivateItemHandler = new DeactivateInventoryItemHandler(this.service);
    private readonly recordTransactionHandler = new RecordInventoryTransactionHandler(this.service);
    private readonly listTransactionsHandler = new ListInventoryTransactionsHandler(this.service);
    private readonly getAlertsHandler = new GetInventoryAlertsHandler(this.service);

    async createCategory(req: Request, res: Response) {
        const body = createCategoryBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createCategoryHandler,
            new CreateInventoryCategoryCommand(
                body.name,
                body.description,
                body.parentId,
                body.isActive,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async listCategories(req: Request, res: Response) {
        const query = listCategoriesQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listCategoriesHandler,
            new ListInventoryCategoriesQuery(
                query.page,
                query.limit,
                query.search,
                query.isActive,
            ),
        );

        return res.status(200).json(result);
    }

    async getCategoryById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getCategoryByIdHandler,
            new GetInventoryCategoryByIdQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async updateCategory(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateCategoryBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateCategoryHandler,
            new UpdateInventoryCategoryCommand(
                params.id,
                body.name,
                body.description,
                body.parentId,
                body.isActive,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async deactivateCategory(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.deactivateCategoryHandler,
            new DeactivateInventoryCategoryCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async createItem(req: Request, res: Response) {
        const body = createItemBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createItemHandler,
            new CreateInventoryItemCommand(
                body.categoryId ?? body.inventoryCategoryId ?? '',
                body.sku,
                body.name,
                body.unitOfMeasure,
                body.departmentId,
                body.description,
                body.currentStock,
                body.reorderLevel,
                body.unitCost,
                body.expiryDate,
                body.isActive,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async listItems(req: Request, res: Response) {
        const query = listItemsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listItemsHandler,
            new ListInventoryItemsQuery(
                query.page,
                query.limit,
                query.search,
                query.categoryId,
                query.departmentId,
                query.belowReorderLevel,
                query.expiringSoonDays ?? query.expiringSoon,
                query.isActive,
                query.sortBy,
                query.sortDirection,
            ),
        );

        return res.status(200).json(result);
    }

    async getItemById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getItemByIdHandler,
            new GetInventoryItemByIdQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async updateItem(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateItemBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateItemHandler,
            new UpdateInventoryItemCommand(
                params.id,
                body.categoryId ?? body.inventoryCategoryId,
                body.sku,
                body.name,
                body.unitOfMeasure,
                body.departmentId,
                body.description,
                body.currentStock,
                body.reorderLevel,
                body.unitCost,
                body.expiryDate,
                body.isActive,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async deactivateItem(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.deactivateItemHandler,
            new DeactivateInventoryItemCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async recordTransaction(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = transactionBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.recordTransactionHandler,
            new RecordInventoryTransactionCommand(
                params.id,
                body.type,
                body.quantity,
                body.reason,
                body.unitCost,
                body.batchNumber,
                body.expiryDate,
                body.reference?.type ?? body.referenceEntityType,
                body.reference?.id ?? body.referenceEntityId,
                body.targetDepartmentId,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async listTransactions(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = paginationQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listTransactionsHandler,
            new ListInventoryTransactionsQuery(params.id, query.page, query.limit),
        );

        return res.status(200).json(result);
    }

    async getAlerts(req: Request, res: Response) {
        const query = alertsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.getAlertsHandler,
            new GetInventoryAlertsQuery(query.expiringSoonDays ?? query.expiringSoon),
        );

        return res.status(200).json(result);
    }
}
