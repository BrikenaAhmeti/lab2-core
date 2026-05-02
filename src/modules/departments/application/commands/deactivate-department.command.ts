import { Command } from '../../../../shared/core/buses/command-bus';

export class DeactivateDepartmentCommand implements Command {
    constructor(public readonly id: string) { }
}
