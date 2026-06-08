import { AppointmentStatus, AppointmentType } from '../../src/generated/prisma';
import { NotificationAppointmentEventPublisher } from '../../src/modules/appointments/infrastructure/notification-appointment-event.publisher';
import { AppointmentView } from '../../src/modules/appointments/domain/appointment.entity';
import { NotificationClient } from '../../src/shared/notifications/notification-client';

const patientUserId = 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057';
const staffUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';

const appointment: AppointmentView = {
    id: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
    patientId: '35974dde-783f-43a1-bcab-117d754f81e1',
    departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    serviceCatalogId: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
    staffProfileId: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    status: AppointmentStatus.SCHEDULED,
    appointmentType: AppointmentType.IN_PERSON,
    scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
    endAt: new Date('2030-01-02T09:30:00.000Z'),
    durationMinutes: 30,
    basePrice: 50,
    notes: null,
    checkedInAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationNote: null,
    createdAt: new Date('2026-05-19T08:00:00.000Z'),
    updatedAt: new Date('2026-05-19T08:00:00.000Z'),
    patient: {
        id: '35974dde-783f-43a1-bcab-117d754f81e1',
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        name: 'Ada Lovelace',
    },
    staff: {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        userId: staffUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    service: {
        id: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
        name: 'Initial Consultation',
        defaultDurationMinutes: 30,
        defaultPrice: 50,
    },
    department: {
        id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Cardiology',
        isActive: true,
    },
};

function createPublisher() {
    const notificationClient: jest.Mocked<NotificationClient> = {
        send: jest.fn().mockResolvedValue(undefined),
    };

    return {
        notificationClient,
        publisher: new NotificationAppointmentEventPublisher(notificationClient),
    };
}

describe('NotificationAppointmentEventPublisher', () => {
    it.each([
        ['AppointmentBooked', 'appointment.booked', [patientUserId, staffUserId]],
        ['AppointmentRescheduled', 'appointment.rescheduled', [patientUserId, staffUserId]],
        ['AppointmentCancelled', 'appointment.cancelled', [patientUserId, staffUserId]],
    ] as const)('sends %s to the expected recipients', async (eventType, type, recipients) => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish(eventType, { appointment });

        expect(notificationClient.send).toHaveBeenCalledTimes(recipients.length);
        for (const recipient of recipients) {
            expect(notificationClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: recipient,
                    type,
                    channels: ['in_app', 'email'],
                }),
            );
        }

        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                link: '/patient/appointments',
            }),
        );
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: staffUserId,
                link: '/doctor/consultations/e61720ab-6446-4da3-a4bc-f642940e4a81',
            }),
        );
    });

    it('sends appointment confirmations only to the patient', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('AppointmentStatusChanged', {
            appointment: {
                ...appointment,
                status: AppointmentStatus.CONFIRMED,
            },
            previousStatus: AppointmentStatus.SCHEDULED,
        });

        expect(notificationClient.send).toHaveBeenCalledTimes(1);
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'appointment.confirmed',
                channels: ['in_app', 'email'],
            }),
        );
    });

    it('sends no-show notifications only to the patient', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('AppointmentStatusChanged', {
            appointment: {
                ...appointment,
                status: AppointmentStatus.NO_SHOW,
            },
            previousStatus: AppointmentStatus.CONFIRMED,
        });

        expect(notificationClient.send).toHaveBeenCalledTimes(1);
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'appointment.no_show',
                channels: ['in_app', 'email'],
            }),
        );
    });

    it('sends completed appointment report notifications to the patient with email enabled', async () => {
        const { notificationClient, publisher } = createPublisher();

        await publisher.publish('AppointmentCompleted', {
            appointment: {
                ...appointment,
                status: AppointmentStatus.COMPLETED,
                completedAt: new Date('2030-01-02T09:40:00.000Z'),
            },
            previousStatus: AppointmentStatus.IN_PROGRESS,
        });

        expect(notificationClient.send).toHaveBeenCalledTimes(1);
        expect(notificationClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'appointment.completed_report',
                channels: ['in_app', 'email'],
                recipientEmail: 'ada@medsphere.local',
                link: '/patient/medical-records',
            }),
        );
    });
});
