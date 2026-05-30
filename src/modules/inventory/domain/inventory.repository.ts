import { InventoryTransactionType } from '../../../generated/prisma';
import {
    InventoryAlertsResult,
    InventoryCategoryEntity,
    InventoryCategoryListResult,
    InventoryItemEntity,
    InventoryItemListResult,
    InventoryTransactionEntity,
    InventoryTransactionListResult,
    InventoryTransactionResult,
} from './inventory.entity';

export interface ListInventoryCategoriesFilters {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
}

export interface CreateInventoryCategoryData {
    name: string;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
    actorUserId?: string;
}

export interface UpdateInventoryCategoryData {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
    actorUserId?: string;
}

export interface ListInventoryItemsFilters {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    departmentId?: string;
    belowReorderLevel?: boolean;
    expiringSoonDays?: number;
    isActive?: boolean;
    sortBy?: 'name' | 'sku' | 'currentStock' | 'reorderLevel' | 'expiryDate' | 'createdAt' | 'updatedAt';
    sortDirection?: 'asc' | 'desc';
    now?: Date;
}

export interface CreateInventoryItemData {
    categoryId: string;
    departmentId?: string | null;
    sku: string;
    name: string;
    description?: string | null;
    unitOfMeasure: string;
    currentStock?: number;
    reorderLevel?: number;
    unitCost?: number | null;
    expiryDate?: Date | null;
    isActive?: boolean;
    actorUserId?: string;
}

export interface UpdateInventoryItemData {
    categoryId?: string;
    departmentId?: string | null;
    sku?: string;
    name?: string;
    description?: string | null;
    unitOfMeasure?: string;
    currentStock?: number;
    reorderLevel?: number;
    unitCost?: number | null;
    expiryDate?: Date | null;
    isActive?: boolean;
    actorUserId?: string;
}

export interface RecordInventoryTransactionData {
    transactionType: InventoryTransactionType;
    quantity: number;
    resultingStock?: number;
    unitCost?: number | null;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    referenceEntityType?: string | null;
    referenceEntityId?: string | null;
    notes: string;
    targetDepartmentId?: string | null;
    actorUserId?: string;
}

export interface ListInventoryTransactionsFilters {
    page: number;
    limit: number;
}

export interface InventoryRepository {
    createCategory(data: CreateInventoryCategoryData): Promise<InventoryCategoryEntity>;
    findCategoryById(id: string): Promise<InventoryCategoryEntity | null>;
    findCategoryByName(name: string): Promise<InventoryCategoryEntity | null>;
    listCategories(filters: ListInventoryCategoriesFilters): Promise<InventoryCategoryListResult>;
    updateCategory(id: string, data: UpdateInventoryCategoryData): Promise<InventoryCategoryEntity>;
    deactivateCategory(id: string, actorUserId?: string): Promise<InventoryCategoryEntity>;
    createItem(data: CreateInventoryItemData): Promise<InventoryItemEntity>;
    findItemById(id: string): Promise<InventoryItemEntity | null>;
    findItemBySku(sku: string): Promise<InventoryItemEntity | null>;
    listItems(filters: ListInventoryItemsFilters): Promise<InventoryItemListResult>;
    updateItem(id: string, data: UpdateInventoryItemData): Promise<InventoryItemEntity>;
    deactivateItem(id: string, actorUserId?: string): Promise<InventoryItemEntity>;
    recordTransaction(
        itemId: string,
        data: RecordInventoryTransactionData,
    ): Promise<InventoryTransactionResult>;
    listTransactions(
        itemId: string,
        filters: ListInventoryTransactionsFilters,
    ): Promise<InventoryTransactionListResult>;
    getAlerts(filters: {
        expiringSoonDays: number;
        now: Date;
    }): Promise<InventoryAlertsResult>;
    categoryExists(id: string): Promise<boolean>;
    departmentExists(id: string): Promise<boolean>;
}
