import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { EnterLabOrderResultsCommand } from '../commands/enter-lab-order-results.command';

export class EnterLabOrderResultsHandler
    implements CommandHandler<EnterLabOrderResultsCommand, LabOrderView> {
    constructor(private readonly labService: LabService) {}

    execute(command: EnterLabOrderResultsCommand) {
        return this.labService.enterLabOrderResults(command.id, {
            items: command.items,
            actorUserId: command.actorUserId,
        });
    }
}
