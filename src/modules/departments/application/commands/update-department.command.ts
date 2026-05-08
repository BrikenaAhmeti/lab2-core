import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateDepartmentCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly name?: string,
        public readonly description?: string | null,
        public readonly floor?: string | null,
        public readonly phoneExtension?: string | null,
        public readonly operatingHours?: unknown | null,
        public readonly isActive?: boolean,
        public readonly sortOrder?: number,
    ) { }
}
