export class RemoveStaffDepartmentCommand {
    constructor(
        public readonly staffProfileId: string,
        public readonly departmentId: string,
        public readonly actorUserId?: string,
    ) { }
}
