import {
    InventoryTransactionType,
    PharmacyStatus,
    Prisma,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    PharmacyDispenseResult,
    PharmacyRepository,
    DispensePharmacyQueueData,
    FulfillPharmacyQueueData,
    ListPharmacyQueueFilters,
} from '../domain/pharmacy.repository';
import {
    PharmacyDispensingItemView,
    PharmacyInventoryItemSummary,
    PharmacyPatientSummary,
    PharmacyQueueView,
    PharmacyStaffSummary,
} from '../domain/pharmacy.entity';

const pharmacyQueueInclude = {
    patient: {
        select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            allergies: true,
        },
    },
    prescription: {
        select: {
            id: true,
            issuedAt: true,
            expiresAt: true,
            notes: true,
            isVoided: true,
            staffProfile: {
                select: {
                    id: true,
                    userId: true,
                    employeeCode: true,
                    specialization: true,
                },
            },
        },
    },
    dispensingItems: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            prescriptionItem: {
                select: {
                    id: true,
                    medicationName: true,
                    dosage: true,
                    frequency: true,
                    durationInstructions: true,
                    quantityPrescribed: true,
                    quantityDispensed: true,
                    notes: true,
                },
            },
            inventoryItem: {
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    unitOfMeasure: true,
                    currentStock: true,
                    reorderLevel: true,
                    unitCost: true,
                    isActive: true,
                },
            },
        },
    },
} satisfies Prisma.PharmacyQueueInclude;

type PharmacyQueueRecord = Prisma.PharmacyQueueGetPayload<{
    include: typeof pharmacyQueueInclude;
}>;

type PharmacyClient = Prisma.TransactionClient | typeof prisma;

function decimalToNumber(value: unknown) {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        return Number(value);
    }

    if (value && typeof value === 'object' && 'toNumber' in value) {
        return (value as { toNumber: () => number }).toNumber();
    }

    return Number(value);
}

function toPatientSummary(
    patient: PharmacyQueueRecord['patient'],
): PharmacyPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffSummary(
    staff: PharmacyQueueRecord['prescription']['staffProfile'],
): PharmacyStaffSummary {
    return {
        ...staff,
        displayName: staff.specialization
            ? `${staff.employeeCode} - ${staff.specialization}`
            : staff.employeeCode,
    };
}

function toInventoryItemSummary(
    item: NonNullable<
        PharmacyQueueRecord['dispensingItems'][number]['inventoryItem']
    >,
): PharmacyInventoryItemSummary {
    return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        currentStock: decimalToNumber(item.currentStock),
        reorderLevel: decimalToNumber(item.reorderLevel),
        unitCost: item.unitCost === null ? null : decimalToNumber(item.unitCost),
        isActive: item.isActive,
    };
}

function toDispensingItemView(
    item: PharmacyQueueRecord['dispensingItems'][number],
): PharmacyDispensingItemView {
    return {
        id: item.id,
        pharmacyQueueId: item.pharmacyQueueId,
        prescriptionItemId: item.prescriptionItemId,
        inventoryItemId: item.inventoryItemId,
        quantityToDispense: item.quantityToDispense,
        quantityDispensed: item.quantityDispensed,
        status: item.status,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        prescriptionItem: item.prescriptionItem,
        inventoryItem: item.inventoryItem
            ? toInventoryItemSummary(item.inventoryItem)
            : null,
    };
}

function toQueueView(record: PharmacyQueueRecord): PharmacyQueueView {
    return {
        id: record.id,
        prescriptionId: record.prescriptionId,
        patientId: record.patientId,
        status: record.status,
        requestedAt: record.requestedAt,
        processedAt: record.processedAt,
        notes: record.notes,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        patient: toPatientSummary(record.patient),
        prescription: {
            id: record.prescription.id,
            issuedAt: record.prescription.issuedAt,
            expiresAt: record.prescription.expiresAt,
            notes: record.prescription.notes,
            isVoided: record.prescription.isVoided,
            staff: toStaffSummary(record.prescription.staffProfile),
        },
        dispensingItems: record.dispensingItems.map(toDispensingItemView),
    };
}

