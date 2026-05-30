import { InventoryTransactionType, Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    InventoryAlertItem,
    InventoryAlertsResult,
    InventoryCategoryEntity,
    InventoryItemEntity,
    InventoryTransactionEntity,
} from '../domain/inventory.entity';
import {
    CreateInventoryCategoryData,
    CreateInventoryItemData,
    InventoryRepository,
    ListInventoryCategoriesFilters,
    ListInventoryItemsFilters,
    ListInventoryTransactionsFilters,
    RecordInventoryTransactionData,
    UpdateInventoryCategoryData,
    UpdateInventoryItemData,
} from '../domain/inventory.repository';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const categoryInclude = {
    parent: {
        select: {
            id: true,
            name: true,
        },
    },
} satisfies Prisma.InventoryCategoryInclude;

const itemInclude = {
    inventoryCategory: {
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    },
    department: {
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    },
} satisfies Prisma.InventoryItemInclude;

type InventoryCategoryRecord = Prisma.InventoryCategoryGetPayload<{
    include: typeof categoryInclude;
}>;

type InventoryItemRecord = Prisma.InventoryItemGetPayload<{
    include: typeof itemInclude;
}>;

type InventoryClient = Prisma.TransactionClient | typeof prisma;

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

function toCategoryEntity(record: InventoryCategoryRecord): InventoryCategoryEntity {
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        parentId: record.parentId,
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        parent: record.parent,
    };
}

function toItemEntity(record: InventoryItemRecord): InventoryItemEntity {
    return {
        id: record.id,
        categoryId: record.inventoryCategoryId,
        departmentId: record.departmentId,
        sku: record.sku,
        name: record.name,
        description: record.description,
        unitOfMeasure: record.unitOfMeasure,
        currentStock: decimalToNumber(record.currentStock),
        reorderLevel: decimalToNumber(record.reorderLevel),
        unitCost: record.unitCost === null ? null : decimalToNumber(record.unitCost),
        expiryDate: record.expiryDate,
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        category: record.inventoryCategory,
        department: record.department,
    };
}

function toTransactionEntity(record: {
    id: string;
    inventoryItemId: string;
    transactionType: InventoryTransactionType;
    quantity: unknown;
    unitCost: unknown | null;
    batchNumber: string | null;
    expiryDate: Date | null;
    referenceEntityType: string | null;
    referenceEntityId: string | null;
    notes: string | null;
    performedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
}): InventoryTransactionEntity {
    return {
        id: record.id,
        itemId: record.inventoryItemId,
        transactionType: record.transactionType,
        quantity: decimalToNumber(record.quantity),
        unitCost: record.unitCost === null ? null : decimalToNumber(record.unitCost),
        batchNumber: record.batchNumber,
        expiryDate: record.expiryDate,
        referenceEntityType: record.referenceEntityType,
        referenceEntityId: record.referenceEntityId,
        notes: record.notes,
        performedByUserId: record.performedByUserId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

function totalPages(total: number, limit: number) {
    return total === 0 ? 0 : Math.ceil(total / limit);
}

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_IN_MS);
}

function alertItem(
    type: InventoryAlertItem['type'],
    item: InventoryItemEntity,
    now: Date,
): InventoryAlertItem {
    return {
        type,
        item,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        expiryDate: item.expiryDate,
        daysUntilExpiry: item.expiryDate
            ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / DAY_IN_MS)
            : null,
    };
}

async function findItem(client: InventoryClient, id: string) {
    return client.inventoryItem.findUnique({
        where: { id },
        include: itemInclude,
    });
}

