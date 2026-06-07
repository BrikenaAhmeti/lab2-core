import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { BillingView } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { MarkBillingPaidCommand } from '../commands/mark-billing-paid.command';

export class MarkBillingPaidHandler
implements CommandHandler<MarkBillingPaidCommand, BillingView> {
    constructor(private readonly billingService: BillingService) {}

    execute(command: MarkBillingPaidCommand): Promise<BillingView> {
        return this.billingService.markPaid(command.id, {
            paymentMethod: command.paymentMethod,
            referenceNumber: command.referenceNumber,
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
