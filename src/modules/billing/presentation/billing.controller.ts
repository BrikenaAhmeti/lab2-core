import { Request, Response } from 'express';
import { z } from 'zod';
import {
    BillingStatus,
    PaymentMethod,
} from '../../../generated/prisma';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { MarkBillingPaidCommand } from '../application/commands/mark-billing-paid.command';
import { RecordBillingPaymentCommand } from '../application/commands/record-billing-payment.command';
import { UpdateBillingCommand } from '../application/commands/update-billing.command';
import { GetBillingByIdHandler } from '../application/handlers/get-billing-by-id.handler';
import { GetBillingPdfHandler } from '../application/handlers/get-billing-pdf.handler';
import { GetBillingStatsHandler } from '../application/handlers/get-billing-stats.handler';
import { ListBillingsHandler } from '../application/handlers/list-billings.handler';
import { MarkBillingPaidHandler } from '../application/handlers/mark-billing-paid.handler';
import { RecordBillingPaymentHandler } from '../application/handlers/record-billing-payment.handler';
import { UpdateBillingHandler } from '../application/handlers/update-billing.handler';
import { GetBillingByIdQuery } from '../application/queries/get-billing-by-id.query';
import { GetBillingPdfQuery } from '../application/queries/get-billing-pdf.query';
import { GetBillingStatsQuery } from '../application/queries/get-billing-stats.query';
import { ListBillingsQuery } from '../application/queries/list-billings.query';
import { BillingPrismaRepository } from '../infrastructure/billing.prisma.repository';
import { NotificationBillingEventPublisher } from '../infrastructure/notification-billing-event.publisher';
import { BillingPdfService } from '../services/billing-pdf.service';
import { BillingService } from '../services/billing.service';

const billingStatusValues = [
    'DRAFT',
    'PENDING',
    'PARTIALLY_PAID',
    'PAID',
    'CANCELLED',
    'OVERDUE',
] as const;

const paymentMethodValues = [
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'ONLINE',
    'OTHER',
] as const;

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid billing id'),
});

const dateTimeSchema = z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date time');

const optionalDateTimeSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, dateTimeSchema.optional());

const nullableDateTimeSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, dateTimeSchema.nullable().optional());

const moneySchema = z.coerce
    .number()
    .finite()
    .min(0)
    .max(9999999);

const positiveMoneySchema = z.coerce
    .number()
    .finite()
    .positive()
    .max(9999999);

const billingItemSchema = z.object({
    serviceCatalogId: z.string().uuid('Invalid service id').nullable().optional(),
    inventoryItemId: z.string().uuid('Invalid inventory item id').nullable().optional(),
    description: z
        .string()
        .trim()
        .min(1, 'Description is required')
        .max(500),
    quantity: z.coerce.number().finite().positive().max(100000),
    unitPrice: moneySchema,
    sourceEntityType: z.string().trim().max(100).nullable().optional(),
    sourceEntityId: z.string().trim().max(100).nullable().optional(),
});

const updateBillingBodySchema = z.object({
    taxAmount: moneySchema.optional(),
    discountAmount: moneySchema.optional(),
    dueDate: nullableDateTimeSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(billingItemSchema).max(100).optional(),
});

const recordPaymentBodySchema = z.object({
    amount: positiveMoneySchema,
    paymentMethod: z.enum(paymentMethodValues),
    referenceNumber: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
});

const markPaidBodySchema = z.object({
    paymentMethod: z.enum(paymentMethodValues).default('CASH'),
    referenceNumber: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
});

const listBillingsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    patientId: z.string().uuid('Invalid patient id').optional(),
    search: z.string().trim().max(120).optional(),
    status: z.enum(billingStatusValues).optional(),
    from: optionalDateTimeSchema,
    to: optionalDateTimeSchema,
});

const statsQuerySchema = z.object({
    from: optionalDateTimeSchema,
    to: optionalDateTimeSchema,
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

export class BillingController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly pdfService = new BillingPdfService();
    private readonly service = new BillingService(
        new BillingPrismaRepository(),
        undefined,
        new NotificationBillingEventPublisher(),
    );
    private readonly listBillingsHandler = new ListBillingsHandler(this.service);
    private readonly getBillingByIdHandler = new GetBillingByIdHandler(this.service);
    private readonly getBillingStatsHandler = new GetBillingStatsHandler(this.service);
    private readonly getBillingPdfHandler = new GetBillingPdfHandler(
        this.service,
        this.pdfService,
    );
    private readonly updateBillingHandler = new UpdateBillingHandler(this.service);
    private readonly recordPaymentHandler = new RecordBillingPaymentHandler(
        this.service,
    );
    private readonly markPaidHandler = new MarkBillingPaidHandler(this.service);

    async list(req: Request, res: Response) {
        const query = listBillingsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listBillingsHandler,
            new ListBillingsQuery(
                query.page,
                query.limit,
                query.patientId,
                query.search,
                query.status as BillingStatus | undefined,
                query.from,
                query.to,
                req.user?.id,
                hasPermission(req, 'billing:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getBillingByIdHandler,
            new GetBillingByIdQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'billing:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateBillingBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateBillingHandler,
            new UpdateBillingCommand(params.id, body, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async recordPayment(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = recordPaymentBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.recordPaymentHandler,
            new RecordBillingPaymentCommand(
                params.id,
                body.amount,
                body.paymentMethod as PaymentMethod,
                body.referenceNumber,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async markPaid(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = markPaidBodySchema.parse(req.body ?? {});
        const result = await this.commandBus.execute(
            this.markPaidHandler,
            new MarkBillingPaidCommand(
                params.id,
                body.paymentMethod as PaymentMethod,
                body.referenceNumber,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async stats(req: Request, res: Response) {
        const query = statsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.getBillingStatsHandler,
            new GetBillingStatsQuery(query.from, query.to),
        );

        return res.status(200).json(result);
    }

    async downloadPdf(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const document = await this.queryBus.execute(
            this.getBillingPdfHandler,
            new GetBillingPdfQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'billing:read', 'all'),
            ),
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${document.filename}"`,
        );

        return res.status(200).send(document.pdf);
    }
}
