import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'department-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    DepartmentPrismaRepository,
} = require('../../src/modules/departments/infrastructure/department.prisma.repository');

const department = {
    id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    name: 'Cardiology',
    description: 'Heart care',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

describe('Department routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('should create a department successfully', async () => {
        jest.spyOn(DepartmentPrismaRepository.prototype, 'findByName').mockResolvedValue(null);
        jest.spyOn(DepartmentPrismaRepository.prototype, 'create').mockResolvedValue(department);

        const response = await request(app)
            .post('/api/departments')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['departments:manage:all'])}`,
            )
            .send({
                name: ' Cardiology ',
                description: ' Heart care ',
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Cardiology');
    });

    it('should reject duplicate department creation', async () => {
        jest.spyOn(DepartmentPrismaRepository.prototype, 'findByName').mockResolvedValue(
            department,
        );

        const response = await request(app)
            .post('/api/departments')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['departments:manage:all'])}`,
            )
            .send({
                name: 'Cardiology',
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Department already exists');
    });

    it('should get department by id', async () => {
        jest.spyOn(DepartmentPrismaRepository.prototype, 'findById').mockResolvedValue(
            department,
        );

        const response = await request(app)
            .get(`/api/departments/${department.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['departments:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(department.id);
    });

    it('should list departments with filters', async () => {
        const listSpy = jest
            .spyOn(DepartmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [department],
                meta: {
                    page: 2,
                    limit: 5,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/departments?page=2&limit=5&search=cardio&isActive=true')
            .set('Authorization', `Bearer ${createAccessToken(['departments:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.meta.page).toBe(2);
        expect(listSpy).toHaveBeenCalledWith({
            page: 2,
            limit: 5,
            search: 'cardio',
            isActive: true,
        });
    });

    it('should update a department', async () => {
        const updatedDepartment = {
            ...department,
            name: 'Radiology',
            description: 'Imaging unit',
        };

        jest.spyOn(DepartmentPrismaRepository.prototype, 'findById').mockResolvedValue(
            department,
        );
        jest.spyOn(DepartmentPrismaRepository.prototype, 'findByName').mockResolvedValue(null);
        jest.spyOn(DepartmentPrismaRepository.prototype, 'update').mockResolvedValue(
            updatedDepartment,
        );

        const response = await request(app)
            .patch(`/api/departments/${department.id}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['departments:manage:all'])}`,
            )
            .send({
                name: ' Radiology ',
                description: ' Imaging unit ',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Radiology');
    });

    it('should deactivate a department', async () => {
        jest.spyOn(DepartmentPrismaRepository.prototype, 'findById').mockResolvedValue(
            department,
        );
        jest.spyOn(DepartmentPrismaRepository.prototype, 'deactivate').mockResolvedValue({
            ...department,
            isActive: false,
        });

        const response = await request(app)
            .delete(`/api/departments/${department.id}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['departments:manage:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.isActive).toBe(false);
    });

    it('should reject unauthorized requests', async () => {
        const response = await request(app).get('/api/departments');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject forbidden requests', async () => {
        const response = await request(app)
            .delete(`/api/departments/${department.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['departments:read'])}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });
});
