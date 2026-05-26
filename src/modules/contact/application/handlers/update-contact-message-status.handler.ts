import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ContactMessageView } from '../../domain/contact.entity';
import { ContactService } from '../../services/contact.service';
import { UpdateContactMessageStatusCommand } from '../commands/update-contact-message-status.command';

export class UpdateContactMessageStatusHandler
    implements CommandHandler<UpdateContactMessageStatusCommand, ContactMessageView>
{
    constructor(private readonly service: ContactService) {}

    execute(command: UpdateContactMessageStatusCommand) {
        return this.service.updateMessageStatus(command.id, {
            status: command.status,
            replyNotes: command.replyNotes,
            actorUserId: command.actorUserId,
        });
    }
}
