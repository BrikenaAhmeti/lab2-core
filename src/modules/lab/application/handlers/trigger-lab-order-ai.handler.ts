import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabAiQueueResponse } from '../../domain/lab-ai.client';
import { LabService } from '../../services/lab.service';
import { TriggerLabOrderAiCommand } from '../commands/trigger-lab-order-ai.command';

export class TriggerLabOrderAiHandler
    implements CommandHandler<
        TriggerLabOrderAiCommand,
        LabAiQueueResponse
    > {
    constructor(private readonly labService: LabService) {}

    execute(command: TriggerLabOrderAiCommand) {
        return this.labService.triggerAi(command.id);
    }
}
