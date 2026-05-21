import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { BillingView } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { AutoGenerateBillingCommand } from '../commands/auto-generate-billing.command';

export class AutoGenerateBillingHandler
implements CommandHandler<AutoGenerateBillingCommand, BillingView> {
    constructor(private readonly billingService: BillingService) {}

    execute(command: AutoGenerateBillingCommand): Promise<BillingView> {
        return this.billingService.autoGenerateFromAppointment(
            command.appointmentId,
            command.actorUserId,
        );
    }
}
