export class DeleteScheduleExceptionCommand {
    constructor(
        public readonly staffProfileId: string,
        public readonly exceptionId: string,
    ) { }
}
