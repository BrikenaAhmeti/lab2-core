import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'department-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    ServiceCatalogPrismaRepository,
} = require('../../src/modules/service-catalog/infrastructure/service-catalog.prisma.repository');

const serviceCatalog = {
    id: '7d6bc4ce-6a73-48cd-b27d-06fae03c8f67',
    departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    name: 'Initial Consultation',
    description: 'Standard first visit',
    defaultDurationMinutes: 30,
    defaultPrice: 50,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    department: {
        id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Cardiology',
        isActive: true,
    },
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

describe('Service catalog routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('should create a service successfully', async () => {
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'departmentExists').mockResolvedValue(true);
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'create').mockResolvedValue(serviceCatalog);

        const response = await request(app)
            .post('/api/services')
            .set('Authorization', `Bearer ${createAccessToken(['services:manage:all'])}`)
            .send({
                departmentId: serviceCatalog.departmentId,
                name: ' Initial Consultation ',
                description: ' Standard first visit ',
                defaultDurationMinutes: 30,
                defaultPrice: 50,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Initial Consultation');
        expect(response.body.department.name).toBe('Cardiology');
    });

    it('should get a service by id with department info', async () => {
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'findById').mockResolvedValue(serviceCatalog);

        const response = await request(app)
            .get(`/api/services/${serviceCatalog.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['services:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(serviceCatalog.id);
        expect(response.body.department.id).toBe(serviceCatalog.departmentId);
    });

    it('should list services with filters', async () => {
        const listSpy = jest
            .spyOn(ServiceCatalogPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [serviceCatalog],
                meta: {
                    page: 2,
                    limit: 5,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/services?page=2&limit=5&departmentId=${serviceCatalog.departmentId}&isActive=true`)
            .set('Authorization', `Bearer ${createAccessToken(['services:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.meta.page).toBe(2);
        expect(listSpy).toHaveBeenCalledWith({
            page: 2,
            limit: 5,
            search: undefined,
            departmentId: serviceCatalog.departmentId,
            isActive: true,
            sortBy: undefined,
            sortDirection: undefined,
        });
    });

    it('should update a service with put', async () => {
        const updatedService = {
            ...serviceCatalog,
            name: 'Follow-up Visit',
            description: 'Shorter visit',
        };

        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'findById').mockResolvedValue(serviceCatalog);
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'update').mockResolvedValue(updatedService);

        const response = await request(app)
            .put(`/api/services/${serviceCatalog.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['services:manage:all'])}`)
            .send({
                name: ' Follow-up Visit ',
                description: ' Shorter visit ',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Follow-up Visit');
    });

    it('should block deactivation when active appointments exist', async () => {
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'findById').mockResolvedValue(serviceCatalog);
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'countActiveAppointmentsByServiceId').mockResolvedValue(1);

        const response = await request(app)
            .delete(`/api/services/${serviceCatalog.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['services:manage:all'])}`);

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Service cannot be deactivated while active appointments reference it');
    });

    it('should deactivate a service', async () => {
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'findById').mockResolvedValue(serviceCatalog);
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'countActiveAppointmentsByServiceId').mockResolvedValue(0);
        jest.spyOn(ServiceCatalogPrismaRepository.prototype, 'deactivate').mockResolvedValue({
            ...serviceCatalog,
            isActive: false,
        });

        const response = await request(app)
            .delete(`/api/services/${serviceCatalog.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['services:manage:all'])}`);

        expect(response.status).toBe(200);
        expect(response.body.isActive).toBe(false);
    });
});
