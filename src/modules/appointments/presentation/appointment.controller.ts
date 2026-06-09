import { Request, Response } from 'express';
import { z } from 'zod';
import {
    AppointmentStatus,
    AppointmentType,
} from '../../../generated/prisma';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/core/errors/app-error';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SchedulePrismaRepository } from '../../schedules/infrastructure/schedule.prisma.repository';
import { ScheduleService } from '../../schedules/services/schedule.service';
import { BookAppointmentCommand } from '../application/commands/book-appointment.command';
import { RescheduleAppointmentCommand } from '../application/commands/reschedule-appointment.command';
import { UpdateAppointmentStatusCommand } from '../application/commands/update-appointment-status.command';
import { BookAppointmentHandler } from '../application/handlers/book-appointment.handler';
import { GetAppointmentByIdHandler } from '../application/handlers/get-appointment-by-id.handler';
import { ListAppointmentReminderCandidatesHandler } from '../application/handlers/list-appointment-reminder-candidates.handler';
import { ListAppointmentsHandler } from '../application/handlers/list-appointments.handler';
import { ListTodayAppointmentsHandler } from '../application/handlers/list-today-appointments.handler';
import { RescheduleAppointmentHandler } from '../application/handlers/reschedule-appointment.handler';
import { UpdateAppointmentStatusHandler } from '../application/handlers/update-appointment-status.handler';
import { GetAppointmentByIdQuery } from '../application/queries/get-appointment-by-id.query';
import { ListAppointmentReminderCandidatesQuery } from '../application/queries/list-appointment-reminder-candidates.query';
import { ListAppointmentsQuery } from '../application/queries/list-appointments.query';
import { ListTodayAppointmentsQuery } from '../application/queries/list-today-appointments.query';
import {
    AuditLogAppointmentAuditLogger,
    NoopAppointmentAuditLogger,
} from '../infrastructure/appointment-audit.logger';
import { AppointmentPrismaRepository } from '../infrastructure/appointment.prisma.repository';
import { createAppointmentSlotLockRepository } from '../infrastructure/appointment-slot-lock.repository';
import { BillingAppointmentEventPublisher } from '../../billing/infrastructure/billing-appointment-event.publisher';
import { CompositeAppointmentEventPublisher } from '../infrastructure/composite-appointment-event.publisher';
import { NotificationAppointmentEventPublisher } from '../infrastructure/notification-appointment-event.publisher';
import { AppointmentView } from '../domain/appointment.entity';
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
    id: z.string().uuid('Invalid appointment id').optional(),
    appointmentId: z.string().uuid('Invalid appointment id').optional(),
}).transform((params) => ({ id: params.id ?? params.appointmentId! }));

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
    patientId: z.string().uuid('Invalid patient id').optional(),
    serviceCatalogId: z.string().uuid('Invalid service id').optional(),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    doctorId: z.string().uuid('Invalid doctor id').optional(),
    scheduledAt: dateTimeSchema.optional(),
    date: dateTimeSchema.optional(),
    appointmentType: z.enum(appointmentTypeValues).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    reason: z.string().trim().max(1000).nullable().optional(),
}).refine((body) => body.staffProfileId || body.doctorId, {
    message: 'staffProfileId or doctorId is required',
}).refine((body) => body.scheduledAt || body.date, {
    message: 'scheduledAt or date is required',
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
    hasNoFeedback: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
});

const reminderCandidatesQuerySchema = z
    .object({
        from: dateTimeSchema,
        to: dateTimeSchema,
    })
    .refine((query) => query.from < query.to, {
        message: 'from must be before to',
    });

const rescheduleAppointmentBodySchema = z.object({
    scheduledAt: dateTimeSchema.optional(),
    date: dateTimeSchema.optional(),
    serviceCatalogId: z.string().uuid('Invalid service id').optional(),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    appointmentType: z.enum(appointmentTypeValues).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
}).refine((body) => body.scheduledAt || body.date, {
    message: 'scheduledAt or date is required',
});

