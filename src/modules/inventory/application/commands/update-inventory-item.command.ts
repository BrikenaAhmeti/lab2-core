import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateInventoryItemCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly categoryId?: string,
        public readonly sku?: string,
        public readonly name?: string,
        public readonly unitOfMeasure?: string,
        public readonly departmentId?: string | null,
        public readonly description?: string | null,
        public readonly currentStock?: number,
        public readonly reorderLevel?: number,
        public readonly unitCost?: number | null,
        public readonly expiryDate?: Date | null,
        public readonly isActive?: boolean,
        public readonly actorUserId?: string,
    ) {}
}
