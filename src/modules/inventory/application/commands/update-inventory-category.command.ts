import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateInventoryCategoryCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly name?: string,
        public readonly description?: string | null,
        public readonly parentId?: string | null,
        public readonly isActive?: boolean,
        public readonly actorUserId?: string,
    ) {}
}
