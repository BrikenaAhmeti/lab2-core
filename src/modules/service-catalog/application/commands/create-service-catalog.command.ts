import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateServiceCatalogCommand implements Command {
    constructor(
        public readonly departmentId: string,
        public readonly name: string,
        public readonly description: string | undefined,
        public readonly defaultDurationMinutes: number,
        public readonly defaultPrice: number,
        public readonly isActive?: boolean,
        public readonly sortOrder?: number,
    ) { }
}
