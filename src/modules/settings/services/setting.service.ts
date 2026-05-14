import { AppError } from '../../../shared/core/errors/app-error';
import {
    SETTING_DEFINITIONS_BY_KEY,
    SettingCategory,
} from '../domain/setting-definition';
import {
    AuditContext,
    SettingRepository,
} from '../domain/setting.repository';

type GroupedSettingItem = {
    key: string;
    label: string;
    description: string;
    category: SettingCategory;
    value: unknown;
    isPublic: boolean;
    readOnly: boolean;
    updatedAt: Date;
    updatedBy: string | null;
};

type GroupedSettingsResponse = Record<
    string,
    {
        label: string;
        settings: GroupedSettingItem[];
    }
>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const CATEGORY_LABELS: Record<SettingCategory, string> = {
    facility: 'Facility',
    scheduling: 'Scheduling',
    notifications: 'Notifications',
    security: 'Security',
    system: 'System',
    other: 'Other',
};

function toTitleCase(value: string) {
    return value
        .split(/[._-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function valuesAreEqual(left: unknown, right: unknown) {
    return JSON.stringify(left) === JSON.stringify(right);
}

export class SettingService {
    private cachedGroupedSettings:
        | { expiresAt: number; value: GroupedSettingsResponse }
        | null = null;

    constructor(private readonly settingRepository: SettingRepository) { }

    async getGroupedSettings(): Promise<GroupedSettingsResponse> {
        if (
            this.cachedGroupedSettings &&
            this.cachedGroupedSettings.expiresAt > Date.now()
        ) {
            return this.cachedGroupedSettings.value;
        }

        const settings = await this.settingRepository.findAll();
        const grouped = this.groupSettings(settings);

        this.cachedGroupedSettings = {
            value: grouped,
            expiresAt: Date.now() + CACHE_TTL_MS,
        };

        return grouped;
    }

    async updateSetting(
        key: string,
        value: unknown,
        auditContext: AuditContext,
    ): Promise<GroupedSettingItem> {
        const definition = SETTING_DEFINITIONS_BY_KEY.get(key);

        if (!definition) {
            throw new AppError('Setting not found', 404);
        }

        if (definition.readOnly) {
            throw new AppError('Setting cannot be updated', 403);
        }

        const existingSetting = await this.settingRepository.findByKey(key);

        if (!existingSetting) {
            throw new AppError('Setting not found', 404);
        }

        const parsedValue = definition.schema.parse(value);

        if (valuesAreEqual(existingSetting.value, parsedValue)) {
            return this.toGroupedSettingItem(existingSetting);
        }

        const updatedSetting = await this.settingRepository.updateWithAudit(
            key,
            parsedValue,
            {
                key,
                category: definition.category,
                previousValue: existingSetting.value,
                nextValue: parsedValue,
                updatedBy: auditContext.performedByUserId,
            },
            auditContext,
        );

        this.invalidateCache();

        return this.toGroupedSettingItem(updatedSetting);
    }

    async updateSettingsBulk(
        updates: Array<{ key: string; value: unknown }>,
        auditContext: AuditContext,
    ): Promise<GroupedSettingItem[]> {
        const seenKeys = new Set<string>();

        for (const update of updates) {
            if (seenKeys.has(update.key)) {
                throw new AppError(`Duplicate setting key: ${update.key}`, 400);
            }

            seenKeys.add(update.key);
        }

        const existingSettings = await this.settingRepository.findByKeys(
            updates.map((update) => update.key),
        );
        const existingSettingsByKey = new Map(
            existingSettings.map((setting) => [setting.key, setting]),
        );

        const repositoryUpdates: Array<{
            key: string;
            value: unknown;
            auditEntry: {
                key: string;
                category: string;
                previousValue: unknown;
                nextValue: unknown;
                updatedBy?: string;
            };
        }> = [];

        for (const update of updates) {
            const definition = SETTING_DEFINITIONS_BY_KEY.get(update.key);

            if (!definition) {
                throw new AppError(`Setting not found: ${update.key}`, 404);
            }

            if (definition.readOnly) {
                throw new AppError(`Setting cannot be updated: ${update.key}`, 403);
            }

            const existingSetting = existingSettingsByKey.get(update.key);

            if (!existingSetting) {
                throw new AppError(`Setting not found: ${update.key}`, 404);
            }

            const parsedValue = definition.schema.parse(update.value);

            if (valuesAreEqual(existingSetting.value, parsedValue)) {
                continue;
            }

            repositoryUpdates.push({
                key: update.key,
                value: parsedValue,
                auditEntry: {
                    key: update.key,
                    category: definition.category,
                    previousValue: existingSetting.value,
                    nextValue: parsedValue,
                    updatedBy: auditContext.performedByUserId,
                },
            });
        }

        const updatedSettings = await this.settingRepository.updateManyWithAudit(
            repositoryUpdates,
            auditContext,
        );

        this.invalidateCache();

        const updatedSettingsByKey = new Map(
            updatedSettings.map((setting) => [setting.key, setting]),
        );

        return updates.map((update) =>
            this.toGroupedSettingItem(
                updatedSettingsByKey.get(update.key) ??
                existingSettingsByKey.get(update.key)!,
            ),
        );
    }

    private groupSettings(settings: Array<{
        key: string;
        value: unknown;
        description: string | null;
        isPublic: boolean;
        updatedAt: Date;
        updatedBy: string | null;
    }>): GroupedSettingsResponse {
        const grouped: GroupedSettingsResponse = {};

        for (const setting of settings) {
            const item = this.toGroupedSettingItem(setting);

            if (!grouped[item.category]) {
                grouped[item.category] = {
                    label: CATEGORY_LABELS[item.category],
                    settings: [],
                };
            }

            grouped[item.category].settings.push(item);
        }

        return grouped;
    }

    private toGroupedSettingItem(setting: {
        key: string;
        value: unknown;
        description: string | null;
        isPublic: boolean;
        updatedAt: Date;
        updatedBy: string | null;
    }): GroupedSettingItem {
        const definition = SETTING_DEFINITIONS_BY_KEY.get(setting.key);
        const category = definition?.category ?? 'other';

        return {
            key: setting.key,
            label: definition?.label ?? toTitleCase(setting.key),
            description: definition?.description ?? setting.description ?? '',
            category,
            value: setting.value,
            isPublic: setting.isPublic,
            readOnly: Boolean(definition?.readOnly),
            updatedAt: setting.updatedAt,
            updatedBy: setting.updatedBy,
        };
    }

    private invalidateCache() {
        this.cachedGroupedSettings = null;
    }
}
