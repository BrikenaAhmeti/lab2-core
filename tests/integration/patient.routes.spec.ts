import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'patient-routes-test-secret';
process.env.PATIENT_DATA_ENCRYPTION_KEY = 'patient-routes-test-key';
process.env.FRONTEND_ORIGINS = '';
process.env.INTERNAL_API_KEY = 'patient-routes-internal-key';

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

    it('creates the authenticated user patient profile without trusting body userId', async () => {
        const authUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
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
            .mockResolvedValue({
                ...patient,
                userId: authUserId,
                firstName: 'Mobile',
                lastName: 'Patient',
                email: 'mobile.patient@example.com',
            });

        const response = await request(app)
            .post('/api/patients')
            .set('Authorization', `Bearer ${createAccessToken([], authUserId)}`)
            .send({
                userId: '11111111-1111-4111-8111-111111111111',
                firstName: 'Mobile',
                lastName: 'Patient',
                email: 'mobile.patient@example.com',
            });

        expect(response.status).toBe(201);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: authUserId,
                actorUserId: authUserId,
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

    it('returns the current patient profile from the linked user id', async () => {
        const findByUserIdSpy = jest
            .spyOn(PatientPrismaRepository.prototype, 'findByUserId')
            .mockResolvedValue(patient);

        const response = await request(app)
            .get('/api/patients/me')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId)}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(patient.id);
        expect(findByUserIdSpy).toHaveBeenCalledWith(patient.userId);
    });

    it('returns an internal patient profile id from the linked user id', async () => {
        const findByUserIdSpy = jest
            .spyOn(PatientPrismaRepository.prototype, 'findByUserId')
            .mockResolvedValue(patient);

        const response = await request(app)
            .get(`/internal/patients/by-user/${patient.userId}`)
            .set('x-internal-api-key', process.env.INTERNAL_API_KEY as string);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            patientId: patient.id,
            patientProfileId: patient.id,
            userId: patient.userId,
        });
        expect(findByUserIdSpy).toHaveBeenCalledWith(patient.userId);
    });

    it('protects the internal patient lookup endpoint with the internal API key', async () => {
        const response = await request(app).get(
            `/internal/patients/by-user/${patient.userId}`,
        );

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid internal API key');
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

    it('rejects patient self-service updates to protected profile fields', async () => {
        jest.spyOn(PatientPrismaRepository.prototype, 'findById').mockResolvedValue(
            patient,
        );
        const updateSpy = jest.spyOn(PatientPrismaRepository.prototype, 'update');

        const response = await request(app)
            .put(`/api/patients/${patient.id}`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId)}`)
            .send({
                personalNumber: '9999999999',
                phone: '+38344999888',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            'Only clinic staff can update protected patient profile fields',
        );
        expect(updateSpy).not.toHaveBeenCalled();
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

    it('links an existing unlinked patient from the internal auth handoff', async () => {
        const linkedUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
        jest.spyOn(PatientPrismaRepository.prototype, 'findByUserId').mockResolvedValue(
            null,
        );
        jest.spyOn(
            PatientPrismaRepository.prototype,
            'findByPersonalNumberHash',
        ).mockResolvedValue({
            ...patient,
            userId: null,
        });
        const updateSpy = jest
            .spyOn(PatientPrismaRepository.prototype, 'update')
            .mockResolvedValue({
                ...patient,
                userId: linkedUserId,
            });

        const response = await request(app)
            .post('/internal/patients/link-by-personal-number')
            .set('x-internal-api-key', process.env.INTERNAL_API_KEY as string)
            .send({
                userId: linkedUserId,
                personalNumber: ' 1234567890 ',
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            linked: true,
            patientId: patient.id,
            userId: linkedUserId,
        });
        expect(updateSpy).toHaveBeenCalledWith(patient.id, {
            userId: linkedUserId,
            actorUserId: linkedUserId,
        });
    });

    it('creates a missing patient profile from the internal auth handoff', async () => {
        const linkedUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
        const createdPatient = {
            ...patient,
            id: 'f9d63ff6-32d1-4d2e-9a54-753525f92b3a',
            userId: linkedUserId,
            firstName: 'Auto',
            lastName: 'Detailing',
            email: 'autodetailingwaxon@example.com',
            personalNumber: 'PN-NEW-1',
        };
        jest.spyOn(PatientPrismaRepository.prototype, 'findByUserId').mockResolvedValue(
            null,
        );
        jest.spyOn(
            PatientPrismaRepository.prototype,
            'findByPersonalNumberHash',
        ).mockResolvedValue(null);
        jest.spyOn(PatientPrismaRepository.prototype, 'findByEmail').mockResolvedValue(
            null,
        );
        const createSpy = jest
            .spyOn(PatientPrismaRepository.prototype, 'create')
            .mockResolvedValue(createdPatient);

        const response = await request(app)
            .post('/internal/patients/link-by-personal-number')
            .set('x-internal-api-key', process.env.INTERNAL_API_KEY as string)
            .send({
                userId: linkedUserId,
                personalNumber: ' PN-NEW-1 ',
                firstName: ' Auto ',
                lastName: ' Detailing ',
                email: ' AUTODETAILINGWAXON@EXAMPLE.COM ',
                phone: '+38344123456',
                dateOfBirth: '1999-01-01',
                gender: 'female',
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            linked: true,
            patientId: createdPatient.id,
            userId: linkedUserId,
        });
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: linkedUserId,
                firstName: 'Auto',
                lastName: 'Detailing',
                email: 'autodetailingwaxon@example.com',
                phone: '+38344123456',
                dateOfBirth: new Date('1999-01-01T00:00:00.000Z'),
                gender: 'female',
                personalNumber: expect.stringMatching(/^enc:/),
                personalNumberHash: expect.any(String),
                actorUserId: linkedUserId,
            }),
        );
    });

    it('protects the internal patient linking endpoint with the internal API key', async () => {
        const response = await request(app)
            .post('/internal/patients/link-by-personal-number')
            .send({
                userId: '15e1a6c6-998a-4d47-a1de-a55859e958cc',
                personalNumber: '1234567890',
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid internal API key');
    });

    it('rejects unauthorized list requests', async () => {
        const response = await request(app).get('/api/patients');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});
