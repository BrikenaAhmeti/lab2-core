import { Request, Response } from 'express';
import { z } from 'zod';
import { BloodType } from '../../../generated/prisma';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { HttpAuthAccountProvisioningClient } from '../../../shared/auth/auth-account-provisioning.client';
import { CreatePatientCommand } from '../application/commands/create-patient.command';
import { LinkPatientByPersonalNumberCommand } from '../application/commands/link-patient-by-personal-number.command';
import { UpdatePatientCommand } from '../application/commands/update-patient.command';
import { CreatePatientHandler } from '../application/handlers/create-patient.handler';
import { GetPatientByIdHandler } from '../application/handlers/get-patient-by-id.handler';
import { GetPatientByUserIdHandler } from '../application/handlers/get-patient-by-user-id.handler';
import { GetPatientTimelineHandler } from '../application/handlers/get-patient-timeline.handler';
import { LinkPatientByPersonalNumberHandler } from '../application/handlers/link-patient-by-personal-number.handler';
import { ListPatientsHandler } from '../application/handlers/list-patients.handler';
import { UpdatePatientHandler } from '../application/handlers/update-patient.handler';
import { GetPatientByIdQuery } from '../application/queries/get-patient-by-id.query';
import { GetPatientByUserIdQuery } from '../application/queries/get-patient-by-user-id.query';
import { GetPatientTimelineQuery } from '../application/queries/get-patient-timeline.query';
import { ListPatientsQuery } from '../application/queries/list-patients.query';
import { PatientPrismaRepository } from '../infrastructure/patient.prisma.repository';
import { PatientService } from '../services/patient.service';

const bloodTypeSchema = z.enum([
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
    'UNKNOWN',
]);

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid patient id'),
});

const createPatientSchema = z.object({
    userId: z.string().uuid('Invalid user id').nullable().optional(),
    firstName: z
        .string()
        .trim()
        .min(2, 'First name must be at least 2 characters')
        .max(100, 'First name must be at most 100 characters'),
    lastName: z
        .string()
        .trim()
        .min(2, 'Last name must be at least 2 characters')
        .max(100, 'Last name must be at most 100 characters'),
    email: z.union([z.string().trim().email(), z.null()]).optional(),
    phone: z.union([z.string().trim().max(40), z.null()]).optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: z.union([z.string().trim().max(40), z.null()]).optional(),
    bloodType: bloodTypeSchema.nullable().optional(),
    personalNumber: z.preprocess(
        (value) => value ?? '',
        z
            .string()
            .trim()
            .min(1, 'Personal number is required')
            .max(120, 'Personal number must be at most 120 characters'),
    ),
    address: z.union([z.string().trim().max(255), z.null()]).optional(),
    emergencyContact: z.union([z.string().trim().max(120), z.null()]).optional(),
    emergencyPhone: z.union([z.string().trim().max(40), z.null()]).optional(),
    allergies: z.unknown().optional(),
    medicalNotes: z.unknown().optional(),
});

const updatePatientSchema = createPatientSchema
    .partial()
    .extend({
        isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: 'At least one field is required',
    });

const listPatientsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(120).optional(),
    gender: z.string().trim().max(40).optional(),
    bloodType: bloodTypeSchema.optional(),
});

const linkByPersonalNumberSchema = z.object({
    userId: z.string().uuid('Invalid user id'),
    personalNumber: z
        .string()
        .trim()
        .min(1, 'Personal number is required')
        .max(120, 'Personal number must be at most 120 characters'),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.union([z.string().trim().email(), z.null()]).optional(),
    phone: z.union([z.string().trim().max(40), z.null()]).optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: z.union([z.string().trim().max(40), z.null()]).optional(),
});

const userIdParamsSchema = z.object({
    userId: z.string().uuid('Invalid user id'),
});

