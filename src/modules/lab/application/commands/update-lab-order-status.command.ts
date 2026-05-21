import { LabOrderStatus } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateLabOrderStatusCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly status: LabOrderStatus,
        public readonly actorUserId?: string,
    ) {}
}
