import { Query } from '../../../../shared/core/buses/query-bus';

export class GetInventoryCategoryByIdQuery implements Query {
    constructor(public readonly id: string) {}
}
