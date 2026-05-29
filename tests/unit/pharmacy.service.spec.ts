import { PharmacyStatus } from '../../src/generated/prisma';
import { PharmacyEventPublisher } from '../../src/modules/pharmacy/domain/pharmacy-event.publisher';
import { PharmacyQueueView } from '../../src/modules/pharmacy/domain/pharmacy.entity';
import { PharmacyRepository } from '../../src/modules/pharmacy/domain/pharmacy.repository';
import { PharmacyService } from '../../src/modules/pharmacy/services/pharmacy.service';

const queueId = 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const doctorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const actorUserId = '2cded68b-2455-4104-87ea-cc3b78d2aa6a';
const prescriptionItemId = '4149ce17-a874-4545-a51d-3f046c19af6f';
const inventoryItemId = '1a0d36f8-22f0-4ed3-912c-50f1dc4b706b';
const now = new Date('2026-05-21T12:00:00.000Z');

const queue: PharmacyQueueView = {
    id: queueId,
    prescriptionId,
    patientId,
    status: PharmacyStatus.IN_PROGRESS,
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
        expiresAt: new Date('2026-06-21T08:30:00.000Z'),
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

function createRepositoryMock(): jest.Mocked<PharmacyRepository> {
    return {
        listQueue: jest.fn(),
        findQueueById: jest.fn(),
        ensureDispensingItems: jest.fn(),
        startQueue: jest.fn(),
        dispenseQueue: jest.fn(),
        fulfillQueue: jest.fn(),
    };
}

function createEventPublisherMock(): jest.Mocked<PharmacyEventPublisher> {
    return {
        publish: jest.fn(),
    };
}

describe('PharmacyService', () => {
    it('starts a pending queue item for dispensing', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findQueueById.mockResolvedValue({
            ...queue,
            status: PharmacyStatus.PENDING,
        });
        repository.startQueue.mockResolvedValue(queue);
        const service = new PharmacyService(repository, eventPublisher);

        const result = await service.startQueue(queueId, actorUserId);

        expect(result.status).toBe(PharmacyStatus.IN_PROGRESS);
        expect(repository.ensureDispensingItems).toHaveBeenCalledWith(
            queueId,
            actorUserId,
        );
        expect(repository.startQueue).toHaveBeenCalledWith(queueId, actorUserId);
    });

    it('dispenses medication with inventory data', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findQueueById.mockResolvedValue(queue);
        repository.dispenseQueue.mockResolvedValue({
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
        const service = new PharmacyService(repository, eventPublisher);

        const result = await service.dispenseQueue(queueId, {
            items: [
                {
                    prescriptionItemId,
                    inventoryItemId,
                    quantityDispensed: 30,
                    status: PharmacyStatus.DISPENSED,
                    notes: ' Given   at counter ',
                },
            ],
            actorUserId,
        });

        expect(result.status).toBe(PharmacyStatus.DISPENSED);
        expect(repository.dispenseQueue).toHaveBeenCalledWith(
            queueId,
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        prescriptionItemId,
                        inventoryItemId,
                        quantityDispensed: 30,
                        status: PharmacyStatus.DISPENSED,
                        notes: 'Given at counter',
                    }),
                ],
            }),
        );
        expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('publishes out-of-stock events when a medication cannot be dispensed', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findQueueById.mockResolvedValue(queue);
        repository.dispenseQueue.mockResolvedValue({
            queue: {
                ...queue,
                status: PharmacyStatus.DISPENSED,
                dispensingItems: [
                    {
                        ...queue.dispensingItems[0],
                        quantityDispensed: 0,
                        status: PharmacyStatus.OUT_OF_STOCK,
                    },
                ],
            },
            outOfStockItems: [
                {
                    prescriptionItemId,
                    medicationName: 'Aspirin',
                    dosage: '81 mg',
                    quantityRequested: 30,
                },
            ],
        });
        const service = new PharmacyService(repository, eventPublisher);

        await service.dispenseQueue(queueId, {
            items: [
                {
                    prescriptionItemId,
                    status: PharmacyStatus.OUT_OF_STOCK,
                    quantityDispensed: 10,
                },
            ],
            actorUserId,
        });

        expect(repository.dispenseQueue).toHaveBeenCalledWith(
            queueId,
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        inventoryItemId: null,
                        quantityDispensed: 0,
                        status: PharmacyStatus.OUT_OF_STOCK,
                    }),
                ],
            }),
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            'MedicationOutOfStock',
            expect.objectContaining({
                actorUserId,
                outOfStockItems: [
                    expect.objectContaining({
                        medicationName: 'Aspirin',
                    }),
                ],
            }),
        );
    });

    it('blocks fulfillment until all prescription items are handled', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findQueueById.mockResolvedValue(queue);
        const service = new PharmacyService(repository, eventPublisher);

        await expect(service.fulfillQueue(queueId, actorUserId)).rejects.toMatchObject(
            {
                message: 'All pharmacy queue items must be handled before fulfillment',
                statusCode: 409,
            },
        );
        expect(repository.fulfillQueue).not.toHaveBeenCalled();
    });

    it('fulfills a handled queue item and publishes a patient notification event', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
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
        repository.findQueueById.mockResolvedValue(handledQueue);
        repository.fulfillQueue.mockResolvedValue({
            ...handledQueue,
            status: PharmacyStatus.FULFILLED,
            processedAt: now,
        });
        const service = new PharmacyService(repository, eventPublisher, () => now);

        const result = await service.fulfillQueue(queueId, actorUserId);

        expect(result.status).toBe(PharmacyStatus.FULFILLED);
        expect(repository.fulfillQueue).toHaveBeenCalledWith(queueId, {
            fulfilledAt: now,
            actorUserId,
        });
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            'PrescriptionFulfilled',
            expect.objectContaining({ actorUserId }),
        );
    });
});
