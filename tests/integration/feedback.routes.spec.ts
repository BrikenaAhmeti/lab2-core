import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus } from '../../src/generated/prisma';
import { FeedbackView } from '../../src/modules/feedback/domain/feedback.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'feedback-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    FeedbackPrismaRepository,
} = require('../../src/modules/feedback/infrastructure/feedback.prisma.repository');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const feedbackId = '8b7610e7-5223-4c86-97f1-22817b08e54d';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
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

const feedback: FeedbackView = {
    id: feedbackId,
    patientId,
    appointmentId,
    rating: 5,
    comment: 'Helpful doctor',
    status: 'pending',
    isAnonymous: false,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    patient,
    appointment: {
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
        staff: {
            id: staffProfileId,
            userId: actorUserId,
            employeeCode: 'DR-001',
            specialization: 'Cardiology',
            displayName: 'DR-001 - Cardiology',
        },
        department: {
            id: '6b2d5084-453e-471d-8a51-9ad8fe1f5f8d',
            name: 'Cardiology',
        },
    },
};

function createAccessToken(permissions: string[], sub = actorUserId) {
    return jwt.sign(
        {
            sub,
            email: 'feedback@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Feedback routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('submits appointment feedback for the authenticated patient', async () => {
        jest.spyOn(
            FeedbackPrismaRepository.prototype,
            'findPatientByUserId',
        ).mockResolvedValue(patient);
        jest.spyOn(
            FeedbackPrismaRepository.prototype,
            'findCompletedAppointmentForFeedback',
        ).mockResolvedValue(feedback.appointment);
        jest.spyOn(
            FeedbackPrismaRepository.prototype,
            'findFeedbackByAppointmentId',
        ).mockResolvedValue(null);
        const createSpy = jest
            .spyOn(FeedbackPrismaRepository.prototype, 'createFeedback')
            .mockResolvedValue(feedback);

        const response = await request(app)
            .post('/api/feedback')
            .set('Authorization', `Bearer ${createAccessToken([], patientUserId)}`)
            .send({
                appointmentId,
                rating: 5,
                comment: ' Helpful   doctor ',
                isAnonymous: false,
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(feedbackId);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                rating: 5,
                comment: 'Helpful doctor',
            }),
        );
    });

    it('lists feedback with admin filters', async () => {
        const listSpy = jest
            .spyOn(FeedbackPrismaRepository.prototype, 'listFeedback')
            .mockResolvedValue({
                items: [feedback],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/feedback?staffProfileId=${staffProfileId}&status=pending`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['feedback:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                staffProfileId,
                status: 'pending',
            }),
        );
    });

    it('updates feedback status', async () => {
        jest.spyOn(
            FeedbackPrismaRepository.prototype,
            'findFeedbackById',
        ).mockResolvedValue(feedback);
        const updateSpy = jest
            .spyOn(FeedbackPrismaRepository.prototype, 'updateFeedbackStatus')
            .mockResolvedValue({
                ...feedback,
                status: 'published',
            });

        const response = await request(app)
            .patch(`/api/feedback/${feedbackId}/status`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['feedback:manage:all'])}`,
            )
            .send({ status: 'published' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('published');
        expect(updateSpy).toHaveBeenCalledWith(
            feedbackId,
            expect.objectContaining({
                status: 'published',
            }),
        );
    });
});
