import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { decryptPersonalNumber } from '../../patients/domain/patient.crypto';
import {
    AppointmentSearchItem,
    AuditLogSearchItem,
    InventoryItemSearchItem,
    LabOrderSearchItem,
    PatientSearchItem,
    SearchAppointmentsFilters,
    SearchAuditLogsFilters,
    SearchInventoryItemsFilters,
    SearchLabOrdersFilters,
    SearchPatientsFilters,
    SearchResult,
    SearchStaffFilters,
    StaffSearchItem,
    StockLevelFilter,
} from '../domain/search.entity';
import { AdvancedSearchRepository } from '../domain/search.repository';
import {
    buildLimitOffset,
    buildOrderBy,
    buildPagedResult,
    buildSearchQuery,
    buildWhere,
} from './search-query-builder';

type CountRow = {
    total: number | bigint | string;
};

type AppointmentSearchRow = Omit<AppointmentSearchItem, 'patient' | 'staff' | 'department' | 'service'> & {
    patientUserId: string | null;
    patientFirstName: string;
    patientLastName: string;
    patientEmail: string | null;
    patientPhone: string | null;
    staffUserId: string | null;
    staffEmployeeCode: string | null;
    staffSpecialization: string | null;
    departmentName: string;
    serviceName: string;
};

type LabOrderSearchRow = Omit<LabOrderSearchItem, 'patient' | 'orderedByStaff' | 'department'> & {
    patientUserId: string | null;
    patientFirstName: string;
    patientLastName: string;
    patientEmail: string | null;
    patientPhone: string | null;
    staffUserId: string;
    staffEmployeeCode: string;
    staffSpecialization: string | null;
    departmentName: string;
};

type InventoryItemSearchRow = Omit<InventoryItemSearchItem, 'category' | 'department'> & {
    categoryId: string;
    categoryName: string;
    departmentId: string | null;
    departmentName: string | null;
};

type StaffSearchRow = Omit<StaffSearchItem, 'positionType' | 'departments'> & {
    positionTypeId: string;
    positionTypeName: string;
    defaultRoleKey: string;
    departments: unknown;
};

const patientDefaultOrder = Prisma.sql`p.last_name ASC, p.first_name ASC, p.id ASC`;
const appointmentDefaultOrder = Prisma.sql`a.scheduled_at DESC, a.id ASC`;
const labOrderDefaultOrder = Prisma.sql`lo.ordered_at DESC, lo.id ASC`;
const inventoryDefaultOrder = Prisma.sql`ii.name ASC, ii.id ASC`;
const staffDefaultOrder = Prisma.sql`sp.employee_code ASC, sp.id ASC`;
const auditLogDefaultOrder = Prisma.sql`al.created_at DESC, al.id ASC`;

const patientSortColumns = {
    firstName: Prisma.sql`p.first_name`,
    lastName: Prisma.sql`p.last_name`,
    personalNumber: Prisma.sql`p.personal_number_hash`,
    email: Prisma.sql`p.email`,
    dateOfBirth: Prisma.sql`p.date_of_birth`,
    age: Prisma.sql`CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::int END`,
    createdAt: Prisma.sql`p.created_at`,
};

const appointmentSortColumns = {
    scheduledAt: Prisma.sql`a.scheduled_at`,
    status: Prisma.sql`a.status`,
    patientName: Prisma.sql`p.last_name`,
    staffName: Prisma.sql`sp.employee_code`,
    department: Prisma.sql`d.name`,
    service: Prisma.sql`sc.name`,
    createdAt: Prisma.sql`a.created_at`,
};

const labOrderSortColumns = {
    orderedAt: Prisma.sql`lo.ordered_at`,
    completedAt: Prisma.sql`lo.completed_at`,
    status: Prisma.sql`lo.status`,
    priority: Prisma.sql`lo.priority`,
    patientName: Prisma.sql`p.last_name`,
    doctor: Prisma.sql`sp.employee_code`,
};

const inventorySortColumns = {
    name: Prisma.sql`ii.name`,
    sku: Prisma.sql`ii.sku`,
    currentStock: Prisma.sql`ii.current_stock`,
    reorderLevel: Prisma.sql`ii.reorder_level`,
    expiryDate: Prisma.sql`ii.expiry_date`,
    category: Prisma.sql`ic.name`,
};

