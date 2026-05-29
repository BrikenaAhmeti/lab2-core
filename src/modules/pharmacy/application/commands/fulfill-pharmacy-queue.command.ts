import { Command } from '../../../../shared/core/buses/command-bus';

export class FulfillPharmacyQueueCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) {}
}
