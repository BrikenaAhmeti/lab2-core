import { ListPublicStaffProfilesQuery } from '../queries/list-public-staff-profiles.query';
import { StaffService } from '../../services/staff.service';

export class ListPublicStaffProfilesHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(query: ListPublicStaffProfilesQuery) {
        return this.staffService.listPublicStaffProfiles({
            page: query.page,
            limit: query.limit,
            departmentId: query.departmentId,
            positionTypeId: query.positionTypeId,
            search: query.search,
        });
    }
}
