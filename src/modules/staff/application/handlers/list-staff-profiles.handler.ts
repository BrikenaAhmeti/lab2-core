import { ListStaffProfilesQuery } from '../queries/list-staff-profiles.query';
import { StaffService } from '../../services/staff.service';

export class ListStaffProfilesHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(query: ListStaffProfilesQuery) {
        return this.staffService.listStaffProfiles({
            page: query.page,
            limit: query.limit,
            departmentId: query.departmentId,
            positionTypeId: query.positionTypeId,
            status: query.status,
            search: query.search,
        });
    }
}
