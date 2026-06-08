import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { DepartmentListResult } from '../../domain/department.entity';
import { DepartmentService } from '../../services/department.service';
import { ListDepartmentsQuery } from '../queries/list-departments.query';

export class ListDepartmentsHandler
    implements QueryHandler<ListDepartmentsQuery, DepartmentListResult> {
    constructor(private readonly departmentService: DepartmentService) { }

    async execute(query: ListDepartmentsQuery): Promise<DepartmentListResult> {
        return this.departmentService.listDepartments({
            page: query.page,
            limit: query.limit,
            search: query.search,
            isActive: query.isActive,
            sortBy: query.sortBy,
            sortDirection: query.sortDirection,
            openAt: query.openAt,
            openFrom: query.openFrom,
            openTo: query.openTo,
        });
    }
}
