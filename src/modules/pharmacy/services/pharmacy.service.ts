import { PharmacyStatus } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import { normalizeOptionalText } from '../domain/pharmacy.normalizer';
import {
    PharmacyEventPublisher,
    PharmacyEventType,
} from '../domain/pharmacy-event.publisher';
import {
    DispensePharmacyQueueItemData,
    PharmacyRepository,
} from '../domain/pharmacy.repository';
import { PharmacyQueueView } from '../domain/pharmacy.entity';

const HANDLED_ITEM_STATUSES: PharmacyStatus[] = [
    PharmacyStatus.DISPENSED,
    PharmacyStatus.OUT_OF_STOCK,
    PharmacyStatus.SUBSTITUTED,
];

const CLOSED_QUEUE_STATUSES: PharmacyStatus[] = [
    PharmacyStatus.CANCELLED,
    PharmacyStatus.FULFILLED,
];

function isHandledItemStatus(status: PharmacyStatus) {
    return HANDLED_ITEM_STATUSES.includes(status);
}

function isClosedQueueStatus(status: PharmacyStatus) {
    return CLOSED_QUEUE_STATUSES.includes(status);
}

function hasDuplicates(values: string[]) {
    return new Set(values).size !== values.length;
}

export class PharmacyService {
    constructor(
        private readonly pharmacyRepository: PharmacyRepository,
        private readonly eventPublisher: PharmacyEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async listQueue(filters: {
        page: number;
        limit: number;
        status?: PharmacyStatus;
    }) {
        return this.pharmacyRepository.listQueue(filters);
    }

    async getQueueById(id: string) {
        return this.getExistingQueue(id);
    }

    async startQueue(id: string, actorUserId?: string) {
        const queue = await this.getExistingQueue(id, actorUserId);

        this.ensureQueueCanBeWorked(queue);

        if (
            queue.status === PharmacyStatus.PENDING ||
            queue.status === PharmacyStatus.ON_HOLD
        ) {
            return this.pharmacyRepository.startQueue(id, actorUserId);
        }

        return queue;
    }

    async dispenseQueue(
        id: string,
        data: {
            items: DispensePharmacyQueueItemData[];
            actorUserId?: string;
        },
    ) {
        const queue = await this.getExistingQueue(id, data.actorUserId);

        this.ensureQueueCanBeWorked(queue);

        if (!data.items.length) {
            throw new AppError('At least one dispensing item is required', 400);
        }

        if (hasDuplicates(data.items.map((item) => item.prescriptionItemId))) {
            throw new AppError('Duplicate prescription items are not allowed', 400);
        }

        const normalizedItems = data.items.map((item) =>
            this.normalizeDispensingItem(queue, item),
        );

        const result = await this.pharmacyRepository.dispenseQueue(id, {
            items: normalizedItems,
            actorUserId: data.actorUserId,
        });

        if (result.outOfStockItems.length) {
            await this.publishSafely('MedicationOutOfStock', {
                queue: result.queue,
                outOfStockItems: result.outOfStockItems,
                actorUserId: data.actorUserId,
            });
        }

        return result.queue;
    }

    async fulfillQueue(id: string, actorUserId?: string) {
        const queue = await this.getExistingQueue(id, actorUserId);

        this.ensureQueueCanBeWorked(queue);

        if (!queue.dispensingItems.length) {
            throw new AppError('Pharmacy queue has no dispensing items', 409);
        }

        const hasUnhandledItems = queue.dispensingItems.some(
            (item) => !isHandledItemStatus(item.status),
        );

        if (hasUnhandledItems) {
            throw new AppError(
                'All pharmacy queue items must be handled before fulfillment',
                409,
            );
        }

        const result = await this.pharmacyRepository.fulfillQueue(id, {
            fulfilledAt: this.nowProvider(),
            actorUserId,
        });

        await this.publishSafely('PrescriptionFulfilled', {
            queue: result,
            actorUserId,
        });

        return result;
    }

    private async getExistingQueue(id: string, actorUserId?: string) {
        await this.pharmacyRepository.ensureDispensingItems(id, actorUserId);

        const queue = await this.pharmacyRepository.findQueueById(id);

        if (!queue) {
            throw new AppError('Pharmacy queue item not found', 404);
        }

        return queue;
    }

    private ensureQueueCanBeWorked(queue: PharmacyQueueView) {
        if (queue.prescription.isVoided) {
            throw new AppError('Voided prescriptions cannot be dispensed', 409);
        }

        if (isClosedQueueStatus(queue.status)) {
            throw new AppError('Pharmacy queue item is closed', 409);
        }
    }

    private normalizeDispensingItem(
        queue: PharmacyQueueView,
        item: DispensePharmacyQueueItemData,
    ): DispensePharmacyQueueItemData {
        if (!isHandledItemStatus(item.status)) {
            throw new AppError('Invalid dispensing status', 400);
        }

        const queueItem = queue.dispensingItems.find(
            (dispensingItem) =>
                dispensingItem.prescriptionItemId === item.prescriptionItemId,
        );

        if (!queueItem) {
            throw new AppError('Prescription item is not part of this queue', 400);
        }

        if (item.status === PharmacyStatus.OUT_OF_STOCK) {
            return {
                prescriptionItemId: item.prescriptionItemId,
                inventoryItemId: null,
                quantityDispensed: 0,
                status: item.status,
                notes: normalizeOptionalText(item.notes),
            };
        }

        if (!item.inventoryItemId) {
            throw new AppError(
                'Inventory item is required for dispensed medication',
                400,
            );
        }

        if (!Number.isInteger(item.quantityDispensed) || item.quantityDispensed <= 0) {
            throw new AppError('Dispensed quantity must be a positive integer', 400);
        }

        if (item.quantityDispensed > queueItem.quantityToDispense) {
            throw new AppError(
                'Dispensed quantity cannot exceed prescribed quantity',
                400,
            );
        }

        return {
            prescriptionItemId: item.prescriptionItemId,
            inventoryItemId: item.inventoryItemId,
            quantityDispensed: item.quantityDispensed,
            status: item.status,
            notes: normalizeOptionalText(item.notes),
        };
    }

    private async publishSafely(
        type: PharmacyEventType,
        payload: Parameters<PharmacyEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {}
    }
}
