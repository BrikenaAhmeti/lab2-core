import { Prisma, Setting } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuditContext,
    SettingAuditEntry,
    SettingRepository,
} from '../domain/setting.repository';

function toJsonInput(value: unknown) {
    if (value === null) {
        return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
}

function toAuditJsonValue(value: unknown): Prisma.InputJsonValue | null {
    if (value === undefined || value === null) {
        return null;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildAuditLogData(auditEntry: SettingAuditEntry, auditContext: AuditContext) {
    return {
        entityType: 'settings',
        entityId: auditEntry.key,
        action: 'settings.updated',
        performedByUserId: auditContext.performedByUserId ?? null,
        ipAddress: auditContext.ipAddress ?? null,
        userAgent: auditContext.userAgent ?? null,
        metadata: {
            key: auditEntry.key,
            category: auditEntry.category,
            previousValue: toAuditJsonValue(auditEntry.previousValue),
            nextValue: toAuditJsonValue(auditEntry.nextValue),
        } satisfies Prisma.InputJsonValue,
    };
}

export class SettingPrismaRepository implements SettingRepository {
    async findAll(): Promise<Setting[]> {
        return prisma.setting.findMany({
            orderBy: [{ key: 'asc' }],
        });
    }

    async findByKey(key: string): Promise<Setting | null> {
        return prisma.setting.findUnique({
            where: { key },
        });
    }

    async findByKeys(keys: string[]): Promise<Setting[]> {
        return prisma.setting.findMany({
            where: {
                key: {
                    in: keys,
                },
            },
        });
    }

    async updateWithAudit(
        key: string,
        value: unknown,
        auditEntry: SettingAuditEntry,
        auditContext: AuditContext,
    ): Promise<Setting> {
        const [updatedSetting] = await prisma.$transaction([
            prisma.setting.update({
                where: { key },
                data: {
                    value: toJsonInput(value),
                    updatedBy: auditEntry.updatedBy ?? null,
                },
            }),
            prisma.auditLog.create({
                data: buildAuditLogData(auditEntry, auditContext),
            }),
        ]);

        return updatedSetting;
    }

    async updateManyWithAudit(
        updates: Array<{ key: string; value: unknown; auditEntry: SettingAuditEntry }>,
        auditContext: AuditContext,
    ): Promise<Setting[]> {
        if (updates.length === 0) {
            return [];
        }

        return prisma.$transaction(async (tx) => {
            const updatedSettings: Setting[] = [];

            for (const update of updates) {
                const updatedSetting = await tx.setting.update({
                    where: { key: update.key },
                    data: {
                        value: toJsonInput(update.value),
                        updatedBy: update.auditEntry.updatedBy ?? null,
                    },
                });

                updatedSettings.push(updatedSetting);

                await tx.auditLog.create({
                    data: buildAuditLogData(update.auditEntry, auditContext),
                });
            }

            return updatedSettings;
        });
    }
}