const patientRescheduleBodySchema = z.object({
    doctorId: z.string().uuid('Invalid doctor id').optional(),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    date: dateTimeSchema,
}).refine((body) => body.doctorId || body.staffProfileId, {
    message: 'doctorId or staffProfileId is required',
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

function hasPermission(req: Request, permission: string) {
    const permissions = req.user?.permissions ?? [];

    return permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`));
}

function canAccessAppointment(req: Request, appointment: AppointmentView, permission: string) {
    if (hasPermission(req, permission)) {
        return true;
    }

    const userId = req.user?.id;

    return Boolean(
        userId &&
        (appointment.patient.userId === userId || appointment.staff?.userId === userId),
    );
}

function toMobileAppointment(appointment: AppointmentView) {
    const doctorName = appointment.staff?.displayName ?? null;

    return {
        ...appointment,
        _id: appointment.id,
        doctorId: appointment.staffProfileId,
        date: appointment.scheduledAt,
        reason: appointment.notes,
        doctor: appointment.staff
            ? {
                id: appointment.staff.id,
                _id: appointment.staff.id,
                userId: appointment.staff.userId,
                name: doctorName,
                fullName: doctorName,
                firstName: doctorName,
                lastName: '',
                specialty: appointment.staff.specialization,
                specialization: appointment.staff.specialization,
                employeeCode: appointment.staff.employeeCode,
            }
            : null,
    };
}

function toMobileAppointmentList(result: { items: AppointmentView[]; meta: unknown }) {
    return {
        ...result,
        items: result.items.map(toMobileAppointment),
    };
}

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
    private readonly appointmentRepository = new AppointmentPrismaRepository();
    private readonly service = new AppointmentService(
        this.appointmentRepository,
        new ScheduleService(new SchedulePrismaRepository(), this.slotLockRepository),
        this.slotLockRepository,
        new CompositeAppointmentEventPublisher([
            new BillingAppointmentEventPublisher(),
            new NotificationAppointmentEventPublisher(),
        ]),
        env.auditLoggingEnabled
            ? new AuditLogAppointmentAuditLogger()
            : new NoopAppointmentAuditLogger(),
    );
    private readonly bookAppointmentHandler = new BookAppointmentHandler(this.service);
    private readonly listAppointmentsHandler = new ListAppointmentsHandler(this.service);
    private readonly listTodayAppointmentsHandler = new ListTodayAppointmentsHandler(this.service);
    private readonly listAppointmentReminderCandidatesHandler =
        new ListAppointmentReminderCandidatesHandler(this.service);
    private readonly getAppointmentByIdHandler = new GetAppointmentByIdHandler(this.service);
    private readonly rescheduleAppointmentHandler = new RescheduleAppointmentHandler(this.service);
    private readonly updateAppointmentStatusHandler = new UpdateAppointmentStatusHandler(this.service);

    async create(req: Request, res: Response) {
        const body = bookAppointmentBodySchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
            throw new AppError('Unauthorized', 401);
        }

        const canCreateForPatient = hasPermission(req, 'appointments:create') && body.patientId;
        const patient = canCreateForPatient
            ? await this.appointmentRepository.findPatientById(body.patientId!)
            : await this.appointmentRepository.findPatientByUserId(userId);

        if (!patient) {
            throw new AppError('Patient not found or inactive', 404);
        }

        const staff = await this.appointmentRepository.findStaffByIdOrUserId(
            body.staffProfileId ?? body.doctorId!,
        );

        if (!staff) {
            throw new AppError('Staff profile not found or inactive', 404);
        }

        const service = body.serviceCatalogId
            ? await this.appointmentRepository.findServiceById(body.serviceCatalogId)
            : await this.appointmentRepository.findDefaultServiceForStaff(staff.id);

        if (!service) {
            throw new AppError('Service not found or inactive', 404);
        }

        const result = await this.commandBus.execute(
            this.bookAppointmentHandler,
            new BookAppointmentCommand(
                patient.id,
                service.id,
                staff.id,
                body.scheduledAt ?? body.date!,
                body.appointmentType as AppointmentType | undefined,
                body.notes ?? body.reason,
                req.user?.id,
            ),
        );

        return res.status(201).json(toMobileAppointment(result));
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
                query.hasNoFeedback,
            ),
        );

        return res.status(200).json(toMobileAppointmentList(result));
    }

    async today(_req: Request, res: Response) {
        const result = await this.queryBus.execute(
            this.listTodayAppointmentsHandler,
            new ListTodayAppointmentsQuery(),
        );

        return res.status(200).json(result.map(toMobileAppointment));
    }

    async reminderCandidates(req: Request, res: Response) {
        const query = reminderCandidatesQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listAppointmentReminderCandidatesHandler,
            new ListAppointmentReminderCandidatesQuery(query.from, query.to),
        );

        return res.status(200).json({ data: result });
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getAppointmentByIdHandler,
            new GetAppointmentByIdQuery(params.id),
        );

        if (!canAccessAppointment(req, result, 'appointments:read')) {
            throw new AppError('Forbidden', 403);
        }

        return res.status(200).json(toMobileAppointment(result));
    }

    async my(req: Request, res: Response) {
        const query = listAppointmentsQuerySchema.parse(req.query);
        const limit = req.query.limit === undefined ? 100 : query.limit;
        const patient = await this.appointmentRepository.findPatientByIdOrUserId(req.user!.id);

        if (!patient) {
            throw new AppError('Patient profile not found', 404);
        }

        const result = await this.queryBus.execute(
            this.listAppointmentsHandler,
            new ListAppointmentsQuery(
                query.page,
                limit,
                query.date,
                query.from,
                query.to,
                undefined,
                patient.id,
                query.departmentId,
                query.status as AppointmentStatus | undefined,
                query.hasNoFeedback,
            ),
        );

        return res.status(200).json(toMobileAppointmentList(result));
    }

    async doctorMy(req: Request, res: Response) {
        const query = listAppointmentsQuerySchema.parse(req.query);
        const limit = req.query.limit === undefined ? 100 : query.limit;
        const staff = await this.appointmentRepository.findStaffByIdOrUserId(req.user!.id);

        if (!staff) {
            throw new AppError('Staff profile not found', 404);
        }

        const result = await this.queryBus.execute(
            this.listAppointmentsHandler,
            new ListAppointmentsQuery(
                query.page,
                limit,
                query.date,
                query.from,
                query.to,
                staff.id,
                query.patientId,
                query.departmentId,
                query.status as AppointmentStatus | undefined,
                query.hasNoFeedback,
            ),
        );

        return res.status(200).json(toMobileAppointmentList(result));
    }

    async reschedule(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = rescheduleAppointmentBodySchema.parse(req.body);
        const appointment = await this.queryBus.execute(
            this.getAppointmentByIdHandler,
            new GetAppointmentByIdQuery(params.id),
        );

        if (!canAccessAppointment(req, appointment, 'appointments:update')) {
            throw new AppError('Forbidden', 403);
        }

        if (!hasPermission(req, 'appointments:update') && appointment.patient.userId === req.user?.id) {
            if (body.serviceCatalogId || body.staffProfileId || body.appointmentType || body.notes !== undefined) {
                throw new AppError('Patients can only reschedule their own appointment date', 403);
            }
        }

        const result = await this.commandBus.execute(
            this.rescheduleAppointmentHandler,
            new RescheduleAppointmentCommand(
                params.id,
                body.scheduledAt ?? body.date!,
                body.serviceCatalogId,
                body.staffProfileId,
                body.appointmentType as AppointmentType | undefined,
                body.notes,
                req.user?.id,
            ),
        );

        return res.status(200).json(toMobileAppointment(result));
    }

    async patientReschedule(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = patientRescheduleBodySchema.parse(req.body);
        const patient = await this.appointmentRepository.findPatientByIdOrUserId(req.user!.id);

        if (!patient) {
            throw new AppError('Patient profile not found', 404);
        }

        const appointment = await this.queryBus.execute(
            this.getAppointmentByIdHandler,
            new GetAppointmentByIdQuery(params.id),
        );

        if (appointment.patientId !== patient.id) {
            throw new AppError('Forbidden', 403);
        }

        if (
            appointment.status === AppointmentStatus.CANCELLED ||
            appointment.status === AppointmentStatus.COMPLETED
        ) {
            throw new AppError('Finalized appointments cannot be rescheduled', 422);
        }

        const staff = await this.appointmentRepository.findStaffByIdOrUserId(
            body.staffProfileId ?? body.doctorId!,
        );

        if (!staff) {
            throw new AppError('Staff profile not found or inactive', 404);
        }

        if (staff.id !== appointment.staffProfileId) {
            throw new AppError('Appointment can only be rescheduled with the same doctor', 400);
        }

        const result = await this.commandBus.execute(
            this.rescheduleAppointmentHandler,
            new RescheduleAppointmentCommand(
                params.id,
                body.date,
                undefined,
                staff.id,
                undefined,
                undefined,
                req.user?.id,
            ),
        );

        return res.status(200).json(toMobileAppointment(result));
    }

    async updateStatus(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateStatusBodySchema.parse(req.body);
        const status = body.status
            ? (body.status as AppointmentStatus)
            : statusFromAction(body.action!);
        const appointment = await this.queryBus.execute(
            this.getAppointmentByIdHandler,
            new GetAppointmentByIdQuery(params.id),
        );

        if (!canAccessAppointment(req, appointment, 'appointments:update')) {
            throw new AppError('Forbidden', 403);
        }

        if (
            !hasPermission(req, 'appointments:update') &&
            appointment.patient.userId === req.user?.id &&
            status !== AppointmentStatus.CANCELLED
        ) {
            throw new AppError('Patients can only cancel their own appointments', 403);
        }

        const result = await this.commandBus.execute(
            this.updateAppointmentStatusHandler,
            new UpdateAppointmentStatusCommand(
                params.id,
                status,
                status === AppointmentStatus.CANCELLED
                    ? body.reason ?? 'Cancelled by user'
                    : body.reason,
                req.user?.id,
            ),
        );

        return res.status(200).json(toMobileAppointment(result));
    }
}
