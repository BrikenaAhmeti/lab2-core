import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../src/generated/prisma';
import { LabOrderView, LabTestEntity } from '../../src/modules/lab/domain/lab.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'lab-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.INTERNAL_API_KEY = '';
process.env.AI_SERVICE_URL = '';

const { createApp } = require('../../src/app');
const {
    LabPrismaRepository,
} = require('../../src/modules/lab/infrastructure/lab.prisma.repository');
const {
    HttpLabAiClient,
} = require('../../src/modules/lab/infrastructure/lab-ai.http.client');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const labOrderId = '0f79fa2f-2db3-4819-9c81-f0e51daeed51';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const labTest: LabTestEntity = {
    id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
    code: 'CBC',
    name: 'Complete Blood Count',
    description: 'Standard CBC panel',
    category: 'Hematology',
    sampleType: 'Blood',
    defaultPrice: '20.00',
    referenceRange: '4.0-10.0',
    isActive: true,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
    updatedAt: new Date('2026-05-21T08:00:00.000Z'),
};

const appointment = {
    id: appointmentId,
    patientId,
    staffProfileId,
    departmentId,
    status: AppointmentStatus.IN_PROGRESS,
    scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
    endAt: new Date('2030-01-02T09:30:00.000Z'),
};

const medicalRecord = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    departmentId,
    diagnosis: 'Fatigue',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
};

