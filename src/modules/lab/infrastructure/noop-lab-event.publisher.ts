import {
    LabEventPayload,
    LabEventPublisher,
    LabEventType,
} from '../domain/lab-event.publisher';

export class NoopLabEventPublisher implements LabEventPublisher {
    async publish(_type: LabEventType, _payload: LabEventPayload): Promise<void> {
        return undefined;
    }
}
