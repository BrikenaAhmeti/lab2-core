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

type MethodAuditAction = 'create' | 'update' | 'delete';

type AuditRouteTarget = {
    action: AuditLogAction;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN =
    /password|token|secret|authorization|api[_-]?key|personal[_-]?number/i;

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

function redactSensitive(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactSensitive);
    }

    if (!value || typeof value !== 'object' || value instanceof Date) {
        return value;
    }

    const prototype = Object.getPrototypeOf(value);

    if (prototype !== Object.prototype && prototype !== null) {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitive(item),
        ]),
    );
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

function inferAction(method: string): MethodAuditAction | null {
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

function pathContext(path: string) {
    const rawSegments = path.split('/').filter(Boolean);
    let segments = rawSegments[0] === 'api'
        ? rawSegments.slice(1)
        : rawSegments;
    const isPublic = segments[0] === 'public';
    const isInternal = segments[0] === 'internal';

    if (isPublic || isInternal) {
        segments = segments.slice(1);
    }

    return {
        segments,
        isPublic,
        isInternal,
    };
}

function inferEntity(req: Pick<Request, 'path'>) {
    const { segments } = pathContext(req.path);
    const [entity] = segments;

    return entity ?? 'unknown';
}

function stringProperty(value: unknown, key: string) {
    if (value && typeof value === 'object' && key in value) {
        const item = (value as Record<string, unknown>)[key];

        return typeof item === 'string' ? item : null;
    }

    return null;
}

function inferEntityIdFromBody(body: unknown): string | null {
    const directId =
        stringProperty(body, 'id') ??
        stringProperty(body, 'jobId') ??
        stringProperty(body, 'key');

    if (directId) {
        return directId;
    }

    if (body && typeof body === 'object') {
        const data = (body as Record<string, unknown>).data;
        const item = (body as Record<string, unknown>).item;
        const result = (body as Record<string, unknown>).result;

        return (
            inferEntityIdFromBody(data) ??
            inferEntityIdFromBody(item) ??
            inferEntityIdFromBody(result)
        );
    }

    return null;
}

function inferEntityId(
    req: Pick<Request, 'params' | 'body'>,
    body: unknown,
) {
    const routeParamId =
        stringProperty(req.params, 'id') ??
        stringProperty(req.params, 'exceptionId') ??
        stringProperty(req.params, 'jobId') ??
        stringProperty(req.params, 'key');

    if (routeParamId) {
        return routeParamId;
    }

    return inferEntityIdFromBody(body) ?? inferEntityIdFromBody(req.body);
}

function requestBodyForMetadata(req: Request) {
    if (req.file) {
        return {
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
        };
    }

    if (Buffer.isBuffer(req.body)) {
        return {
            contentType: req.header('content-type') ?? null,
            sizeBytes: req.body.length,
        };
    }

    if (typeof req.body === 'string') {
        return {
            contentType: req.header('content-type') ?? null,
            sizeBytes: Buffer.byteLength(req.body),
        };
    }

    if (Array.isArray(req.body)) {
        return { rowCount: req.body.length };
    }

    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return redactSensitive(req.body);
    }

    return undefined;
}

function crudTarget(input: {
    methodAction: MethodAuditAction;
    entity: string;
    actionSubject: string;
    entityId?: string | null;
    deleteVerb?: 'deleted' | 'deactivated';
    metadata?: Record<string, unknown>;
}): AuditRouteTarget {
    const verbs: Record<MethodAuditAction, string> = {
        create: 'created',
        update: 'updated',
        delete: input.deleteVerb ?? 'deleted',
    };

    return {
        action: `${input.actionSubject}.${verbs[input.methodAction]}`,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
    };
}

function valueFromRequestBody(req: Request, key: string) {
    return stringProperty(req.body, key);
}

