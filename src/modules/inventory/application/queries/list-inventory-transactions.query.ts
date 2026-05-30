import { Query } from '../../../../shared/core/buses/query-bus';

export class ListInventoryTransactionsQuery implements Query {
    constructor(
        public readonly itemId: string,
        public readonly page: number,
        public readonly limit: number,
    ) {}
}
