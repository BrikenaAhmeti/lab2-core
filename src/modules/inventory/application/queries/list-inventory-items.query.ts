import { Query } from '../../../../shared/core/buses/query-bus';

export class ListInventoryItemsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly categoryId?: string,
        public readonly departmentId?: string,
        public readonly belowReorderLevel?: boolean,
        public readonly expiringSoonDays?: number,
        public readonly isActive?: boolean,
        public readonly sortBy?: 'name' | 'sku' | 'currentStock' | 'reorderLevel' | 'expiryDate' | 'createdAt' | 'updatedAt',
        public readonly sortDirection?: 'asc' | 'desc',
    ) {}
}
