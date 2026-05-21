import { LabOrderStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';

export class ListLabOrdersQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly patientId: string | undefined,
        public readonly status: LabOrderStatus | undefined,
        public readonly priority: 'normal' | 'urgent' | undefined,
        public readonly from: Date | undefined,
        public readonly to: Date | undefined,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
