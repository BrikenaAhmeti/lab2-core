import { AppointmentType } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class BookAppointmentCommand implements Command {
    constructor(
        public readonly patientId: string,
        public readonly serviceCatalogId: string,
        public readonly staffProfileId: string,
        public readonly scheduledAt: Date,
        public readonly appointmentType?: AppointmentType,
        public readonly notes?: string | null,
        public readonly actorUserId?: string,
    ) { }
}
