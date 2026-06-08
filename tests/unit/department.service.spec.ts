import { AppError } from '../../src/shared/core/errors/app-error';
import { DepartmentRepository } from '../../src/modules/departments/domain/department.repository';
import { DepartmentService } from '../../src/modules/departments/services/department.service';

function createRepositoryMock(): jest.Mocked<DepartmentRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
    };
}

describe('DepartmentService', () => {
    const department = {
        id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Cardiology',
        description: 'Heart care',
        floor: null,
        phoneExtension: null,
        operatingHours: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should normalize and create a department', async () => {
        const repository = createRepositoryMock();
        const service = new DepartmentService(repository);

        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue(department);

        const result = await service.createDepartment({
            name: '  Cardiology  ',
            description: '  Heart   care  ',
        });

        expect(repository.findByName).toHaveBeenCalledWith('Cardiology');
        expect(repository.create).toHaveBeenCalledWith({
            name: 'Cardiology',
            description: 'Heart care',
        });
        expect(result).toEqual(department);
    });

    it('should reject duplicate departments', async () => {
        const repository = createRepositoryMock();
        const service = new DepartmentService(repository);

        repository.findByName.mockResolvedValue(department);

        await expect(
            service.createDepartment({
                name: 'Cardiology',
            }),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('should list departments with normalized filters', async () => {
        const repository = createRepositoryMock();
        const service = new DepartmentService(repository);

        repository.list.mockResolvedValue({
            items: [department],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });

        const result = await service.listDepartments({
            page: 1,
            limit: 10,
            search: '  cardio   unit ',
            isActive: true,
            sortBy: 'createdAt',
            sortDirection: 'desc',
            openAt: '2026-01-05T10:30',
            openFrom: '2026-01-06T09:00',
            openTo: '2026-01-07T15:30',
        });

        expect(repository.list).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: 'cardio unit',
            isActive: true,
            sortBy: 'createdAt',
            sortDirection: 'desc',
            openAt: '2026-01-05T10:30',
            openFrom: '2026-01-06T09:00',
            openTo: '2026-01-07T15:30',
        });
        expect(result.items).toHaveLength(1);
    });

    it('should update a department', async () => {
        const repository = createRepositoryMock();
        const service = new DepartmentService(repository);

        repository.findById.mockResolvedValue(department);
        repository.findByName.mockResolvedValue(null);
        repository.update.mockResolvedValue({
            ...department,
            name: 'Radiology',
            description: 'Imaging unit',
        });

        const result = await service.updateDepartment(department.id, {
            name: ' Radiology ',
            description: ' Imaging   unit ',
            isActive: true,
        });

        expect(repository.update).toHaveBeenCalledWith(department.id, {
            name: 'Radiology',
            description: 'Imaging unit',
            isActive: true,
        });
        expect(result.name).toBe('Radiology');
    });

    it('should deactivate an active department', async () => {
        const repository = createRepositoryMock();
        const service = new DepartmentService(repository);

        repository.findById.mockResolvedValue(department);
        repository.deactivate.mockResolvedValue({
            ...department,
            isActive: false,
        });

        const result = await service.deactivateDepartment(department.id);

        expect(repository.deactivate).toHaveBeenCalledWith(department.id);
        expect(result.isActive).toBe(false);
    });
});
