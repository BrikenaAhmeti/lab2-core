import { CreateStaffPositionTypeCommand } from '../commands/create-staff-position-type.command';
import { StaffPositionTypeService } from '../../services/staff-position-type.service';

export class CreateStaffPositionTypeHandler {
    constructor(private readonly staffPositionTypeService: StaffPositionTypeService) { }

    async execute(command: CreateStaffPositionTypeCommand) {
        return this.staffPositionTypeService.createStaffPositionType({
            name: command.name,
            description: command.description,
            defaultRoleKey: command.defaultRoleKey,
            applicableDepartmentIds: command.applicableDepartmentIds,
            isActive: command.isActive,
        });
    }
}
