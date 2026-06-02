import { AppError } from '../../src/shared/core/errors/app-error';
import { SettingRepository } from '../../src/modules/settings/domain/setting.repository';
import { SettingService } from '../../src/modules/settings/services/setting.service';

function createRepositoryMock(): jest.Mocked<SettingRepository> {
    return {
        findAll: jest.fn(),
        findPublic: jest.fn(),
        findByKey: jest.fn(),
        findByKeys: jest.fn(),
        updateWithAudit: jest.fn(),
        updateManyWithAudit: jest.fn(),
    };
}

describe('SettingService', () => {
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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should group settings by category', async () => {
        const repository = createRepositoryMock();
        const service = new SettingService(repository);

        repository.findAll.mockResolvedValue([facilityNameSetting, reminderSetting]);

        const result = await service.getGroupedSettings();

        expect(result.facility.settings).toHaveLength(1);
        expect(result.notifications.settings).toHaveLength(1);
        expect(result.facility.settings[0].label).toBe('Facility Name');
    });

    it('should list only public settings for website consumers', async () => {
        const repository = createRepositoryMock();
        const service = new SettingService(repository);

        repository.findPublic.mockResolvedValue([
            {
                ...facilityNameSetting,
                isPublic: true,
            },
        ]);

        const result = await service.getPublicSettings();

        expect(repository.findPublic).toHaveBeenCalledTimes(1);
        expect(result.facility.settings).toHaveLength(1);
        expect(result.facility.settings[0]).toEqual(
            expect.objectContaining({
                key: 'facility_name',
                isPublic: true,
            }),
        );
    });

    it('should update a setting and write audit context', async () => {
        const repository = createRepositoryMock();
        const service = new SettingService(repository);
        const updatedSetting = {
            ...facilityNameSetting,
            value: 'MedSphere Central Clinic',
            updatedBy: 'user-1',
        };

        repository.findByKey.mockResolvedValue(facilityNameSetting);
        repository.updateWithAudit.mockResolvedValue(updatedSetting);

        const result = await service.updateSetting(
            'facility_name',
            'MedSphere Central Clinic',
            {
                performedByUserId: 'user-1',
                ipAddress: '127.0.0.1',
                userAgent: 'jest',
            },
        );

        expect(repository.updateWithAudit).toHaveBeenCalledWith(
            'facility_name',
            'MedSphere Central Clinic',
            expect.objectContaining({
                key: 'facility_name',
                category: 'facility',
                previousValue: 'MedSphere Demo Clinic',
                nextValue: 'MedSphere Central Clinic',
                updatedBy: 'user-1',
            }),
            expect.objectContaining({
                performedByUserId: 'user-1',
            }),
        );
        expect(result.value).toBe('MedSphere Central Clinic');
    });

    it('should reject attempts to update read-only settings', async () => {
        const repository = createRepositoryMock();
        const service = new SettingService(repository);

        await expect(
            service.updateSetting('auth.super_admin_reference', { userId: facilityNameSetting.id }, {}),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('should bulk update multiple settings', async () => {
        const repository = createRepositoryMock();
        const service = new SettingService(repository);
        const updatedFacilitySetting = {
            ...facilityNameSetting,
            value: 'MedSphere East Clinic',
            updatedBy: 'user-2',
        };
        const updatedReminderSetting = {
            ...reminderSetting,
            value: false,
            updatedBy: 'user-2',
        };

        repository.findByKeys.mockResolvedValue([facilityNameSetting, reminderSetting]);
        repository.updateManyWithAudit.mockResolvedValue([
            updatedFacilitySetting,
            updatedReminderSetting,
        ]);

        const result = await service.updateSettingsBulk(
            [
                { key: 'facility_name', value: 'MedSphere East Clinic' },
                { key: 'appointment_reminder_24h', value: false },
            ],
            {
                performedByUserId: 'user-2',
            },
        );

        expect(repository.updateManyWithAudit).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ key: 'facility_name', value: 'MedSphere East Clinic' }),
                expect.objectContaining({ key: 'appointment_reminder_24h', value: false }),
            ]),
            expect.objectContaining({ performedByUserId: 'user-2' }),
        );
        expect(result).toHaveLength(2);
    });
});