function hasPermission(req: Request, permission: string) {
    const permissions = req.user?.permissions ?? [];

    return (
        permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`))
    );
}

function toBloodType(value?: z.infer<typeof bloodTypeSchema> | null) {
    return value as BloodType | null | undefined;
}

export class PatientController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new PatientService(
        new PatientPrismaRepository(),
        new HttpAuthAccountProvisioningClient(),
    );
    private readonly createPatientHandler = new CreatePatientHandler(this.service);
    private readonly updatePatientHandler = new UpdatePatientHandler(this.service);
    private readonly listPatientsHandler = new ListPatientsHandler(this.service);
    private readonly getPatientByIdHandler = new GetPatientByIdHandler(this.service);
    private readonly getPatientByUserIdHandler = new GetPatientByUserIdHandler(
        this.service,
    );
    private readonly getPatientTimelineHandler = new GetPatientTimelineHandler(
        this.service,
    );
    private readonly linkPatientByPersonalNumberHandler =
        new LinkPatientByPersonalNumberHandler(this.service);

    async create(req: Request, res: Response) {
        const body = createPatientSchema.parse(req.body);
        const canCreateAll = hasPermission(req, 'patients:create');
        const command = new CreatePatientCommand(
            body.firstName,
            body.lastName,
            body.userId,
            body.email,
            body.phone,
            body.dateOfBirth,
            body.gender,
            toBloodType(body.bloodType),
            body.personalNumber,
            body.address,
            body.emergencyContact,
            body.emergencyPhone,
            body.allergies,
            body.medicalNotes,
            req.user?.id,
            canCreateAll,
        );
        const result = await this.commandBus.execute(
            this.createPatientHandler,
            command,
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const queryData = listPatientsQuerySchema.parse(req.query);
        const query = new ListPatientsQuery(
            queryData.page,
            queryData.limit,
            queryData.search,
            queryData.gender,
            toBloodType(queryData.bloodType) ?? undefined,
        );
        const result = await this.queryBus.execute(
            this.listPatientsHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async me(req: Request, res: Response) {
        const query = new GetPatientByUserIdQuery(req.user!.id);
        const result = await this.queryBus.execute(
            this.getPatientByUserIdHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = new GetPatientByIdQuery(
            params.id,
            req.user?.id,
            hasPermission(req, 'patients:read'),
        );
        const result = await this.queryBus.execute(
            this.getPatientByIdHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updatePatientSchema.parse(req.body);
        const command = new UpdatePatientCommand(
            params.id,
            body.firstName,
            body.lastName,
            body.userId,
            body.email,
            body.phone,
            body.dateOfBirth,
            body.gender,
            toBloodType(body.bloodType),
            body.personalNumber,
            body.address,
            body.emergencyContact,
            body.emergencyPhone,
            body.allergies,
            body.medicalNotes,
            body.isActive,
            req.user?.id,
            hasPermission(req, 'patients:update'),
        );
        const result = await this.commandBus.execute(
            this.updatePatientHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async timeline(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = new GetPatientTimelineQuery(
            params.id,
            req.user?.id,
            hasPermission(req, 'patients:read'),
        );
        const result = await this.queryBus.execute(
            this.getPatientTimelineHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async linkByPersonalNumber(req: Request, res: Response) {
        const body = linkByPersonalNumberSchema.parse(req.body);
        const command = new LinkPatientByPersonalNumberCommand(
            body.userId,
            body.personalNumber,
            body.firstName,
            body.lastName,
            body.email,
            body.phone,
            body.dateOfBirth,
            body.gender,
        );
        const result = await this.commandBus.execute(
            this.linkPatientByPersonalNumberHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async getInternalByUserId(req: Request, res: Response) {
        const params = userIdParamsSchema.parse(req.params);
        const query = new GetPatientByUserIdQuery(params.userId);
        const patient = await this.queryBus.execute(
            this.getPatientByUserIdHandler,
            query,
        );

        return res.status(200).json({
            patientId: patient.id,
            patientProfileId: patient.id,
            userId: patient.userId,
        });
    }
}
