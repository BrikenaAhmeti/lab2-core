import { Command } from '../../../../shared/core/buses/command-bus';
import { ContactMessageStatus } from '../../domain/contact.entity';

export class UpdateContactMessageStatusCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly status: ContactMessageStatus,
        public readonly replyNotes?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
