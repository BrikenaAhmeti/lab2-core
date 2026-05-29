import { PharmacyStatus } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export interface DispensePharmacyQueueCommandItem {
    prescriptionItemId: string;
    inventoryItemId?: string | null;
    quantityDispensed: number;
    status: PharmacyStatus;
    notes?: string | null;
}

export class DispensePharmacyQueueCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly items: DispensePharmacyQueueCommandItem[],
        public readonly actorUserId?: string,
    ) {}
}
