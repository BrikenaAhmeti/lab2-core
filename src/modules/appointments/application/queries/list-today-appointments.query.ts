import { Query } from '../../../../shared/core/buses/query-bus';

export class ListTodayAppointmentsQuery implements Query {
    constructor(public readonly now?: Date) { }
}