export class InventoryPrismaRepository implements InventoryRepository {
    async createCategory(data: CreateInventoryCategoryData): Promise<InventoryCategoryEntity> {
        const category = await prisma.inventoryCategory.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                parentId: data.parentId ?? null,
                isActive: data.isActive,
                createdBy: data.actorUserId ?? null,
                updatedBy: data.actorUserId ?? null,
            },
            include: categoryInclude,
        });

        return toCategoryEntity(category);
    }

    async findCategoryById(id: string): Promise<InventoryCategoryEntity | null> {
        const category = await prisma.inventoryCategory.findUnique({
            where: { id },
            include: categoryInclude,
        });

        return category ? toCategoryEntity(category) : null;
    }

    async findCategoryByName(name: string): Promise<InventoryCategoryEntity | null> {
        const category = await prisma.inventoryCategory.findUnique({
            where: { name },
            include: categoryInclude,
        });

        return category ? toCategoryEntity(category) : null;
    }

    async listCategories(filters: ListInventoryCategoriesFilters) {
        const where: Prisma.InventoryCategoryWhereInput = {};

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const skip = (filters.page - 1) * filters.limit;
        const [items, total] = await prisma.$transaction([
            prisma.inventoryCategory.findMany({
                where,
                orderBy: [{ name: 'asc' }],
                skip,
                take: filters.limit,
                include: categoryInclude,
            }),
            prisma.inventoryCategory.count({ where }),
        ]);

        return {
            items: items.map(toCategoryEntity),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: totalPages(total, filters.limit),
            },
        };
    }

    async updateCategory(id: string, data: UpdateInventoryCategoryData): Promise<InventoryCategoryEntity> {
        const category = await prisma.inventoryCategory.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                parentId: data.parentId,
                isActive: data.isActive,
                updatedBy: data.actorUserId ?? null,
            },
            include: categoryInclude,
        });

        return toCategoryEntity(category);
    }

    async deactivateCategory(id: string, actorUserId?: string): Promise<InventoryCategoryEntity> {
        const category = await prisma.inventoryCategory.update({
            where: { id },
            data: {
                isActive: false,
                updatedBy: actorUserId ?? null,
            },
            include: categoryInclude,
        });

        return toCategoryEntity(category);
    }

    async createItem(data: CreateInventoryItemData): Promise<InventoryItemEntity> {
        const item = await prisma.inventoryItem.create({
            data: {
                inventoryCategoryId: data.categoryId,
                departmentId: data.departmentId ?? null,
                sku: data.sku,
                name: data.name,
                description: data.description ?? null,
                unitOfMeasure: data.unitOfMeasure,
                currentStock: data.currentStock ?? 0,
                reorderLevel: data.reorderLevel ?? 0,
                unitCost: data.unitCost ?? null,
                expiryDate: data.expiryDate ?? null,
                isActive: data.isActive,
                createdBy: data.actorUserId ?? null,
                updatedBy: data.actorUserId ?? null,
            },
            include: itemInclude,
        });

        return toItemEntity(item);
    }

    async findItemById(id: string): Promise<InventoryItemEntity | null> {
        const item = await findItem(prisma, id);

        return item ? toItemEntity(item) : null;
    }

    async findItemBySku(sku: string): Promise<InventoryItemEntity | null> {
        const item = await prisma.inventoryItem.findUnique({
            where: { sku },
            include: itemInclude,
        });

        return item ? toItemEntity(item) : null;
    }

    async listItems(filters: ListInventoryItemsFilters) {
        const where: Prisma.InventoryItemWhereInput = {};

        if (filters.categoryId) {
            where.inventoryCategoryId = filters.categoryId;
        }

        if (filters.departmentId) {
            where.departmentId = filters.departmentId;
        }

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        if (filters.belowReorderLevel) {
            where.currentStock = {
                lte: prisma.inventoryItem.fields.reorderLevel,
            };
        }

        if (filters.expiringSoonDays !== undefined) {
            where.expiryDate = {
                lte: addDays(filters.now ?? new Date(), filters.expiringSoonDays),
            };
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const orderBy = filters.sortBy
            ? [{ [filters.sortBy === 'sku' ? 'sku' : filters.sortBy]: filters.sortDirection ?? 'asc' }]
            : [{ name: 'asc' as const }, { sku: 'asc' as const }];
        const skip = (filters.page - 1) * filters.limit;
        const [items, total] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where,
                orderBy,
                skip,
                take: filters.limit,
                include: itemInclude,
            }),
            prisma.inventoryItem.count({ where }),
        ]);

        return {
            items: items.map(toItemEntity),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: totalPages(total, filters.limit),
            },
        };
    }

    async updateItem(id: string, data: UpdateInventoryItemData): Promise<InventoryItemEntity> {
        const item = await prisma.inventoryItem.update({
            where: { id },
            data: {
                inventoryCategoryId: data.categoryId,
                departmentId: data.departmentId,
                sku: data.sku,
                name: data.name,
                description: data.description,
                unitOfMeasure: data.unitOfMeasure,
                currentStock: data.currentStock,
                reorderLevel: data.reorderLevel,
                unitCost: data.unitCost,
                expiryDate: data.expiryDate,
                isActive: data.isActive,
                updatedBy: data.actorUserId ?? null,
            },
            include: itemInclude,
        });

        return toItemEntity(item);
    }

    async deactivateItem(id: string, actorUserId?: string): Promise<InventoryItemEntity> {
        const item = await prisma.inventoryItem.update({
            where: { id },
            data: {
                isActive: false,
                updatedBy: actorUserId ?? null,
            },
            include: itemInclude,
        });

        return toItemEntity(item);
    }

    async recordTransaction(itemId: string, data: RecordInventoryTransactionData) {
        return prisma.$transaction(async (tx) => {
            const item = await findItem(tx, itemId);

            if (!item) {
                throw new AppError('Inventory item not found', 404);
            }

            if (data.transactionType === InventoryTransactionType.RECEIVED) {
                await tx.inventoryItem.update({
                    where: { id: itemId },
                    data: {
                        currentStock: { increment: data.quantity },
                        updatedBy: data.actorUserId ?? null,
                    },
                });
            } else if (data.transactionType === InventoryTransactionType.WRITTEN_OFF) {
                const updated = await tx.inventoryItem.updateMany({
                    where: {
                        id: itemId,
                        currentStock: { gte: data.quantity },
                    },
                    data: {
                        currentStock: { decrement: data.quantity },
                        updatedBy: data.actorUserId ?? null,
                    },
                });

                if (updated.count === 0) {
                    throw new AppError('Quantity cannot exceed current stock', 409);
                }
            } else if (data.transactionType === InventoryTransactionType.ADJUSTED) {
                await tx.inventoryItem.update({
                    where: { id: itemId },
                    data: {
                        currentStock: data.resultingStock ?? data.quantity,
                        updatedBy: data.actorUserId ?? null,
                    },
                });
            } else {
                await tx.inventoryItem.update({
                    where: { id: itemId },
                    data: {
                        departmentId: data.targetDepartmentId ?? item.departmentId,
                        updatedBy: data.actorUserId ?? null,
                    },
                });
            }

            const transactions = data.transactionType === InventoryTransactionType.TRANSFERRED
                ? await this.createTransferTransactions(tx, item, data)
                : [
                    await this.createTransaction(tx, itemId, data),
                ];
            const updatedItem = await findItem(tx, itemId);

            if (!updatedItem) {
                throw new AppError('Inventory item not found', 404);
            }

            return {
                item: toItemEntity(updatedItem),
                transactions: transactions.map(toTransactionEntity),
            };
        });
    }

    async listTransactions(itemId: string, filters: ListInventoryTransactionsFilters) {
        const where: Prisma.InventoryTransactionWhereInput = {
            inventoryItemId: itemId,
        };
        const skip = (filters.page - 1) * filters.limit;
        const [items, total] = await prisma.$transaction([
            prisma.inventoryTransaction.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.inventoryTransaction.count({ where }),
        ]);

        return {
            items: items.map(toTransactionEntity),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: totalPages(total, filters.limit),
            },
        };
    }

    async getAlerts(filters: { expiringSoonDays: number; now: Date }): Promise<InventoryAlertsResult> {
        const expiryLimit = addDays(filters.now, filters.expiringSoonDays);
        const [lowStockRecords, expiringRecords] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where: {
                    isActive: true,
                    currentStock: {
                        lte: prisma.inventoryItem.fields.reorderLevel,
                    },
                },
                include: itemInclude,
                orderBy: [{ currentStock: 'asc' }, { name: 'asc' }],
            }),
            prisma.inventoryItem.findMany({
                where: {
                    isActive: true,
                    expiryDate: {
                        lte: expiryLimit,
                    },
                },
                include: itemInclude,
                orderBy: [{ expiryDate: 'asc' }, { name: 'asc' }],
            }),
        ]);
        const lowStockItems = lowStockRecords.map(toItemEntity);
        const expiringItems = expiringRecords.map(toItemEntity);

        return {
            generatedAt: filters.now,
            expiringSoonDays: filters.expiringSoonDays,
            criticalShortage: lowStockItems
                .filter((item) => item.currentStock <= 0)
                .map((item) => alertItem('critical_shortage', item, filters.now)),
            lowStock: lowStockItems
                .filter((item) => item.currentStock > 0)
                .map((item) => alertItem('low_stock', item, filters.now)),
            expiringSoon: expiringItems.map((item) =>
                alertItem('expiring_soon', item, filters.now),
            ),
        };
    }

    async categoryExists(id: string): Promise<boolean> {
        const category = await prisma.inventoryCategory.findUnique({
            where: { id },
            select: { id: true },
        });

        return Boolean(category);
    }

    async departmentExists(id: string): Promise<boolean> {
        const department = await prisma.department.findUnique({
            where: { id },
            select: { id: true },
        });

        return Boolean(department);
    }

    private createTransaction(
        tx: Prisma.TransactionClient,
        itemId: string,
        data: RecordInventoryTransactionData,
    ) {
        return tx.inventoryTransaction.create({
            data: {
                inventoryItemId: itemId,
                transactionType: data.transactionType,
                quantity: data.quantity,
                unitCost: data.unitCost ?? null,
                batchNumber: data.batchNumber ?? null,
                expiryDate: data.expiryDate ?? null,
                referenceEntityType: data.referenceEntityType ?? null,
                referenceEntityId: data.referenceEntityId ?? null,
                notes: data.notes,
                performedByUserId: data.actorUserId ?? null,
                createdBy: data.actorUserId ?? null,
                updatedBy: data.actorUserId ?? null,
            },
        });
    }

    private createTransferTransactions(
        tx: Prisma.TransactionClient,
        item: InventoryItemRecord,
        data: RecordInventoryTransactionData,
    ) {
        const sourceDepartmentId = item.departmentId;

        return Promise.all([
            tx.inventoryTransaction.create({
                data: {
                    inventoryItemId: item.id,
                    transactionType: InventoryTransactionType.TRANSFERRED,
                    quantity: data.quantity,
                    referenceEntityType: 'source_department',
                    referenceEntityId: sourceDepartmentId,
                    notes: data.notes,
                    performedByUserId: data.actorUserId ?? null,
                    createdBy: data.actorUserId ?? null,
                    updatedBy: data.actorUserId ?? null,
                },
            }),
            tx.inventoryTransaction.create({
                data: {
                    inventoryItemId: item.id,
                    transactionType: InventoryTransactionType.TRANSFERRED,
                    quantity: data.quantity,
                    referenceEntityType: 'target_department',
                    referenceEntityId: data.targetDepartmentId ?? null,
                    notes: data.notes,
                    performedByUserId: data.actorUserId ?? null,
                    createdBy: data.actorUserId ?? null,
                    updatedBy: data.actorUserId ?? null,
                },
            }),
        ]);
    }
}
