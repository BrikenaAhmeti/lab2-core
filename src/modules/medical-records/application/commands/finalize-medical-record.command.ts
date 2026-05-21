export class FinalizeMedicalRecordCommand {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) {}
}