const staffSortColumns = {
    employeeCode: Prisma.sql`sp.employee_code`,
    specialization: Prisma.sql`sp.specialization`,
    employmentStatus: Prisma.sql`sp.employment_status`,
    positionType: Prisma.sql`spt.name`,
    hireDate: Prisma.sql`sp.hire_date`,
};

const auditLogSortColumns = {
    timestamp: Prisma.sql`al.created_at`,
    action: Prisma.sql`al.action`,
    entity: Prisma.sql`al.entity_type`,
    userId: Prisma.sql`al.performed_by_user_id`,
    ip: Prisma.sql`al.ip_address`,
};

function toNumber(value: unknown) {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    if (value && typeof value === 'object' && 'toNumber' in value) {
        return (value as { toNumber: () => number }).toNumber();
    }

    return Number(value);
}

function toNullableNumber(value: unknown) {
    return value === null || value === undefined ? null : toNumber(value);
}

function totalFrom(rows: CountRow[]) {
    return toNumber(rows[0]?.total ?? 0);
}

function patientName(row: { patientFirstName: string; patientLastName: string }) {
    return `${row.patientFirstName} ${row.patientLastName}`.trim();
}

function staffDisplayName(row: {
    staffEmployeeCode: string | null;
    staffSpecialization: string | null;
}) {
    if (!row.staffEmployeeCode) {
        return null;
    }

    return row.staffSpecialization
        ? `${row.staffEmployeeCode} - ${row.staffSpecialization}`
        : row.staffEmployeeCode;
}

function parseDepartments(value: unknown): StaffSearchItem['departments'] {
    if (Array.isArray(value)) {
        return value as StaffSearchItem['departments'];
    }

    if (typeof value === 'string') {
        return JSON.parse(value) as StaffSearchItem['departments'];
    }

    return [];
}

function mapAppointment(row: AppointmentSearchRow): AppointmentSearchItem {
    const displayName = staffDisplayName(row);

    return {
        id: row.id,
        patientId: row.patientId,
        departmentId: row.departmentId,
        serviceCatalogId: row.serviceCatalogId,
        staffProfileId: row.staffProfileId,
        status: row.status,
        scheduledAt: row.scheduledAt,
        endAt: row.endAt,
        durationMinutes: row.durationMinutes,
        basePrice: toNumber(row.basePrice),
        appointmentType: row.appointmentType,
        patient: {
            id: row.patientId,
            userId: row.patientUserId,
            name: patientName(row),
            email: row.patientEmail,
            phone: row.patientPhone,
        },
        staff: row.staffProfileId && row.staffUserId && row.staffEmployeeCode && displayName
            ? {
                id: row.staffProfileId,
                userId: row.staffUserId,
                employeeCode: row.staffEmployeeCode,
                specialization: row.staffSpecialization,
                displayName,
            }
            : null,
        department: {
            id: row.departmentId,
            name: row.departmentName,
        },
        service: {
            id: row.serviceCatalogId,
            name: row.serviceName,
        },
    };
}

function mapLabOrder(row: LabOrderSearchRow): LabOrderSearchItem {
    const displayName = staffDisplayName(row);

    return {
        id: row.id,
        patientId: row.patientId,
        orderedByStaffId: row.orderedByStaffId,
        departmentId: row.departmentId,
        status: row.status,
        priority: row.priority,
        orderedAt: row.orderedAt,
        collectedAt: row.collectedAt,
        completedAt: row.completedAt,
        reviewedAt: row.reviewedAt,
        hasCritical: row.hasCritical,
        testCount: toNumber(row.testCount),
        patient: {
            id: row.patientId,
            userId: row.patientUserId,
            name: patientName(row),
            email: row.patientEmail,
            phone: row.patientPhone,
        },
        orderedByStaff: {
            id: row.orderedByStaffId,
            userId: row.staffUserId,
            employeeCode: row.staffEmployeeCode,
            specialization: row.staffSpecialization,
            displayName: displayName ?? row.staffEmployeeCode,
        },
        department: {
            id: row.departmentId,
            name: row.departmentName,
        },
    };
}

