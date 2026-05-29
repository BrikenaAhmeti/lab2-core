import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PharmacyQueueView } from '../../domain/pharmacy.entity';
import { PharmacyService } from '../../services/pharmacy.service';
import { FulfillPharmacyQueueCommand } from '../commands/fulfill-pharmacy-queue.command';

export class FulfillPharmacyQueueHandler
    implements CommandHandler<FulfillPharmacyQueueCommand, PharmacyQueueView>
{
    constructor(private readonly pharmacyService: PharmacyService) {}

    async execute(command: FulfillPharmacyQueueCommand): Promise<PharmacyQueueView> {
        return this.pharmacyService.fulfillQueue(
            command.id,
            command.actorUserId,
        );
    }
}
