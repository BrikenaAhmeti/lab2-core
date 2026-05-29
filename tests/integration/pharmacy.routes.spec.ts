import jwt from 'jsonwebtoken';
import request from 'supertest';
import { PharmacyStatus } from '../../src/generated/prisma';
import { PharmacyQueueView } from '../../src/modules/pharmacy/domain/pharmacy.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'pharmacy-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    PharmacyPrismaRepository,
} = require('../../src/modules/pharmacy/infrastructure/pharmacy.prisma.repository');

const queueId = 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const actorUserId = '2cded68b-2455-4104-87ea-cc3b78d2aa6a';
const doctorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const prescriptionItemId = '4149ce17-a874-4545-a51d-3f046c19af6f';
const inventoryItemId = '1a0d36f8-22f0-4ed3-912c-50f1dc4b706b';

const queue: PharmacyQueueView = {
    id: queueId,
    prescriptionId,
    patientId,
    status: PharmacyStatus.PENDING,
    requestedAt: new Date('2026-05-21T08:30:00.000Z'),
    processedAt: null,
    notes: null,
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
    prescription: {
        id: prescriptionId,
        issuedAt: new Date('2026-05-21T08:30:00.000Z'),
        expiresAt: null,
        notes: null,
        isVoided: false,
        staff: {
            id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
            userId: doctorUserId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            displayName: 'DR-001 - Cardiologist',
        },
    },
    dispensingItems: [
        {
            id: 'f8b1b3b1-7186-492f-87bb-1d194da8e0aa1',
            pharmacyQueueId: queueId,
            prescriptionItemId,
            inventoryItemId: null,
            quantityToDispense: 30,
            quantityDispensed: null,
            status: PharmacyStatus.PENDING,
            notes: null,
            createdAt: new Date('2026-05-21T08:30:00.000Z'),
            updatedAt: new Date('2026-05-21T08:30:00.000Z'),
            prescriptionItem: {
                id: prescriptionItemId,
                medicationName: 'Aspirin',
                dosage: '81 mg',
                frequency: 'Once daily',
                durationInstructions: '30 days',
                quantityPrescribed: 30,
                quantityDispensed: null,
                notes: null,
            },
            inventoryItem: null,
        },
    ],
};

function createAccessToken(permissions: string[], sub = actorUserId) {
    return jwt.sign(
        {
            sub,
            email: 'pharmacist@medsphere.local',
            roles: ['Pharmacist'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Pharmacy routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('lists pharmacy queue items with status filtering', async () => {
        const listSpy = jest
            .spyOn(PharmacyPrismaRepository.prototype, 'listQueue')
            .mockResolvedValue({
                items: [
                    {
                        ...queue,
                        status: PharmacyStatus.IN_PROGRESS,
                    },
                ],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/pharmacy/queue?status=in_progress')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['pharmacy:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items[0].status).toBe(PharmacyStatus.IN_PROGRESS);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: PharmacyStatus.IN_PROGRESS,
            }),
        );
    });

    it('returns queue detail with patient allergies for pharmacist review', async () => {
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'ensureDispensingItems',
        ).mockResolvedValue(undefined);
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'findQueueById',
        ).mockResolvedValue(queue);

        const response = await request(app)
            .get(`/api/pharmacy/queue/${queueId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['pharmacy:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.patient.allergies).toEqual(['penicillin']);
        expect(response.body.dispensingItems[0].prescriptionItem.medicationName).toBe(
            'Aspirin',
        );
    });

    it('starts queue processing through PATCH /api/pharmacy/queue/:id/start', async () => {
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'ensureDispensingItems',
        ).mockResolvedValue(undefined);
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'findQueueById',
        ).mockResolvedValue(queue);
        const startSpy = jest
            .spyOn(PharmacyPrismaRepository.prototype, 'startQueue')
            .mockResolvedValue({
                ...queue,
                status: PharmacyStatus.IN_PROGRESS,
            });

        const response = await request(app)
            .patch(`/api/pharmacy/queue/${queueId}/start`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['pharmacy:dispense:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(PharmacyStatus.IN_PROGRESS);
        expect(startSpy).toHaveBeenCalledWith(queueId, actorUserId);
    });

    it('dispenses queue items and maps API statuses to pharmacy statuses', async () => {
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'ensureDispensingItems',
        ).mockResolvedValue(undefined);
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'findQueueById',
        ).mockResolvedValue({
            ...queue,
            status: PharmacyStatus.IN_PROGRESS,
        });
        const dispenseSpy = jest
            .spyOn(PharmacyPrismaRepository.prototype, 'dispenseQueue')
            .mockResolvedValue({
                queue: {
                    ...queue,
                    status: PharmacyStatus.DISPENSED,
                    dispensingItems: [
                        {
                            ...queue.dispensingItems[0],
                            inventoryItemId,
                            quantityDispensed: 30,
                            status: PharmacyStatus.DISPENSED,
                        },
                    ],
                },
                outOfStockItems: [],
            });

        const response = await request(app)
            .post(`/api/pharmacy/queue/${queueId}/dispense`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['pharmacy:dispense:all'])}`,
            )
            .send({
                items: [
                    {
                        prescriptionItemId,
                        inventoryItemId,
                        quantityDispensed: 30,
                        status: 'dispensed',
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(PharmacyStatus.DISPENSED);
        expect(dispenseSpy).toHaveBeenCalledWith(
            queueId,
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        status: PharmacyStatus.DISPENSED,
                        inventoryItemId,
                    }),
                ],
            }),
        );
    });

    it('fulfills handled queue items', async () => {
        const handledQueue = {
            ...queue,
            status: PharmacyStatus.DISPENSED,
            dispensingItems: [
                {
                    ...queue.dispensingItems[0],
                    quantityDispensed: 30,
                    status: PharmacyStatus.DISPENSED,
                },
            ],
        };
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'ensureDispensingItems',
        ).mockResolvedValue(undefined);
        jest.spyOn(
            PharmacyPrismaRepository.prototype,
            'findQueueById',
        ).mockResolvedValue(handledQueue);
        const fulfillSpy = jest
            .spyOn(PharmacyPrismaRepository.prototype, 'fulfillQueue')
            .mockResolvedValue({
                ...handledQueue,
                status: PharmacyStatus.FULFILLED,
                processedAt: new Date('2026-05-21T09:00:00.000Z'),
            });

        const response = await request(app)
            .patch(`/api/pharmacy/queue/${queueId}/fulfill`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['pharmacy:dispense:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(PharmacyStatus.FULFILLED);
        expect(fulfillSpy).toHaveBeenCalledWith(
            queueId,
            expect.objectContaining({
                actorUserId,
            }),
        );
    });
});
