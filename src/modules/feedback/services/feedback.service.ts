import { AppError } from '../../../shared/core/errors/app-error';
import { FeedbackEventPublisher } from '../domain/feedback-event.publisher';
import { FeedbackStatus } from '../domain/feedback.entity';
import {
    normalizeOptionalText,
    normalizeRating,
} from '../domain/feedback.normalizer';
import {
    FeedbackRepository,
    ListFeedbackFilters,
} from '../domain/feedback.repository';

export class FeedbackService {
    constructor(
        private readonly feedbackRepository: FeedbackRepository,
        private readonly eventPublisher: FeedbackEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async submitFeedback(data: {
        appointmentId: string;
        rating: number;
        comment?: string | null;
        isAnonymous?: boolean;
        actorUserId?: string;
    }) {
        if (!data.actorUserId) {
            throw new AppError('Patient user is required', 400);
        }

        const patient = await this.feedbackRepository.findPatientByUserId(
            data.actorUserId,
        );

        if (!patient) {
            throw new AppError('Patient profile not found', 404);
        }

        const appointment =
            await this.feedbackRepository.findCompletedAppointmentForFeedback(
                data.appointmentId,
            );

        if (!appointment) {
            throw new AppError('Completed appointment not found', 404);
        }

        if (appointment.patientId !== patient.id) {
            throw new AppError('Forbidden', 403);
        }

        const existing = await this.feedbackRepository.findFeedbackByAppointmentId(
            data.appointmentId,
        );

        if (existing) {
            throw new AppError('Feedback already submitted for this appointment', 409);
        }

        const feedback = await this.feedbackRepository.createFeedback({
            patientId: patient.id,
            appointmentId: appointment.id,
            rating: normalizeRating(data.rating),
            comment: normalizeOptionalText(data.comment),
            status: 'pending',
            isAnonymous: data.isAnonymous ?? false,
            submittedAt: this.nowProvider(),
            actorUserId: data.actorUserId,
        });

        await this.publishSafely('FeedbackSubmitted', {
            feedback,
            actorUserId: data.actorUserId,
        });

        return feedback;
    }

    async listFeedback(
        filters: ListFeedbackFilters,
        actorUserId?: string,
        canReadAll = false,
    ) {
        if (
            filters.submittedAtFrom &&
            filters.submittedAtTo &&
            filters.submittedAtFrom >= filters.submittedAtTo
        ) {
            throw new AppError('Submitted date range is invalid', 400);
        }

        const scopedFilters = await this.applyStaffScope(
            filters,
            actorUserId,
            canReadAll,
        );

        return this.feedbackRepository.listFeedback(scopedFilters);
    }

    async listMyFeedback(
        filters: {
            page: number;
            limit: number;
        },
        actorUserId?: string,
    ) {
        if (!actorUserId) {
            throw new AppError('Patient user is required', 400);
        }

        const patient = await this.feedbackRepository.findPatientByUserId(
            actorUserId,
        );

        if (!patient) {
            return {
                items: [],
                meta: {
                    page: filters.page,
                    limit: filters.limit,
                    total: 0,
                    totalPages: 0,
                },
            };
        }

        return this.feedbackRepository.listPatientFeedback({
            ...filters,
            patientId: patient.id,
        });
    }

    async updateFeedbackStatus(
        id: string,
        data: {
            status: FeedbackStatus;
            actorUserId?: string;
        },
    ) {
        const feedback = await this.feedbackRepository.findFeedbackById(id);

        if (!feedback) {
            throw new AppError('Feedback not found', 404);
        }

        if (feedback.status === data.status) {
            return feedback;
        }

        return this.feedbackRepository.updateFeedbackStatus(id, {
            status: data.status,
            actorUserId: data.actorUserId,
        });
    }

    private async applyStaffScope(
        filters: ListFeedbackFilters,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return filters;
        }

        if (!actorUserId) {
            throw new AppError('Forbidden', 403);
        }

        const staff = await this.feedbackRepository.findStaffByUserId(actorUserId);

        if (!staff) {
            throw new AppError('Forbidden', 403);
        }

        if (filters.staffProfileId && filters.staffProfileId !== staff.id) {
            throw new AppError('Forbidden', 403);
        }

        return {
            ...filters,
            staffProfileId: staff.id,
        };
    }

    private async publishSafely(
        type: Parameters<FeedbackEventPublisher['publish']>[0],
        payload: Parameters<FeedbackEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {
            // Feedback should be saved even if notification delivery is unavailable.
        }
    }
}
