import { Query } from '../../../../shared/core/buses/query-bus';

export class GetPharmacyQueueByIdQuery implements Query {
    constructor(public readonly id: string) {}
}
