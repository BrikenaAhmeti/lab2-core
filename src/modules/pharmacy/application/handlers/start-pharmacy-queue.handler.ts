import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PharmacyQueueView } from '../../domain/pharmacy.entity';
import { PharmacyService } from '../../services/pharmacy.service';
import { StartPharmacyQueueCommand } from '../commands/start-pharmacy-queue.command';

export class StartPharmacyQueueHandler
    implements CommandHandler<StartPharmacyQueueCommand, PharmacyQueueView>
{
    constructor(private readonly pharmacyService: PharmacyService) {}

    async execute(command: StartPharmacyQueueCommand): Promise<PharmacyQueueView> {
        return this.pharmacyService.startQueue(
            command.id,
            command.actorUserId,
        );
    }
}
