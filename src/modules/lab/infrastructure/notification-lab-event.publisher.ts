import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    LabEventPayload,
    LabEventPublisher,
    LabEventType,
} from '../domain/lab-event.publisher';
import { LabOrderView } from '../domain/lab.entity';

function orderTests(order: LabOrderView) {
    return order.items.map((item) => item.labTest.name).join(', ');
}

export class NotificationLabEventPublisher implements LabEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(type: LabEventType, payload: LabEventPayload): Promise<void> {
        const notifications = this.buildNotifications(type, payload.order);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: LabEventType,
        order: LabOrderView,
    ): SendNotificationPayload[] {
        if (type === 'LabOrderCompleted') {
            const doctorNotification: SendNotificationPayload = {
                userId: order.orderedByStaff.userId,
                type: 'lab.results.completed',
                title: 'Lab results ready for review',
                message: `Lab results for ${order.patient.name} are ready for doctor review: ${orderTests(order)}.`,
                link: `/doctor/lab-reviews/${order.id}`,
                channels: ['in_app'],
            };

            const patientNotification: SendNotificationPayload[] = order.patient.userId
                ? [
                    {
                        userId: order.patient.userId,
                        type: 'lab.results.ready',
                        title: 'Lab results ready',
                        message: `Your lab results are ready to view: ${orderTests(order)}.`,
                        link: '/patient/lab-results',
                        channels: ['in_app', 'email'],
                        recipientEmail: order.patient.email,
                    },
                ]
                : [];

            return [
                doctorNotification,
                ...patientNotification,
            ];
        }

        if (type === 'LabOrderReviewed' && order.patient.userId) {
            return [
                {
                    userId: order.patient.userId,
                    type: 'lab.results.reviewed',
                    title: 'Lab results reviewed',
                    message: `Your lab results were reviewed by your doctor: ${orderTests(order)}.`,
                    link: '/patient/lab-results',
                    channels: ['in_app', 'email'],
                    recipientEmail: order.patient.email,
                },
            ];
        }

        return [];
    }
}
