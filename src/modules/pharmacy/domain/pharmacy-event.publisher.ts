import {
    PharmacyOutOfStockItem,
    PharmacyQueueView,
} from './pharmacy.entity';

export type PharmacyEventType = 'MedicationOutOfStock' | 'PrescriptionFulfilled';

export interface PharmacyEventPayload {
    queue: PharmacyQueueView;
    outOfStockItems?: PharmacyOutOfStockItem[];
    actorUserId?: string;
}

export interface PharmacyEventPublisher {
    publish(type: PharmacyEventType, payload: PharmacyEventPayload): Promise<void>;
}
