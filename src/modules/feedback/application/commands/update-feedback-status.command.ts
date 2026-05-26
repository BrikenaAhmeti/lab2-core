import { Command } from '../../../../shared/core/buses/command-bus';
import { FeedbackStatus } from '../../domain/feedback.entity';

export class UpdateFeedbackStatusCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly status: FeedbackStatus,
        public readonly actorUserId?: string,
    ) {}
}
