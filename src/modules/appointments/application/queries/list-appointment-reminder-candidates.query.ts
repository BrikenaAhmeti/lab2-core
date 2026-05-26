import { Query } from '../../../../shared/core/buses/query-bus';

export class ListAppointmentReminderCandidatesQuery implements Query {
    constructor(
        public readonly from: Date,
        public readonly to: Date,
    ) {}
}
