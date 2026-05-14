export class GetAvailableSlotsQuery {
    constructor(
        public readonly staffProfileId: string,
        public readonly serviceId: string,
        public readonly date: string,
    ) { }
}
