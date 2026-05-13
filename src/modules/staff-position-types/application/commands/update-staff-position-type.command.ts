export class UpdateStaffPositionTypeCommand {
    constructor(
        public readonly id: string,
        public readonly name?: string,
        public readonly defaultRoleKey?: string,
        public readonly description?: string | null,
        public readonly applicableDepartmentIds?: string[] | null,
        public readonly isActive?: boolean,
    ) { }
}
