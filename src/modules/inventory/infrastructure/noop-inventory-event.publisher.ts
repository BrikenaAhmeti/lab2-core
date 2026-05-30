import {
    InventoryEventPayload,
    InventoryEventPublisher,
    InventoryEventType,
} from '../domain/inventory-event.publisher';

export class NoopInventoryEventPublisher implements InventoryEventPublisher {
    async publish(
        _type: InventoryEventType,
        _payload: InventoryEventPayload,
    ): Promise<void> {
        return undefined;
    }
}
