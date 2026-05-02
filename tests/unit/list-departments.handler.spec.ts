import { ListDepartmentsHandler } from '../../src/modules/departments/application/handlers/list-departments.handler';
import { ListDepartmentsQuery } from '../../src/modules/departments/application/queries/list-departments.query';
import { DepartmentService } from '../../src/modules/departments/services/department.service';

describe('ListDepartmentsHandler', () => {
    const departmentService = {
        listDepartments: jest.fn(),
    } as unknown as jest.Mocked<DepartmentService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate list queries to the department service', async () => {
        (departmentService.listDepartments as jest.Mock).mockResolvedValue({
            items: [],
            meta: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });

        const handler = new ListDepartmentsHandler(departmentService);
        const query = new ListDepartmentsQuery(1, 10, 'cardio', true);

        const result = await handler.execute(query);

        expect(departmentService.listDepartments).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: 'cardio',
            isActive: true,
        });
        expect(result.meta.total).toBe(0);
    });
});
