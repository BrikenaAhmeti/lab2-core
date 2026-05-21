import { BillingStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';

export class ListBillingsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly patientId?: string,
        public readonly status?: BillingStatus,
        public readonly from?: Date,
        public readonly to?: Date,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
