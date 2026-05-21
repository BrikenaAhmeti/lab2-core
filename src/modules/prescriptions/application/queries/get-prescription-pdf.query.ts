export class GetPrescriptionPdfQuery {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
