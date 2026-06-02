import { randomUUID } from 'crypto';
import { AppointmentStatus, AppointmentType } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import { ScheduleService } from '../../schedules/services/schedule.service';
import {
    AppointmentTimeRange,
    AppointmentView,
} from '../domain/appointment.entity';
import { AppointmentAuditLogger } from '../domain/appointment-audit.logger';
import { AppointmentEventPublisher } from '../domain/appointment-event.publisher';
import {
    AppointmentRepository,
    ListAppointmentsFilters,
} from '../domain/appointment.repository';
import { AppointmentSlotLockRepository } from '../domain/appointment-slot-lock.repository';

const SLOT_LOCK_TTL_SECONDS = 300;

const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ],
    [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ],
    [AppointmentStatus.CHECKED_IN]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ],
    [AppointmentStatus.IN_PROGRESS]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
    ],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELLED]: [],
    [AppointmentStatus.NO_SHOW]: [],
};

const NON_RESCHEDULABLE_STATUSES = new Set<AppointmentStatus>([
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
]);

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}

function normalizeNotes(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}

export class AppointmentService {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly scheduleService: ScheduleService,
        private readonly slotLockRepository: AppointmentSlotLockRepository,
        private readonly eventPublisher: AppointmentEventPublisher,
        private readonly auditLogger: AppointmentAuditLogger,
        private readonly nowProvider: () => Date = () => new Date(),
    ) { }

    async bookAppointment(data: {
        patientId: string;
        serviceCatalogId: string;
        staffProfileId: string;
        scheduledAt: Date;
        appointmentType?: AppointmentType;
        notes?: string | null;
        actorUserId?: string;
    }): Promise<AppointmentView> {
        if (data.scheduledAt <= this.nowProvider()) {
            throw new AppError('Cannot book an appointment in the past', 400);
        }

        const patient = await this.appointmentRepository.findPatientById(data.patientId);

        if (!patient) {
            throw new AppError('Patient not found or inactive', 404);
        }

        const service = await this.getActiveService(data.serviceCatalogId);
        await this.ensureStaffCanServeDepartment(data.staffProfileId, service.departmentId);

        const range = this.buildAppointmentRange(data.scheduledAt, service.defaultDurationMinutes);
        await this.ensureSlotIsAvailable({
            staffProfileId: data.staffProfileId,
            serviceCatalogId: data.serviceCatalogId,
            scheduledAt: range.scheduledAt,
            endAt: range.endAt,
        });

        const lockToken = randomUUID();
        const locked = await this.slotLockRepository.acquireSlotLock({
            staffProfileId: data.staffProfileId,
            serviceId: data.serviceCatalogId,
            scheduledAt: range.scheduledAt,
            endAt: range.endAt,
            token: lockToken,
            ttlSeconds: SLOT_LOCK_TTL_SECONDS,
        });

        if (!locked) {
            throw new AppError('Appointment slot is currently locked', 409);
        }

        try {
            await this.ensureNoAppointmentConflict({
                staffProfileId: data.staffProfileId,
                scheduledAt: range.scheduledAt,
                endAt: range.endAt,
            });

            const appointment = await this.appointmentRepository.create({
                patientId: data.patientId,
                departmentId: service.departmentId,
                serviceCatalogId: service.id,
                staffProfileId: data.staffProfileId,
                appointmentType: data.appointmentType ?? AppointmentType.IN_PERSON,
                scheduledAt: range.scheduledAt,
                endAt: range.endAt,
                durationMinutes: service.defaultDurationMinutes,
                basePrice: service.defaultPrice,
                notes: normalizeNotes(data.notes),
                actorUserId: data.actorUserId,
            });

            await this.publishSafely('AppointmentBooked', {
                appointment,
                actorUserId: data.actorUserId,
            });

            return appointment;
        } finally {
            await this.releaseSlotLockSafely(data.staffProfileId, range.scheduledAt, lockToken);
        }
    }

    async listAppointments(filters: ListAppointmentsFilters) {
        if (filters.from && filters.to && filters.from > filters.to) {
            throw new AppError('from must be before or equal to to', 400);
        }

        return this.appointmentRepository.list(filters);
    }

    async listTodayAppointments(now = this.nowProvider()) {
        return this.appointmentRepository.listToday(now);
    }

    async listReminderCandidates(from: Date, to: Date) {
        if (from >= to) {
            throw new AppError('from must be before to', 400);
        }

        return this.appointmentRepository.listReminderCandidates({ from, to });
    }

    async getAppointmentById(id: string) {
        const appointment = await this.appointmentRepository.findById(id);

        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        return appointment;
    }

    async rescheduleAppointment(
        id: string,
        data: {
            serviceCatalogId?: string;
            staffProfileId?: string;
            scheduledAt: Date;
            appointmentType?: AppointmentType;
            notes?: string | null;
            actorUserId?: string;
        },
    ) {
        const appointment = await this.getAppointmentById(id);

        if (NON_RESCHEDULABLE_STATUSES.has(appointment.status)) {
            throw new AppError('Finalized appointments cannot be rescheduled', 422);
        }

        if (data.scheduledAt <= this.nowProvider()) {
            throw new AppError('Cannot reschedule an appointment in the past', 400);
        }

        const serviceId = data.serviceCatalogId ?? appointment.serviceCatalogId;
        const staffProfileId = data.staffProfileId ?? appointment.staffProfileId;

        if (!staffProfileId) {
            throw new AppError('A staff profile is required for rescheduling', 400);
        }

        const service = await this.getActiveService(serviceId);
        await this.ensureStaffCanServeDepartment(staffProfileId, service.departmentId);

        const range = this.buildAppointmentRange(data.scheduledAt, service.defaultDurationMinutes);
        await this.ensureSlotIsAvailable({
            staffProfileId,
            serviceCatalogId: service.id,
            scheduledAt: range.scheduledAt,
            endAt: range.endAt,
        });

        const lockToken = randomUUID();
        const locked = await this.slotLockRepository.acquireSlotLock({
            staffProfileId,
            serviceId: service.id,
            scheduledAt: range.scheduledAt,
            endAt: range.endAt,
            token: lockToken,
            ttlSeconds: SLOT_LOCK_TTL_SECONDS,
        });

        if (!locked) {
            throw new AppError('Appointment slot is currently locked', 409);
        }

        try {
            await this.ensureNoAppointmentConflict({
                staffProfileId,
                scheduledAt: range.scheduledAt,
                endAt: range.endAt,
                excludeAppointmentId: id,
            });

            const updatedAppointment = await this.appointmentRepository.reschedule(id, {
                departmentId: service.departmentId,
                serviceCatalogId: service.id,
                staffProfileId,
                scheduledAt: range.scheduledAt,
                endAt: range.endAt,
                durationMinutes: service.defaultDurationMinutes,
                basePrice: service.defaultPrice,
                appointmentType: data.appointmentType,
                notes: normalizeNotes(data.notes),
                actorUserId: data.actorUserId,
            });

            await this.auditLogger.recordReschedule({
                appointmentId: id,
                actorUserId: data.actorUserId,
                oldScheduledAt: appointment.scheduledAt,
                oldEndAt: appointment.endAt,
                newScheduledAt: updatedAppointment.scheduledAt,
                newEndAt: updatedAppointment.endAt,
            });
            await this.publishSafely('AppointmentRescheduled', {
                appointment: updatedAppointment,
                actorUserId: data.actorUserId,
                previousScheduledAt: appointment.scheduledAt,
                previousEndAt: appointment.endAt,
            });

            return updatedAppointment;
        } finally {
            await this.releaseSlotLockSafely(staffProfileId, range.scheduledAt, lockToken);
        }
    }

    async updateAppointmentStatus(
        id: string,
        data: {
            status: AppointmentStatus;
            reason?: string | null;
            actorUserId?: string;
        },
    ) {
        const appointment = await this.getAppointmentById(id);

        if (appointment.status === data.status) {
            return appointment;
        }

        const allowedStatuses = VALID_STATUS_TRANSITIONS[appointment.status] ?? [];

        if (!allowedStatuses.includes(data.status)) {
            throw new AppError(
                `Cannot transition appointment from ${appointment.status} to ${data.status}`,
                422,
            );
        }

        if (data.status === AppointmentStatus.CANCELLED && !data.reason?.trim()) {
            throw new AppError('Cancellation reason is required', 400);
        }

        const now = this.nowProvider();
        const updatedAppointment = await this.appointmentRepository.updateStatus(id, {
            status: data.status,
            checkedInAt:
                data.status === AppointmentStatus.CHECKED_IN ? now : undefined,
            completedAt:
                data.status === AppointmentStatus.COMPLETED ? now : undefined,
            cancelledAt:
                data.status === AppointmentStatus.CANCELLED ? now : undefined,
            cancellationNote:
                data.status === AppointmentStatus.CANCELLED
                    ? data.reason!.trim()
                    : undefined,
            actorUserId: data.actorUserId,
        });

        await this.publishSafely(
            data.status === AppointmentStatus.CANCELLED
                ? 'AppointmentCancelled'
                : data.status === AppointmentStatus.COMPLETED
                    ? 'AppointmentCompleted'
                : 'AppointmentStatusChanged',
            {
                appointment: updatedAppointment,
                actorUserId: data.actorUserId,
                previousStatus: appointment.status,
            },
        );

        return updatedAppointment;
    }

    private buildAppointmentRange(scheduledAt: Date, durationMinutes: number): AppointmentTimeRange {
        return {
            scheduledAt,
            endAt: addMinutes(scheduledAt, durationMinutes),
        };
    }

    private async getActiveService(serviceCatalogId: string) {
        const service = await this.appointmentRepository.findServiceById(serviceCatalogId);

        if (!service || !service.isActive || !service.department.isActive) {
            throw new AppError('Service not found or inactive', 404);
        }

        return service;
    }

    private async ensureStaffCanServeDepartment(staffProfileId: string, departmentId: string) {
        const staff = await this.appointmentRepository.findStaffById(staffProfileId);

        if (!staff || staff.employmentStatus !== 'ACTIVE') {
            throw new AppError('Staff profile not found or inactive', 404);
        }

        const servesDepartment = staff.departments.some(
            (assignment) =>
                assignment.departmentId === departmentId &&
                assignment.unassignedAt === null &&
                assignment.department.isActive,
        );

        if (!servesDepartment) {
            throw new AppError('Staff profile is not assigned to this department', 400);
        }
    }

    private async ensureSlotIsAvailable(input: {
        staffProfileId: string;
        serviceCatalogId: string;
        scheduledAt: Date;
        endAt: Date;
    }) {
        const availableSlots = await this.scheduleService.getAvailableSlots({
            staffProfileId: input.staffProfileId,
            serviceId: input.serviceCatalogId,
            date: toDateOnly(input.scheduledAt),
        });
        const startIso = input.scheduledAt.toISOString();
        const endIso = input.endAt.toISOString();
        const isAvailable = availableSlots.slots.some(
            (slot) => slot.start === startIso && slot.end === endIso,
        );

        if (!isAvailable) {
            throw new AppError('Appointment slot is not available', 409);
        }
    }

    private async ensureNoAppointmentConflict(input: {
        staffProfileId: string;
        scheduledAt: Date;
        endAt: Date;
        excludeAppointmentId?: string;
    }) {
        const conflicts = await this.appointmentRepository.countConflictingAppointments(input);

        if (conflicts > 0) {
            throw new AppError('Appointment slot is already booked', 409);
        }
    }

    private async releaseSlotLockSafely(
        staffProfileId: string,
        scheduledAt: Date,
        token: string,
    ) {
        try {
            await this.slotLockRepository.releaseSlotLock({
                staffProfileId,
                scheduledAt,
                token,
            });
        } catch {
            // Lock cleanup should not hide the actual booking/reschedule result.
        }
    }

    private async publishSafely(
        type: Parameters<AppointmentEventPublisher['publish']>[0],
        payload: Parameters<AppointmentEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {
            // Notification wiring is best-effort until the notification service owns delivery.
        }
    }
}
