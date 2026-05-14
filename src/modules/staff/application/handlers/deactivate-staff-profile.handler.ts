import { DeactivateStaffProfileCommand } from '../commands/deactivate-staff-profile.command';
import { StaffService } from '../../services/staff.service';

export class DeactivateStaffProfileHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(command: DeactivateStaffProfileCommand) {
        return this.staffService.deactivateStaffProfile(
            command.id,
            command.actorUserId,
        );
    }
}
