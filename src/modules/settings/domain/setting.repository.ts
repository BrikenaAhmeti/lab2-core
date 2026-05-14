import { Setting } from '../../../generated/prisma';

export type AuditContext = {
    performedByUserId?: string;
    ipAddress?: string;
    userAgent?: string;
};

export type SettingAuditEntry = {
    key: string;
    category: string;
    previousValue: unknown;
    nextValue: unknown;
    updatedBy?: string;
};

export interface SettingRepository {
    findAll(): Promise<Setting[]>;
    findByKey(key: string): Promise<Setting | null>;
    findByKeys(keys: string[]): Promise<Setting[]>;
    updateWithAudit(
        key: string,
        value: unknown,
        auditEntry: SettingAuditEntry,
        auditContext: AuditContext,
    ): Promise<Setting>;
    updateManyWithAudit(
        updates: Array<{ key: string; value: unknown; auditEntry: SettingAuditEntry }>,
        auditContext: AuditContext,
    ): Promise<Setting[]>;
}
