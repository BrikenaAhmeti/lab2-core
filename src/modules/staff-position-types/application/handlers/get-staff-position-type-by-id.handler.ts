import { GetStaffPositionTypeByIdQuery } from '../queries/get-staff-position-type-by-id.query';
import { StaffPositionTypeService } from '../../services/staff-position-type.service';

export class GetStaffPositionTypeByIdHandler {
    constructor(private readonly staffPositionTypeService: StaffPositionTypeService) { }

    async execute(query: GetStaffPositionTypeByIdQuery) {
        return this.staffPositionTypeService.getStaffPositionTypeById(query.id);
    }
}
