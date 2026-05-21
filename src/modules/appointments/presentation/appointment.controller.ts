import { Request, Response } from 'express';
import { z } from 'zod';
import {
    AppointmentStatus,
    AppointmentType,
} from '../../../generated/prisma';
import { env } from '../../../config/env';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SchedulePrismaRepository } from '../../schedules/infrastructure/schedule.prisma.repository';
import { ScheduleService } from '../../schedules/services/schedule.service';
import { BookAppointmentCommand } from '../application/commands/book-appointment.command';
import { RescheduleAppointmentCommand } from '../application/commands/reschedule-appointment.command';
import { UpdateAppointmentStatusCommand } from '../application/commands/update-appointment-status.command';
import { BookAppointmentHandler } from '../application/handlers/book-appointment.handler';
import { GetAppointmentByIdHandler } from '../application/handlers/get-appointment-by-id.handler';
import { ListAppointmentsHandler } from '../application/handlers/list-appointments.handler';
import { ListTodayAppointmentsHandler } from '../application/handlers/list-today-appointments.handler';
import { RescheduleAppointmentHandler } from '../application/handlers/reschedule-appointment.handler';
import { UpdateAppointmentStatusHandler } from '../application/handlers/update-appointment-status.handler';
import { GetAppointmentByIdQuery } from '../application/queries/get-appointment-by-id.query';
import { ListAppointmentsQuery } from '../application/queries/list-appointments.query';
import { ListTodayAppointmentsQuery } from '../application/queries/list-today-appointments.query';
import {
    AuditLogAppointmentAuditLogger,
    NoopAppointmentAuditLogger,
} from '../infrastructure/appointment-audit.logger';
import { AppointmentPrismaRepository } from '../infrastructure/appointment.prisma.repository';
import { createAppointmentSlotLockRepository } from '../infrastructure/appointment-slot-lock.repository';
import { BillingAppointmentEventPublisher } from '../../billing/infrastructure/billing-appointment-event.publisher';
import { AppointmentService } from '../services/appointment.service';

const appointmentStatusValues = [
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
] as const;

const appointmentTypeValues = [
    'IN_PERSON',
    'VIRTUAL',
    'WALK_IN',
    'FOLLOW_UP',
] as const;

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid appointment id'),
});

const dateOnlySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
    .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, {
        message: 'Invalid date',
    })
    .transform((value) => new Date(`${value}T00:00:00.000Z`));

const dateTimeSchema = z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date time');

const optionalDateTimeSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, dateTimeSchema.optional());

const bookAppointmentBodySchema = z.object({
    patientId: z.string().uuid('Invalid patient id'),
    serviceCatalogId: z.string().uuid('Invalid service id'),
    staffProfileId: z.string().uuid('Invalid staff profile id'),
    scheduledAt: dateTimeSchema,
    appointmentType: z.enum(appointmentTypeValues).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
});

const listAppointmentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    date: dateOnlySchema.optional(),
    from: optionalDateTimeSchema,
    to: optionalDateTimeSchema,
    staffId: z.string().uuid('Invalid staff profile id').optional(),
    patientId: z.string().uuid('Invalid patient id').optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    status: z.enum(appointmentStatusValues).optional(),
});

const rescheduleAppointmentBodySchema = z.object({
    scheduledAt: dateTimeSchema,
    serviceCatalogId: z.string().uuid('Invalid service id').optional(),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    appointmentType: z.enum(appointmentTypeValues).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
});

const statusActionSchema = z.enum([
    'confirm',
    'check-in',
    'check_in',
    'start',
    'complete',
    'cancel',
    'no-show',
    'no_show',
]);

const updateStatusBodySchema = z
    .object({
        status: z.enum(appointmentStatusValues).optional(),
        action: statusActionSchema.optional(),
        reason: z.string().trim().max(500).nullable().optional(),
    })
    .refine((body) => body.status || body.action, {
        message: 'status or action is required',
    });

function statusFromAction(action: z.infer<typeof statusActionSchema>): AppointmentStatus {
    const statusByAction: Record<z.infer<typeof statusActionSchema>, AppointmentStatus> = {
        confirm: AppointmentStatus.CONFIRMED,
        'check-in': AppointmentStatus.CHECKED_IN,
        check_in: AppointmentStatus.CHECKED_IN,
        start: AppointmentStatus.IN_PROGRESS,
        complete: AppointmentStatus.COMPLETED,
        cancel: AppointmentStatus.CANCELLED,
        'no-show': AppointmentStatus.NO_SHOW,
        no_show: AppointmentStatus.NO_SHOW,
    };

    return statusByAction[action];
}

export class AppointmentController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly slotLockRepository = createAppointmentSlotLockRepository();
    private readonly service = new AppointmentService(
        new AppointmentPrismaRepository(),
        new ScheduleService(new SchedulePrismaRepository(), this.slotLockRepository),
        this.slotLockRepository,
        new BillingAppointmentEventPublisher(),
        env.auditLoggingEnabled
            ? new AuditLogAppointmentAuditLogger()
            : new NoopAppointmentAuditLogger(),
    );
    private readonly bookAppointmentHandler = new BookAppointmentHandler(this.service);
    private readonly listAppointmentsHandler = new ListAppointmentsHandler(this.service);
    private readonly listTodayAppointmentsHandler = new ListTodayAppointmentsHandler(this.service);
    private readonly getAppointmentByIdHandler = new GetAppointmentByIdHandler(this.service);
    private readonly rescheduleAppointmentHandler = new RescheduleAppointmentHandler(this.service);
    private readonly updateAppointmentStatusHandler = new UpdateAppointmentStatusHandler(this.service);

    async create(req: Request, res: Response) {
        const body = bookAppointmentBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.bookAppointmentHandler,
            new BookAppointmentCommand(
                body.patientId,
                body.serviceCatalogId,
                body.staffProfileId,
                body.scheduledAt,
                body.appointmentType as AppointmentType | undefined,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const query = listAppointmentsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listAppointmentsHandler,
            new ListAppointmentsQuery(
                query.page,
                query.limit,
                query.date,
                query.from,
                query.to,
                query.staffId,
                query.patientId,
                query.departmentId,
                query.status as AppointmentStatus | undefined,
            ),
        );

        return res.status(200).json(result);
    }

    async today(_req: Request, res: Response) {
        const result = await this.queryBus.execute(
            this.listTodayAppointmentsHandler,
            new ListTodayAppointmentsQuery(),
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getAppointmentByIdHandler,
            new GetAppointmentByIdQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async reschedule(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = rescheduleAppointmentBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.rescheduleAppointmentHandler,
            new RescheduleAppointmentCommand(
                params.id,
                body.scheduledAt,
                body.serviceCatalogId,
                body.staffProfileId,
                body.appointmentType as AppointmentType | undefined,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }

    async updateStatus(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateStatusBodySchema.parse(req.body);
        const status = body.status
            ? (body.status as AppointmentStatus)
            : statusFromAction(body.action!);
        const result = await this.commandBus.execute(
            this.updateAppointmentStatusHandler,
            new UpdateAppointmentStatusCommand(
                params.id,
                status,
                body.reason,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }
}
