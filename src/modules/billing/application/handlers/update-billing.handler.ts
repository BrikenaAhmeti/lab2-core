import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { BillingView } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { UpdateBillingCommand } from '../commands/update-billing.command';

export class UpdateBillingHandler
implements CommandHandler<UpdateBillingCommand, BillingView> {
    constructor(private readonly billingService: BillingService) {}

    execute(command: UpdateBillingCommand): Promise<BillingView> {
        return this.billingService.updateBilling(command.id, {
            ...command.data,
            actorUserId: command.actorUserId,
        });
    }
}
