import { Command } from '../../../../shared/core/buses/command-bus';

export class SubmitFeedbackCommand implements Command {
    constructor(
        public readonly appointmentId: string,
        public readonly rating: number,
        public readonly comment?: string | null,
        public readonly isAnonymous?: boolean,
        public readonly actorUserId?: string,
    ) {}
}
