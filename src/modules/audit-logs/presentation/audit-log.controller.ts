import { Request, Response } from 'express';
import { z } from 'zod';
import { AuditLogPrismaRepository } from '../infrastructure/audit-log.prisma.repository';
import { AuditLogService } from '../services/audit-log.service';

const dateQuery = z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((value) => new Date(value));

const auditLogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    userId: z.string().uuid().optional(),
    from: dateQuery.optional(),
    to: dateQuery.optional(),
    ip: z.string().trim().min(1).max(100).optional(),
});

const auditLogExportQuerySchema = auditLogQuerySchema
    .omit({ page: true, limit: true })
    .extend({
        format: z.enum(['csv']).default('csv'),
    });

function serializeAuditLog(item: Awaited<ReturnType<AuditLogService['list']>>['items'][number]) {
    return {
        id: item.id,
        action: item.action,
        entity: item.entityType,
        entityId: item.entityId,
        userId: item.performedByUserId,
        ip: item.ipAddress,
        userAgent: item.userAgent,
        oldValue: item.oldValue,
        newValue: item.newValue,
        requestId: item.requestId,
        metadata: item.metadata,
        timestamp: item.createdAt,
    };
}

export class AuditLogController {
    private readonly service = new AuditLogService(new AuditLogPrismaRepository());

    async list(req: Request, res: Response) {
        const filters = auditLogQuerySchema.parse(req.query);
        const result = await this.service.list(filters);

        return res.status(200).json({
            items: result.items.map(serializeAuditLog),
            meta: result.meta,
        });
    }

    async export(req: Request, res: Response) {
        const { format, ...filters } = auditLogExportQuerySchema.parse(req.query);
        const csv = await this.service.exportCsv(filters);

        res.setHeader('content-type', 'text/csv; charset=utf-8');
        res.setHeader(
            'content-disposition',
            `attachment; filename="audit-logs.${format}"`,
        );

        return res.status(200).send(csv);
    }
}
