export class DeactivateStaffProfileCommand {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
    ) { }
}
