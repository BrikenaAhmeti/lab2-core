import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    InventoryEventPayload,
    InventoryEventPublisher,
    InventoryEventType,
} from '../domain/inventory-event.publisher';

export class NotificationInventoryEventPublisher implements InventoryEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(type: InventoryEventType, payload: InventoryEventPayload): Promise<void> {
        const notification = this.buildNotification(type, payload);

        if (!notification) {
            return;
        }

        await this.notificationClient.send(notification);
    }

    private buildNotification(
        type: InventoryEventType,
        payload: InventoryEventPayload,
    ): SendNotificationPayload | null {
        if (!payload.actorUserId) {
            return null;
        }

        const link = `/admin/inventory/items/${payload.item.id}`;

        if (type === 'InventoryCriticalShortage') {
            return {
                userId: payload.actorUserId,
                type: 'inventory.critical_shortage',
                title: 'Critical inventory shortage',
                message: `${payload.item.name} is out of stock.`,
                link,
                channels: ['in_app'],
                dedupeByTypeAndLink: true,
            };
        }

        if (type === 'InventoryLowStock') {
            return {
                userId: payload.actorUserId,
                type: 'inventory.low_stock',
                title: 'Low stock alert',
                message: `${payload.item.name} is below reorder level.`,
                link,
                channels: ['in_app'],
                dedupeByTypeAndLink: true,
            };
        }

        return {
            userId: payload.actorUserId,
            type: 'inventory.expiry_warning',
            title: 'Inventory expiry warning',
            message: `${payload.item.name} is expiring soon.`,
            link,
            channels: ['in_app'],
            dedupeByTypeAndLink: true,
        };
    }
}
