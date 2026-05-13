import { UpdateStaffPositionTypeCommand } from '../commands/update-staff-position-type.command';
import { StaffPositionTypeService } from '../../services/staff-position-type.service';

export class UpdateStaffPositionTypeHandler {
    constructor(private readonly staffPositionTypeService: StaffPositionTypeService) { }

    async execute(command: UpdateStaffPositionTypeCommand) {
        return this.staffPositionTypeService.updateStaffPositionType(command.id, {
            name: command.name,
            description: command.description,
            defaultRoleKey: command.defaultRoleKey,
            applicableDepartmentIds: command.applicableDepartmentIds,
            isActive: command.isActive,
        });
    }
}
