import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
    AppointmentStatus,
    PharmacyStatus,
} from '../../src/generated/prisma';
import { PrescriptionView } from '../../src/modules/prescriptions/domain/prescription.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'prescription-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    PrescriptionPrismaRepository,
} = require('../../src/modules/prescriptions/infrastructure/prescription.prisma.repository');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const medicalRecord = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    diagnosis: 'Stable angina',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
};

const prescription: PrescriptionView = {
    id: prescriptionId,
    patientId,
    medicalRecordId,
    appointmentId,
    staffProfileId,
    issuedAt: new Date('2026-05-21T08:30:00.000Z'),
    expiresAt: new Date('2026-06-21T08:30:00.000Z'),
    notes: 'Take after meals',
    isVoided: false,
    voidedAt: null,
    voidReason: null,
    voidedByUserId: null,
    status: 'ACTIVE',
    pharmacyStatus: PharmacyStatus.PENDING,
    createdAt: new Date('2026-05-21T08:30:00.000Z'),
    updatedAt: new Date('2026-05-21T08:30:00.000Z'),
    patient: {
        id: patientId,
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        allergies: ['penicillin'],
        name: 'Ada Lovelace',
    },
    medicalRecord: {
        id: medicalRecordId,
        diagnosis: 'Stable angina',
        isFinalized: false,
        createdAt: medicalRecord.createdAt,
    },
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
        endAt: new Date('2030-01-02T09:30:00.000Z'),
    },
    staff: {
        id: staffProfileId,
        userId: actorUserId,
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
    pharmacyQueue: [
        {
            id: 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe',
            status: PharmacyStatus.PENDING,
            requestedAt: new Date('2026-05-21T08:30:00.000Z'),
            processedAt: null,
            notes: null,
            dispensingItems: [],
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

describe('Prescription routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a prescription through POST /api/prescriptions', async () => {
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'findMedicalRecordById',
        ).mockResolvedValue(medicalRecord);
        const createSpy = jest
            .spyOn(PrescriptionPrismaRepository.prototype, 'createWithPharmacyQueue')
            .mockResolvedValue(prescription);

        const response = await request(app)
            .post('/api/prescriptions')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['prescriptions:write:all'])}`,
            )
            .send({
                medicalRecordId,
                expiresAt: prescription.expiresAt?.toISOString(),
                notes: ' Take   after meals ',
                items: [
                    {
                        medicationName: ' Aspirin ',
                        dosage: ' 81 mg ',
                        frequency: ' Once   daily ',
                        durationInstructions: '30 days',
                        quantityPrescribed: 30,
                    },
                ],
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(prescriptionId);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                medicalRecordId,
                appointmentId,
                staffProfileId,
                notes: 'Take after meals',
            }),
        );
    });

    it('lists prescriptions for the authenticated patient scope', async () => {
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'findPatientById',
        ).mockResolvedValue(prescription.patient);
        const listSpy = jest
            .spyOn(PrescriptionPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [prescription],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/prescriptions?patientId=${patientId}&isVoided=false`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['prescriptions:read:own'], patientUserId)}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                isVoided: false,
            }),
        );
    });

    it('gets a prescription by id', async () => {
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue(prescription);

        const response = await request(app)
            .get(`/api/prescriptions/${prescriptionId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['prescriptions:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(prescriptionId);
        expect(response.body.items[0].medicationName).toBe('Aspirin');
    });

    it('returns a prescription PDF download', async () => {
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue(prescription);

        const response = await request(app)
            .get(`/api/prescriptions/${prescriptionId}/pdf`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['prescriptions:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/pdf');
        expect(response.headers['content-disposition']).toContain(
            `prescription-${prescriptionId}.pdf`,
        );
    });

    it('blocks voiding after dispensing has started', async () => {
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'findById',
        ).mockResolvedValue({
            ...prescription,
            pharmacyStatus: PharmacyStatus.DISPENSED,
        });
        jest.spyOn(
            PrescriptionPrismaRepository.prototype,
            'hasDispensingActivity',
        ).mockResolvedValue(true);

        const response = await request(app)
            .post(`/api/prescriptions/${prescriptionId}/void`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['prescriptions:write:all'])}`,
            )
            .send({ reason: 'Medication changed' });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            'Dispensed prescriptions cannot be voided',
        );
    });
});
