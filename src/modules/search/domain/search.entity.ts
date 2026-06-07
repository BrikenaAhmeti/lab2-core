import {
    AppointmentStatus,
    BloodType,
    EmploymentStatus,
    LabOrderStatus,
} from '../../../generated/prisma';

export type SearchSortOrder = 'asc' | 'desc';

export type StockLevelFilter = 'out_of_stock' | 'low' | 'in_stock';

export type SearchPagination = {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: SearchSortOrder;
};

export type SearchPatientsFilters = SearchPagination & {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    bloodType?: BloodType;
    personalNumberHash?: string;
};

export type SearchAppointmentsFilters = SearchPagination & {
    status?: AppointmentStatus;
    from?: Date;
    to?: Date;
    departmentId?: string;
    serviceCatalogId?: string;
};

export type SearchLabOrdersFilters = SearchPagination & {
    status?: LabOrderStatus;
    priority?: string;
    from?: Date;
    to?: Date;
    hasCritical?: boolean;
};

export type SearchInventoryItemsFilters = SearchPagination & {
    categoryId?: string;
    category?: string;
    stockLevel?: StockLevelFilter;
    departmentId?: string;
    expiryFrom?: Date;
    expiryTo?: Date;
};

export type SearchStaffFilters = SearchPagination & {
    departmentId?: string;
    positionTypeId?: string;
    status?: EmploymentStatus;
};

export type SearchAuditLogsFilters = SearchPagination & {
    userId?: string;
    action?: string;
    entity?: string;
    from?: Date;
    to?: Date;
    ip?: string;
};

export type SearchResult<T> = {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type PatientSearchItem = {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    personalNumber: string | null;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    age: number | null;
    gender: string | null;
    bloodType: BloodType | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type AppointmentSearchItem = {
    id: string;
    patientId: string;
    departmentId: string;
    serviceCatalogId: string;
    staffProfileId: string | null;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
    durationMinutes: number;
    basePrice: number;
    appointmentType: string;
    patient: {
        id: string;
        userId: string | null;
        name: string;
        email: string | null;
        phone: string | null;
    };
    staff: {
        id: string;
        userId: string;
        employeeCode: string;
        specialization: string | null;
        displayName: string;
    } | null;
    department: {
        id: string;
        name: string;
    };
    service: {
        id: string;
        name: string;
    };
};

export type LabOrderSearchItem = {
    id: string;
    patientId: string;
    orderedByStaffId: string;
    departmentId: string;
    status: LabOrderStatus;
    priority: string | null;
    orderedAt: Date;
    collectedAt: Date | null;
    completedAt: Date | null;
    reviewedAt: Date | null;
    hasCritical: boolean;
    testCount: number;
    patient: {
        id: string;
        userId: string | null;
        name: string;
        email: string | null;
        phone: string | null;
    };
    orderedByStaff: {
        id: string;
        userId: string;
        employeeCode: string;
        specialization: string | null;
        displayName: string;
    };
    department: {
        id: string;
        name: string;
    };
};

export type InventoryItemSearchItem = {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    unitOfMeasure: string;
    currentStock: number;
    reorderLevel: number;
    unitCost: number | null;
    expiryDate: Date | null;
    isActive: boolean;
    stockLevel: StockLevelFilter;
    category: {
        id: string;
        name: string;
    };
    department: {
        id: string;
        name: string;
    } | null;
};

export type StaffSearchItem = {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    licenseNumber: string | null;
    employmentStatus: EmploymentStatus;
    hireDate: Date | null;
    isPublicProfile: boolean;
    displayName: string;
    positionType: {
        id: string;
        name: string;
        defaultRoleKey: string;
    };
    departments: Array<{
        id: string;
        name: string;
        isPrimary: boolean;
    }>;
};

export type AuditLogSearchItem = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
    requestId: string | null;
    metadata: unknown;
    oldValue: unknown;
    newValue: unknown;
    timestamp: Date;
};
