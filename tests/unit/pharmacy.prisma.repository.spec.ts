import {
    InventoryTransactionType,
    PharmacyStatus,
} from '../../src/generated/prisma';

const mockPrisma = {
    $transaction: jest.fn(),
};

jest.mock('../../src/infrastructure/db/prisma', () => ({
    prisma: mockPrisma,
}));

import { PharmacyPrismaRepository } from '../../src/modules/pharmacy/infrastructure/pharmacy.prisma.repository';

const queueId = 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const doctorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const actorUserId = '2cded68b-2455-4104-87ea-cc3b78d2aa6a';
const prescriptionItemId = '4149ce17-a874-4545-a51d-3f046c19af6f';
const dispensingItemId = 'f8b1b3b1-7186-492f-87bb-1d194da8e0aa1';
const inventoryItemId = '1a0d36f8-22f0-4ed3-912c-50f1dc4b706b';

function createQueueRecord(status: PharmacyStatus) {
    return {
        id: queueId,
        prescriptionId,
        patientId,
        status,
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
        },
        prescription: {
            id: prescriptionId,
            issuedAt: new Date('2026-05-21T08:30:00.000Z'),
            expiresAt: null,
            notes: null,
            isVoided: false,
            staffProfile: {
                id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
                userId: doctorUserId,
                employeeCode: 'DR-001',
                specialization: 'Cardiologist',
            },
        },
        dispensingItems: [
            {
                id: dispensingItemId,
                pharmacyQueueId: queueId,
                prescriptionItemId,
                inventoryItemId,
                quantityToDispense: 30,
                quantityDispensed: 30,
                status: PharmacyStatus.DISPENSED,
                notes: 'Given at counter',
                createdAt: new Date('2026-05-21T08:30:00.000Z'),
                updatedAt: new Date('2026-05-21T08:30:00.000Z'),
                prescriptionItem: {
                    id: prescriptionItemId,
                    medicationName: 'Aspirin',
                    dosage: '81 mg',
                    frequency: 'Once daily',
                    durationInstructions: '30 days',
                    quantityPrescribed: 30,
                    quantityDispensed: 30,
                    notes: null,
                },
                inventoryItem: {
                    id: inventoryItemId,
                    sku: 'ASP-81',
                    name: 'Aspirin 81 mg',
                    unitOfMeasure: 'tablet',
                    currentStock: 70,
                    reorderLevel: 20,
                    unitCost: 1,
                    isActive: true,
                },
            },
        ],
    };
}

describe('PharmacyPrismaRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('decrements inventory and records a transaction when dispensing medication', async () => {
        const tx = {
            pharmacyQueue: {
                findUnique: jest
                    .fn()
                    .mockResolvedValueOnce({
                        id: queueId,
                        prescription: {
                            items: [
                                {
                                    id: prescriptionItemId,
                                    quantityPrescribed: 30,
                                },
                            ],
                        },
                        dispensingItems: [
                            {
                                prescriptionItemId,
                            },
                        ],
                    })
                    .mockResolvedValueOnce(createQueueRecord(PharmacyStatus.IN_PROGRESS))
                    .mockResolvedValueOnce(createQueueRecord(PharmacyStatus.DISPENSED)),
                update: jest.fn().mockResolvedValue(undefined),
            },
            pharmacyDispensingItem: {
                createMany: jest.fn(),
                update: jest.fn().mockResolvedValue({
                    id: dispensingItemId,
                }),
            },
            prescriptionItem: {
                update: jest.fn().mockResolvedValue(undefined),
            },
            inventoryItem: {
                updateMany: jest.fn().mockResolvedValue({
                    count: 1,
                }),
                findUnique: jest.fn(),
            },
            inventoryTransaction: {
                create: jest.fn().mockResolvedValue(undefined),
            },
        };
        mockPrisma.$transaction.mockImplementation(async (callback) =>
            callback(tx),
        );
        const repository = new PharmacyPrismaRepository();

        const result = await repository.dispenseQueue(queueId, {
            items: [
                {
                    prescriptionItemId,
                    inventoryItemId,
                    quantityDispensed: 30,
                    status: PharmacyStatus.DISPENSED,
                    notes: 'Given at counter',
                },
            ],
            actorUserId,
        });

        expect(result.queue.status).toBe(PharmacyStatus.DISPENSED);
        expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: inventoryItemId,
                    isActive: true,
                    currentStock: {
                        gte: 30,
                    },
                }),
                data: expect.objectContaining({
                    currentStock: {
                        decrement: 30,
                    },
                }),
            }),
        );
        expect(tx.inventoryTransaction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                inventoryItemId,
                transactionType: InventoryTransactionType.DISPENSED,
                quantity: 30,
                referenceEntityType: 'pharmacy_dispensing_item',
                referenceEntityId: dispensingItemId,
                performedByUserId: actorUserId,
            }),
        });
        expect(tx.pharmacyQueue.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: PharmacyStatus.DISPENSED,
                }),
            }),
        );
    });
});
