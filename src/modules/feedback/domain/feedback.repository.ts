import {
    FeedbackAppointmentSummary,
    FeedbackListResult,
    FeedbackPatientSummary,
    FeedbackStaffSummary,
    FeedbackStatus,
    FeedbackView,
} from './feedback.entity';

export interface CreateFeedbackData {
    patientId: string;
    appointmentId: string;
    rating: number;
    comment?: string | null;
    status: FeedbackStatus;
    isAnonymous: boolean;
    submittedAt: Date;
    actorUserId?: string;
}

export interface ListFeedbackFilters {
    page: number;
    limit: number;
    staffProfileId?: string;
    departmentId?: string;
    status?: FeedbackStatus;
}

export interface ListPatientFeedbackFilters {
    page: number;
    limit: number;
    patientId: string;
}

export interface UpdateFeedbackStatusData {
    status: FeedbackStatus;
    actorUserId?: string;
}

export interface FeedbackRepository {
    findPatientByUserId(userId: string): Promise<FeedbackPatientSummary | null>;
    findStaffByUserId(userId: string): Promise<FeedbackStaffSummary | null>;
    findCompletedAppointmentForFeedback(
        appointmentId: string,
    ): Promise<FeedbackAppointmentSummary | null>;
    findFeedbackByAppointmentId(appointmentId: string): Promise<FeedbackView | null>;
    findFeedbackById(id: string): Promise<FeedbackView | null>;
    createFeedback(data: CreateFeedbackData): Promise<FeedbackView>;
    listFeedback(filters: ListFeedbackFilters): Promise<FeedbackListResult>;
    listPatientFeedback(
        filters: ListPatientFeedbackFilters,
    ): Promise<FeedbackListResult>;
    updateFeedbackStatus(
        id: string,
        data: UpdateFeedbackStatusData,
    ): Promise<FeedbackView>;
}
