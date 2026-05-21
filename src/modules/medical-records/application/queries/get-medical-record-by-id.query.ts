export class GetMedicalRecordByIdQuery {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
