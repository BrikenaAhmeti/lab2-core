import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateLabTestCommand implements Command {
    constructor(
        public readonly code: string,
        public readonly name: string,
        public readonly description: string | null | undefined,
        public readonly category: string | null | undefined,
        public readonly sampleType: string | null | undefined,
        public readonly defaultPrice: number | null,
        public readonly referenceRange: string | null | undefined,
        public readonly isActive: boolean,
        public readonly actorUserId?: string,
    ) {}
}
