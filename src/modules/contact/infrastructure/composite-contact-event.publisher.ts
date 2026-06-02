import {
    ContactEventPayload,
    ContactEventPublisher,
    ContactEventType,
} from '../domain/contact-event.publisher';

export class CompositeContactEventPublisher implements ContactEventPublisher {
    constructor(private readonly publishers: ContactEventPublisher[]) {}

    async publish(
        type: ContactEventType,
        payload: ContactEventPayload,
    ): Promise<void> {
        await Promise.all(
            this.publishers.map((publisher) => publisher.publish(type, payload)),
        );
    }
}
