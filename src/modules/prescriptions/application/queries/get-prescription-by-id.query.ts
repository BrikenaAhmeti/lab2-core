export class GetPrescriptionByIdQuery {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
