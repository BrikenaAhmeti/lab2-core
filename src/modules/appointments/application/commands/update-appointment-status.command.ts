import { AppointmentStatus } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class UpdateAppointmentStatusCommand implements Command {
    constructor(
        public readonly id: string,
        public readonly status: AppointmentStatus,
        public readonly reason?: string | null,
        public readonly actorUserId?: string,
    ) { }
}