function isHandledStatus(status: PharmacyStatus) {
    const handledStatuses: PharmacyStatus[] = [
        PharmacyStatus.DISPENSED,
        PharmacyStatus.OUT_OF_STOCK,
        PharmacyStatus.SUBSTITUTED,
    ];

    return handledStatuses.includes(status);
}

async function findQueueByIdWithClient(client: PharmacyClient, id: string) {
    const record = await client.pharmacyQueue.findUnique({
        where: { id },
        include: pharmacyQueueInclude,
    });

    return record ? toQueueView(record) : null;
}

async function ensureDispensingItemsWithClient(
    client: PharmacyClient,
    id: string,
    actorUserId?: string,
) {
    const queue = await client.pharmacyQueue.findUnique({
        where: { id },
        select: {
            id: true,
            prescription: {
                select: {
                    items: {
                        select: {
                            id: true,
                            quantityPrescribed: true,
                        },
                    },
                },
            },
            dispensingItems: {
                select: {
                    prescriptionItemId: true,
                },
            },
        },
    });

    if (!queue) {
        return;
    }

    const existingItemIds = new Set(
        queue.dispensingItems.map((item) => item.prescriptionItemId),
    );
    const missingItems = queue.prescription.items.filter(
        (item) => !existingItemIds.has(item.id),
    );

    if (!missingItems.length) {
        return;
    }

    await client.pharmacyDispensingItem.createMany({
        data: missingItems.map((item) => ({
            pharmacyQueueId: id,
            prescriptionItemId: item.id,
            quantityToDispense: item.quantityPrescribed,
            createdBy: actorUserId,
            updatedBy: actorUserId,
        })),
        skipDuplicates: true,
    });
}

function nextQueueStatus(queue: PharmacyQueueView) {
    const hasHandledItems = queue.dispensingItems.some((item) =>
        isHandledStatus(item.status),
    );
    const allHandled = queue.dispensingItems.every((item) =>
        isHandledStatus(item.status),
    );

    if (allHandled) {
        return PharmacyStatus.DISPENSED;
    }

    if (hasHandledItems) {
        return PharmacyStatus.PARTIALLY_DISPENSED;
    }

    return PharmacyStatus.IN_PROGRESS;
}

