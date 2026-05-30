import { Command } from '../../../../shared/core/buses/command-bus';
import { InventoryTransactionKind } from '../../domain/inventory.entity';

export class RecordInventoryTransactionCommand implements Command {
    constructor(
        public readonly itemId: string,
        public readonly type: InventoryTransactionKind,
        public readonly quantity: number,
        public readonly reason: string,
        public readonly unitCost?: number | null,
        public readonly batchNumber?: string | null,
        public readonly expiryDate?: Date | null,
        public readonly referenceEntityType?: string | null,
        public readonly referenceEntityId?: string | null,
        public readonly targetDepartmentId?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
