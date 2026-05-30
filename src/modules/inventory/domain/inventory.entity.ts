import { InventoryTransactionType } from '../../../generated/prisma';

export type InventoryTransactionKind = 'in' | 'out' | 'adjustment' | 'transfer';
export type InventoryAlertType = 'low_stock' | 'critical_shortage' | 'expiring_soon';

export interface InventoryCategoryEntity {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    parent: {
        id: string;
        name: string;
    } | null;
}

export interface InventoryCategoryListResult {
    items: InventoryCategoryEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InventoryDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface InventoryCategorySummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface InventoryItemEntity {
    id: string;
    categoryId: string;
    departmentId: string | null;
    sku: string;
    name: string;
    description: string | null;
    unitOfMeasure: string;
    currentStock: number;
    reorderLevel: number;
    unitCost: number | null;
    expiryDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: InventoryCategorySummary;
    department: InventoryDepartmentSummary | null;
}

export interface InventoryItemListResult {
    items: InventoryItemEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InventoryTransactionEntity {
    id: string;
    itemId: string;
    transactionType: InventoryTransactionType;
    quantity: number;
    unitCost: number | null;
    batchNumber: string | null;
    expiryDate: Date | null;
    referenceEntityType: string | null;
    referenceEntityId: string | null;
    notes: string | null;
    performedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryTransactionListResult {
    items: InventoryTransactionEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InventoryTransactionResult {
    item: InventoryItemEntity;
    transactions: InventoryTransactionEntity[];
}

export interface InventoryAlertItem {
    type: InventoryAlertType;
    item: InventoryItemEntity;
    currentStock: number;
    reorderLevel: number;
    expiryDate: Date | null;
    daysUntilExpiry: number | null;
}

export interface InventoryAlertsResult {
    generatedAt: Date;
    expiringSoonDays: number;
    lowStock: InventoryAlertItem[];
    criticalShortage: InventoryAlertItem[];
    expiringSoon: InventoryAlertItem[];
}
