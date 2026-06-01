import { AppointmentStatus, AppointmentType } from '../../../generated/prisma';
import {
    AppointmentListResult,
    AppointmentPatientSummary,
    AppointmentServiceSummary,
    AppointmentStaffAvailabilitySummary,
    AppointmentView,
} from './appointment.entity';

export interface CreateAppointmentData {
    patientId: string;
    departmentId: string;
    serviceCatalogId: string;
    staffProfileId: string;
    status?: AppointmentStatus;
    appointmentType: AppointmentType;
    scheduledAt: Date;
    endAt: Date;
    durationMinutes: number;
    basePrice: number;
    notes?: string | null;
    actorUserId?: string;
}

export interface ListAppointmentsFilters {
    page: number;
    limit: number;
    date?: Date;
    from?: Date;
    to?: Date;
    staffId?: string;
    patientId?: string;
    departmentId?: string;
    status?: AppointmentStatus;
    hasNoFeedback?: boolean;
}

export interface RescheduleAppointmentData {
    departmentId: string;
    serviceCatalogId: string;
    staffProfileId: string;
    scheduledAt: Date;
    endAt: Date;
    durationMinutes: number;
    basePrice: number;
    appointmentType?: AppointmentType;
    notes?: string | null;
    actorUserId?: string;
}

export interface UpdateAppointmentStatusData {
    status: AppointmentStatus;
    checkedInAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
    cancellationNote?: string | null;
    actorUserId?: string;
}

export interface AppointmentConflictFilters {
    staffProfileId: string;
    scheduledAt: Date;
    endAt: Date;
    excludeAppointmentId?: string;
}

export interface AppointmentReminderFilters {
    from: Date;
    to: Date;
}

export interface AppointmentRepository {
    create(data: CreateAppointmentData): Promise<AppointmentView>;
    findById(id: string): Promise<AppointmentView | null>;
    findPatientById(id: string): Promise<AppointmentPatientSummary | null>;
    findPatientByUserId(userId: string): Promise<AppointmentPatientSummary | null>;
    findPatientByIdOrUserId(id: string): Promise<AppointmentPatientSummary | null>;
    findServiceById(id: string): Promise<AppointmentServiceSummary | null>;
    findDefaultServiceForStaff(staffProfileId: string): Promise<AppointmentServiceSummary | null>;
    findStaffById(id: string): Promise<AppointmentStaffAvailabilitySummary | null>;
    findStaffByIdOrUserId(id: string): Promise<AppointmentStaffAvailabilitySummary | null>;
    countConflictingAppointments(filters: AppointmentConflictFilters): Promise<number>;
    listReminderCandidates(filters: AppointmentReminderFilters): Promise<AppointmentView[]>;
    list(filters: ListAppointmentsFilters): Promise<AppointmentListResult>;
    listToday(now: Date): Promise<AppointmentView[]>;
    reschedule(id: string, data: RescheduleAppointmentData): Promise<AppointmentView>;
    updateStatus(id: string, data: UpdateAppointmentStatusData): Promise<AppointmentView>;
}
