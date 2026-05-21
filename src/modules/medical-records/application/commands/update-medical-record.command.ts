export class UpdateMedicalRecordCommand {
    constructor(
        public readonly id: string,
        public readonly chiefComplaint?: string | null,
        public readonly vitals?: unknown,
        public readonly diagnosis?: string | null,
        public readonly treatmentPlan?: string | null,
        public readonly notes?: string | null,
        public readonly followUpInstructions?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
