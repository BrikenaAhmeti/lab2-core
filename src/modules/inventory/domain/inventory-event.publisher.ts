import { InventoryAlertType, InventoryItemEntity } from './inventory.entity';

export type InventoryEventType = 'InventoryLowStock' | 'InventoryCriticalShortage' | 'InventoryExpiryWarning';

export interface InventoryEventPayload {
    item: InventoryItemEntity;
    alertType: InventoryAlertType;
    actorUserId?: string;
}

export interface InventoryEventPublisher {
    publish(type: InventoryEventType, payload: InventoryEventPayload): Promise<void>;
}
