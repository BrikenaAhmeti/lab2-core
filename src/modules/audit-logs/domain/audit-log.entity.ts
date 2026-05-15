import { AuditLog } from '../../../generated/prisma';

export type AuditLogEntity = AuditLog;

export type AuditLogFilters = {
    page: number;
    limit: number;
    action?: string;
    entity?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    ip?: string;
};

export type AuditLogListResult = {
    items: AuditLogEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};
