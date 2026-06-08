import { Query } from '../../../../shared/core/buses/query-bus';
import { FeedbackStatus } from '../../domain/feedback.entity';

export class ListFeedbackQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly staffProfileId?: string,
        public readonly departmentId?: string,
        public readonly status?: FeedbackStatus,
        public readonly patientSearch?: string,
        public readonly appointmentSearch?: string,
        public readonly submittedAtFrom?: Date,
        public readonly submittedAtTo?: Date,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
