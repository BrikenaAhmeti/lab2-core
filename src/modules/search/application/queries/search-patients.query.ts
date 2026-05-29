import { BloodType } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';
import { SearchSortOrder } from '../../domain/search.entity';

export class SearchPatientsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly gender?: string,
        public readonly minAge?: number,
        public readonly maxAge?: number,
        public readonly bloodType?: BloodType,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
