import {
    PharmacyEventPayload,
    PharmacyEventPublisher,
    PharmacyEventType,
} from '../domain/pharmacy-event.publisher';

export class NoopPharmacyEventPublisher implements PharmacyEventPublisher {
    async publish(
        _type: PharmacyEventType,
        _payload: PharmacyEventPayload,
    ): Promise<void> {
        return undefined;
    }
}
