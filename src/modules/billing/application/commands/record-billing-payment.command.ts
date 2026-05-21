import { PaymentMethod } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class RecordBillingPaymentCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly amount: number,
        public readonly paymentMethod: PaymentMethod,
        public readonly referenceNumber?: string | null,
        public readonly notes?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
