import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { FeedbackView } from '../../domain/feedback.entity';
import { FeedbackService } from '../../services/feedback.service';
import { UpdateFeedbackStatusCommand } from '../commands/update-feedback-status.command';

export class UpdateFeedbackStatusHandler
    implements CommandHandler<UpdateFeedbackStatusCommand, FeedbackView>
{
    constructor(private readonly service: FeedbackService) {}

    execute(command: UpdateFeedbackStatusCommand) {
        return this.service.updateFeedbackStatus(command.id, {
            status: command.status,
            actorUserId: command.actorUserId,
        });
    }
}
