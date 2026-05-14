import { AddStaffDepartmentCommand } from '../commands/add-staff-department.command';
import { StaffService } from '../../services/staff.service';

export class AddStaffDepartmentHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(command: AddStaffDepartmentCommand) {
        return this.staffService.addDepartment(command.staffProfileId, {
            departmentId: command.departmentId,
            isPrimary: command.isPrimary,
            actorUserId: command.actorUserId,
        });
    }
}
