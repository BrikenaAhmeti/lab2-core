import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'setting-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    SettingPrismaRepository,
} = require('../../src/modules/settings/infrastructure/setting.prisma.repository');

const facilityNameSetting = {
    id: '1d2fd8a0-6074-472d-b65f-e5e0d9fd9f7a',
    key: 'facility_name',
    value: 'MedSphere Demo Clinic',
    description: 'Facility display name',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: null,
    updatedBy: null,
};

const reminderSetting = {
    id: 'fcae98f6-8df2-4743-bca5-5c2719bb4c22',
    key: 'appointment_reminder_24h',
    value: true,
    description: '24h reminder toggle',
    isPublic: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: null,
    updatedBy: null,
};

function createAccessToken(permissions: string[], roles: string[] = ['Admin']) {
    return jwt.sign(
        {
            sub: 'user-1',
            email: 'admin@medsphere.local',
            roles,
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Setting routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('should list settings grouped by category', async () => {
        jest.spyOn(SettingPrismaRepository.prototype, 'findAll').mockResolvedValue([
            facilityNameSetting,
            reminderSetting,
        ]);

        const response = await request(app)
            .get('/api/settings')
            .set('Authorization', `Bearer ${createAccessToken(['settings:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.facility.settings[0].key).toBe('facility_name');
        expect(response.body.notifications.settings[0].key).toBe(
            'appointment_reminder_24h',
        );
    });

    it('should update a setting for a super admin', async () => {
        jest.spyOn(SettingPrismaRepository.prototype, 'findByKey').mockResolvedValue(
            facilityNameSetting,
        );
        jest.spyOn(SettingPrismaRepository.prototype, 'updateWithAudit').mockResolvedValue({
            ...facilityNameSetting,
            value: 'MedSphere Central Clinic',
            updatedBy: 'user-1',
        });

        const response = await request(app)
            .put('/api/settings/facility_name')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['settings:manage:all'], ['Super Admin'])}`,
            )
            .send({
                value: 'MedSphere Central Clinic',
            });

        expect(response.status).toBe(200);
        expect(response.body.value).toBe('MedSphere Central Clinic');
    });

    it('should bulk update settings for a super admin', async () => {
        jest.spyOn(SettingPrismaRepository.prototype, 'findByKeys').mockResolvedValue([
            facilityNameSetting,
            reminderSetting,
        ]);
        jest.spyOn(SettingPrismaRepository.prototype, 'updateManyWithAudit').mockResolvedValue([
            {
                ...facilityNameSetting,
                value: 'MedSphere East Clinic',
                updatedBy: 'user-1',
            },
            {
                ...reminderSetting,
                value: false,
                updatedBy: 'user-1',
            },
        ]);

        const response = await request(app)
            .put('/api/settings/bulk')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['settings:manage:all'], ['Super Admin'])}`,
            )
            .send({
                settings: [
                    { key: 'facility_name', value: 'MedSphere East Clinic' },
                    { key: 'appointment_reminder_24h', value: false },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(2);
    });

    it('should reject writes for non-super-admin users', async () => {
        const response = await request(app)
            .put('/api/settings/facility_name')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['settings:manage:all'], ['Admin'])}`,
            )
            .send({
                value: 'MedSphere Central Clinic',
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Super Admin access required');
    });
});
