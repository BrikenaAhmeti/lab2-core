import { PaymentMethod } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class MarkBillingPaidCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly paymentMethod: PaymentMethod,
        public readonly referenceNumber?: string | null,
        public readonly notes?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
