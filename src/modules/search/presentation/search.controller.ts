import { Request, Response } from 'express';
import { z } from 'zod';
import {
    AppointmentStatus,
    BloodType,
    EmploymentStatus,
    LabOrderStatus,
} from '../../../generated/prisma';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SearchAppointmentsHandler } from '../application/handlers/search-appointments.handler';
import { SearchAuditLogsHandler } from '../application/handlers/search-audit-logs.handler';
import { SearchInventoryItemsHandler } from '../application/handlers/search-inventory-items.handler';
import { SearchLabOrdersHandler } from '../application/handlers/search-lab-orders.handler';
import { SearchPatientsHandler } from '../application/handlers/search-patients.handler';
import { SearchStaffHandler } from '../application/handlers/search-staff.handler';
import { SearchAppointmentsQuery } from '../application/queries/search-appointments.query';
import { SearchAuditLogsQuery } from '../application/queries/search-audit-logs.query';
import { SearchInventoryItemsQuery } from '../application/queries/search-inventory-items.query';
import { SearchLabOrdersQuery } from '../application/queries/search-lab-orders.query';
import { SearchPatientsQuery } from '../application/queries/search-patients.query';
import { SearchStaffQuery } from '../application/queries/search-staff.query';
import { StockLevelFilter } from '../domain/search.entity';
import { AdvancedSearchPrismaRepository } from '../infrastructure/search.prisma.repository';
import { AdvancedSearchService } from '../services/search.service';

const appointmentStatusValues = [
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
] as const;

const bloodTypeValues = [
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
    'UNKNOWN',
] as const;

const employmentStatusValues = [
    'ACTIVE',
    'INACTIVE',
    'ON_LEAVE',
    'TERMINATED',
] as const;

const labOrderStatusValues = [
    'PENDING',
    'COLLECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'pending',
    'collected',
    'in_progress',
    'completed',
    'cancelled',
] as const;

const optionalDateSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, z.coerce.date().optional());

const commonQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().min(1).max(120).optional(),
    q: z.string().trim().min(1).max(120).optional(),
    sortBy: z.string().trim().min(1).max(60).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const patientsQuerySchema = commonQuerySchema.extend({
    gender: z.string().trim().min(1).max(40).optional(),
    minAge: z.coerce.number().int().min(0).max(130).optional(),
    maxAge: z.coerce.number().int().min(0).max(130).optional(),
    bloodType: z.enum(bloodTypeValues).optional(),
});

const appointmentsQuerySchema = commonQuerySchema.extend({
    status: z.enum(appointmentStatusValues).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    departmentId: z.string().uuid('Invalid department id').optional(),
    serviceId: z.string().uuid('Invalid service id').optional(),
    serviceCatalogId: z.string().uuid('Invalid service id').optional(),
});

const labOrdersQuerySchema = commonQuerySchema.extend({
    status: z.enum(labOrderStatusValues).optional(),
    priority: z.string().trim().min(1).max(40).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    hasCritical: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
});

const inventoryItemsQuerySchema = commonQuerySchema.extend({
    categoryId: z.string().uuid('Invalid category id').optional(),
    category: z.string().trim().min(1).max(120).optional(),
    stockLevel: z.enum(['out_of_stock', 'low', 'in_stock']).optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    expiryFrom: optionalDateSchema,
    expiryTo: optionalDateSchema,
});

const staffQuerySchema = commonQuerySchema.extend({
    departmentId: z.string().uuid('Invalid department id').optional(),
    positionTypeId: z.string().uuid('Invalid staff position type id').optional(),
    status: z.enum(employmentStatusValues).optional(),
});

const auditLogsQuerySchema = commonQuerySchema.extend({
    userId: z.string().uuid('Invalid user id').optional(),
    action: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
    ip: z.string().trim().min(1).max(100).optional(),
});

function searchValue(query: z.infer<typeof commonQuerySchema>) {
    return query.search ?? query.q;
}

function toLabOrderStatus(value?: (typeof labOrderStatusValues)[number]) {
    if (!value) {
        return undefined;
    }

    if (value === 'in_progress') {
        return LabOrderStatus.IN_PROGRESS;
    }

    return value.toUpperCase() as LabOrderStatus;
}

export class SearchController {
    private readonly queryBus = new QueryBus();
    private readonly service = new AdvancedSearchService(
        new AdvancedSearchPrismaRepository(),
    );
    private readonly searchPatientsHandler = new SearchPatientsHandler(this.service);
    private readonly searchAppointmentsHandler = new SearchAppointmentsHandler(
        this.service,
    );
    private readonly searchLabOrdersHandler = new SearchLabOrdersHandler(this.service);
    private readonly searchInventoryItemsHandler = new SearchInventoryItemsHandler(
        this.service,
    );
    private readonly searchStaffHandler = new SearchStaffHandler(this.service);
    private readonly searchAuditLogsHandler = new SearchAuditLogsHandler(this.service);

    async patients(req: Request, res: Response) {
        const query = patientsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchPatientsHandler,
            new SearchPatientsQuery(
                query.page,
                query.limit,
                searchValue(query),
                query.gender,
                query.minAge,
                query.maxAge,
                query.bloodType as BloodType | undefined,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }

    async appointments(req: Request, res: Response) {
        const query = appointmentsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchAppointmentsHandler,
            new SearchAppointmentsQuery(
                query.page,
                query.limit,
                searchValue(query),
                query.status as AppointmentStatus | undefined,
                query.from,
                query.to,
                query.departmentId,
                query.serviceCatalogId ?? query.serviceId,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }

    async labOrders(req: Request, res: Response) {
        const query = labOrdersQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchLabOrdersHandler,
            new SearchLabOrdersQuery(
                query.page,
                query.limit,
                searchValue(query),
                toLabOrderStatus(query.status),
                query.priority,
                query.from,
                query.to,
                query.hasCritical,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }

    async inventoryItems(req: Request, res: Response) {
        const query = inventoryItemsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchInventoryItemsHandler,
            new SearchInventoryItemsQuery(
                query.page,
                query.limit,
                searchValue(query),
                query.categoryId,
                query.category,
                query.stockLevel as StockLevelFilter | undefined,
                query.departmentId,
                query.expiryFrom,
                query.expiryTo,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }

    async staff(req: Request, res: Response) {
        const query = staffQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchStaffHandler,
            new SearchStaffQuery(
                query.page,
                query.limit,
                searchValue(query),
                query.departmentId,
                query.positionTypeId,
                query.status as EmploymentStatus | undefined,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }

    async auditLogs(req: Request, res: Response) {
        const query = auditLogsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.searchAuditLogsHandler,
            new SearchAuditLogsQuery(
                query.page,
                query.limit,
                searchValue(query),
                query.userId,
                query.action,
                query.entity,
                query.from,
                query.to,
                query.ip,
                query.sortBy,
                query.sortOrder,
            ),
        );

        return res.status(200).json(result);
    }
}
