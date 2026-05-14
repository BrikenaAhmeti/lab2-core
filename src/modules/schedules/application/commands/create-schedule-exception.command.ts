export class CreateScheduleExceptionCommand {
    constructor(
        public readonly staffProfileId: string,
        public readonly exceptionDate: Date,
        public readonly isUnavailable: boolean,
        public readonly departmentId?: string | null,
        public readonly startTime?: string | null,
        public readonly endTime?: string | null,
        public readonly reason?: string | null,
        public readonly actorUserId?: string,
    ) { }
}
