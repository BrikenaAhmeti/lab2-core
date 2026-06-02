import {
    ContactEventPayload,
    ContactEventPublisher,
    ContactEventType,
} from '../domain/contact-event.publisher';
import {
    AuthContactEmailClient,
    ContactAcknowledgementEmailClient,
} from './auth-contact-email.client';

export class AuthContactEmailEventPublisher implements ContactEventPublisher {
    constructor(
        private readonly client: ContactAcknowledgementEmailClient = new AuthContactEmailClient(),
    ) {}

    async publish(
        type: ContactEventType,
        payload: ContactEventPayload,
    ): Promise<void> {
        if (type !== 'ContactMessageSubmitted') {
            return;
        }

        await this.client.send({
            name: payload.message.name,
            email: payload.message.email,
            subject: payload.message.subject,
        });
    }
}
