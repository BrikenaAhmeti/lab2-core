import { UpdateStaffProfileCommand } from '../commands/update-staff-profile.command';
import { StaffService } from '../../services/staff.service';

export class UpdateStaffProfileHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(command: UpdateStaffProfileCommand) {
        return this.staffService.updateStaffProfile(command.id, {
            staffPositionTypeId: command.staffPositionTypeId,
            employeeCode: command.employeeCode,
            specialization: command.specialization,
            licenseNumber: command.licenseNumber,
            employmentStatus: command.employmentStatus,
            hireDate: command.hireDate,
            terminationDate: command.terminationDate,
            bio: command.bio,
            isPublicProfile: command.isPublicProfile,
            actorUserId: command.actorUserId,
        });
    }
}
