import { Command } from '../../../../shared/core/buses/command-bus';

export class ReviewLabOrderCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly notes?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
