import { AuditLogEntity, AuditLogFilters } from '../domain/audit-log.entity';
import { AuditLogRepository } from '../domain/audit-log.repository';

function jsonForCsv(value: unknown) {
    if (value === null || value === undefined) {
        return '';
    }

    return JSON.stringify(value);
}

function escapeCsv(value: unknown) {
    const stringValue = value instanceof Date
        ? value.toISOString()
        : String(value ?? '');

    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

function toCsvRow(item: AuditLogEntity) {
    return [
        item.id,
        item.createdAt,
        item.action,
        item.entityType,
        item.entityId,
        item.performedByUserId,
        item.ipAddress,
        item.userAgent,
        item.requestId,
        jsonForCsv(item.oldValue),
        jsonForCsv(item.newValue),
        jsonForCsv(item.metadata),
    ].map(escapeCsv).join(',');
}

export class AuditLogService {
    constructor(private readonly repository: AuditLogRepository) {}

    list(filters: AuditLogFilters) {
        return this.repository.list(filters);
    }

    async exportCsv(filters: Omit<AuditLogFilters, 'page' | 'limit'>) {
        const rows = await this.repository.export(filters);
        const header = [
            'id',
            'timestamp',
            'action',
            'entity',
            'entityId',
            'userId',
            'ip',
            'userAgent',
            'requestId',
            'oldValue',
            'newValue',
            'metadata',
        ].join(',');

        return [header, ...rows.map(toCsvRow)].join('\n');
    }
}
