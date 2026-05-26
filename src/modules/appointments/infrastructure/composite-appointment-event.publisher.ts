import {
    AppointmentEventPayload,
    AppointmentEventPublisher,
    AppointmentEventType,
} from '../domain/appointment-event.publisher';

export class CompositeAppointmentEventPublisher implements AppointmentEventPublisher {
    constructor(private readonly publishers: AppointmentEventPublisher[]) {}

    async publish(
        type: AppointmentEventType,
        payload: AppointmentEventPayload,
    ): Promise<void> {
        await Promise.all(
            this.publishers.map((publisher) => publisher.publish(type, payload)),
        );
    }
}
