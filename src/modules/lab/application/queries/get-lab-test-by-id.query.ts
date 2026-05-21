import { Query } from '../../../../shared/core/buses/query-bus';

export class GetLabTestByIdQuery implements Query {
    constructor(public readonly id: string) {}
}
