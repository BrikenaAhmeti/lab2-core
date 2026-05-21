import { Command } from '../../../../shared/core/buses/command-bus';

export class EnterLabOrderResultsCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly items: Array<{
            itemId: string;
            resultValue: string;
            resultUnit?: string | null;
            resultNotes?: string | null;
        }>,
        public readonly actorUserId?: string,
    ) {}
}
