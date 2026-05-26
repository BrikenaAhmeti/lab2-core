import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreatePrescriptionCommand } from '../application/commands/create-prescription.command';
import { VoidPrescriptionCommand } from '../application/commands/void-prescription.command';
import { CreatePrescriptionHandler } from '../application/handlers/create-prescription.handler';
import { GetPrescriptionByIdHandler } from '../application/handlers/get-prescription-by-id.handler';
import { GetPrescriptionPdfHandler } from '../application/handlers/get-prescription-pdf.handler';
import { ListPrescriptionsHandler } from '../application/handlers/list-prescriptions.handler';
import { VoidPrescriptionHandler } from '../application/handlers/void-prescription.handler';
import { GetPrescriptionByIdQuery } from '../application/queries/get-prescription-by-id.query';
import { GetPrescriptionPdfQuery } from '../application/queries/get-prescription-pdf.query';
import { ListPrescriptionsQuery } from '../application/queries/list-prescriptions.query';
import { NotificationPrescriptionEventPublisher } from '../infrastructure/notification-prescription-event.publisher';
import { PrescriptionPrismaRepository } from '../infrastructure/prescription.prisma.repository';
import { PrescriptionPdfService } from '../services/prescription-pdf.service';
import { PrescriptionService } from '../services/prescription.service';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid prescription id'),
});

const dateTimeSchema = z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date time');

const nullableDateTimeSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, dateTimeSchema.nullable().optional());

const prescriptionItemSchema = z.object({
    medicationName: z
        .string()
        .trim()
        .min(1, 'Medication name is required')
        .max(200, 'Medication name must be at most 200 characters'),
    dosage: z
        .string()
        .trim()
        .min(1, 'Dosage is required')
        .max(200, 'Dosage must be at most 200 characters'),
    frequency: z
        .string()
        .trim()
        .min(1, 'Frequency is required')
        .max(200, 'Frequency must be at most 200 characters'),
    durationInstructions: z.string().trim().max(1000).nullable().optional(),
    quantityPrescribed: z.coerce.number().int().min(1).max(100000),
    notes: z.string().trim().max(1000).nullable().optional(),
});

const createPrescriptionBodySchema = z.object({
    medicalRecordId: z.string().uuid('Invalid medical record id'),
    expiresAt: nullableDateTimeSchema,
    notes: z.string().trim().max(4000).nullable().optional(),
    items: z.array(prescriptionItemSchema).min(1).max(50),
});

const listPrescriptionsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    patientId: z.string().uuid('Invalid patient id').optional(),
    isVoided: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
});

const voidPrescriptionBodySchema = z.object({
    reason: z
        .string()
        .trim()
        .min(3, 'Void reason must be at least 3 characters')
        .max(1000, 'Void reason must be at most 1000 characters'),
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

export class PrescriptionController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly pdfService = new PrescriptionPdfService();
    private readonly service = new PrescriptionService(
        new PrescriptionPrismaRepository(),
        new NotificationPrescriptionEventPublisher(),
    );
    private readonly createPrescriptionHandler = new CreatePrescriptionHandler(
        this.service,
    );
    private readonly voidPrescriptionHandler = new VoidPrescriptionHandler(
        this.service,
    );
    private readonly listPrescriptionsHandler = new ListPrescriptionsHandler(
        this.service,
    );
    private readonly getPrescriptionByIdHandler = new GetPrescriptionByIdHandler(
        this.service,
    );
    private readonly getPrescriptionPdfHandler = new GetPrescriptionPdfHandler(
        this.service,
        this.pdfService,
    );

    async create(req: Request, res: Response) {
        const body = createPrescriptionBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createPrescriptionHandler,
            new CreatePrescriptionCommand(
                body.medicalRecordId,
                body.items,
                body.expiresAt,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const query = listPrescriptionsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listPrescriptionsHandler,
            new ListPrescriptionsQuery(
                query.page,
                query.limit,
                query.patientId,
                query.isVoided,
                req.user?.id,
                hasPermission(req, 'prescriptions:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getPrescriptionByIdHandler,
            new GetPrescriptionByIdQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'prescriptions:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async downloadPdf(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const pdf = await this.queryBus.execute(
            this.getPrescriptionPdfHandler,
            new GetPrescriptionPdfQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'prescriptions:read', 'all'),
            ),
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="prescription-${params.id}.pdf"`,
        );

        return res.status(200).send(pdf);
    }

    async voidPrescription(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = voidPrescriptionBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.voidPrescriptionHandler,
            new VoidPrescriptionCommand(params.id, body.reason, req.user?.id),
        );

        return res.status(200).json(result);
    }
}
