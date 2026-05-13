import { DeactivateStaffPositionTypeCommand } from '../commands/deactivate-staff-position-type.command';
import { StaffPositionTypeService } from '../../services/staff-position-type.service';

export class DeactivateStaffPositionTypeHandler {
    constructor(private readonly staffPositionTypeService: StaffPositionTypeService) { }

    async execute(command: DeactivateStaffPositionTypeCommand) {
        return this.staffPositionTypeService.deactivateStaffPositionType(command.id);
    }
}
