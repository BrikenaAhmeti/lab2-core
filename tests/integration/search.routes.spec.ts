import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'search-routes-test-secret';
process.env.PATIENT_DATA_ENCRYPTION_KEY = 'search-routes-test-key';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    AdvancedSearchPrismaRepository,
} = require('../../src/modules/search/infrastructure/search.prisma.repository');

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Search routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('searches patients with filters, sorting, and pagination', async () => {
        const result = {
            data: [
                {
                    id: '6d8ad35f-76cc-4cf7-bc12-065ac46a3f7f',
                    userId: null,
                    firstName: 'Arta',
                    lastName: 'Krasniqi',
                    email: 'arta@example.com',
                    phone: '+38344111222',
                    dateOfBirth: '1995-04-10T00:00:00.000Z',
                    age: 31,
                    gender: 'female',
                    bloodType: 'A_POSITIVE',
                    isActive: true,
                    createdAt: '2026-01-10T00:00:00.000Z',
                    updatedAt: '2026-01-10T00:00:00.000Z',
                },
            ],
            total: 1,
            page: 2,
            limit: 5,
            totalPages: 1,
        };
        const searchSpy = jest
            .spyOn(AdvancedSearchPrismaRepository.prototype, 'searchPatients')
            .mockResolvedValue(result);

        const response = await request(app)
            .get(
                '/api/search/patients?q=Arta&page=2&limit=5&gender=female&minAge=20&maxAge=40&bloodType=A_POSITIVE&sortBy=lastName&sortOrder=asc',
            )
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(result);
        expect(searchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                page: 2,
                limit: 5,
                search: 'Arta',
                gender: 'female',
                minAge: 20,
                maxAge: 40,
                bloodType: 'A_POSITIVE',
                sortBy: 'lastName',
                sortOrder: 'asc',
                personalNumberHash: expect.any(String),
            }),
        );
    });

    it('maps lab order filters before searching', async () => {
        const searchSpy = jest
            .spyOn(AdvancedSearchPrismaRepository.prototype, 'searchLabOrders')
            .mockResolvedValue({
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            });

        const response = await request(app)
            .get('/api/search/lab-orders?status=in_progress&hasCritical=true')
            .set('Authorization', `Bearer ${createAccessToken(['lab_orders:read'])}`);

        expect(response.status).toBe(200);
        expect(searchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'IN_PROGRESS',
                hasCritical: true,
            }),
        );
    });

    it('protects inventory search with inventory permissions', async () => {
        const response = await request(app)
            .get('/api/search/inventory-items')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(403);
    });
});
