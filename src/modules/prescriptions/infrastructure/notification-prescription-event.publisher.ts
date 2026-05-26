import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    PrescriptionEventPayload,
    PrescriptionEventPublisher,
    PrescriptionEventType,
} from '../domain/prescription-event.publisher';
import { PrescriptionView } from '../domain/prescription.entity';

function medicationList(prescription: PrescriptionView) {
    return prescription.items.map((item) => item.medicationName).join(', ');
}

export class NotificationPrescriptionEventPublisher implements PrescriptionEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(
        type: PrescriptionEventType,
        payload: PrescriptionEventPayload,
    ): Promise<void> {
        const notifications = this.buildNotifications(type, payload.prescription);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: PrescriptionEventType,
        prescription: PrescriptionView,
    ): SendNotificationPayload[] {
        if (type !== 'PrescriptionCreated' || !prescription.patient.userId) {
            return [];
        }

        return [
            {
                userId: prescription.patient.userId,
                type: 'prescription.created',
                title: 'New prescription created',
                message: `A new prescription is available: ${medicationList(prescription)}.`,
                link: `/patient/prescriptions/${prescription.id}`,
                channels: ['in_app'],
            },
        ];
    }
}
