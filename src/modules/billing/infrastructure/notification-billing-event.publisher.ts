import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    BillingEventPayload,
    BillingEventPublisher,
    BillingEventType,
} from '../domain/billing-event.publisher';
import { BillingView } from '../domain/billing.entity';

function formatDate(value: Date | null) {
    return value ? value.toISOString().slice(0, 10) : 'the due date';
}

function formatAmount(value: number) {
    return `EUR ${Number(value).toFixed(2)}`;
}

function billingLink() {
    return '/patient/billing';
}

export class NotificationBillingEventPublisher implements BillingEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(type: BillingEventType, payload: BillingEventPayload): Promise<void> {
        const notification = this.buildNotification(type, payload.billing);

        if (!notification) {
            return;
        }

        await this.notificationClient.send(notification);
    }

    private buildNotification(
        type: BillingEventType,
        billing: BillingView,
    ): SendNotificationPayload | null {
        if (!billing.patient.userId) {
            return null;
        }

        if (type === 'BillingCreated') {
            return {
                userId: billing.patient.userId,
                type: 'billing.payment_reminder',
                title: 'Billing reminder',
                message: `Payment reminder for invoice ${billing.billingNumber}: ${formatAmount(
                    billing.outstandingAmount,
                )} is due by ${formatDate(billing.dueDate)}.`,
                link: billingLink(),
                channels: ['in_app', 'email'],
                recipientEmail: billing.patient.email,
                dedupeByTypeAndLink: true,
            };
        }

        if (type === 'BillingPaid') {
            return {
                userId: billing.patient.userId,
                type: 'billing.invoice_paid',
                title: 'Invoice paid',
                message: `Invoice ${billing.billingNumber} has been marked as paid. Your paid invoice is available in your portal.`,
                link: billingLink(),
                channels: ['in_app', 'email'],
                recipientEmail: billing.patient.email,
                dedupeByTypeAndLink: true,
            };
        }

        return null;
    }
}
