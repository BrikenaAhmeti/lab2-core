import { CreateDepartmentCommand } from '../../src/modules/departments/application/commands/create-department.command';
import { CreateDepartmentHandler } from '../../src/modules/departments/application/handlers/create-department.handler';
import { DepartmentService } from '../../src/modules/departments/services/department.service';

describe('CreateDepartmentHandler', () => {
    const department = {
        id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Cardiology',
        description: 'Heart care',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const departmentService = {
        createDepartment: jest.fn(),
    } as unknown as jest.Mocked<DepartmentService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate creation to the department service', async () => {
        (departmentService.createDepartment as jest.Mock).mockResolvedValue(department);

        const handler = new CreateDepartmentHandler(departmentService);
        const command = new CreateDepartmentCommand('Cardiology', 'Heart care');

        const result = await handler.execute(command);

        expect(departmentService.createDepartment).toHaveBeenCalledWith({
            name: 'Cardiology',
            description: 'Heart care',
        });
        expect(result).toEqual(department);
    });
});
