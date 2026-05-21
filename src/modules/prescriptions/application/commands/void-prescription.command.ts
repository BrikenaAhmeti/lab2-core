export class VoidPrescriptionCommand {
    constructor(
        public readonly id: string,
        public readonly reason: string,
        public readonly actorUserId?: string,
    ) {}
}
