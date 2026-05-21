import { LabOrderView } from './lab.entity';

export type LabEventType =
    | 'LabOrderCreated'
    | 'LabOrderCompleted'
    | 'LabOrderReviewed';

export interface LabEventPayload {
    order: LabOrderView;
    actorUserId?: string;
}

export interface LabEventPublisher {
    publish(type: LabEventType, payload: LabEventPayload): Promise<void>;
}
