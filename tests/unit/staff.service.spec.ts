import { StaffService } from '../../src/modules/staff/services/staff.service';
import { StaffRepository } from '../../src/modules/staff/domain/staff.repository';
import { StaffProfileView } from '../../src/modules/staff/domain/staff.entity';

const positionType = {
    id: '19d58aae-448c-40fb-8c2b-17fdb09883b8',
    name: 'Doctor',
    defaultRoleKey: 'doctor',
    isActive: true,
};

const department = {
    id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    name: 'Cardiology',
    isActive: true,
};

const staffProfile: StaffProfileView = {
    id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    user: {
        id: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    },
    staffPositionTypeId: positionType.id,
    positionType,
    employeeCode: 'DR-001',
    specialization: 'Cardiology',
    licenseNumber: 'LIC-100',
    employmentStatus: 'ACTIVE',
    hireDate: new Date('2026-01-10T00:00:00.000Z'),
    terminationDate: null,
    bio: 'Heart care specialist',
    isPublicProfile: true,
    departments: [
        {
            id: 'ca0c7c75-3e7d-4887-98bb-a13fd3dc7d3c',
            departmentId: department.id,
            isPrimary: true,
            assignedAt: new Date('2026-01-10T00:00:00.000Z'),
            unassignedAt: null,
            department,
        },
    ],
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
};

function createRepositoryMock(): jest.Mocked<StaffRepository> {
    return {
        createWithDepartments: jest.fn(),
        findById: jest.fn(),
        findByUserId: jest.fn(),
        findByEmployeeCode: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
        addDepartment: jest.fn(),
        removeDepartment: jest.fn(),
        countFutureAppointments: jest.fn(),
        findPositionTypeById: jest.fn(),
        findDepartmentsByIds: jest.fn(),
    };
}

describe('StaffService', () => {
    it('creates a staff profile with normalized fields and one primary department', async () => {
        const repository = createRepositoryMock();
        repository.findPositionTypeById.mockResolvedValue(positionType);
        repository.findByUserId.mockResolvedValue(null);
        repository.findByEmployeeCode.mockResolvedValue(null);
        repository.findDepartmentsByIds.mockResolvedValue([department]);
        repository.createWithDepartments.mockResolvedValue(staffProfile);
        const service = new StaffService(repository);

        const result = await service.createStaffProfile({
            userId: staffProfile.userId,
            staffPositionTypeId: positionType.id,
            employeeCode: ' dr-001 ',
            specialization: ' Cardiology ',
            licenseNumber: ' LIC-100 ',
            bio: ' Heart care specialist ',
            departments: [{ departmentId: department.id }],
        });

        expect(result.id).toBe(staffProfile.id);
        expect(repository.createWithDepartments).toHaveBeenCalledWith(
            expect.objectContaining({
                employeeCode: 'DR-001',
                specialization: 'Cardiology',
                licenseNumber: 'LIC-100',
                bio: 'Heart care specialist',
                departments: [
                    {
                        departmentId: department.id,
                        isPrimary: true,
                    },
                ],
            }),
        );
    });

    it('provisions an auth account when a staff profile is created without a user id', async () => {
        const repository = createRepositoryMock();
        const authClient = {
            provisionAccount: jest.fn().mockResolvedValue({
                id: staffProfile.userId,
                email: 'doctor@medsphere.local',
                firstName: 'Ana',
                lastName: 'Doctor',
                isActive: false,
                roles: ['Doctor'],
            }),
        };
        repository.findPositionTypeById.mockResolvedValue(positionType);
        repository.findByEmployeeCode.mockResolvedValue(null);
        repository.findDepartmentsByIds.mockResolvedValue([department]);
        repository.createWithDepartments.mockResolvedValue(staffProfile);
        const service = new StaffService(repository, authClient);

        await service.createStaffProfile({
            firstName: ' Ana ',
            lastName: ' Doctor ',
            email: ' DOCTOR@MEDSPHERE.LOCAL ',
            staffPositionTypeId: positionType.id,
            employeeCode: 'DR-001',
            departments: [{ departmentId: department.id }],
            actorUserId: 'admin-user',
        });

        expect(authClient.provisionAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                actorUserId: 'admin-user',
                firstName: 'Ana',
                lastName: 'Doctor',
                email: 'doctor@medsphere.local',
                roles: ['Doctor'],
            }),
        );
        expect(repository.createWithDepartments).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: staffProfile.userId,
            }),
        );
    });

    it('rejects duplicate staff profiles for the same user', async () => {
        const repository = createRepositoryMock();
        repository.findPositionTypeById.mockResolvedValue(positionType);
        repository.findByUserId.mockResolvedValue(staffProfile);
        const service = new StaffService(repository);

        await expect(
            service.createStaffProfile({
                userId: staffProfile.userId,
                staffPositionTypeId: positionType.id,
                employeeCode: 'DR-001',
                departments: [{ departmentId: department.id }],
            }),
        ).rejects.toMatchObject({
            message: 'Staff profile already exists for this user',
            statusCode: 409,
        });
    });

    it('adds seeded staff email fallbacks when auth profiles are unavailable', async () => {
        const repository = createRepositoryMock();
        repository.list.mockResolvedValue({
            items: [
                {
                    ...staffProfile,
                    userId: 'b2000000-0000-4000-8000-000000000001',
                    user: { id: 'b2000000-0000-4000-8000-000000000001' },
                    employeeCode: 'Dr. Amina El-Sayed',
                },
            ],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
        const service = new StaffService(repository);

        const result = await service.listStaffProfiles({ page: 1, limit: 10 });

        expect(result.items[0].user).toEqual(
            expect.objectContaining({
                name: 'Amina El-Sayed',
                firstName: 'Amina',
                lastName: 'El-Sayed',
                email: 'amina.el-sayed@medsphere.local',
            }),
        );
    });

    it('blocks deactivation when future appointments exist', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(staffProfile);
        repository.countFutureAppointments.mockResolvedValue(2);
        const service = new StaffService(repository);

        await expect(
            service.deactivateStaffProfile(staffProfile.id, staffProfile.userId),
        ).rejects.toMatchObject({
            message:
                'Staff profile cannot be deactivated while future appointments exist',
            statusCode: 409,
        });
        expect(repository.deactivate).not.toHaveBeenCalled();
    });

    it('keeps at least one active department assignment', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(staffProfile);
        const service = new StaffService(repository);

        await expect(
            service.removeDepartment(staffProfile.id, department.id, staffProfile.userId),
        ).rejects.toMatchObject({
            message: 'Staff profile must have at least one department',
            statusCode: 409,
        });
        expect(repository.removeDepartment).not.toHaveBeenCalled();
    });
});
