import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateServiceCatalogCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly departmentId?: string,
        public readonly name?: string,
        public readonly description?: string | null,
        public readonly defaultDurationMinutes?: number,
        public readonly defaultPrice?: number,
        public readonly isActive?: boolean,
        public readonly sortOrder?: number,
    ) { }
}
