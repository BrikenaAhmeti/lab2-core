import { Query } from '../../../../shared/core/buses/query-bus';

export class GetAppointmentByIdQuery implements Query {
    constructor(public readonly id: string) { }
}
