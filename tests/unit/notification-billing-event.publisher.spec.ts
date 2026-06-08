import {
    AppointmentStatus,
    BillingStatus,
} from '../../src/generated/prisma';
import { BillingView } from '../../src/modules/billing/domain/billing.entity';
import { NotificationBillingEventPublisher } from '../../src/modules/billing/infrastructure/notification-billing-event.publisher';
import { NotificationClient } from '../../src/shared/notifications/notification-client';

const patientUserId = 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057';

const billing: BillingView = {
    id: 'b14d4f97-281c-41b5-b6f4-215c4c620878',
    patientId: '35974dde-783f-43a1-bcab-117d754f81e1',
    appointmentId: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
    billingNumber: 'BILL-20260521-E61720AB',
    status: BillingStatus.PENDING,
    subtotal: 80,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 80,
    amountPaid: 0,
    outstandingAmount: 80,
    dueDate: new Date('2026-06-04T12:00:00.000Z'),
    issuedAt: new Date('2026-05-21T12:00:00.000Z'),
    paidAt: null,
    notes: null,
    createdAt: new Date('2026-05-21T12:00:00.000Z'),
    updatedAt: new Date('2026-05-21T12:00:00.000Z'),
    patient: {
        id: '35974dde-783f-43a1-bcab-117d754f81e1',
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        name: 'Ada Lovelace',
    },
    appointment: {
        id: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
        status: AppointmentStatus.COMPLETED,
        scheduledAt: new Date('2026-05-21T09:00:00.000Z'),
        endAt: new Date('2026-05-21T09:30:00.000Z'),
        service: {
            id: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
            name: 'Initial Consultation',
        },
    },
    items: [],
    payments: [],
};

function createPublisher() {
    const notificationClient: jest.Mocked<NotificationClient> = {
        send: jest.fn().mockResolvedValue(undefined),
    };

    return {
        notificationClient,
        publisher: new NotificationBillingEventPublisher(notificationClient),
    };
}

describe('NotificationBillingEventPublisher', () => {
    it('sends billing payment reminders to patients with email enabled', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('BillingCreated', { billing });

        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'billing.payment_reminder',
                channels: ['in_app', 'email'],
                recipientEmail: 'ada@medsphere.local',
                link: '/patient/billing',
            }),
        );
    });

    it('sends paid invoice notifications to patients with email enabled', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('BillingPaid', {
            billing: {
                ...billing,
                status: BillingStatus.PAID,
                amountPaid: 80,
                outstandingAmount: 0,
                paidAt: new Date('2026-05-21T12:30:00.000Z'),
            },
        });

        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'billing.invoice_paid',
                channels: ['in_app', 'email'],
                recipientEmail: 'ada@medsphere.local',
                link: '/patient/billing',
            }),
        );
    });
});
