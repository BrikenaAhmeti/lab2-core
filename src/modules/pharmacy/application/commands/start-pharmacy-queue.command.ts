import { Command } from '../../../../shared/core/buses/command-bus';

export class StartPharmacyQueueCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) {}
}
