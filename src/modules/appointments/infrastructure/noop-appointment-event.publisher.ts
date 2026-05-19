import {
    AppointmentEventPayload,
    AppointmentEventPublisher,
    AppointmentEventType,
} from '../domain/appointment-event.publisher';

export class NoopAppointmentEventPublisher implements AppointmentEventPublisher {
    async publish(_type: AppointmentEventType, _payload: AppointmentEventPayload): Promise<void> {
        return undefined;
    }
}
