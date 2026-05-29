import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PharmacyQueueView } from '../../domain/pharmacy.entity';
import { PharmacyService } from '../../services/pharmacy.service';
import { DispensePharmacyQueueCommand } from '../commands/dispense-pharmacy-queue.command';

export class DispensePharmacyQueueHandler
    implements CommandHandler<DispensePharmacyQueueCommand, PharmacyQueueView>
{
    constructor(private readonly pharmacyService: PharmacyService) {}

    async execute(
        command: DispensePharmacyQueueCommand,
    ): Promise<PharmacyQueueView> {
        return this.pharmacyService.dispenseQueue(command.id, {
            items: command.items,
            actorUserId: command.actorUserId,
        });
    }
}
