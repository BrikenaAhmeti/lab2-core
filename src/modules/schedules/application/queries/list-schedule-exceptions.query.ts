export class ListScheduleExceptionsQuery {
    constructor(
        public readonly staffProfileId: string,
        public readonly from?: Date,
        public readonly to?: Date,
    ) { }
}
