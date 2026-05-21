import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateLabTestCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly code?: string,
        public readonly name?: string,
        public readonly description?: string | null,
        public readonly category?: string | null,
        public readonly sampleType?: string | null,
        public readonly defaultPrice?: number | null,
        public readonly referenceRange?: string | null,
        public readonly isActive?: boolean,
        public readonly actorUserId?: string,
    ) {}
}
