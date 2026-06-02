import { AppointmentType } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class BookPublicAppointmentCommand implements Command {
    constructor(
        public readonly patient: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            dateOfBirth: Date;
            gender: string;
            personalNumber: string;
        },
        public readonly serviceCatalogId: string,
        public readonly staffProfileId: string,
        public readonly scheduledAt: Date,
        public readonly appointmentType?: AppointmentType,
        public readonly notes?: string | null,
    ) { }
}
