export class AddStaffDepartmentCommand {
    constructor(
        public readonly staffProfileId: string,
        public readonly departmentId: string,
        public readonly isPrimary?: boolean,
        public readonly actorUserId?: string,
    ) { }
}
