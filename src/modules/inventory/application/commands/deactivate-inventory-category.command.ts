import { Command } from '../../../../shared/core/buses/command-bus';

export class DeactivateInventoryCategoryCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) {}
}