export class PharmacyPrismaRepository implements PharmacyRepository {
    async listQueue(filters: ListPharmacyQueueFilters) {
        const where: Prisma.PharmacyQueueWhereInput = {};
        const skip = (filters.page - 1) * filters.limit;

        if (filters.status) {
            where.status = filters.status;
        }

        const [items, total] = await prisma.$transaction([
            prisma.pharmacyQueue.findMany({
                where,
                include: pharmacyQueueInclude,
                orderBy: [{ requestedAt: 'asc' }],
                skip,
                take: filters.limit,
            }),
            prisma.pharmacyQueue.count({ where }),
        ]);

        return {
            items: items.map(toQueueView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async findQueueById(id: string) {
        return findQueueByIdWithClient(prisma, id);
    }

    async ensureDispensingItems(id: string, actorUserId?: string) {
        await ensureDispensingItemsWithClient(prisma, id, actorUserId);
    }

    async startQueue(id: string, actorUserId?: string) {
        await prisma.pharmacyQueue.update({
            where: { id },
            data: {
                status: PharmacyStatus.IN_PROGRESS,
                updatedBy: actorUserId,
            },
        });

        const queue = await this.findQueueById(id);

        if (!queue) {
            throw new AppError('Pharmacy queue item not found', 404);
        }

        return queue;
    }

    async dispenseQueue(
        id: string,
        data: DispensePharmacyQueueData,
    ): Promise<PharmacyDispenseResult> {
        return prisma.$transaction(async (tx) => {
            await ensureDispensingItemsWithClient(tx, id, data.actorUserId);

            for (const item of data.items) {
                const updatedDispensingItem =
                    await tx.pharmacyDispensingItem.update({
                        where: {
                            pharmacyQueueId_prescriptionItemId: {
                                pharmacyQueueId: id,
                                prescriptionItemId: item.prescriptionItemId,
                            },
                        },
                        data: {
                            inventoryItemId: item.inventoryItemId ?? null,
                            quantityDispensed: item.quantityDispensed,
                            status: item.status,
                            notes: item.notes ?? null,
                            updatedBy: data.actorUserId,
                        },
                    });

                await tx.prescriptionItem.update({
                    where: { id: item.prescriptionItemId },
                    data: {
                        quantityDispensed: item.quantityDispensed,
                        updatedBy: data.actorUserId,
                    },
                });

                if (item.inventoryItemId && item.quantityDispensed > 0) {
                    const stockUpdate = await tx.inventoryItem.updateMany({
                        where: {
                            id: item.inventoryItemId,
                            isActive: true,
                            currentStock: {
                                gte: item.quantityDispensed,
                            },
                        },
                        data: {
                            currentStock: {
                                decrement: item.quantityDispensed,
                            },
                            updatedBy: data.actorUserId,
                        },
                    });

                    if (stockUpdate.count === 0) {
                        const inventoryItem = await tx.inventoryItem.findUnique({
                            where: { id: item.inventoryItemId },
                            select: {
                                id: true,
                                isActive: true,
                                currentStock: true,
                            },
                        });

                        if (!inventoryItem || !inventoryItem.isActive) {
                            throw new AppError(
                                'Inventory item not found or inactive',
                                404,
                            );
                        }

                        throw new AppError(
                            'Insufficient stock for inventory item',
                            409,
                        );
                    }

                    await tx.inventoryTransaction.create({
                        data: {
                            inventoryItemId: item.inventoryItemId,
                            transactionType: InventoryTransactionType.DISPENSED,
                            quantity: item.quantityDispensed,
                            referenceEntityType: 'pharmacy_dispensing_item',
                            referenceEntityId: updatedDispensingItem.id,
                            notes: item.notes ?? null,
                            performedByUserId: data.actorUserId,
                            createdBy: data.actorUserId,
                            updatedBy: data.actorUserId,
                        },
                    });
                }
            }

            const refreshedQueue = await findQueueByIdWithClient(tx, id);

            if (!refreshedQueue) {
                throw new AppError('Pharmacy queue item not found', 404);
            }

            await tx.pharmacyQueue.update({
                where: { id },
                data: {
                    status: nextQueueStatus(refreshedQueue),
                    updatedBy: data.actorUserId,
                },
            });

            const queue = await findQueueByIdWithClient(tx, id);

            if (!queue) {
                throw new AppError('Pharmacy queue item not found', 404);
            }

            const outOfStockIds = new Set(
                data.items
                    .filter((item) => item.status === PharmacyStatus.OUT_OF_STOCK)
                    .map((item) => item.prescriptionItemId),
            );

            return {
                queue,
                outOfStockItems: queue.dispensingItems
                    .filter((item) => outOfStockIds.has(item.prescriptionItemId))
                    .map((item) => ({
                        prescriptionItemId: item.prescriptionItemId,
                        medicationName: item.prescriptionItem.medicationName,
                        dosage: item.prescriptionItem.dosage,
                        quantityRequested: item.quantityToDispense,
                    })),
            };
        });
    }

    async fulfillQueue(id: string, data: FulfillPharmacyQueueData) {
        const queue = await prisma.pharmacyQueue.update({
            where: { id },
            data: {
                status: PharmacyStatus.FULFILLED,
                processedAt: data.fulfilledAt,
                updatedBy: data.actorUserId,
            },
            include: pharmacyQueueInclude,
        });

        return toQueueView(queue);
    }
}
