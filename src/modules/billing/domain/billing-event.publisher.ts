import { BillingView } from './billing.entity';

export type BillingEventType =
    | 'BillingCreated'
    | 'BillingPaid';

export interface BillingEventPayload {
    billing: BillingView;
    actorUserId?: string;
}

export interface BillingEventPublisher {
    publish(type: BillingEventType, payload: BillingEventPayload): Promise<void>;
}
