import { PharmacyStatus } from '../../../generated/prisma';
import {
    PharmacyOutOfStockItem,
    PharmacyQueueListResult,
    PharmacyQueueView,
} from './pharmacy.entity';

export interface ListPharmacyQueueFilters {
    page: number;
    limit: number;
    status?: PharmacyStatus;
}

export interface DispensePharmacyQueueItemData {
    prescriptionItemId: string;
    inventoryItemId?: string | null;
    quantityDispensed: number;
    status: PharmacyStatus;
    notes?: string | null;
}

export interface DispensePharmacyQueueData {
    items: DispensePharmacyQueueItemData[];
    actorUserId?: string;
}

export interface FulfillPharmacyQueueData {
    fulfilledAt: Date;
    actorUserId?: string;
}

export interface PharmacyDispenseResult {
    queue: PharmacyQueueView;
    outOfStockItems: PharmacyOutOfStockItem[];
}

export interface PharmacyRepository {
    listQueue(filters: ListPharmacyQueueFilters): Promise<PharmacyQueueListResult>;
    findQueueById(id: string): Promise<PharmacyQueueView | null>;
    ensureDispensingItems(id: string, actorUserId?: string): Promise<void>;
    startQueue(id: string, actorUserId?: string): Promise<PharmacyQueueView>;
    dispenseQueue(
        id: string,
        data: DispensePharmacyQueueData,
    ): Promise<PharmacyDispenseResult>;
    fulfillQueue(
        id: string,
        data: FulfillPharmacyQueueData,
    ): Promise<PharmacyQueueView>;
}