function mapInventoryItem(row: InventoryItemSearchRow): InventoryItemSearchItem {
    return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        unitOfMeasure: row.unitOfMeasure,
        currentStock: toNumber(row.currentStock),
        reorderLevel: toNumber(row.reorderLevel),
        unitCost: toNullableNumber(row.unitCost),
        expiryDate: row.expiryDate,
        isActive: row.isActive,
        stockLevel: row.stockLevel,
        category: {
            id: row.categoryId,
            name: row.categoryName,
        },
        department: row.departmentId && row.departmentName
            ? {
                id: row.departmentId,
                name: row.departmentName,
            }
            : null,
    };
}

function mapStaff(row: StaffSearchRow): StaffSearchItem {
    return {
        id: row.id,
        userId: row.userId,
        employeeCode: row.employeeCode,
        specialization: row.specialization,
        licenseNumber: row.licenseNumber,
        employmentStatus: row.employmentStatus,
        hireDate: row.hireDate,
        isPublicProfile: row.isPublicProfile,
        displayName: row.displayName,
        positionType: {
            id: row.positionTypeId,
            name: row.positionTypeName,
            defaultRoleKey: row.defaultRoleKey,
        },
        departments: parseDepartments(row.departments),
    };
}

function stockLevelCondition(stockLevel: StockLevelFilter) {
    if (stockLevel === 'out_of_stock') {
        return Prisma.sql`ii.current_stock <= 0`;
    }

    if (stockLevel === 'low') {
        return Prisma.sql`ii.current_stock > 0 AND ii.current_stock <= ii.reorder_level`;
    }

    return Prisma.sql`ii.current_stock > ii.reorder_level`;
}

export class AdvancedSearchPrismaRepository implements AdvancedSearchRepository {
    async searchPatients(
        filters: SearchPatientsFilters,
    ): Promise<SearchResult<PatientSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(
            filters.search,
            [Prisma.sql`p.search_vector`],
            filters.personalNumberHash
                ? [Prisma.sql`p.personal_number_hash = ${filters.personalNumberHash}`]
                : [],
        );

        if (searchCondition) conditions.push(searchCondition);
        if (filters.gender) {
            conditions.push(Prisma.sql`LOWER(p.gender) = LOWER(${filters.gender})`);
        }
        if (filters.bloodType) {
            conditions.push(Prisma.sql`p.blood_type = ${filters.bloodType}::"BloodType"`);
        }
        if (filters.minAge !== undefined || filters.maxAge !== undefined) {
            conditions.push(Prisma.sql`p.date_of_birth IS NOT NULL`);
        }
        if (filters.minAge !== undefined) {
            conditions.push(
                Prisma.sql`EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::int >= ${filters.minAge}`,
            );
        }
        if (filters.maxAge !== undefined) {
            conditions.push(
                Prisma.sql`EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::int <= ${filters.maxAge}`,
            );
        }

