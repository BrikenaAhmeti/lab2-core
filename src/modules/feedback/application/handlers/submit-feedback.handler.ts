import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { FeedbackView } from '../../domain/feedback.entity';
import { FeedbackService } from '../../services/feedback.service';
import { SubmitFeedbackCommand } from '../commands/submit-feedback.command';

export class SubmitFeedbackHandler
    implements CommandHandler<SubmitFeedbackCommand, FeedbackView>
{
    constructor(private readonly service: FeedbackService) {}

    execute(command: SubmitFeedbackCommand) {
        return this.service.submitFeedback({
            appointmentId: command.appointmentId,
            rating: command.rating,
            comment: command.comment,
            isAnonymous: command.isAnonymous,
            actorUserId: command.actorUserId,
        });
    }
}
