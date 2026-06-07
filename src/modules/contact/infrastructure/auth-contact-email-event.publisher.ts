import {
    ContactEventPayload,
    ContactEventPublisher,
    ContactEventType,
} from '../domain/contact-event.publisher';
import {
    AuthContactEmailClient,
    ContactEmailClient,
} from './auth-contact-email.client';

export class AuthContactEmailEventPublisher implements ContactEventPublisher {
    constructor(
        private readonly client: ContactEmailClient = new AuthContactEmailClient(),
    ) {}

    async publish(
        type: ContactEventType,
        payload: ContactEventPayload,
    ): Promise<void> {
        if (type !== 'ContactMessageSubmitted') {
            if (type === 'ContactMessageReplied' && payload.replyText) {
                await this.client.sendReply({
                    name: payload.message.name,
                    email: payload.message.email,
                    subject: payload.message.subject,
                    replyText: payload.replyText,
                });
            }

            return;
        }

        await this.client.sendAcknowledgement({
            name: payload.message.name,
            email: payload.message.email,
            subject: payload.message.subject,
        });
    }
}
