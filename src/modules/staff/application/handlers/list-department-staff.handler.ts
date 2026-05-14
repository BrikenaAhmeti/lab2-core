import { ListDepartmentStaffQuery } from '../queries/list-department-staff.query';
import { StaffService } from '../../services/staff.service';

export class ListDepartmentStaffHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(query: ListDepartmentStaffQuery) {
        return this.staffService.listDepartmentStaff({
            departmentId: query.departmentId,
            page: query.page,
            limit: query.limit,
            status: query.status,
            search: query.search,
        });
    }
}
