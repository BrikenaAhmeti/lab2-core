import { AppError } from '../../src/shared/core/errors/app-error';
import { StaffPositionTypeRepository } from '../../src/modules/staff-position-types/domain/staff-position-type.repository';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

function createRepositoryMock(): jest.Mocked<StaffPositionTypeRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
        findDepartmentsByIds: jest.fn(),
        countAssignedStaffProfiles: jest.fn(),
    };
}

describe('StaffPositionTypeService', () => {
    const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
    const staffPositionTypeEntity = {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        name: 'Radiologic Technologist',
        description: 'Imaging specialist',
        defaultRoleKey: 'lab_technician',
        applicableDepartmentIds: [departmentId],
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const staffPositionType = {
        ...staffPositionTypeEntity,
        defaultRoleName: 'Lab Technician',
        applicableDepartments: [
            {
                id: departmentId,
                name: 'Radiology',
                isActive: true,
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should normalize and create a staff position type', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.findByName.mockResolvedValue(null);
        repository.findDepartmentsByIds.mockResolvedValue(
            staffPositionType.applicableDepartments,
        );
        repository.create.mockResolvedValue(staffPositionTypeEntity);
        repository.findById.mockResolvedValue(staffPositionType);

        const result = await service.createStaffPositionType({
            name: '  Radiologic   Technologist ',
            description: '  Imaging   specialist ',
            defaultRoleKey: 'Lab Technician',
            applicableDepartmentIds: [departmentId, departmentId],
        });

        expect(repository.create).toHaveBeenCalledWith({
            name: 'Radiologic Technologist',
            description: 'Imaging specialist',
            defaultRoleKey: 'lab_technician',
            applicableDepartmentIds: [departmentId],
            isActive: undefined,
        });
        expect(result).toEqual(staffPositionType);
    });

    it('should reject invalid applicable departments', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.findByName.mockResolvedValue(null);
        repository.findDepartmentsByIds.mockResolvedValue([]);

        await expect(
            service.createStaffPositionType({
                name: 'Physiotherapy Assistant',
                defaultRoleKey: 'nurse',
                applicableDepartmentIds: [departmentId],
            }),
        ).rejects.toMatchObject({
            message: 'One or more applicable departments are invalid',
            statusCode: 400,
        });
    });

    it('should list staff position types', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.list.mockResolvedValue({
            items: [staffPositionType],
        });

        const result = await service.listStaffPositionTypes({
            isActive: true,
        });

        expect(repository.list).toHaveBeenCalledWith({
            isActive: true,
        });
        expect(result.items).toHaveLength(1);
    });

    it('should update a staff position type', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.findById
            .mockResolvedValueOnce(staffPositionType)
            .mockResolvedValueOnce({
                ...staffPositionType,
                name: 'Optometrist',
                defaultRoleKey: 'doctor',
                defaultRoleName: 'Doctor',
            });
        repository.findByName.mockResolvedValue(null);
        repository.findDepartmentsByIds.mockResolvedValue(
            staffPositionType.applicableDepartments,
        );
        repository.update.mockResolvedValue({
            ...staffPositionTypeEntity,
            name: 'Optometrist',
            defaultRoleKey: 'doctor',
        });

        const result = await service.updateStaffPositionType(staffPositionType.id, {
            name: '  Optometrist ',
            defaultRoleKey: 'Doctor',
            applicableDepartmentIds: [departmentId],
        });

        expect(repository.update).toHaveBeenCalledWith(staffPositionType.id, {
            name: 'Optometrist',
            defaultRoleKey: 'doctor',
            applicableDepartmentIds: [departmentId],
        });
        expect(result).toMatchObject({
            name: 'Optometrist',
            defaultRoleKey: 'doctor',
            defaultRoleName: 'Doctor',
        });
    });

    it('should reject deactivation when staff profiles are assigned', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.findById.mockResolvedValue(staffPositionType);
        repository.countAssignedStaffProfiles.mockResolvedValue(2);

        await expect(
            service.deactivateStaffPositionType(staffPositionType.id),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('should deactivate a staff position type when it has no assigned staff profiles', async () => {
        const repository = createRepositoryMock();
        const service = new StaffPositionTypeService(repository);

        repository.findById
            .mockResolvedValueOnce(staffPositionType)
            .mockResolvedValueOnce({
                ...staffPositionType,
                isActive: false,
            });
        repository.countAssignedStaffProfiles.mockResolvedValue(0);
        repository.deactivate.mockResolvedValue({
            ...staffPositionTypeEntity,
            isActive: false,
        });

        const result = await service.deactivateStaffPositionType(staffPositionType.id);

        expect(repository.deactivate).toHaveBeenCalledWith(staffPositionType.id);
        expect(result.isActive).toBe(false);
    });
});
