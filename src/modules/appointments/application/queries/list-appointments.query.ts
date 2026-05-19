import { AppointmentStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';

export class ListAppointmentsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly date?: Date,
        public readonly from?: Date,
        public readonly to?: Date,
        public readonly staffId?: string,
        public readonly patientId?: string,
        public readonly departmentId?: string,
        public readonly status?: AppointmentStatus,
    ) { }
}
