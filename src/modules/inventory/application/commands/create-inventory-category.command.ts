import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateInventoryCategoryCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly description?: string | null,
        public readonly parentId?: string | null,
        public readonly isActive?: boolean,
        public readonly actorUserId?: string,
    ) {}
}
