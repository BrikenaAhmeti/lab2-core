import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../src/generated/prisma';
import { MedicalRecordView } from '../../src/modules/medical-records/domain/medical-record.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'medical-record-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    MedicalRecordPrismaRepository,
} = require('../../src/modules/medical-records/infrastructure/medical-record.prisma.repository');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const appointment = {
    id: appointmentId,
    patientId,
    staffProfileId,
    departmentId,
    status: AppointmentStatus.IN_PROGRESS,
    scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
    endAt: new Date('2030-01-02T09:30:00.000Z'),
};

const record: MedicalRecordView = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    departmentId,
    chiefComplaint: 'Chest discomfort',
    vitals: { bloodPressure: '120/80' },
    diagnosis: 'Stable angina',
    treatmentPlan: 'Continue monitoring',
    notes: null,
    followUpInstructions: 'Follow up in two weeks',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
    updatedAt: new Date('2026-05-21T08:00:00.000Z'),
    patient: {
        id: patientId,
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        name: 'Ada Lovelace',
    },
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
    },
    staff: {
        id: staffProfileId,
        userId: actorUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    department: {
        id: departmentId,
        name: 'Cardiology',
        isActive: true,
    },
    amendments: [],
    prescriptions: [],
    labOrders: [
        {
            id: '0f79fa2f-2db3-4819-9c81-f0e51daeed51',
            status: LabOrderStatus.PENDING,
            priority: 'normal',
            notes: null,
            orderedAt: new Date('2026-05-21T08:10:00.000Z'),
            completedAt: null,
            reviewedAt: null,
            items: [
                {
                    id: '22c52439-b31f-4de8-9b0e-80dd54e47561',
                    resultValue: null,
                    resultUnit: null,
                    resultNotes: null,
                    resultStatus: LabResultStatus.PENDING,
                    isCritical: false,
                    completedAt: null,
                    labTest: {
                        id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
                        code: 'CBC',
                        name: 'Complete Blood Count',
                    },
                },
            ],
        },
    ],
};

function createAccessToken(permissions: string[], sub = actorUserId) {
    return jwt.sign(
        {
            sub,
            email: 'doctor@medsphere.local',
            roles: ['Doctor'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Medical record routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a medical record through POST /api/medical-records', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findAppointmentById',
        ).mockResolvedValue(appointment);
        const createSpy = jest
            .spyOn(MedicalRecordPrismaRepository.prototype, 'create')
            .mockResolvedValue(record);

        const response = await request(app)
            .post('/api/medical-records')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:write:all'])}`,
            )
            .send({
                patientId,
                appointmentId,
                staffProfileId,
                chiefComplaint: ' Chest discomfort ',
                diagnosis: ' Stable angina ',
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(medicalRecordId);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                staffProfileId,
                departmentId,
                chiefComplaint: 'Chest discomfort',
                diagnosis: 'Stable angina',
            }),
        );
    });

    it('allows a patient to list only their own medical records', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findPatientById',
        ).mockResolvedValue(record.patient);
        const listSpy = jest
            .spyOn(MedicalRecordPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [record],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/medical-records?patientId=${patientId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:read:own'], patientUserId)}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                isFinalized: true,
            }),
        );
    });

    it('allows a patient to download a finalized medical record PDF', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue({
            ...record,
            isFinalized: true,
        });

        const response = await request(app)
            .get(`/api/medical-records/${medicalRecordId}/pdf`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:read:own'], patientUserId)}`,
            );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/pdf');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('blocks patient PDF download for draft medical records', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue(record);

        const response = await request(app)
            .get(`/api/medical-records/${medicalRecordId}/pdf`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:read:own'], patientUserId)}`,
            );

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });

    it('finalizes a draft medical record', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue(record);
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'finalize',
        ).mockResolvedValue({
            ...record,
            isFinalized: true,
        });

        const response = await request(app)
            .post(`/api/medical-records/${medicalRecordId}/finalize`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:write:all'])}`,
            )
            .send();

        expect(response.status).toBe(200);
        expect(response.body.isFinalized).toBe(true);
        expect(MedicalRecordPrismaRepository.prototype.finalize).toHaveBeenCalledWith(
            medicalRecordId,
            actorUserId,
        );
    });

    it('rejects direct edits to finalized medical records', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue({
            ...record,
            isFinalized: true,
        });

        const response = await request(app)
            .put(`/api/medical-records/${medicalRecordId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:write:all'])}`,
            )
            .send({
                notes: 'New note',
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            'Finalized medical records cannot be updated',
        );
    });

    it('adds an amendment for a finalized medical record', async () => {
        jest.spyOn(
            MedicalRecordPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue({
            ...record,
            isFinalized: true,
        });
        const amendmentSpy = jest
            .spyOn(MedicalRecordPrismaRepository.prototype, 'createAmendment')
            .mockResolvedValue({
                id: '921484e4-c080-4a04-821b-fc2902180cce',
                medicalRecordId,
                amendedByUserId: actorUserId,
                reason: 'Correct diagnosis wording',
                previousSnapshot: {},
                createdAt: new Date('2026-05-21T09:00:00.000Z'),
                updatedAt: new Date('2026-05-21T09:00:00.000Z'),
            });

        const response = await request(app)
            .post(`/api/medical-records/${medicalRecordId}/amendments`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['medical_records:write:all'])}`,
            )
            .send({
                reason: 'Correct diagnosis wording',
                changes: {
                    diagnosis: 'Stable exertional angina',
                },
            });

        expect(response.status).toBe(201);
        expect(response.body.medicalRecordId).toBe(medicalRecordId);
        expect(amendmentSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                medicalRecordId,
                amendedByUserId: actorUserId,
                previousSnapshot: expect.objectContaining({
                    original: expect.objectContaining({ id: medicalRecordId }),
                    changes: {
                        diagnosis: 'Stable exertional angina',
                    },
                }),
            }),
        );
    });
});
