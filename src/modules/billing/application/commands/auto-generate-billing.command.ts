import { Command } from '../../../../shared/core/buses/command-bus';

export class AutoGenerateBillingCommand implements Command {
    constructor(
        public readonly appointmentId: string,
        public readonly actorUserId?: string,
    ) {}
}
