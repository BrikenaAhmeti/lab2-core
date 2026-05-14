import { Query } from '../../../../shared/core/buses/query-bus';

export class GetPatientTimelineQuery implements Query {
    constructor(
        public readonly patientId: string,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
