import { Query } from '../../../../shared/core/buses/query-bus';
import {
    SearchSortOrder,
    StockLevelFilter,
} from '../../domain/search.entity';

export class SearchInventoryItemsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly categoryId?: string,
        public readonly category?: string,
        public readonly stockLevel?: StockLevelFilter,
        public readonly departmentId?: string,
        public readonly expiryFrom?: Date,
        public readonly expiryTo?: Date,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
