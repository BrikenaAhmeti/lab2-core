import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateDepartmentCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly description?: string,
        public readonly floor?: string,
        public readonly phoneExtension?: string,
        public readonly operatingHours?: unknown,
        public readonly isActive?: boolean,
        public readonly sortOrder?: number,
    ) { }
}
