import { Request, Response } from 'express';
import { z } from 'zod';
import { LabOrderStatus } from '../../../generated/prisma';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateLabOrderCommand } from '../application/commands/create-lab-order.command';
import { CreateLabTestCommand } from '../application/commands/create-lab-test.command';
import { DeactivateLabTestCommand } from '../application/commands/deactivate-lab-test.command';
import { EnterLabOrderResultsCommand } from '../application/commands/enter-lab-order-results.command';
import { ReviewLabOrderCommand } from '../application/commands/review-lab-order.command';
import { TriggerLabOrderAiCommand } from '../application/commands/trigger-lab-order-ai.command';
import { UpdateLabOrderStatusCommand } from '../application/commands/update-lab-order-status.command';
import { UpdateLabTestCommand } from '../application/commands/update-lab-test.command';
import { CreateLabOrderHandler } from '../application/handlers/create-lab-order.handler';
import { CreateLabTestHandler } from '../application/handlers/create-lab-test.handler';
import { DeactivateLabTestHandler } from '../application/handlers/deactivate-lab-test.handler';
import { EnterLabOrderResultsHandler } from '../application/handlers/enter-lab-order-results.handler';
import { GetLabOrderByIdHandler } from '../application/handlers/get-lab-order-by-id.handler';
import { GetLabTestByIdHandler } from '../application/handlers/get-lab-test-by-id.handler';
import { ListLabOrdersHandler } from '../application/handlers/list-lab-orders.handler';
import { ListLabTestsHandler } from '../application/handlers/list-lab-tests.handler';
import { ListPendingLabOrdersHandler } from '../application/handlers/list-pending-lab-orders.handler';
import { ReviewLabOrderHandler } from '../application/handlers/review-lab-order.handler';
import { TriggerLabOrderAiHandler } from '../application/handlers/trigger-lab-order-ai.handler';
import { UpdateLabOrderStatusHandler } from '../application/handlers/update-lab-order-status.handler';
import { UpdateLabTestHandler } from '../application/handlers/update-lab-test.handler';
import { GetLabOrderByIdQuery } from '../application/queries/get-lab-order-by-id.query';
import { GetLabTestByIdQuery } from '../application/queries/get-lab-test-by-id.query';
import { ListLabOrdersQuery } from '../application/queries/list-lab-orders.query';
import { ListLabTestsQuery } from '../application/queries/list-lab-tests.query';
import { ListPendingLabOrdersQuery } from '../application/queries/list-pending-lab-orders.query';
import { LabPrismaRepository } from '../infrastructure/lab.prisma.repository';
import { NotificationLabEventPublisher } from '../infrastructure/notification-lab-event.publisher';
import { LabService } from '../services/lab.service';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid id'),
});

const nullableStringSchema = z.string().trim().max(4000).nullable().optional();

const moneySchema = z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    return value;
}, z.coerce.number().min(0).max(1000000).nullable().optional());

const createLabTestBodySchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, 'Code is required')
        .max(50, 'Code must be at most 50 characters'),
    name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .max(200, 'Name must be at most 200 characters'),
    description: nullableStringSchema,
    category: z.string().trim().max(100).nullable().optional(),
    sampleType: z.string().trim().max(100).nullable().optional(),
    defaultPrice: moneySchema,
    referenceRange: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
});

const updateLabTestBodySchema = createLabTestBodySchema.partial();

const listLabTestsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    isActive: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
});

const createLabOrderBodySchema = z.object({
    patientId: z.string().uuid('Invalid patient id'),
    appointmentId: z.string().uuid('Invalid appointment id'),
    medicalRecordId: z.string().uuid('Invalid medical record id').nullable().optional(),
    orderedByStaffId: z.string().uuid('Invalid ordering staff id'),
    priority: z.enum(['normal', 'urgent']).nullable().optional(),
    notes: nullableStringSchema,
    tests: z.array(z.string().uuid('Invalid lab test id')).min(1).max(100),
});

const listLabOrdersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    patientId: z.string().uuid('Invalid patient id').optional(),
    status: z
        .enum(['pending', 'sample_collected', 'collected', 'in_progress', 'completed', 'cancelled'])
        .optional(),
    priority: z.enum(['normal', 'urgent']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

const updateLabOrderStatusBodySchema = z.object({
    status: z.enum([
        'pending',
        'sample_collected',
        'collected',
        'in_progress',
        'completed',
        'cancelled',
    ]),
});

const enterLabOrderResultsBodySchema = z.object({
    items: z
        .array(
            z.object({
                itemId: z.string().uuid('Invalid lab order item id'),
                resultValue: z
                    .string()
                    .trim()
                    .min(1, 'Result value is required')
                    .max(200, 'Result value must be at most 200 characters'),
                resultUnit: z.string().trim().max(100).nullable().optional(),
                resultNotes: z.string().trim().max(1000).nullable().optional(),
            }),
        )
        .min(1)
        .max(100),
});

const reviewLabOrderBodySchema = z.object({
    notes: nullableStringSchema,
});

function hasPermission(req: Request, permission: string, scope?: string) {
    const permissions = req.user?.permissions ?? [];

    if (scope) {
        return (
            permissions.includes(`${permission}:${scope}`) ||
            permissions.includes(permission)
        );
    }

    return (
        permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`))
    );
}

function mapStatus(value?: string): LabOrderStatus | undefined {
    if (!value) {
        return undefined;
    }

    if (value === 'sample_collected' || value === 'collected') {
        return LabOrderStatus.COLLECTED;
    }

    if (value === 'in_progress') {
        return LabOrderStatus.IN_PROGRESS;
    }

    if (value === 'completed') {
        return LabOrderStatus.COMPLETED;
    }

    if (value === 'cancelled') {
        return LabOrderStatus.CANCELLED;
    }

    return LabOrderStatus.PENDING;
}

export class LabController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new LabService(
        new LabPrismaRepository(),
        new NotificationLabEventPublisher(),
    );
    private readonly createLabTestHandler = new CreateLabTestHandler(this.service);
    private readonly listLabTestsHandler = new ListLabTestsHandler(this.service);
    private readonly getLabTestByIdHandler = new GetLabTestByIdHandler(this.service);
    private readonly updateLabTestHandler = new UpdateLabTestHandler(this.service);
    private readonly deactivateLabTestHandler = new DeactivateLabTestHandler(
        this.service,
    );
    private readonly createLabOrderHandler = new CreateLabOrderHandler(this.service);
    private readonly listLabOrdersHandler = new ListLabOrdersHandler(this.service);
    private readonly listPendingLabOrdersHandler = new ListPendingLabOrdersHandler(
        this.service,
    );
    private readonly getLabOrderByIdHandler = new GetLabOrderByIdHandler(
        this.service,
    );
    private readonly updateLabOrderStatusHandler = new UpdateLabOrderStatusHandler(
        this.service,
    );
    private readonly enterLabOrderResultsHandler = new EnterLabOrderResultsHandler(
        this.service,
    );
    private readonly reviewLabOrderHandler = new ReviewLabOrderHandler(this.service);
    private readonly triggerLabOrderAiHandler = new TriggerLabOrderAiHandler(
        this.service,
    );

    async createLabTest(req: Request, res: Response) {
        const body = createLabTestBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createLabTestHandler,
            new CreateLabTestCommand(
                body.code,
                body.name,
                body.description,
                body.category,
                body.sampleType,
                body.defaultPrice ?? null,
                body.referenceRange,
                body.isActive ?? true,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async listLabTests(req: Request, res: Response) {
        const query = listLabTestsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listLabTestsHandler,
            new ListLabTestsQuery(
                query.page,
                query.limit,
                query.search,
                query.category,
                query.isActive,
            ),
        );

        return res.status(200).json(result);
    }

    async getLabTestById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getLabTestByIdHandler,
            new GetLabTestByIdQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async updateLabTest(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateLabTestBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateLabTestHandler,
            new UpdateLabTestCommand(
                params.id,
                body.code,
                body.name,
                body.description,
                body.category,
                body.sampleType,
                body.defaultPrice,
                body.referenceRange,
                body.isActive,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async deactivateLabTest(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.deactivateLabTestHandler,
            new DeactivateLabTestCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async createLabOrder(req: Request, res: Response) {
        const body = createLabOrderBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createLabOrderHandler,
            new CreateLabOrderCommand(
                body.patientId,
                body.appointmentId,
                body.medicalRecordId,
                body.orderedByStaffId,
                body.priority,
                body.notes,
                body.tests,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async listLabOrders(req: Request, res: Response) {
        const query = listLabOrdersQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listLabOrdersHandler,
            new ListLabOrdersQuery(
                query.page,
                query.limit,
                query.patientId,
                mapStatus(query.status),
                query.priority,
                query.from,
                query.to,
                req.user?.id,
                hasPermission(req, 'lab_orders:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async listPendingLabOrders(req: Request, res: Response) {
        const result = await this.queryBus.execute(
            this.listPendingLabOrdersHandler,
            new ListPendingLabOrdersQuery(),
        );

        return res.status(200).json(result);
    }

    async getLabOrderById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getLabOrderByIdHandler,
            new GetLabOrderByIdQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'lab_orders:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async updateLabOrderStatus(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateLabOrderStatusBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateLabOrderStatusHandler,
            new UpdateLabOrderStatusCommand(
                params.id,
                mapStatus(body.status) ?? LabOrderStatus.PENDING,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async enterLabOrderResults(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = enterLabOrderResultsBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.enterLabOrderResultsHandler,
            new EnterLabOrderResultsCommand(params.id, body.items, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async reviewLabOrder(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = reviewLabOrderBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.reviewLabOrderHandler,
            new ReviewLabOrderCommand(params.id, body.notes, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async triggerLabOrderAi(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.triggerLabOrderAiHandler,
            new TriggerLabOrderAiCommand(params.id),
        );

        return res.status(202).json(result);
    }
}
