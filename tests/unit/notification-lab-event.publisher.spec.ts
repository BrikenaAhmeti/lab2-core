import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../src/generated/prisma';
import { LabOrderView } from '../../src/modules/lab/domain/lab.entity';
import { NotificationLabEventPublisher } from '../../src/modules/lab/infrastructure/notification-lab-event.publisher';
import { NotificationClient } from '../../src/shared/notifications/notification-client';

const patientUserId = 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057';
const doctorUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';

const order: LabOrderView = {
    id: '0f79fa2f-2db3-4819-9c81-f0e51daeed51',
    patientId: '35974dde-783f-43a1-bcab-117d754f81e1',
    appointmentId: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
    medicalRecordId: null,
    orderedByStaffId: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    status: LabOrderStatus.COMPLETED,
    priority: 'urgent',
    notes: null,
    orderedAt: new Date('2026-05-21T08:10:00.000Z'),
    collectedAt: null,
    completedAt: new Date('2026-05-21T10:30:00.000Z'),
    reviewedAt: null,
    createdAt: new Date('2026-05-21T08:10:00.000Z'),
    updatedAt: new Date('2026-05-21T10:30:00.000Z'),
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
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
        endAt: new Date('2030-01-02T09:30:00.000Z'),
    },
    medicalRecord: null,
    orderedByStaff: {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        userId: doctorUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    department: {
        id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Cardiology',
        isActive: true,
    },
    items: [
        {
            id: '22c52439-b31f-4de8-9b0e-80dd54e47561',
            labTestId: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
            resultValue: '95',
            resultUnit: 'mg/dL',
            resultNotes: null,
            resultStatus: LabResultStatus.ENTERED,
            isCritical: false,
            completedAt: new Date('2026-05-21T10:00:00.000Z'),
            flag: 'normal',
            labTest: {
                id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
                code: 'GLU',
                name: 'Glucose',
                description: null,
                category: 'Chemistry',
                sampleType: 'Blood',
                defaultPrice: '15.00',
                referenceRange: '70-99 mg/dL',
                isActive: true,
            },
        },
    ],
};

function createPublisher() {
    const notificationClient: jest.Mocked<NotificationClient> = {
        send: jest.fn().mockResolvedValue(undefined),
    };

    return {
        notificationClient,
        publisher: new NotificationLabEventPublisher(notificationClient),
    };
}

describe('NotificationLabEventPublisher', () => {
    it('sends completed lab results to the ordering doctor and patient', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('LabOrderCompleted', { order });

        expect(notificationClient.send).toHaveBeenCalledTimes(2);
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: doctorUserId,
                type: 'lab.results.completed',
                channels: ['in_app'],
                link: '/doctor/lab-reviews/0f79fa2f-2db3-4819-9c81-f0e51daeed51',
            }),
        );
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'lab.results.ready',
                channels: ['in_app', 'email'],
                recipientEmail: 'ada@medsphere.local',
                link: '/patient/lab-results',
            }),
        );
    });

    it('sends reviewed lab results to the patient with email enabled', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('LabOrderReviewed', {
            order: {
                ...order,
                reviewedAt: new Date('2026-05-21T11:00:00.000Z'),
            },
        });

        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'lab.results.reviewed',
                channels: ['in_app', 'email'],
                recipientEmail: 'ada@medsphere.local',
                link: '/patient/lab-results',
            }),
        );
    });
});
