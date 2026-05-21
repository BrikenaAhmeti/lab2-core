import { Command } from '../../../../shared/core/buses/command-bus';

export class DeactivateLabTestCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) {}
}
