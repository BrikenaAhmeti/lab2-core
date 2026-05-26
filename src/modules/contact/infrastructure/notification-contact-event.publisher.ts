import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    ContactEventPayload,
    ContactEventPublisher,
    ContactEventType,
} from '../domain/contact-event.publisher';
import { ContactMessageView } from '../domain/contact.entity';

export class NotificationContactEventPublisher implements ContactEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(
        type: ContactEventType,
        payload: ContactEventPayload,
    ): Promise<void> {
        const notifications = this.buildNotifications(type, payload);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: ContactEventType,
        payload: ContactEventPayload,
    ): SendNotificationPayload[] {
        if (type !== 'ContactMessageSubmitted') {
            return [];
        }

        return [...new Set(payload.adminUserIds)].map((userId) =>
            this.toAdminNotification(userId, payload.message),
        );
    }

    private toAdminNotification(
        userId: string,
        message: ContactMessageView,
    ): SendNotificationPayload {
        return {
            userId,
            type: 'contact.submitted',
            title: 'New contact message',
            message: `${message.name} sent a contact message: ${message.subject}.`,
            link: `/admin/contact/${message.id}`,
            channels: ['in_app'],
        };
    }
}
