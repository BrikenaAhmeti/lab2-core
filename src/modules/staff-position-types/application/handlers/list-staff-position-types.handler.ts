import { ListStaffPositionTypesQuery } from '../queries/list-staff-position-types.query';
import { StaffPositionTypeService } from '../../services/staff-position-type.service';

export class ListStaffPositionTypesHandler {
    constructor(private readonly staffPositionTypeService: StaffPositionTypeService) { }

    async execute(query: ListStaffPositionTypesQuery) {
        return this.staffPositionTypeService.listStaffPositionTypes({
            isActive: query.isActive,
        });
    }
}
