import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateServiceCatalogCommand } from '../application/commands/create-service-catalog.command';
import { DeactivateServiceCatalogCommand } from '../application/commands/deactivate-service-catalog.command';
import { UpdateServiceCatalogCommand } from '../application/commands/update-service-catalog.command';
import { CreateServiceCatalogHandler } from '../application/handlers/create-service-catalog.handler';
import { DeactivateServiceCatalogHandler } from '../application/handlers/deactivate-service-catalog.handler';
import { GetServiceCatalogByIdHandler } from '../application/handlers/get-service-catalog-by-id.handler';
import { ListServiceCatalogHandler } from '../application/handlers/list-service-catalog.handler';
import { UpdateServiceCatalogHandler } from '../application/handlers/update-service-catalog.handler';
import { GetServiceCatalogByIdQuery } from '../application/queries/get-service-catalog-by-id.query';
import { ListServiceCatalogQuery } from '../application/queries/list-service-catalog.query';
import { ServiceCatalogPrismaRepository } from '../infrastructure/service-catalog.prisma.repository';
import { ServiceCatalogService } from '../services/service-catalog.service';

const serviceCatalogIdParamsSchema = z.object({
    id: z.string().uuid('Invalid service id'),
});

const serviceCatalogBodySchema = z.object({
    departmentId: z.string().uuid('Invalid department id'),
    name: z.string().trim().min(2, 'Service name must be at least 2 characters').max(100),
    description: z.string().trim().max(255).optional(),
    defaultDurationMinutes: z.number().int().positive(),
    defaultPrice: z.number().min(0),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

const listServiceCatalogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    isActive: z.preprocess((value) => {
        if (value === undefined || value === '') return undefined;
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    }, z.boolean().optional()),
    sortBy: z
        .enum(['name', 'sortOrder', 'defaultDurationMinutes', 'defaultPrice', 'createdAt', 'updatedAt'])
        .optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
});

const updateServiceCatalogSchema = z
    .object({
        departmentId: z.string().uuid('Invalid department id').optional(),
        name: z.string().trim().min(2, 'Service name must be at least 2 characters').max(100).optional(),
        description: z.union([z.string().trim().max(255), z.null()]).optional(),
        defaultDurationMinutes: z.number().int().positive().optional(),
        defaultPrice: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
    })
    .refine(
        (body) =>
            body.departmentId !== undefined ||
            body.name !== undefined ||
            body.description !== undefined ||
            body.defaultDurationMinutes !== undefined ||
            body.defaultPrice !== undefined ||
            body.isActive !== undefined ||
            body.sortOrder !== undefined,
        {
            message: 'At least one field is required',
        },
    );

export class ServiceCatalogController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new ServiceCatalogService(new ServiceCatalogPrismaRepository());
    private readonly createServiceCatalogHandler = new CreateServiceCatalogHandler(this.service);
    private readonly getServiceCatalogByIdHandler = new GetServiceCatalogByIdHandler(this.service);
    private readonly listServiceCatalogHandler = new ListServiceCatalogHandler(this.service);
    private readonly updateServiceCatalogHandler = new UpdateServiceCatalogHandler(this.service);
    private readonly deactivateServiceCatalogHandler = new DeactivateServiceCatalogHandler(this.service);

    async create(req: Request, res: Response) {
        const body = serviceCatalogBodySchema.parse(req.body);
        const command = new CreateServiceCatalogCommand(
            body.departmentId,
            body.name,
            body.description,
            body.defaultDurationMinutes,
            body.defaultPrice,
            body.isActive,
            body.sortOrder,
        );
        const result = await this.commandBus.execute(this.createServiceCatalogHandler, command);

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const queryData = listServiceCatalogQuerySchema.parse(req.query);
        const query = new ListServiceCatalogQuery(
            queryData.page,
            queryData.limit,
            queryData.search,
            queryData.departmentId,
            queryData.isActive,
            queryData.sortBy,
            queryData.sortDirection,
        );
        const result = await this.queryBus.execute(this.listServiceCatalogHandler, query);

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = serviceCatalogIdParamsSchema.parse(req.params);
        const query = new GetServiceCatalogByIdQuery(params.id);
        const result = await this.queryBus.execute(this.getServiceCatalogByIdHandler, query);

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = serviceCatalogIdParamsSchema.parse(req.params);
        const body = updateServiceCatalogSchema.parse(req.body);
        const command = new UpdateServiceCatalogCommand(
            params.id,
            body.departmentId,
            body.name,
            body.description,
            body.defaultDurationMinutes,
            body.defaultPrice,
            body.isActive,
            body.sortOrder,
        );
        const result = await this.commandBus.execute(this.updateServiceCatalogHandler, command);

        return res.status(200).json(result);
    }

    async deactivate(req: Request, res: Response) {
        const params = serviceCatalogIdParamsSchema.parse(req.params);
        const command = new DeactivateServiceCatalogCommand(params.id);
        const result = await this.commandBus.execute(this.deactivateServiceCatalogHandler, command);

        return res.status(200).json(result);
    }
}
