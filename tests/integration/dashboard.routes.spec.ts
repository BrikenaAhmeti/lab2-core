import jwt from 'jsonwebtoken';
import request from 'supertest';
import { DashboardStats } from '../../src/modules/dashboard/domain/dashboard.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'dashboard-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    DashboardPrismaRepository,
} = require('../../src/modules/dashboard/infrastructure/dashboard.prisma.repository');

const dashboardStats: DashboardStats = {
    appointments: {
        scheduled: 4,
        checkedIn: 2,
        completed: 6,
        cancelled: 1,
        noShow: 1,
        total: 14,
    },
    checkedInPatients: 2,
    pendingLabOrders: 5,
    lowStockItems: 3,
    revenue: {
        today: 120,
        week: 760,
        month: 2480,
    },
    revenueTrend: [
        { date: '2026-05-21', total: 90 },
        { date: '2026-05-22', total: 110 },
        { date: '2026-05-23', total: 80 },
        { date: '2026-05-24', total: 140 },
        { date: '2026-05-25', total: 95 },
        { date: '2026-05-26', total: 125 },
        { date: '2026-05-27', total: 120 },
    ],
    updatedAt: new Date('2026-05-27T12:00:00.000Z'),
};

function createAccessToken(permissions: string[], roles = ['Admin']) {
    return jwt.sign(
        {
            sub: '7cded68b-2455-4104-87ea-cc3b78d2aa6f',
            email: 'dashboard@medsphere.local',
            roles,
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Dashboard routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('returns dashboard stats for the frontend', async () => {
        const statsSpy = jest
            .spyOn(DashboardPrismaRepository.prototype, 'getStats')
            .mockResolvedValue(dashboardStats);

        const response = await request(app)
            .get('/api/dashboard/stats')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['dashboard:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            ...dashboardStats,
            updatedAt: dashboardStats.updatedAt.toISOString(),
        });
        expect(statsSpy).toHaveBeenCalledWith(expect.any(Date));
    });

    it('allows admin roles without a dashboard permission claim', async () => {
        jest
            .spyOn(DashboardPrismaRepository.prototype, 'getStats')
            .mockResolvedValue(dashboardStats);

        const response = await request(app)
            .get('/api/dashboard/stats')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:read:all'], ['Super Admin'])}`,
            );

        expect(response.status).toBe(200);
    });

    it('requires dashboard read access', async () => {
        const response = await request(app)
            .get('/api/dashboard/stats')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:read:all'], ['Nurse'])}`,
            );

        expect(response.status).toBe(403);
    });
});
