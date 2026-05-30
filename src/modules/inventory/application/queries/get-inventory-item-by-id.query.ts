import { Query } from '../../../../shared/core/buses/query-bus';

export class GetInventoryItemByIdQuery implements Query {
    constructor(public readonly id: string) {}
}