const labOrder: LabOrderView = {
    id: labOrderId,
    patientId,
    appointmentId,
    medicalRecordId,
    orderedByStaffId: staffProfileId,
    departmentId,
    status: LabOrderStatus.PENDING,
    priority: 'urgent',
    notes: 'Draw before medication',
    orderedAt: new Date('2026-05-21T08:10:00.000Z'),
    collectedAt: null,
    completedAt: null,
    reviewedAt: null,
    createdAt: new Date('2026-05-21T08:10:00.000Z'),
    updatedAt: new Date('2026-05-21T08:10:00.000Z'),
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
    medicalRecord: {
        id: medicalRecordId,
        diagnosis: 'Fatigue',
        isFinalized: false,
        createdAt: medicalRecord.createdAt,
    },
    orderedByStaff: {
        id: staffProfileId,
        userId: actorUserId,
        employeeCode: 'DR-001',
        specialization: 'Internist',
        displayName: 'DR-001 - Internist',
    },
    department: {
        id: departmentId,
        name: 'Internal Medicine',
        isActive: true,
    },
    items: [
        {
            id: '22c52439-b31f-4de8-9b0e-80dd54e47561',
            labTestId: labTest.id,
            resultValue: null,
            resultUnit: null,
            resultNotes: null,
            resultStatus: LabResultStatus.PENDING,
            isCritical: false,
            completedAt: null,
            flag: 'pending',
            labTest: {
                id: labTest.id,
                code: labTest.code,
                name: labTest.name,
                description: labTest.description,
                category: labTest.category,
                sampleType: labTest.sampleType,
                defaultPrice: labTest.defaultPrice,
                referenceRange: labTest.referenceRange,
                isActive: labTest.isActive,
            },
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

describe('Lab routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a lab test through POST /api/lab-tests', async () => {
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findLabTestByCode',
        ).mockResolvedValue(null);
        const createSpy = jest
            .spyOn(LabPrismaRepository.prototype, 'createLabTest')
            .mockResolvedValue(labTest);

        const response = await request(app)
            .post('/api/lab-tests')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_tests:manage:all'])}`,
            )
            .send({
                code: ' cbc ',
                name: ' Complete Blood Count ',
                category: 'Hematology',
                sampleType: 'Blood',
                referenceRange: '4.0-10.0',
            });

        expect(response.status).toBe(201);
        expect(response.body.code).toBe('CBC');
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'CBC',
                name: 'Complete Blood Count',
            }),
        );
    });

    it('creates a lab order through POST /api/lab-orders', async () => {
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findAppointmentById',
        ).mockResolvedValue(appointment);
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findMedicalRecordById',
        ).mockResolvedValue(medicalRecord);
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findLabTestsByIds',
        ).mockResolvedValue([labTest]);
        const createSpy = jest
            .spyOn(LabPrismaRepository.prototype, 'createLabOrder')
            .mockResolvedValue(labOrder);

        const response = await request(app)
            .post('/api/lab-orders')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_orders:create:all'])}`,
            )
            .send({
                patientId,
                appointmentId,
                medicalRecordId,
                orderedByStaffId: staffProfileId,
                priority: 'urgent',
                notes: ' Draw before medication ',
                tests: [labTest.id],
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(labOrderId);
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                medicalRecordId,
                orderedByStaffId: staffProfileId,
                departmentId,
            }),
        );
    });

    it('lists pending lab orders through GET /api/lab-orders/pending', async () => {
        jest.spyOn(
            LabPrismaRepository.prototype,
            'listPendingLabOrders',
        ).mockResolvedValue([labOrder]);

        const response = await request(app)
            .get('/api/lab-orders/pending')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_orders:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].id).toBe(labOrderId);
    });

    it('lists completed patient lab orders with result flags and reference ranges', async () => {
        const completedOrder: LabOrderView = {
            ...labOrder,
            status: LabOrderStatus.COMPLETED,
            completedAt: new Date('2026-05-21T09:00:00.000Z'),
            items: labOrder.items.map((item) => ({
                ...item,
                resultValue: '5.2',
                resultUnit: '10^9/L',
                resultStatus: LabResultStatus.ENTERED,
                completedAt: new Date('2026-05-21T08:55:00.000Z'),
                flag: 'normal',
            })),
        };
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findPatientById',
        ).mockResolvedValue(completedOrder.patient);
        const listSpy = jest
            .spyOn(LabPrismaRepository.prototype, 'listLabOrders')
            .mockResolvedValue({
                items: [completedOrder],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/lab-orders?patientId=${patientId}&status=completed`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_orders:read:own'], patientUserId)}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items[0].items[0]).toEqual(
            expect.objectContaining({
                resultValue: '5.2',
                flag: 'normal',
                labTest: expect.objectContaining({
                    referenceRange: '4.0-10.0',
                }),
            }),
        );
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                status: LabOrderStatus.COMPLETED,
            }),
        );
    });

    it('queues AI interpretation through POST /api/lab-orders/:id/trigger-ai', async () => {
        const completedOrder: LabOrderView = {
            ...labOrder,
            status: LabOrderStatus.COMPLETED,
            completedAt: new Date('2026-05-21T09:00:00.000Z'),
            items: labOrder.items.map((item) => ({
                ...item,
                resultValue: '12.0',
                resultUnit: '10^9/L',
                resultStatus: LabResultStatus.ABNORMAL,
                completedAt: new Date('2026-05-21T08:55:00.000Z'),
                flag: 'abnormal',
            })),
        };
        jest.spyOn(
            LabPrismaRepository.prototype,
            'findLabOrderById',
        ).mockResolvedValue(completedOrder);
        const queueSpy = jest
            .spyOn(HttpLabAiClient.prototype, 'queueLabInterpretation')
            .mockResolvedValue({ labOrderId, status: 'queued' });

        const response = await request(app)
            .post(`/api/lab-orders/${labOrderId}/trigger-ai`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_results:review:all'])}`,
            )
            .send();

        expect(response.status).toBe(202);
        expect(response.body).toEqual({ labOrderId, status: 'queued' });
        expect(queueSpy).toHaveBeenCalledWith(
            labOrderId,
            expect.objectContaining({
                patientId,
                results: [
                    expect.objectContaining({
                        name: 'Complete Blood Count',
                        value: 12,
                        unit: '10^9/L',
                        referenceRange: '4.0-10.0',
                        flag: 'high',
                    }),
                ],
            }),
        );
    });
});
