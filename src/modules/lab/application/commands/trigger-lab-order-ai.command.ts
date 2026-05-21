import { Command } from '../../../../shared/core/buses/command-bus';

export class TriggerLabOrderAiCommand implements Command {
    constructor(public readonly id: string) {}
}
