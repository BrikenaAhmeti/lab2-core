export class ListPrescriptionsQuery {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly patientId?: string,
        public readonly isVoided?: boolean,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
