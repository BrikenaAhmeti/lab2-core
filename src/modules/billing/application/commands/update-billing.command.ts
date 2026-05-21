import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateBillingCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly data: {
            taxAmount?: number;
            discountAmount?: number;
            dueDate?: Date | null;
            notes?: string | null;
            items?: Array<{
                serviceCatalogId?: string | null;
                inventoryItemId?: string | null;
                description: string;
                quantity: number;
                unitPrice: number;
                sourceEntityType?: string | null;
                sourceEntityId?: string | null;
            }>;
        },
        public readonly actorUserId?: string,
    ) {}
}
