export const exportEntities = [
    'patients',
    'appointments',
    'lab-results',
    'inventory-items',
    'billings',
    'audit-logs',
    'staff',
] as const;

export const importEntities = [
    'patients',
    'inventory-items',
    'lab-tests',
    'service-catalog',
    'staff',
] as const;

export const exchangeFormats = ['csv', 'xlsx', 'json'] as const;
export const importModes = ['strict', 'lenient'] as const;

export type ExportEntity = (typeof exportEntities)[number];
export type ImportEntity = (typeof importEntities)[number];
export type ExchangeFormat = (typeof exchangeFormats)[number];
export type ImportMode = (typeof importModes)[number];

export type DataExchangeRow = Record<string, unknown>;

export interface DataExchangeColumn {
    key: string;
    header: string;
}

export interface ExportDataset {
    entity: ExportEntity | ImportEntity;
    generatedAt: Date;
    columns: DataExchangeColumn[];
    rows: DataExchangeRow[];
}

export interface DataExchangeFile {
    buffer: Buffer;
    contentType: string;
    filename: string;
}

export interface ImportSource {
    buffer?: Buffer;
    rows?: Record<string, unknown>[];
    filename?: string;
    mimeType?: string;
    format?: ExchangeFormat;
}

export interface ParsedImportRow {
    rowNumber: number;
    values: Record<string, string>;
}

export interface ImportRowError {
    row: number;
    field?: string;
    reason: string;
}

export interface ImportResult {
    entity: ImportEntity;
    mode: ImportMode;
    status: 'completed';
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: ImportRowError[];
}

export interface ImportJob {
    id: string;
    entity: ImportEntity;
    mode: ImportMode;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    result?: ImportResult;
    error?: string;
}

export interface PatientImportData {
    userId?: string | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    bloodType?: string | null;
    personalNumber?: string | null;
    personalNumberHash?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    emergencyPhone?: string | null;
    allergies?: unknown;
    medicalNotes?: unknown;
    isActive?: boolean;
}

export interface LabTestImportData {
    code: string;
    name: string;
    description?: string | null;
    category?: string | null;
    sampleType?: string | null;
    defaultPrice?: number | null;
    referenceRange?: string | null;
    isActive?: boolean;
}

export interface InventoryItemImportData {
    inventoryCategoryId: string;
    departmentId?: string | null;
    sku: string;
    name: string;
    description?: string | null;
    unitOfMeasure: string;
    currentStock: number;
    reorderLevel: number;
    unitCost?: number | null;
    expiryDate?: Date | null;
    isActive?: boolean;
}

export interface ServiceCatalogImportData {
    departmentId: string;
    name: string;
    description?: string | null;
    defaultDurationMinutes: number;
    defaultPrice: number;
    isActive?: boolean;
    sortOrder?: number;
}

export interface StaffDepartmentImportData {
    departmentId: string;
    isPrimary: boolean;
}

export interface StaffImportData {
    userId: string;
    staffPositionTypeId: string;
    employeeCode: string;
    specialization?: string | null;
    licenseNumber?: string | null;
    employmentStatus?: string;
    hireDate?: Date | null;
    bio?: string | null;
    isPublicProfile?: boolean;
    departments: StaffDepartmentImportData[];
}

export interface DepartmentReference {
    id: string;
    name: string;
    isActive: boolean;
}

export interface InventoryCategoryReference {
    id: string;
    name: string;
    isActive: boolean;
}

export interface StaffPositionTypeReference {
    id: string;
    name: string;
    isActive: boolean;
}

export interface PatientExistingKeys {
    emails: Set<string>;
    personalNumberHashes: Set<string>;
    userIds: Set<string>;
}

export interface StaffExistingKeys {
    userIds: Set<string>;
    employeeCodes: Set<string>;
}
