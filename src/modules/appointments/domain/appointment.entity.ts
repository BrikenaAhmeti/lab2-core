import { AppointmentStatus, AppointmentType } from '../../../generated/prisma';

export interface AppointmentPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface AppointmentStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface AppointmentDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface AppointmentServiceSummary {
    id: string;
    departmentId: string;
    name: string;
    defaultDurationMinutes: number;
    defaultPrice: number;
    isActive: boolean;
    department: AppointmentDepartmentSummary;
}

export interface AppointmentStaffAvailabilitySummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    employmentStatus: string;
    departments: Array<{
        departmentId: string;
        unassignedAt: Date | null;
        department: AppointmentDepartmentSummary;
    }>;
}

export interface AppointmentView {
    id: string;
    patientId: string;
    departmentId: string;
    serviceCatalogId: string;
    staffProfileId: string | null;
    status: AppointmentStatus;
    appointmentType: AppointmentType;
    scheduledAt: Date;
    endAt: Date;
    durationMinutes: number;
    basePrice: number;
    notes: string | null;
    checkedInAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    cancellationNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    patient: AppointmentPatientSummary;
    staff: AppointmentStaffSummary | null;
    service: {
        id: string;
        name: string;
        defaultDurationMinutes: number;
        defaultPrice: number;
    };
    department: AppointmentDepartmentSummary;
}

export interface AppointmentListResult {
    items: AppointmentView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AppointmentTimeRange {
    scheduledAt: Date;
    endAt: Date;
}
