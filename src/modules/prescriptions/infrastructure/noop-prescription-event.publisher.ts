import {
    PrescriptionEventPayload,
    PrescriptionEventPublisher,
    PrescriptionEventType,
} from '../domain/prescription-event.publisher';

export class NoopPrescriptionEventPublisher implements PrescriptionEventPublisher {
    async publish(
        _type: PrescriptionEventType,
        _payload: PrescriptionEventPayload,
    ): Promise<void> {
        return undefined;
    }
}
