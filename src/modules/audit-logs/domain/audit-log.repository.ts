import {
    AuditLogEntity,
    AuditLogFilters,
    AuditLogListResult,
} from './audit-log.entity';

export interface AuditLogRepository {
    list(filters: AuditLogFilters): Promise<AuditLogListResult>;
    export(filters: Omit<AuditLogFilters, 'page' | 'limit'>): Promise<AuditLogEntity[]>;
}
