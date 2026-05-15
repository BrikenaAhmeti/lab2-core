import { NextFunction, Request, Response } from 'express';
import { Prisma } from '../../generated/prisma';
import { env } from '../../config/env';
import { prisma } from '../../infrastructure/db/prisma';
import { logger } from '../utils/winston';

export type AuditLogAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'security'
    | (string & {});

export type AuditLogInput = {
    action: AuditLogAction;
    entity: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
};

function toJsonValue(value: unknown):
    | Prisma.InputJsonValue
    | typeof Prisma.JsonNull
    | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return Prisma.JsonNull;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getClientIp(req: Request) {
    const forwardedFor = req.header('x-forwarded-for');

    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || req.ip;
    }

    return req.ip;
}

function singleHeader(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value ?? null;
}

function inferAction(method: string): AuditLogAction | null {
    switch (method.toUpperCase()) {
        case 'POST':
            return 'create';
        case 'PUT':
        case 'PATCH':
            return 'update';
        case 'DELETE':
            return 'delete';
        default:
            return null;
    }
}

function inferEntity(req: Request) {
    const segments = req.path.split('/').filter(Boolean);
    const [entity] = segments[0] === 'api' ? segments.slice(1) : segments;

    return entity ?? 'unknown';
}

function inferEntityId(req: Request, body: unknown) {
    if (req.params.id) {
        return singleHeader(req.params.id);
    }

    if (body && typeof body === 'object' && 'id' in body) {
        const id = (body as { id?: unknown; key?: unknown }).id;

        return typeof id === 'string' ? id : null;
    }

    if (body && typeof body === 'object' && 'key' in body) {
        const key = (body as { key?: unknown }).key;

        return typeof key === 'string' ? key : null;
    }

    return null;
}

export async function auditLog(input: AuditLogInput) {
    return prisma.auditLog.create({
        data: {
            action: input.action,
            entityType: input.entity,
            entityId: input.entityId ?? null,
            performedByUserId: input.userId ?? null,
            ipAddress: input.ip ?? null,
            userAgent: input.userAgent ?? null,
            oldValue: toJsonValue(input.oldValue),
            newValue: toJsonValue(input.newValue),
            requestId: input.requestId ?? null,
            metadata: toJsonValue(input.metadata),
        },
    });
}

export function auditLogger(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const action = inferAction(req.method);

    if (
        !env.auditLoggingEnabled ||
        !action ||
        req.path.startsWith('/api/audit-logs') ||
        req.path.startsWith('/api/settings')
    ) {
        return next();
    }

    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = ((body: unknown) => {
        responseBody = body;

        return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
            return;
        }

        void auditLog({
            action,
            entity: inferEntity(req),
            entityId: inferEntityId(req, responseBody),
            oldValue: null,
            newValue: action === 'delete' ? responseBody ?? null : responseBody ?? req.body,
            userId: req.user?.id,
            ip: getClientIp(req),
            userAgent: singleHeader(req.get('user-agent')),
            requestId: req.requestId,
            metadata: {
                method: req.method,
                path: req.originalUrl,
                requestBody: action === 'update' ? req.body : undefined,
            },
        }).catch((error) => {
            logger.error('audit_log_write_failed', {
                requestId: req.requestId,
                error,
            });
        });
    });

    return next();
}
