import { AppointmentStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';
import { SearchSortOrder } from '../../domain/search.entity';

export class SearchAppointmentsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly status?: AppointmentStatus,
        public readonly from?: Date,
        public readonly to?: Date,
        public readonly departmentId?: string,
        public readonly serviceCatalogId?: string,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
