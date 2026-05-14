import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'patient-routes-test-secret';
process.env.PATIENT_DATA_ENCRYPTION_KEY = 'patient-routes-test-key';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    PatientPrismaRepository,
} = require('../../src/modules/patients/infrastructure/patient.prisma.repository');

const patient = {
    id: '6d8ad35f-76cc-4cf7-bc12-065ac46a3f7f',
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    firstName: 'Arta',
    lastName: 'Krasniqi',
    email: 'arta@example.com',
    phone: '+38344111222',
    dateOfBirth: new Date('1995-04-10T00:00:00.000Z'),
    gender: 'female',
    bloodType: 'A_POSITIVE',
    personalNumber: '1234567890',
    address: null,
    emergencyContact: null,
    emergencyPhone: null,
    allergies: ['penicillin'],
    medicalNotes: null,
    isActive: true,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
};

function createAccessToken(permissions: string[], sub = 'admin-user') {
    return jwt.sign(
        {
            sub,
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Patient routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a patient and performs duplicate checks', async () => {
        jest.spyOn(PatientPrismaRepository.prototype, 'findByUserId').mockResolvedValue(
            null,
        );
        jest.spyOn(PatientPrismaRepository.prototype, 'findByEmail').mockResolvedValue(
            null,
        );
        jest.spyOn(
            PatientPrismaRepository.prototype,
            'findByPersonalNumberHash',
        ).mockResolvedValue(null);
        const createSpy = jest
            .spyOn(PatientPrismaRepository.prototype, 'create')
            .mockResolvedValue(patient);

        const response = await request(app)
            .post('/api/patients')
            .set('Authorization', `Bearer ${createAccessToken(['patients:create:all'])}`)
            .send({
                userId: patient.userId,
                firstName: ' Arta ',
                lastName: ' Krasniqi ',
                email: ' ARTA@EXAMPLE.COM ',
                personalNumber: ' 1234567890 ',
            });

        expect(response.status).toBe(201);
        expect(response.body.email).toBe(patient.email);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'arta@example.com',
                personalNumber: expect.stringMatching(/^enc:/),
                personalNumberHash: expect.any(String),
            }),
        );
    });

    it('lists patients with pagination and filters', async () => {
        const listSpy = jest.spyOn(PatientPrismaRepository.prototype, 'list').mockResolvedValue({
            items: [patient],
            meta: {
                page: 2,
                limit: 5,
                total: 1,
                totalPages: 1,
            },
        });

        const response = await request(app)
            .get('/api/patients?page=2&limit=5&search=arta&gender=female&bloodType=A_POSITIVE')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                page: 2,
                limit: 5,
                search: 'arta',
                gender: 'female',
                bloodType: 'A_POSITIVE',
            }),
        );
    });

    it('allows a patient to read their own profile', async () => {
        jest.spyOn(PatientPrismaRepository.prototype, 'findById').mockResolvedValue(
            patient,
        );

        const response = await request(app)
            .get(`/api/patients/${patient.id}`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId)}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(patient.id);
    });

    it('allows staff to update a patient profile', async () => {
        jest.spyOn(PatientPrismaRepository.prototype, 'findById').mockResolvedValue(
            patient,
        );
        jest.spyOn(PatientPrismaRepository.prototype, 'findByEmail').mockResolvedValue(
            null,
        );
        jest.spyOn(PatientPrismaRepository.prototype, 'update').mockResolvedValue({
            ...patient,
            phone: '+38344999888',
        });

        const response = await request(app)
            .put(`/api/patients/${patient.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['patients:update:all'])}`)
            .send({
                phone: '+38344999888',
            });

        expect(response.status).toBe(200);
        expect(response.body.phone).toBe('+38344999888');
    });

    it('returns a patient timeline', async () => {
        const timeline = [
            {
                id: 'appointment:6f85fca2-bd32-4ea1-bfd5-27f4adfa40d5',
                type: 'appointment',
                occurredAt: new Date('2026-05-01T10:00:00.000Z'),
                title: 'General consultation appointment',
                status: 'SCHEDULED',
                summary: 'General Medicine - IN_PERSON',
                reference: {
                    entity: 'appointments',
                    id: '6f85fca2-bd32-4ea1-bfd5-27f4adfa40d5',
                },
            },
        ];

        jest.spyOn(PatientPrismaRepository.prototype, 'findById').mockResolvedValue(
            patient,
        );
        jest.spyOn(PatientPrismaRepository.prototype, 'getTimeline').mockResolvedValue(
            timeline,
        );

        const response = await request(app)
            .get(`/api/patients/${patient.id}/timeline`)
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].type).toBe('appointment');
    });

    it('rejects unauthorized list requests', async () => {
        const response = await request(app).get('/api/patients');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});
