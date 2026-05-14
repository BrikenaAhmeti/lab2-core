export class ListPublicStaffProfilesQuery {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly departmentId?: string,
        public readonly positionTypeId?: string,
        public readonly search?: string,
    ) { }
}
