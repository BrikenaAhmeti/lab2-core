import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'department-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    StaffPositionTypePrismaRepository,
} = require('../../src/modules/staff-position-types/infrastructure/staff-position-type.prisma.repository');

const staffPositionType = {
    id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    name: 'Radiologic Technologist',
    description: 'Imaging specialist',
    defaultRoleKey: 'lab_technician',
    defaultRoleName: 'Lab Technician',
    applicableDepartmentIds: ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
    applicableDepartments: [
        {
            id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
            name: 'Radiology',
            isActive: true,
        },
    ],
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};
const staffPositionTypeEntity = {
    id: staffPositionType.id,
    name: staffPositionType.name,
    description: staffPositionType.description,
    defaultRoleKey: staffPositionType.defaultRoleKey,
    applicableDepartmentIds: staffPositionType.applicableDepartmentIds,
    isActive: staffPositionType.isActive,
    createdAt: staffPositionType.createdAt,
    updatedAt: staffPositionType.updatedAt,
};

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: 'user-1',
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Staff position type routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('should create a staff position type successfully', async () => {
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findByName').mockResolvedValue(
            null,
        );
        jest.spyOn(
            StaffPositionTypePrismaRepository.prototype,
            'findDepartmentsByIds',
        ).mockResolvedValue(staffPositionType.applicableDepartments);
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'create').mockResolvedValue(
            staffPositionTypeEntity,
        );
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findById').mockResolvedValue(
            staffPositionType,
        );

        const response = await request(app)
            .post('/api/staff-position-types')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['staff-types:manage:all'])}`,
            )
            .send({
                name: ' Radiologic   Technologist ',
                description: ' Imaging specialist ',
                defaultRoleKey: 'Lab Technician',
                applicableDepartmentIds: ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
            });

        expect(response.status).toBe(201);
        expect(response.body.defaultRoleKey).toBe('lab_technician');
        expect(response.body.defaultRoleName).toBe('Lab Technician');
    });

    it('should list staff position types with filters', async () => {
        const listSpy = jest
            .spyOn(StaffPositionTypePrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [staffPositionType],
            });

        const response = await request(app)
            .get('/api/staff-position-types?isActive=true')
            .set('Authorization', `Bearer ${createAccessToken(['staff-types:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith({
            isActive: true,
        });
    });

    it('should get a staff position type by id', async () => {
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findById').mockResolvedValue(
            staffPositionType,
        );

        const response = await request(app)
            .get(`/api/staff-position-types/${staffPositionType.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['staff-types:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(staffPositionType.id);
    });

    it('should update a staff position type', async () => {
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findById')
            .mockResolvedValueOnce(staffPositionType)
            .mockResolvedValueOnce({
                ...staffPositionType,
                name: 'Optometrist',
                defaultRoleKey: 'doctor',
                defaultRoleName: 'Doctor',
            });
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findByName').mockResolvedValue(
            null,
        );
        jest.spyOn(
            StaffPositionTypePrismaRepository.prototype,
            'findDepartmentsByIds',
        ).mockResolvedValue(staffPositionType.applicableDepartments);
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'update').mockResolvedValue({
            ...staffPositionTypeEntity,
            name: 'Optometrist',
            defaultRoleKey: 'doctor',
        });

        const response = await request(app)
            .put(`/api/staff-position-types/${staffPositionType.id}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['staff-types:manage:all'])}`,
            )
            .send({
                name: 'Optometrist',
                defaultRoleKey: 'Doctor',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Optometrist');
    });

    it('should reject deactivation when staff profiles are assigned', async () => {
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findById').mockResolvedValue(
            staffPositionType,
        );
        jest.spyOn(
            StaffPositionTypePrismaRepository.prototype,
            'countAssignedStaffProfiles',
        ).mockResolvedValue(1);

        const response = await request(app)
            .delete(`/api/staff-position-types/${staffPositionType.id}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['staff-types:manage:all'])}`,
            );

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            'Staff position type cannot be deactivated while staff profiles are assigned to it',
        );
    });

    it('should deactivate a staff position type', async () => {
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'findById')
            .mockResolvedValueOnce(staffPositionType)
            .mockResolvedValueOnce({
                ...staffPositionType,
                isActive: false,
            });
        jest.spyOn(
            StaffPositionTypePrismaRepository.prototype,
            'countAssignedStaffProfiles',
        ).mockResolvedValue(0);
        jest.spyOn(StaffPositionTypePrismaRepository.prototype, 'deactivate').mockResolvedValue({
            ...staffPositionTypeEntity,
            isActive: false,
        });

        const response = await request(app)
            .delete(`/api/staff-position-types/${staffPositionType.id}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['staff-types:manage:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.isActive).toBe(false);
    });

    it('should reject unauthorized requests', async () => {
        const response = await request(app).get('/api/staff-position-types');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject forbidden requests', async () => {
        const response = await request(app)
            .delete(`/api/staff-position-types/${staffPositionType.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['staff-types:read'])}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });
}
