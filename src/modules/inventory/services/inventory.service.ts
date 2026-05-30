import { InventoryTransactionType } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import { InventoryEventPublisher, InventoryEventType } from '../domain/inventory-event.publisher';
import { InventoryItemEntity, InventoryTransactionKind } from '../domain/inventory.entity';
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
import {
    normalizeOptionalText,
    normalizeRequiredText,
    normalizeSearch,
    normalizeSku,
} from '../domain/inventory.normalizer';

const DEFAULT_EXPIRY_ALERT_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function transactionTypeFor(kind: InventoryTransactionKind) {
    if (kind === 'in') {
        return InventoryTransactionType.RECEIVED;
    }

    if (kind === 'out') {
        return InventoryTransactionType.WRITTEN_OFF;
    }

    if (kind === 'transfer') {
        return InventoryTransactionType.TRANSFERRED;
    }

    return InventoryTransactionType.ADJUSTED;
}

function expiryThreshold(now: Date, days = DEFAULT_EXPIRY_ALERT_DAYS) {
    return new Date(now.getTime() + days * DAY_IN_MS);
}

export class InventoryService {
    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly eventPublisher: InventoryEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async createCategory(data: CreateInventoryCategoryData) {
        const name = normalizeRequiredText(data.name);

        if (!name) {
            throw new AppError('Category name is required', 400);
        }

        const existing = await this.inventoryRepository.findCategoryByName(name);

        if (existing) {
            throw new AppError('Inventory category already exists', 409);
        }

        if (data.parentId) {
            const parentExists = await this.inventoryRepository.categoryExists(data.parentId);

            if (!parentExists) {
                throw new AppError('Parent inventory category not found', 404);
            }
        }

        return this.inventoryRepository.createCategory({
            name,
            description: normalizeOptionalText(data.description),
            parentId: data.parentId ?? null,
            isActive: data.isActive,
            actorUserId: data.actorUserId,
        });
    }

    async listCategories(filters: ListInventoryCategoriesFilters) {
        return this.inventoryRepository.listCategories({
            ...filters,
            search: normalizeSearch(filters.search),
        });
    }

    async getCategoryById(id: string) {
        const category = await this.inventoryRepository.findCategoryById(id);

        if (!category) {
            throw new AppError('Inventory category not found', 404);
        }

        return category;
    }

