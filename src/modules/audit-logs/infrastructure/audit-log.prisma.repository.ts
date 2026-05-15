import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuditLogEntity,
    AuditLogFilters,
    AuditLogListResult,
} from '../domain/audit-log.entity';
import { AuditLogRepository } from '../domain/audit-log.repository';

function buildWhere(filters: Omit<AuditLogFilters, 'page' | 'limit'>) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.action) {
        where.action = filters.action;
    }

    if (filters.entity) {
        where.entityType = filters.entity;
    }

    if (filters.userId) {
        where.performedByUserId = filters.userId;
    }

    if (filters.ip) {
        where.ipAddress = filters.ip;
    }

    if (filters.from || filters.to) {
        where.createdAt = {};

        if (filters.from) {
            where.createdAt.gte = filters.from;
        }

        if (filters.to) {
            where.createdAt.lte = filters.to;
        }
    }

    return where;
}

export class AuditLogPrismaRepository implements AuditLogRepository {
    async list(filters: AuditLogFilters): Promise<AuditLogListResult> {
        const where = buildWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: filters.limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return {
            items,
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async export(filters: Omit<AuditLogFilters, 'page' | 'limit'>): Promise<AuditLogEntity[]> {
        return prisma.auditLog.findMany({
            where: buildWhere(filters),
            orderBy: { createdAt: 'desc' },
            take: 10000,
        });
    }
}
