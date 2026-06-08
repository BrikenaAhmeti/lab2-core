import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    PharmacyEventPayload,
    PharmacyEventPublisher,
    PharmacyEventType,
} from '../domain/pharmacy-event.publisher';
import { PharmacyOutOfStockItem, PharmacyQueueView } from '../domain/pharmacy.entity';

function medicationList(items: PharmacyOutOfStockItem[]) {
    return items
        .map((item) => `${item.medicationName} ${item.dosage}`.trim())
        .join(', ');
}

export class NotificationPharmacyEventPublisher implements PharmacyEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(
        type: PharmacyEventType,
        payload: PharmacyEventPayload,
    ): Promise<void> {
        const notifications = this.buildNotifications(type, payload);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: PharmacyEventType,
        payload: PharmacyEventPayload,
    ): SendNotificationPayload[] {
        if (type === 'MedicationOutOfStock') {
            return this.buildOutOfStockNotifications(
                payload.queue,
                payload.outOfStockItems ?? [],
            );
        }

        if (type === 'PrescriptionFulfilled') {
            return this.buildFulfilledNotifications(payload.queue);
        }

        return [];
    }

    private buildOutOfStockNotifications(
        queue: PharmacyQueueView,
        items: PharmacyOutOfStockItem[],
    ): SendNotificationPayload[] {
        if (!items.length) {
            return [];
        }

        const medications = medicationList(items);
        const notifications: SendNotificationPayload[] = [];

        if (queue.patient.userId) {
            notifications.push({
                userId: queue.patient.userId,
                type: 'pharmacy.medication.out_of_stock',
                title: 'Medication out of stock',
                message: `The pharmacy marked medication out of stock for your prescription: ${medications}.`,
                link: '/patient/prescriptions',
                channels: ['in_app', 'email'],
                recipientEmail: queue.patient.email,
            });
        }

        notifications.push({
            userId: queue.prescription.staff.userId,
            type: 'pharmacy.medication.out_of_stock',
            title: 'Medication out of stock',
            message: `${queue.patient.name}'s prescription has out-of-stock medication: ${medications}.`,
            link: '/doctor',
            channels: ['in_app'],
        });

        return notifications;
    }

    private buildFulfilledNotifications(
        queue: PharmacyQueueView,
    ): SendNotificationPayload[] {
        if (!queue.patient.userId) {
            return [];
        }

        return [
            {
                userId: queue.patient.userId,
                type: 'pharmacy.prescription.fulfilled',
                title: 'Prescription ready for pickup',
                message: 'Your prescription has been fulfilled by the pharmacy.',
                link: '/patient/prescriptions',
                channels: ['in_app', 'email'],
                recipientEmail: queue.patient.email,
            },
        ];
    }
}
