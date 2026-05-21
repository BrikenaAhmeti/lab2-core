import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabService } from '../../services/lab.service';
import { TriggerLabOrderAiCommand } from '../commands/trigger-lab-order-ai.command';

export class TriggerLabOrderAiHandler
    implements CommandHandler<
        TriggerLabOrderAiCommand,
        { labOrderId: string; status: string; message: string }
    > {
    constructor(private readonly labService: LabService) {}

    execute(command: TriggerLabOrderAiCommand) {
        return this.labService.triggerAi(command.id);
    }
}