        const from = Prisma.sql`FROM patients p`;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            patientSortColumns,
            patientDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<PatientSearchItem[]>(Prisma.sql`
                SELECT
                    p.id,
                    p.user_id AS "userId",
                    p.first_name AS "firstName",
                    p.last_name AS "lastName",
                    p.personal_number AS "personalNumber",
                    p.email,
                    p.phone,
                    p.date_of_birth AS "dateOfBirth",
                    CASE
                        WHEN p.date_of_birth IS NULL THEN NULL
                        ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::int
                    END AS age,
                    p.gender,
                    p.blood_type AS "bloodType",
                    p.is_active AS "isActive",
                    p.created_at AS "createdAt",
                    p.updated_at AS "updatedAt"
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(
            rows.map((row) => ({
                ...row,
                personalNumber: decryptPersonalNumber(row.personalNumber),
            })),
            totalFrom(countRows),
            filters.page,
            filters.limit,
        );
    }

    async searchAppointments(
        filters: SearchAppointmentsFilters,
    ): Promise<SearchResult<AppointmentSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(filters.search, [
            Prisma.sql`a.search_vector`,
            Prisma.sql`p.search_vector`,
            Prisma.sql`sp.search_vector`,
        ]);

        if (searchCondition) conditions.push(searchCondition);
        if (filters.status) {
            conditions.push(Prisma.sql`a.status = ${filters.status}::"AppointmentStatus"`);
        }
        if (filters.from) {
            conditions.push(Prisma.sql`a.scheduled_at >= ${filters.from}`);
        }
        if (filters.to) {
            conditions.push(Prisma.sql`a.scheduled_at <= ${filters.to}`);
        }
        if (filters.departmentId) {
            conditions.push(Prisma.sql`a.department_id = ${filters.departmentId}`);
        }
        if (filters.serviceCatalogId) {
            conditions.push(Prisma.sql`a.service_catalog_id = ${filters.serviceCatalogId}`);
        }

        const from = Prisma.sql`
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN departments d ON d.id = a.department_id
            JOIN service_catalog sc ON sc.id = a.service_catalog_id
            LEFT JOIN staff_profiles sp ON sp.id = a.staff_profile_id
        `;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            appointmentSortColumns,
            appointmentDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<AppointmentSearchRow[]>(Prisma.sql`
                SELECT
                    a.id,
                    a.patient_id AS "patientId",
                    a.department_id AS "departmentId",
                    a.service_catalog_id AS "serviceCatalogId",
                    a.staff_profile_id AS "staffProfileId",
                    a.status,
                    a.scheduled_at AS "scheduledAt",
                    a.end_at AS "endAt",
                    a.duration_minutes AS "durationMinutes",
                    a.base_price::float8 AS "basePrice",
                    a.appointment_type AS "appointmentType",
                    p.user_id AS "patientUserId",
                    p.first_name AS "patientFirstName",
                    p.last_name AS "patientLastName",
                    p.email AS "patientEmail",
                    p.phone AS "patientPhone",
                    sp.user_id AS "staffUserId",
                    sp.employee_code AS "staffEmployeeCode",
                    sp.specialization AS "staffSpecialization",
                    d.name AS "departmentName",
                    sc.name AS "serviceName"
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(
            rows.map(mapAppointment),
            totalFrom(countRows),
            filters.page,
            filters.limit,
        );
    }

    async searchLabOrders(
        filters: SearchLabOrdersFilters,
    ): Promise<SearchResult<LabOrderSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(filters.search, [
            Prisma.sql`lo.search_vector`,
            Prisma.sql`p.search_vector`,
            Prisma.sql`sp.search_vector`,
        ]);

        if (searchCondition) conditions.push(searchCondition);
        if (filters.status) {
            conditions.push(Prisma.sql`lo.status = ${filters.status}::"LabOrderStatus"`);
        }
        if (filters.priority) {
            conditions.push(Prisma.sql`LOWER(lo.priority) = LOWER(${filters.priority})`);
        }
        if (filters.from) {
            conditions.push(Prisma.sql`lo.ordered_at >= ${filters.from}`);
        }
        if (filters.to) {
            conditions.push(Prisma.sql`lo.ordered_at <= ${filters.to}`);
        }
        if (filters.hasCritical !== undefined) {
            conditions.push(
                filters.hasCritical
                    ? Prisma.sql`EXISTS (
                        SELECT 1
                        FROM lab_order_items loi
                        WHERE loi.lab_order_id = lo.id AND loi.is_critical = true
                    )`
                    : Prisma.sql`NOT EXISTS (
                        SELECT 1
                        FROM lab_order_items loi
                        WHERE loi.lab_order_id = lo.id AND loi.is_critical = true
                    )`,
            );
        }

