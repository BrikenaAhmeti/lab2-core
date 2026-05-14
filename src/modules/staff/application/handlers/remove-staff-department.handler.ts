import { RemoveStaffDepartmentCommand } from '../commands/remove-staff-department.command';
import { StaffService } from '../../services/staff.service';

export class RemoveStaffDepartmentHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(command: RemoveStaffDepartmentCommand) {
        return this.staffService.removeDepartment(
            command.staffProfileId,
            command.departmentId,
            command.actorUserId,
        );
    }
}
