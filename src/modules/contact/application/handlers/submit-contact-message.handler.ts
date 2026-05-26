import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ContactMessageView } from '../../domain/contact.entity';
import { ContactService } from '../../services/contact.service';
import { SubmitContactMessageCommand } from '../commands/submit-contact-message.command';

export class SubmitContactMessageHandler
    implements CommandHandler<SubmitContactMessageCommand, ContactMessageView>
{
    constructor(private readonly service: ContactService) {}

    execute(command: SubmitContactMessageCommand) {
        return this.service.submitContactMessage({
            name: command.name,
            email: command.email,
            phone: command.phone,
            subject: command.subject,
            message: command.message,
        });
    }
}
