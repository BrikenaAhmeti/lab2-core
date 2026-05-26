import { AppointmentStatus } from '../../../generated/prisma';

export type FeedbackStatus = 'pending' | 'published' | 'hidden';

export interface FeedbackPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface FeedbackStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface FeedbackDepartmentSummary {
    id: string;
    name: string;
}

export interface FeedbackAppointmentSummary {
    id: string;
    patientId: string;
    departmentId: string;
    staffProfileId: string | null;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
    completedAt: Date | null;
    service: {
        id: string;
        name: string;
    };
    staff: FeedbackStaffSummary | null;
    department: FeedbackDepartmentSummary;
}

export interface FeedbackView {
    id: string;
    patientId: string;
    appointmentId: string | null;
    rating: number;
    comment: string | null;
    status: FeedbackStatus;
    isAnonymous: boolean;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    patient: FeedbackPatientSummary;
    appointment: FeedbackAppointmentSummary | null;
}

export interface FeedbackListResult {
    items: FeedbackView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
