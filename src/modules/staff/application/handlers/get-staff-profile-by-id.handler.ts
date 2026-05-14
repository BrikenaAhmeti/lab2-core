import { GetStaffProfileByIdQuery } from '../queries/get-staff-profile-by-id.query';
import { StaffService } from '../../services/staff.service';

export class GetStaffProfileByIdHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(query: GetStaffProfileByIdQuery) {
        return this.staffService.getStaffProfileById(query.id);
    }
}
