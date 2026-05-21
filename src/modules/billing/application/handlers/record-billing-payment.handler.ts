import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { BillingView } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { RecordBillingPaymentCommand } from '../commands/record-billing-payment.command';

export class RecordBillingPaymentHandler
implements CommandHandler<RecordBillingPaymentCommand, BillingView> {
    constructor(private readonly billingService: BillingService) {}

    execute(command: RecordBillingPaymentCommand): Promise<BillingView> {
        return this.billingService.recordPayment(command.id, {
            amount: command.amount,
            paymentMethod: command.paymentMethod,
            referenceNumber: command.referenceNumber,
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
