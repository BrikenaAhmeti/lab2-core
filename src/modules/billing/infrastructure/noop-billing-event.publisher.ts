import {
    BillingEventPayload,
    BillingEventPublisher,
    BillingEventType,
} from '../domain/billing-event.publisher';

export class NoopBillingEventPublisher implements BillingEventPublisher {
    async publish(_type: BillingEventType, _payload: BillingEventPayload): Promise<void> {
        return undefined;
    }
}