        const from = Prisma.sql`
            FROM lab_orders lo
            JOIN patients p ON p.id = lo.patient_id
            JOIN staff_profiles sp ON sp.id = lo.ordered_by_staff_id
            JOIN departments d ON d.id = lo.department_id
        `;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            labOrderSortColumns,
            labOrderDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<LabOrderSearchRow[]>(Prisma.sql`
                SELECT
                    lo.id,
                    lo.patient_id AS "patientId",
                    lo.ordered_by_staff_id AS "orderedByStaffId",
                    lo.department_id AS "departmentId",
                    lo.status,
                    lo.priority,
                    lo.ordered_at AS "orderedAt",
                    lo.collected_at AS "collectedAt",
                    lo.completed_at AS "completedAt",
                    lo.reviewed_at AS "reviewedAt",
                    EXISTS (
                        SELECT 1
                        FROM lab_order_items loi
                        WHERE loi.lab_order_id = lo.id AND loi.is_critical = true
                    ) AS "hasCritical",
                    (
                        SELECT COUNT(*)::int
                        FROM lab_order_items loi
                        WHERE loi.lab_order_id = lo.id
                    ) AS "testCount",
                    p.user_id AS "patientUserId",
                    p.first_name AS "patientFirstName",
                    p.last_name AS "patientLastName",
                    p.email AS "patientEmail",
                    p.phone AS "patientPhone",
                    sp.user_id AS "staffUserId",
                    sp.employee_code AS "staffEmployeeCode",
                    sp.specialization AS "staffSpecialization",
                    d.name AS "departmentName"
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(
            rows.map(mapLabOrder),
            totalFrom(countRows),
            filters.page,
            filters.limit,
        );
    }

    async searchInventoryItems(
        filters: SearchInventoryItemsFilters,
    ): Promise<SearchResult<InventoryItemSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(filters.search, [
            Prisma.sql`ii.search_vector`,
        ]);

        if (searchCondition) conditions.push(searchCondition);
        if (filters.categoryId) {
            conditions.push(Prisma.sql`ii.inventory_category_id = ${filters.categoryId}`);
        }
        if (filters.category) {
            conditions.push(Prisma.sql`LOWER(ic.name) = LOWER(${filters.category})`);
        }
        if (filters.departmentId) {
            conditions.push(Prisma.sql`ii.department_id = ${filters.departmentId}`);
        }
        if (filters.stockLevel) {
            conditions.push(stockLevelCondition(filters.stockLevel));
        }
        if (filters.expiryFrom) {
            conditions.push(Prisma.sql`ii.expiry_date >= ${filters.expiryFrom}`);
        }
        if (filters.expiryTo) {
            conditions.push(Prisma.sql`ii.expiry_date <= ${filters.expiryTo}`);
        }

        const from = Prisma.sql`
            FROM inventory_items ii
            JOIN inventory_categories ic ON ic.id = ii.inventory_category_id
            LEFT JOIN departments d ON d.id = ii.department_id
        `;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            inventorySortColumns,
            inventoryDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<InventoryItemSearchRow[]>(Prisma.sql`
                SELECT
                    ii.id,
                    ii.sku,
                    ii.name,
                    ii.description,
                    ii.unit_of_measure AS "unitOfMeasure",
                    ii.current_stock::float8 AS "currentStock",
                    ii.reorder_level::float8 AS "reorderLevel",
                    ii.unit_cost::float8 AS "unitCost",
                    ii.expiry_date AS "expiryDate",
                    ii.is_active AS "isActive",
                    CASE
                        WHEN ii.current_stock <= 0 THEN 'out_of_stock'
                        WHEN ii.current_stock <= ii.reorder_level THEN 'low'
                        ELSE 'in_stock'
                    END AS "stockLevel",
                    ic.id AS "categoryId",
                    ic.name AS "categoryName",
                    d.id AS "departmentId",
                    d.name AS "departmentName"
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(
            rows.map(mapInventoryItem),
            totalFrom(countRows),
            filters.page,
            filters.limit,
        );
    }

    async searchStaff(filters: SearchStaffFilters): Promise<SearchResult<StaffSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(filters.search, [
            Prisma.sql`sp.search_vector`,
        ]);

        if (searchCondition) conditions.push(searchCondition);
        if (filters.positionTypeId) {
            conditions.push(Prisma.sql`sp.staff_position_type_id = ${filters.positionTypeId}`);
        }
        if (filters.status) {
            conditions.push(Prisma.sql`sp.employment_status = ${filters.status}::"EmploymentStatus"`);
        }
        if (filters.departmentId) {
            conditions.push(Prisma.sql`EXISTS (
                SELECT 1
                FROM staff_department_assignments sda_filter
                WHERE sda_filter.staff_profile_id = sp.id
                    AND sda_filter.department_id = ${filters.departmentId}
                    AND sda_filter.unassigned_at IS NULL
            )`);
        }

