import { AppointmentStatus, PharmacyStatus } from '../../src/generated/prisma';
import { PrescriptionView } from '../../src/modules/prescriptions/domain/prescription.entity';
import { NotificationPrescriptionEventPublisher } from '../../src/modules/prescriptions/infrastructure/notification-prescription-event.publisher';
import { NotificationClient } from '../../src/shared/notifications/notification-client';

const patientUserId = 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057';

const prescription: PrescriptionView = {
    id: '664e433c-7166-45f0-8d2d-5f03b7bbdb3c',
    patientId: '35974dde-783f-43a1-bcab-117d754f81e1',
    medicalRecordId: '2fb8b77f-0a57-4c85-89f7-9222da1fcb12',
    appointmentId: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
    staffProfileId: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    issuedAt: new Date('2026-05-21T08:30:00.000Z'),
    expiresAt: null,
    notes: null,
    isVoided: false,
    voidedAt: null,
    voidReason: null,
    voidedByUserId: null,
    status: 'ACTIVE',
    pharmacyStatus: PharmacyStatus.PENDING,
    createdAt: new Date('2026-05-21T08:30:00.000Z'),
    updatedAt: new Date('2026-05-21T08:30:00.000Z'),
    patient: {
        id: '35974dde-783f-43a1-bcab-117d754f81e1',
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        allergies: [],
        name: 'Ada Lovelace',
    },
    medicalRecord: {
        id: '2fb8b77f-0a57-4c85-89f7-9222da1fcb12',
        diagnosis: 'Stable angina',
        isFinalized: false,
        createdAt: new Date('2026-05-21T08:00:00.000Z'),
    },
    appointment: {
        id: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
        endAt: new Date('2030-01-02T09:30:00.000Z'),
    },
    staff: {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    items: [
        {
            id: '4149ce17-a874-4545-a51d-3f046c19af6f',
            medicationName: 'Aspirin',
            dosage: '81 mg',
            frequency: 'Once daily',
            durationInstructions: '30 days',
            quantityPrescribed: 30,
            quantityDispensed: null,
            notes: null,
            createdAt: new Date('2026-05-21T08:30:00.000Z'),
            updatedAt: new Date('2026-05-21T08:30:00.000Z'),
        },
    ],
    pharmacyQueue: [],
};

describe('NotificationPrescriptionEventPublisher', () => {
    it('sends new prescription notifications to the patient only', async () => {
        const notificationClient: jest.Mocked<NotificationClient> = {
            send: jest.fn().mockResolvedValue(undefined),
        };
        const publisher = new NotificationPrescriptionEventPublisher(notificationClient);

        await publisher.publish('PrescriptionCreated', { prescription });

        expect(notificationClient.send).toHaveBeenCalledTimes(1);
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'prescription.created',
                channels: ['in_app'],
                link: '/patient/prescriptions',
            }),
        );
    });
});