    async updateCategory(id: string, data: UpdateInventoryCategoryData) {
        const existing = await this.getCategoryById(id);
        const updateData: UpdateInventoryCategoryData = {
            actorUserId: data.actorUserId,
        };

        if (data.name !== undefined) {
            const name = normalizeRequiredText(data.name);

            if (!name) {
                throw new AppError('Category name is required', 400);
            }

            if (name !== existing.name) {
                const duplicate = await this.inventoryRepository.findCategoryByName(name);

                if (duplicate && duplicate.id !== id) {
                    throw new AppError('Inventory category already exists', 409);
                }
            }

            updateData.name = name;
        }

        if (data.description !== undefined) {
            updateData.description = normalizeOptionalText(data.description);
        }

        if (data.parentId !== undefined) {
            if (data.parentId === id) {
                throw new AppError('Category cannot be its own parent', 400);
            }

            if (data.parentId) {
                const parentExists = await this.inventoryRepository.categoryExists(data.parentId);

                if (!parentExists) {
                    throw new AppError('Parent inventory category not found', 404);
                }
            }

            updateData.parentId = data.parentId;
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (Object.keys(updateData).length === 1) {
            throw new AppError('At least one category field is required', 400);
        }

        return this.inventoryRepository.updateCategory(id, updateData);
    }

    async deactivateCategory(id: string, actorUserId?: string) {
        const existing = await this.getCategoryById(id);

        if (!existing.isActive) {
            return existing;
        }

        return this.inventoryRepository.deactivateCategory(id, actorUserId);
    }

    async createItem(data: CreateInventoryItemData) {
        const itemData = await this.normalizeCreateItem(data);
        const created = await this.inventoryRepository.createItem(itemData);

        await this.publishItemAlerts(created, data.actorUserId);

        return created;
    }

    async listItems(filters: ListInventoryItemsFilters) {
        return this.inventoryRepository.listItems({
            ...filters,
            search: normalizeSearch(filters.search),
            now: filters.now ?? this.nowProvider(),
        });
    }

    async getItemById(id: string) {
        const item = await this.inventoryRepository.findItemById(id);

        if (!item) {
            throw new AppError('Inventory item not found', 404);
        }

        return item;
    }

    async updateItem(id: string, data: UpdateInventoryItemData) {
        const existing = await this.getItemById(id);
        const updateData = await this.normalizeUpdateItem(id, existing, data);

        if (Object.keys(updateData).length === 1) {
            throw new AppError('At least one item field is required', 400);
        }

        const updated = await this.inventoryRepository.updateItem(id, updateData);

        await this.publishItemAlerts(updated, data.actorUserId);

        return updated;
    }

    async deactivateItem(id: string, actorUserId?: string) {
        const existing = await this.getItemById(id);

        if (!existing.isActive) {
            return existing;
        }

        return this.inventoryRepository.deactivateItem(id, actorUserId);
    }

    async recordTransaction(
        itemId: string,
        data: {
            type: InventoryTransactionKind;
            quantity: number;
            reason: string;
            unitCost?: number | null;
            batchNumber?: string | null;
            expiryDate?: Date | null;
            referenceEntityType?: string | null;
            referenceEntityId?: string | null;
            targetDepartmentId?: string | null;
            actorUserId?: string;
        },
    ) {
        const item = await this.getItemById(itemId);

        if (!item.isActive) {
            throw new AppError('Inactive inventory items cannot receive transactions', 409);
        }

        const reason = normalizeRequiredText(data.reason);

        if (!reason) {
            throw new AppError('Transaction reason is required', 400);
        }

        if (data.type === 'adjustment') {
            if (data.quantity < 0) {
                throw new AppError('Adjusted stock cannot be negative', 400);
            }
        } else if (data.quantity <= 0) {
            throw new AppError('Transaction quantity must be greater than zero', 400);
        }

        if ((data.type === 'out' || data.type === 'transfer') && data.quantity > item.currentStock) {
            throw new AppError('Quantity cannot exceed current stock', 409);
        }

        if (data.type === 'transfer') {
            if (!data.targetDepartmentId) {
                throw new AppError('Target department is required for stock transfer', 400);
            }

            const departmentExists = await this.inventoryRepository.departmentExists(data.targetDepartmentId);

            if (!departmentExists) {
                throw new AppError('Target department not found', 404);
            }
        }

        const repositoryData: RecordInventoryTransactionData = {
            transactionType: transactionTypeFor(data.type),
            quantity: data.quantity,
            resultingStock: this.resultingStock(item, data.type, data.quantity),
            unitCost: data.unitCost ?? null,
            batchNumber: normalizeOptionalText(data.batchNumber),
            expiryDate: data.expiryDate ?? null,
            referenceEntityType: normalizeOptionalText(data.referenceEntityType),
            referenceEntityId: normalizeOptionalText(data.referenceEntityId),
            notes: reason,
            targetDepartmentId: data.targetDepartmentId ?? null,
            actorUserId: data.actorUserId,
        };

        const result = await this.inventoryRepository.recordTransaction(itemId, repositoryData);

        await this.publishItemAlerts(result.item, data.actorUserId);

        return result;
    }

    async listTransactions(itemId: string, filters: ListInventoryTransactionsFilters) {
        await this.getItemById(itemId);

        return this.inventoryRepository.listTransactions(itemId, filters);
    }

    async getAlerts(expiringSoonDays = DEFAULT_EXPIRY_ALERT_DAYS) {
        return this.inventoryRepository.getAlerts({
            expiringSoonDays,
            now: this.nowProvider(),
        });
    }

    private async normalizeCreateItem(data: CreateInventoryItemData): Promise<CreateInventoryItemData> {
        const sku = normalizeSku(data.sku);
        const name = normalizeRequiredText(data.name);
        const unitOfMeasure = normalizeRequiredText(data.unitOfMeasure);

        if (!name) {
            throw new AppError('Item name is required', 400);
        }

        if (!unitOfMeasure) {
            throw new AppError('Unit of measure is required', 400);
        }

        const duplicate = await this.inventoryRepository.findItemBySku(sku);

        if (duplicate) {
            throw new AppError('Inventory item SKU already exists', 409);
        }

        if ((data.currentStock ?? 0) < 0) {
            throw new AppError('Current stock cannot be negative', 400);
        }

        if ((data.reorderLevel ?? 0) < 0) {
            throw new AppError('Reorder level cannot be negative', 400);
        }

        if (data.unitCost !== undefined && data.unitCost !== null && data.unitCost < 0) {
            throw new AppError('Unit cost cannot be negative', 400);
        }

        await this.ensureCategory(data.categoryId);

        if (data.departmentId) {
            await this.ensureDepartment(data.departmentId);
        }

        return {
            categoryId: data.categoryId,
            departmentId: data.departmentId ?? null,
            sku,
            name,
            description: normalizeOptionalText(data.description),
            unitOfMeasure,
            currentStock: data.currentStock ?? 0,
            reorderLevel: data.reorderLevel ?? 0,
            unitCost: data.unitCost ?? null,
            expiryDate: data.expiryDate ?? null,
            isActive: data.isActive,
            actorUserId: data.actorUserId,
        };
    }

    private async normalizeUpdateItem(
        id: string,
        existing: InventoryItemEntity,
        data: UpdateInventoryItemData,
    ): Promise<UpdateInventoryItemData> {
        const updateData: UpdateInventoryItemData = {
            actorUserId: data.actorUserId,
        };

        if (data.sku !== undefined) {
            const sku = normalizeSku(data.sku);

            if (sku !== existing.sku) {
                const duplicate = await this.inventoryRepository.findItemBySku(sku);

                if (duplicate && duplicate.id !== id) {
                    throw new AppError('Inventory item SKU already exists', 409);
                }
            }

            updateData.sku = sku;
        }

        if (data.name !== undefined) {
            const name = normalizeRequiredText(data.name);

            if (!name) {
                throw new AppError('Item name is required', 400);
            }

            updateData.name = name;
        }

        if (data.description !== undefined) {
            updateData.description = normalizeOptionalText(data.description);
        }

        if (data.categoryId !== undefined) {
            await this.ensureCategory(data.categoryId);
            updateData.categoryId = data.categoryId;
        }

        if (data.departmentId !== undefined) {
            if (data.departmentId) {
                await this.ensureDepartment(data.departmentId);
            }

            updateData.departmentId = data.departmentId;
        }

        if (data.unitOfMeasure !== undefined) {
            const unitOfMeasure = normalizeRequiredText(data.unitOfMeasure);

            if (!unitOfMeasure) {
                throw new AppError('Unit of measure is required', 400);
            }

            updateData.unitOfMeasure = unitOfMeasure;
        }

        if (data.currentStock !== undefined) {
            if (data.currentStock < 0) {
                throw new AppError('Current stock cannot be negative', 400);
            }

            updateData.currentStock = data.currentStock;
        }

        if (data.reorderLevel !== undefined) {
            if (data.reorderLevel < 0) {
                throw new AppError('Reorder level cannot be negative', 400);
            }

            updateData.reorderLevel = data.reorderLevel;
        }

        if (data.unitCost !== undefined) {
            if (data.unitCost !== null && data.unitCost < 0) {
                throw new AppError('Unit cost cannot be negative', 400);
            }

            updateData.unitCost = data.unitCost;
        }

        if (data.expiryDate !== undefined) {
            updateData.expiryDate = data.expiryDate;
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        return updateData;
    }

    private resultingStock(item: InventoryItemEntity, type: InventoryTransactionKind, quantity: number) {
        if (type === 'in') {
            return item.currentStock + quantity;
        }

        if (type === 'out') {
            return item.currentStock - quantity;
        }

        if (type === 'adjustment') {
            return quantity;
        }

        return item.currentStock;
    }

    private async ensureCategory(categoryId: string) {
        const categoryExists = await this.inventoryRepository.categoryExists(categoryId);

        if (!categoryExists) {
            throw new AppError('Inventory category not found', 404);
        }
    }

    private async ensureDepartment(departmentId: string) {
        const departmentExists = await this.inventoryRepository.departmentExists(departmentId);

        if (!departmentExists) {
            throw new AppError('Department not found', 404);
        }
    }

    private async publishItemAlerts(item: InventoryItemEntity, actorUserId?: string) {
        if (!item.isActive) {
            return;
        }

        if (item.currentStock <= 0) {
            await this.publishSafely('InventoryCriticalShortage', item, 'critical_shortage', actorUserId);
            return;
        }

        if (item.currentStock <= item.reorderLevel) {
            await this.publishSafely('InventoryLowStock', item, 'low_stock', actorUserId);
        }

        if (item.expiryDate && item.expiryDate <= expiryThreshold(this.nowProvider())) {
            await this.publishSafely('InventoryExpiryWarning', item, 'expiring_soon', actorUserId);
        }
    }

    private async publishSafely(
        type: InventoryEventType,
        item: InventoryItemEntity,
        alertType: 'low_stock' | 'critical_shortage' | 'expiring_soon',
        actorUserId?: string,
    ) {
        try {
            await this.eventPublisher.publish(type, {
                item,
                alertType,
                actorUserId,
            });
        } catch {}
    }
}