function inferRouteTarget(
    req: Request,
    responseBody: unknown,
    methodAction: MethodAuditAction,
): AuditRouteTarget {
    const { segments, isPublic, isInternal } = pathContext(req.path);
    const [root, second, third, fourth] = segments;
    const responseId = inferEntityIdFromBody(responseBody);

    switch (root) {
        case 'departments':
            return crudTarget({
                methodAction,
                entity: 'departments',
                actionSubject: 'departments',
                entityId: responseId ?? second,
                deleteVerb: 'deactivated',
            });
        case 'services':
            return crudTarget({
                methodAction,
                entity: 'services',
                actionSubject: 'service_catalog',
                entityId: responseId ?? second,
                deleteVerb: 'deactivated',
            });
        case 'staff-position-types':
            return crudTarget({
                methodAction,
                entity: 'staff-position-types',
                actionSubject: 'staff_position_types',
                entityId: responseId ?? second,
                deleteVerb: 'deactivated',
            });
        case 'staff':
            if (third === 'departments') {
                return {
                    action:
                        methodAction === 'delete'
                            ? 'staff.departments.removed'
                            : 'staff.departments.assigned',
                    entity: 'staff-departments',
                    entityId: responseId ?? second,
                    metadata: {
                        staffProfileId: second,
                        departmentId: valueFromRequestBody(req, 'departmentId'),
                    },
                };
            }

            if (third === 'schedules') {
                return {
                    action: 'staff.schedules.updated',
                    entity: 'staff-schedules',
                    entityId: responseId ?? second,
                    metadata: { staffProfileId: second },
                };
            }

            if (third === 'schedule-exceptions') {
                return {
                    action:
                        methodAction === 'delete'
                            ? 'staff.schedule_exceptions.deleted'
                            : 'staff.schedule_exceptions.created',
                    entity: 'schedule-exceptions',
                    entityId: responseId ?? fourth ?? second,
                    metadata: { staffProfileId: second, exceptionId: fourth },
                };
            }

            return crudTarget({
                methodAction,
                entity: 'staff',
                actionSubject: 'staff',
                entityId: responseId ?? second,
                deleteVerb: 'deactivated',
            });
        case 'patients':
            if (isInternal && second === 'link-by-personal-number') {
                return {
                    action: 'patients.linked_by_personal_number',
                    entity: 'patients',
                    entityId: responseId ?? valueFromRequestBody(req, 'userId'),
                    metadata: { internal: true },
                };
            }

            return crudTarget({
                methodAction,
                entity: 'patients',
                actionSubject: 'patients',
                entityId: responseId ?? second,
            });
        case 'appointments':
            if (second && third === 'status') {
                return {
                    action: 'appointments.status_updated',
                    entity: 'appointments',
                    entityId: second,
                    metadata: {
                        nextStatus: valueFromRequestBody(req, 'status'),
                        statusAction: valueFromRequestBody(req, 'action'),
                    },
                };
            }

            if (methodAction === 'update' && second) {
                return {
                    action: 'appointments.rescheduled',
                    entity: 'appointments',
                    entityId: responseId ?? second,
                };
            }

            return {
                action: isPublic ? 'appointments.public_booked' : 'appointments.booked',
                entity: 'appointments',
                entityId: responseId ?? second,
                metadata: { public: isPublic || undefined },
            };
        case 'medical-records':
            if (second && third === 'finalize') {
                return {
                    action: 'medical_records.finalized',
                    entity: 'medical-records',
                    entityId: second,
                };
            }

            if (second && third === 'amendments') {
                return {
                    action: 'medical_records.amended',
                    entity: 'medical-records',
                    entityId: second,
                };
            }

            return crudTarget({
                methodAction,
                entity: 'medical-records',
                actionSubject: 'medical_records',
                entityId: responseId ?? second,
            });
        case 'prescriptions':
            if (second && third === 'void') {
                return {
                    action: 'prescriptions.voided',
                    entity: 'prescriptions',
                    entityId: second,
                };
            }

            return crudTarget({
                methodAction,
                entity: 'prescriptions',
                actionSubject: 'prescriptions',
                entityId: responseId ?? second,
            });
        case 'lab-tests':
            return crudTarget({
                methodAction,
                entity: 'lab-tests',
                actionSubject: 'lab_tests',
                entityId: responseId ?? second,
                deleteVerb: 'deactivated',
            });
        case 'lab-orders':
            if (second && third === 'status') {
                return {
                    action: 'lab_orders.status_updated',
                    entity: 'lab-orders',
                    entityId: second,
                    metadata: { nextStatus: valueFromRequestBody(req, 'status') },
                };
            }

            if (second && third === 'results') {
                return {
                    action: 'lab_orders.results_entered',
                    entity: 'lab-orders',
                    entityId: second,
                };
            }

            if (second && third === 'review') {
                return {
                    action: 'lab_orders.reviewed',
                    entity: 'lab-orders',
                    entityId: second,
                };
            }

            if (second && third === 'trigger-ai') {
                return {
                    action: 'lab_orders.ai_triggered',
                    entity: 'lab-orders',
                    entityId: second,
                };
            }

            return {
                action: 'lab_orders.created',
                entity: 'lab-orders',
                entityId: responseId ?? second,
            };
        case 'billings':
            if (second && third === 'payments') {
                return {
                    action: 'billings.payment_recorded',
                    entity: 'billings',
                    entityId: second,
                    metadata: { paymentId: responseId },
                };
            }

            return crudTarget({
                methodAction,
                entity: 'billings',
                actionSubject: 'billings',
                entityId: responseId ?? second,
            });
        case 'pharmacy':
            if (second === 'queue' && third) {
                const operationBySegment: Record<string, string> = {
                    start: 'queue_started',
                    dispense: 'queue_dispensed',
                    fulfill: 'queue_fulfilled',
                };

                return {
                    action: `pharmacy.${operationBySegment[fourth ?? ''] ?? 'queue_updated'}`,
                    entity: 'pharmacy',
                    entityId: third,
                    metadata: { queueId: third },
                };
            }

            return crudTarget({
                methodAction,
                entity: 'pharmacy',
                actionSubject: 'pharmacy',
                entityId: responseId ?? second,
            });
        case 'inventory':
            if (second === 'categories') {
                return crudTarget({
                    methodAction,
                    entity: 'inventory-categories',
                    actionSubject: 'inventory_categories',
                    entityId: responseId ?? third,
                    deleteVerb: 'deactivated',
                });
            }

            if (second === 'items' && fourth === 'transactions') {
                return {
                    action: 'inventory.transactions.recorded',
                    entity: 'inventory-transactions',
                    entityId: responseId,
                    metadata: { inventoryItemId: third },
                };
            }

            if (second === 'items') {
                return crudTarget({
                    methodAction,
                    entity: 'inventory-items',
                    actionSubject: 'inventory_items',
                    entityId: responseId ?? third,
                    deleteVerb: 'deactivated',
                });
            }

            break;
        case 'feedback':
            if (second && third === 'status') {
                return {
                    action: 'feedback.status_updated',
                    entity: 'feedback',
                    entityId: second,
                    metadata: { nextStatus: valueFromRequestBody(req, 'status') },
                };
            }

            return {
                action: 'feedback.submitted',
                entity: 'feedback',
                entityId: responseId ?? second,
            };
        case 'contact':
            if (second && third === 'status') {
                return {
                    action: 'contact.status_updated',
                    entity: 'contact',
                    entityId: second,
                    metadata: { nextStatus: valueFromRequestBody(req, 'status') },
                };
            }

            return {
                action: 'contact.submitted',
                entity: 'contact',
                entityId: responseId ?? second,
            };
        case 'reports':
            if (second === 'templates') {
                return {
                    action: 'reports.template_saved',
                    entity: 'report-templates',
                    entityId: responseId,
                };
            }

            break;
        case 'import':
            return {
                action: 'data_import.started',
                entity: 'imports',
                entityId: responseId,
                metadata: {
                    importEntity: second,
                    mode: typeof req.query.mode === 'string' ? req.query.mode : undefined,
                    async: typeof req.query.async === 'string' ? req.query.async : undefined,
                },
            };
    }

    return crudTarget({
        methodAction,
        entity: inferEntity(req),
        actionSubject: inferEntity(req).replace(/-/g, '_'),
        entityId: responseId ?? inferEntityId(req, responseBody),
        deleteVerb: 'deleted',
    });
}

export function inferAuditDetails(
    req: Request,
    responseBody: unknown,
): AuditRouteTarget | null {
    const methodAction = inferAction(req.method);

    if (!methodAction) {
        return null;
    }

    return inferRouteTarget(req, responseBody, methodAction);
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
            oldValue: toJsonValue(redactSensitive(input.oldValue)),
            newValue: toJsonValue(redactSensitive(input.newValue)),
            requestId: input.requestId ?? null,
            metadata: toJsonValue(redactSensitive(input.metadata)),
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

        const details = inferAuditDetails(req, responseBody);

        if (!details) {
            return;
        }

        void auditLog({
            action: details.action,
            entity: details.entity,
            entityId: details.entityId ?? inferEntityId(req, responseBody),
            oldValue: null,
            newValue: action === 'delete' ? responseBody ?? null : responseBody ?? req.body,
            userId: req.user?.id,
            ip: getClientIp(req),
            userAgent: singleHeader(req.get('user-agent')),
            requestId: req.requestId,
            metadata: {
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                requestBody: action === 'delete' ? undefined : requestBodyForMetadata(req),
                ...details.metadata,
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
