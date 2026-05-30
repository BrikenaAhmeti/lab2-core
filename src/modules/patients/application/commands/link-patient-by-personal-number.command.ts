import { Command } from '../../../../shared/core/buses/command-bus';

export class LinkPatientByPersonalNumberCommand implements Command {
    constructor(
        public readonly userId: string,
        public readonly personalNumber: string,
    ) {}
}
