import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateLabOrderCommand implements Command {
    constructor(
        public readonly patientId: string,
        public readonly appointmentId: string,
        public readonly medicalRecordId: string | null | undefined,
        public readonly orderedByStaffId: string,
        public readonly priority: string | null | undefined,
        public readonly notes: string | null | undefined,
        public readonly tests: string[],
        public readonly actorUserId?: string,
    ) {}
}
