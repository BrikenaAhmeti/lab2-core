import { AppError } from '../../../shared/core/errors/app-error';
import { ContactEventPublisher } from '../domain/contact-event.publisher';
import { ContactMessageStatus } from '../domain/contact.entity';
import {
    normalizeOptionalText,
    normalizeRequiredText,
} from '../domain/contact.normalizer';
import {
    ContactRepository,
    ListContactMessagesFilters,
} from '../domain/contact.repository';

export class ContactService {
    constructor(
        private readonly contactRepository: ContactRepository,
        private readonly eventPublisher: ContactEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async submitContactMessage(data: {
        name: string;
        email: string;
        phone?: string | null;
        subject: string;
        message: string;
    }) {
        const message = await this.contactRepository.createMessage({
            name: normalizeRequiredText(data.name),
            email: normalizeRequiredText(data.email).toLowerCase(),
            phone: normalizeOptionalText(data.phone),
            subject: normalizeRequiredText(data.subject),
            message: normalizeRequiredText(data.message),
        });
        const adminUserIds =
            await this.contactRepository.findAdminNotificationUserIds();

        await this.publishSafely('ContactMessageSubmitted', {
            message,
            adminUserIds,
        });

        return message;
    }

    async listMessages(filters: ListContactMessagesFilters) {
        return this.contactRepository.listMessages(filters);
    }

    async updateMessageStatus(
        id: string,
        data: {
            status: ContactMessageStatus;
            replyNotes?: string | null;
            actorUserId?: string;
        },
    ) {
        const existing = await this.contactRepository.findMessageById(id);

        if (!existing) {
            throw new AppError('Contact message not found', 404);
        }

        const replyNotes =
            data.replyNotes !== undefined
                ? normalizeOptionalText(data.replyNotes)
                : undefined;

        if (
            data.status === 'replied' &&
            !replyNotes &&
            !existing.replyNotes
        ) {
            throw new AppError('Reply notes are required when marking as replied', 400);
        }

        return this.contactRepository.updateMessageStatus(id, {
            status: data.status,
            replyNotes,
            repliedAt:
                data.status === 'replied'
                    ? existing.repliedAt ?? this.nowProvider()
                    : null,
            actorUserId: data.actorUserId,
        });
    }

    private async publishSafely(
        type: Parameters<ContactEventPublisher['publish']>[0],
        payload: Parameters<ContactEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {
            // Contact intake should not fail when notification delivery is down.
        }
    }
}
