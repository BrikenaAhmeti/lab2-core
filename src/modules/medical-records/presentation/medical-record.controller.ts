import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { AddMedicalRecordAmendmentCommand } from '../application/commands/add-medical-record-amendment.command';
import { CreateMedicalRecordCommand } from '../application/commands/create-medical-record.command';
import { FinalizeMedicalRecordCommand } from '../application/commands/finalize-medical-record.command';
import { UpdateMedicalRecordCommand } from '../application/commands/update-medical-record.command';
import { AddMedicalRecordAmendmentHandler } from '../application/handlers/add-medical-record-amendment.handler';
import { CreateMedicalRecordHandler } from '../application/handlers/create-medical-record.handler';
import { FinalizeMedicalRecordHandler } from '../application/handlers/finalize-medical-record.handler';
import { GetMedicalRecordByIdHandler } from '../application/handlers/get-medical-record-by-id.handler';
import { GetMedicalRecordPdfHandler } from '../application/handlers/get-medical-record-pdf.handler';
import { ListMedicalRecordsHandler } from '../application/handlers/list-medical-records.handler';
import { UpdateMedicalRecordHandler } from '../application/handlers/update-medical-record.handler';
import { GetMedicalRecordByIdQuery } from '../application/queries/get-medical-record-by-id.query';
import { GetMedicalRecordPdfQuery } from '../application/queries/get-medical-record-pdf.query';
import { ListMedicalRecordsQuery } from '../application/queries/list-medical-records.query';
import { MedicalRecordPrismaRepository } from '../infrastructure/medical-record.prisma.repository';
import { MedicalRecordPdfService } from '../services/medical-record-pdf.service';
import { MedicalRecordService } from '../services/medical-record.service';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid medical record id'),
});

const medicalRecordFieldsSchema = z.object({
    chiefComplaint: z.string().trim().max(2000).nullable().optional(),
    vitals: z.unknown().optional(),
    diagnosis: z.string().trim().max(2000).nullable().optional(),
    treatmentPlan: z.string().trim().max(4000).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    followUpInstructions: z.string().trim().max(2000).nullable().optional(),
});

const createMedicalRecordBodySchema = medicalRecordFieldsSchema.extend({
    patientId: z.string().uuid('Invalid patient id'),
    appointmentId: z.string().uuid('Invalid appointment id'),
    staffProfileId: z.string().uuid('Invalid staff profile id'),
});

const updateMedicalRecordBodySchema = medicalRecordFieldsSchema.refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one medical record field is required' },
);

const amendmentBodySchema = z.object({
    reason: z
        .string()
        .trim()
        .min(3, 'Amendment reason must be at least 3 characters')
        .max(1000, 'Amendment reason must be at most 1000 characters'),
    changes: updateMedicalRecordBodySchema,
});

const listMedicalRecordsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    patientId: z.string().uuid('Invalid patient id').optional(),
    isFinalized: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
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

export class MedicalRecordController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly pdfService = new MedicalRecordPdfService();
    private readonly service = new MedicalRecordService(
        new MedicalRecordPrismaRepository(),
    );
    private readonly createMedicalRecordHandler = new CreateMedicalRecordHandler(
        this.service,
    );
    private readonly updateMedicalRecordHandler = new UpdateMedicalRecordHandler(
        this.service,
    );
    private readonly finalizeMedicalRecordHandler = new FinalizeMedicalRecordHandler(
        this.service,
    );
    private readonly addMedicalRecordAmendmentHandler =
        new AddMedicalRecordAmendmentHandler(this.service);
    private readonly listMedicalRecordsHandler = new ListMedicalRecordsHandler(
        this.service,
    );
    private readonly getMedicalRecordByIdHandler = new GetMedicalRecordByIdHandler(
        this.service,
    );
    private readonly getMedicalRecordPdfHandler = new GetMedicalRecordPdfHandler(
        this.service,
        this.pdfService,
    );

    async create(req: Request, res: Response) {
        const body = createMedicalRecordBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createMedicalRecordHandler,
            new CreateMedicalRecordCommand(
                body.patientId,
                body.appointmentId,
                body.staffProfileId,
                body.chiefComplaint,
                body.vitals,
                body.diagnosis,
                body.treatmentPlan,
                body.notes,
                body.followUpInstructions,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const query = listMedicalRecordsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listMedicalRecordsHandler,
            new ListMedicalRecordsQuery(
                query.page,
                query.limit,
                query.patientId,
                query.isFinalized,
                req.user?.id,
                hasPermission(req, 'medical_records:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getMedicalRecordByIdHandler,
            new GetMedicalRecordByIdQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'medical_records:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async downloadPdf(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const pdf = await this.queryBus.execute(
            this.getMedicalRecordPdfHandler,
            new GetMedicalRecordPdfQuery(
                params.id,
                req.user?.id,
                hasPermission(req, 'medical_records:read', 'all'),
            ),
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="medical-record-${params.id}.pdf"`,
        );

        return res.status(200).send(pdf);
    }

    async update(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateMedicalRecordBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateMedicalRecordHandler,
            new UpdateMedicalRecordCommand(
                params.id,
                body.chiefComplaint,
                body.vitals,
                body.diagnosis,
                body.treatmentPlan,
                body.notes,
                body.followUpInstructions,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async finalize(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.commandBus.execute(
            this.finalizeMedicalRecordHandler,
            new FinalizeMedicalRecordCommand(params.id, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async addAmendment(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = amendmentBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.addMedicalRecordAmendmentHandler,
            new AddMedicalRecordAmendmentCommand(
                params.id,
                body.reason,
                body.changes,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }
}
