import { Request, Response } from 'express';
import { z } from 'zod';
import { PharmacyStatus } from '../../../generated/prisma';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { DispensePharmacyQueueCommand } from '../application/commands/dispense-pharmacy-queue.command';
import { FulfillPharmacyQueueCommand } from '../application/commands/fulfill-pharmacy-queue.command';
import { StartPharmacyQueueCommand } from '../application/commands/start-pharmacy-queue.command';
import { DispensePharmacyQueueHandler } from '../application/handlers/dispense-pharmacy-queue.handler';
import { FulfillPharmacyQueueHandler } from '../application/handlers/fulfill-pharmacy-queue.handler';
import { GetPharmacyQueueByIdHandler } from '../application/handlers/get-pharmacy-queue-by-id.handler';
import { ListPharmacyQueueHandler } from '../application/handlers/list-pharmacy-queue.handler';
import { StartPharmacyQueueHandler } from '../application/handlers/start-pharmacy-queue.handler';
import { GetPharmacyQueueByIdQuery } from '../application/queries/get-pharmacy-queue-by-id.query';
import { ListPharmacyQueueQuery } from '../application/queries/list-pharmacy-queue.query';
import { NotificationPharmacyEventPublisher } from '../infrastructure/notification-pharmacy-event.publisher';
import { PharmacyPrismaRepository } from '../infrastructure/pharmacy.prisma.repository';
import { PharmacyService } from '../services/pharmacy.service';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid pharmacy queue id'),
});

const listQueueQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z
        .enum([
            'pending',
            'in_progress',
            'on_hold',
            'partially_dispensed',
            'dispensed',
            'fulfilled',
            'cancelled',
        ])
        .optional(),
});

const dispenseBodySchema = z.object({
    items: z
        .array(
            z.object({
                prescriptionItemId: z.string().uuid('Invalid prescription item id'),
                inventoryItemId: z
                    .string()
                    .uuid('Invalid inventory item id')
                    .nullable()
                    .optional(),
                quantityDispensed: z.coerce.number().int().min(0).default(0),
                status: z.enum(['dispensed', 'out_of_stock', 'substituted']),
                notes: z.string().trim().max(1000).nullable().optional(),
            }),
        )
        .min(1)
        .max(100),
});

function mapQueueStatus(value?: string) {
    if (!value) {
        return undefined;
    }

    const statusMap: Record<string, PharmacyStatus> = {
        pending: PharmacyStatus.PENDING,
        in_progress: PharmacyStatus.IN_PROGRESS,
        on_hold: PharmacyStatus.ON_HOLD,
        partially_dispensed: PharmacyStatus.PARTIALLY_DISPENSED,
        dispensed: PharmacyStatus.DISPENSED,
        fulfilled: PharmacyStatus.FULFILLED,
        cancelled: PharmacyStatus.CANCELLED,
    };

    return statusMap[value];
}

function mapDispensingStatus(value: string) {
    const statusMap: Record<string, PharmacyStatus> = {
        dispensed: PharmacyStatus.DISPENSED,
        out_of_stock: PharmacyStatus.OUT_OF_STOCK,
        substituted: PharmacyStatus.SUBSTITUTED,
    };

    return statusMap[value];
}

export class PharmacyController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new PharmacyService(
        new PharmacyPrismaRepository(),
        new NotificationPharmacyEventPublisher(),
    );
    private readonly listQueueHandler = new ListPharmacyQueueHandler(
        this.service,
    );
    private readonly getQueueByIdHandler = new GetPharmacyQueueByIdHandler(
        this.service,
    );
    private readonly startQueueHandler = new StartPharmacyQueueHandler(
        this.service,
    );
    private readonly dispenseQueueHandler = new DispensePharmacyQueueHandler(
        this.service,
    );
    private readonly fulfillQueueHandler = new FulfillPharmacyQueueHandler(
        this.service,
    );

    async listQueue(req: Request, res: Response) {
        const query = listQueueQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listQueueHandler,
            new ListPharmacyQueueQuery(
                query.page,
                query.limit,
                mapQueueStatus(query.status),
            ),
        );

        return res.status(200).json(result);
    }

    async getQueueById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getQueueByIdHandler,
            new GetPharmacyQueueByIdQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async startQueue(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.startQueueHandler,
            new StartPharmacyQueueCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async dispenseQueue(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = dispenseBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.dispenseQueueHandler,
            new DispensePharmacyQueueCommand(
                params.id,
                body.items.map((item) => ({
                    prescriptionItemId: item.prescriptionItemId,
                    inventoryItemId: item.inventoryItemId,
                    quantityDispensed: item.quantityDispensed,
                    status: mapDispensingStatus(item.status),
                    notes: item.notes,
                })),
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async fulfillQueue(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.fulfillQueueHandler,
            new FulfillPharmacyQueueCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }
}