        const from = Prisma.sql`
            FROM staff_profiles sp
            JOIN staff_position_types spt ON spt.id = sp.staff_position_type_id
        `;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            staffSortColumns,
            staffDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<StaffSearchRow[]>(Prisma.sql`
                SELECT
                    sp.id,
                    sp.user_id AS "userId",
                    sp.employee_code AS "employeeCode",
                    sp.specialization,
                    sp.license_number AS "licenseNumber",
                    sp.employment_status AS "employmentStatus",
                    sp.hire_date AS "hireDate",
                    sp.is_public_profile AS "isPublicProfile",
                    CASE
                        WHEN sp.specialization IS NULL THEN sp.employee_code
                        ELSE sp.employee_code || ' - ' || sp.specialization
                    END AS "displayName",
                    spt.id AS "positionTypeId",
                    spt.name AS "positionTypeName",
                    spt.default_role_key AS "defaultRoleKey",
                    COALESCE((
                        SELECT json_agg(
                            json_build_object(
                                'id', d.id,
                                'name', d.name,
                                'isPrimary', sda.is_primary
                            )
                            ORDER BY sda.is_primary DESC, d.name ASC
                        )
                        FROM staff_department_assignments sda
                        JOIN departments d ON d.id = sda.department_id
                        WHERE sda.staff_profile_id = sp.id
                            AND sda.unassigned_at IS NULL
                    ), '[]'::json) AS departments
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(
            rows.map(mapStaff),
            totalFrom(countRows),
            filters.page,
            filters.limit,
        );
    }

    async searchAuditLogs(
        filters: SearchAuditLogsFilters,
    ): Promise<SearchResult<AuditLogSearchItem>> {
        const conditions: Prisma.Sql[] = [];
        const searchCondition = buildSearchQuery(filters.search, [
            Prisma.sql`al.search_vector`,
        ]);

        if (searchCondition) conditions.push(searchCondition);
        if (filters.userId) {
            conditions.push(Prisma.sql`al.performed_by_user_id = ${filters.userId}::uuid`);
        }
        if (filters.action) {
            conditions.push(Prisma.sql`LOWER(al.action) = LOWER(${filters.action})`);
        }
        if (filters.entity) {
            conditions.push(Prisma.sql`LOWER(al.entity_type) = LOWER(${filters.entity})`);
        }
        if (filters.from) {
            conditions.push(Prisma.sql`al.created_at >= ${filters.from}`);
        }
        if (filters.to) {
            conditions.push(Prisma.sql`al.created_at <= ${filters.to}`);
        }
        if (filters.ip) {
            conditions.push(Prisma.sql`al.ip_address = ${filters.ip}`);
        }

        const from = Prisma.sql`FROM audit_logs al`;
        const where = buildWhere(conditions);
        const orderBy = buildOrderBy(
            filters.sortBy,
            filters.sortOrder,
            auditLogSortColumns,
            auditLogDefaultOrder,
        );
        const limitOffset = buildLimitOffset(filters.page, filters.limit);
        const [rows, countRows] = await prisma.$transaction([
            prisma.$queryRaw<AuditLogSearchItem[]>(Prisma.sql`
                SELECT
                    al.id,
                    al.action,
                    al.entity_type AS entity,
                    al.entity_id AS "entityId",
                    al.performed_by_user_id AS "userId",
                    al.ip_address AS ip,
                    al.user_agent AS "userAgent",
                    al.request_id AS "requestId",
                    al.metadata,
                    al.old_value AS "oldValue",
                    al.new_value AS "newValue",
                    al.created_at AS timestamp
                ${from}
                ${where}
                ${orderBy}
                ${limitOffset}
            `),
            prisma.$queryRaw<CountRow[]>(Prisma.sql`
                SELECT COUNT(*)::int AS total
                ${from}
                ${where}
            `),
        ]);

        return buildPagedResult(rows, totalFrom(countRows), filters.page, filters.limit);
    }
}
