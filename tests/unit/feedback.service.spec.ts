import { AppointmentStatus } from '../../src/generated/prisma';
import { FeedbackEventPublisher } from '../../src/modules/feedback/domain/feedback-event.publisher';
import {
    FeedbackAppointmentSummary,
    FeedbackStaffSummary,
    FeedbackView,
} from '../../src/modules/feedback/domain/feedback.entity';
import { FeedbackRepository } from '../../src/modules/feedback/domain/feedback.repository';
import { FeedbackService } from '../../src/modules/feedback/services/feedback.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const feedbackId = '8b7610e7-5223-4c86-97f1-22817b08e54d';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const doctorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const now = new Date('2026-05-26T10:00:00.000Z');

const patient = {
    id: patientId,
    userId: patientUserId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    name: 'Ada Lovelace',
};

const staff: FeedbackStaffSummary = {
    id: staffProfileId,
    userId: doctorUserId,
    employeeCode: 'DR-001',
    specialization: 'Cardiology',
    displayName: 'DR-001 - Cardiology',
};

const appointment: FeedbackAppointmentSummary = {
    id: appointmentId,
    patientId,
    departmentId: '6b2d5084-453e-471d-8a51-9ad8fe1f5f8d',
    staffProfileId,
    status: AppointmentStatus.COMPLETED,
    scheduledAt: new Date('2026-05-25T09:00:00.000Z'),
    endAt: new Date('2026-05-25T09:30:00.000Z'),
    completedAt: new Date('2026-05-25T09:45:00.000Z'),
    service: {
        id: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
        name: 'Initial Consultation',
    },
    staff,
    department: {
        id: '6b2d5084-453e-471d-8a51-9ad8fe1f5f8d',
        name: 'Cardiology',
    },
};

const feedback: FeedbackView = {
    id: feedbackId,
    patientId,
    appointmentId,
    rating: 5,
    comment: 'Very helpful visit',
    status: 'pending',
    isAnonymous: false,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    patient,
    appointment,
};

function createRepositoryMock(): jest.Mocked<FeedbackRepository> {
    return {
        findPatientByUserId: jest.fn(),
        findStaffByUserId: jest.fn(),
        findCompletedAppointmentForFeedback: jest.fn(),
        findFeedbackByAppointmentId: jest.fn(),
        findFeedbackById: jest.fn(),
        createFeedback: jest.fn(),
        listFeedback: jest.fn(),
        listPatientFeedback: jest.fn(),
        updateFeedbackStatus: jest.fn(),
    };
}

function createPublisherMock(): jest.Mocked<FeedbackEventPublisher> {
    return {
        publish: jest.fn(),
    };
}

describe('FeedbackService', () => {
    it('submits feedback for the authenticated patient after a completed appointment', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findPatientByUserId.mockResolvedValue(patient);
        repository.findCompletedAppointmentForFeedback.mockResolvedValue(appointment);
        repository.findFeedbackByAppointmentId.mockResolvedValue(null);
        repository.createFeedback.mockResolvedValue({
            ...feedback,
            comment: 'Great care',
            isAnonymous: true,
        });
        const service = new FeedbackService(repository, publisher, () => now);

        const result = await service.submitFeedback({
            appointmentId,
            rating: 5,
            comment: ' Great   care ',
            isAnonymous: true,
            actorUserId: patientUserId,
        });

        expect(result.comment).toBe('Great care');
        expect(repository.createFeedback).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                rating: 5,
                comment: 'Great care',
                status: 'pending',
                isAnonymous: true,
                submittedAt: now,
            }),
        );
        expect(publisher.publish).toHaveBeenCalledWith(
            'FeedbackSubmitted',
            expect.objectContaining({
                actorUserId: patientUserId,
            }),
        );
    });

    it('prevents duplicate feedback for the same appointment', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findPatientByUserId.mockResolvedValue(patient);
        repository.findCompletedAppointmentForFeedback.mockResolvedValue(appointment);
        repository.findFeedbackByAppointmentId.mockResolvedValue(feedback);
        const service = new FeedbackService(repository, publisher, () => now);

        await expect(
            service.submitFeedback({
                appointmentId,
                rating: 4,
                actorUserId: patientUserId,
            }),
        ).rejects.toMatchObject({
            message: 'Feedback already submitted for this appointment',
            statusCode: 409,
        });

        expect(repository.createFeedback).not.toHaveBeenCalled();
    });

    it('scopes doctor feedback lists to their own staff profile', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findStaffByUserId.mockResolvedValue(staff);
        repository.listFeedback.mockResolvedValue({
            items: [feedback],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
        const service = new FeedbackService(repository, publisher, () => now);

        await service.listFeedback(
            {
                page: 1,
                limit: 10,
                status: 'pending',
            },
            doctorUserId,
            false,
        );

        expect(repository.listFeedback).toHaveBeenCalledWith(
            expect.objectContaining({
                staffProfileId,
                status: 'pending',
            }),
        );
    });
});
