import { Query } from '../../../../shared/core/buses/query-bus';

export class GetPatientByUserIdQuery implements Query {
    constructor(public readonly userId: string) {}
}
