import { Query } from '../../../../shared/core/buses/query-bus';

export class ListInventoryCategoriesQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly isActive?: boolean,
    ) {}
}
