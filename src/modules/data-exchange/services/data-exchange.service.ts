import { BloodType, EmploymentStatus } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    encryptPersonalNumber,
    hashPersonalNumber,
} from '../../patients/domain/patient.crypto';
import {
    DataExchangeFile,
    ExchangeFormat,
    ExportEntity,
    ImportEntity,
    ImportJob,
    ImportMode,
    ImportResult,
    ImportRowError,
    ImportSource,
    InventoryItemImportData,
    LabTestImportData,
    ParsedImportRow,
    PatientImportData,
    ServiceCatalogImportData,
    StaffImportData,
} from '../domain/data-exchange.entity';
import { DataExchangeRepository } from '../domain/data-exchange.repository';
import {
    exportColumns,
    importTemplates,
} from '../domain/data-exchange.templates';
import { ImportJobStore } from '../infrastructure/import-job.store';
import { DataExchangeFileService } from './data-exchange-file.service';

type Candidate<T> = {
    rowNumber: number;
    data: T;
};

type RefCandidate<T> = Candidate<T> & {
    refs: Record<string, string | string[] | null | undefined>;
};

const asyncImportThreshold = 500;

function normalizeColumn(value: string) {
    return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
    const email = normalizeText(value);
    return email ? email.toLowerCase() : null;
}

function readValue(row: ParsedImportRow, aliases: string[]) {
    const normalizedAliases = aliases.map(normalizeColumn);

    for (const [key, value] of Object.entries(row.values)) {
        if (normalizedAliases.includes(normalizeColumn(key))) {
            return normalizeText(value);
        }
    }

    return null;
}

function addError(
    errors: ImportRowError[],
    row: number,
    field: string,
    reason: string,
) {
    errors.push({ row, field, reason });
}

function requiredText(
    row: ParsedImportRow,
    aliases: string[],
    field: string,
    errors: ImportRowError[],
) {
    const value = readValue(row, aliases);

    if (!value) {
        addError(errors, row.rowNumber, field, `${field} is required`);
        return '';
    }

    return value;
}

function optionalText(row: ParsedImportRow, aliases: string[]) {
    return readValue(row, aliases);
}

function parseBooleanValue(
    value: string | null,
    defaultValue: boolean,
    row: ParsedImportRow,
    field: string,
    errors: ImportRowError[],
) {
    if (!value) {
        return defaultValue;
    }

    const normalized = value.toLowerCase();

    if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
    }

    addError(errors, row.rowNumber, field, `${field} must be true or false`);
    return defaultValue;
}

function parseNumberValue(
    value: string | null,
    defaultValue: number | null,
    row: ParsedImportRow,
    field: string,
    errors: ImportRowError[],
    options: { required?: boolean; integer?: boolean; min?: number } = {},
) {
    if (!value) {
        if (options.required) {
            addError(errors, row.rowNumber, field, `${field} is required`);
        }

        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        addError(errors, row.rowNumber, field, `${field} must be a number`);
        return defaultValue;
    }

    if (options.integer && !Number.isInteger(parsed)) {
        addError(errors, row.rowNumber, field, `${field} must be an integer`);
        return defaultValue;
    }

    if (options.min !== undefined && parsed < options.min) {
        addError(errors, row.rowNumber, field, `${field} must be at least ${options.min}`);
        return defaultValue;
    }

    return parsed;
}

function parseDateValue(
    value: string | null,
    row: ParsedImportRow,
    field: string,
    errors: ImportRowError[],
) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        addError(errors, row.rowNumber, field, `${field} must be a valid date`);
        return null;
    }

    return date;
}

function parseJsonValue(value: string | null) {
    if (!value) {
        return undefined;
    }

    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function splitList(value: string | null) {
    if (!value) {
        return [];
    }

    return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function lower(value: string) {
    return value.trim().toLowerCase();
}

function serviceKey(departmentId: string, name: string) {
    return `${departmentId}:${lower(name)}`;
}

function pushDuplicateError(
    seen: Set<string>,
    value: string | null | undefined,
    row: ParsedImportRow,
    field: string,
    errors: ImportRowError[],
) {
    if (!value) {
        return;
    }

    if (seen.has(value)) {
        addError(errors, row.rowNumber, field, `${field} is duplicated in the import file`);
        return;
    }

    seen.add(value);
}

function invalidRows(errors: ImportRowError[]) {
    return new Set(errors.map((error) => error.row));
}

function mapById<T extends { id: string }>(items: T[]) {
    return new Map(items.map((item) => [item.id, item]));
}

function mapByName<T extends { name: string }>(items: T[]) {
    return new Map(items.map((item) => [lower(item.name), item]));
}

function normalizeEmploymentStatus(value: string | null) {
    return value ? value.trim().toUpperCase() : EmploymentStatus.ACTIVE;
}

export class DataExchangeService {
    constructor(
        private readonly repository: DataExchangeRepository,
        private readonly fileService: DataExchangeFileService,
        private readonly jobStore: ImportJobStore,
    ) {}

    async exportEntity(
        entity: ExportEntity,
        format: ExchangeFormat,
    ): Promise<DataExchangeFile> {
        const rows = await this.repository.exportRows(entity);

        return this.fileService.export(
            {
                entity,
                generatedAt: new Date(),
                columns: exportColumns[entity],
                rows,
            },
            format,
        );
    }

    async getImportTemplate(
        entity: ImportEntity,
        format: ExchangeFormat,
    ): Promise<DataExchangeFile> {
        const template = importTemplates[entity];

        return this.fileService.export(
            {
                entity,
                generatedAt: new Date(),
                columns: template.columns,
                rows: [template.sample],
            },
            format,
        );
    }

    async importEntity(
        entity: ImportEntity,
        mode: ImportMode,
        source: ImportSource,
        actorUserId?: string,
        asyncRequested = false,
    ): Promise<ImportResult | ImportJob> {
        const rows = await this.fileService.parseImportSource(source);

        if (asyncRequested || rows.length > asyncImportThreshold) {
            return this.queueImport(entity, mode, rows, actorUserId);
        }

        return this.processRows(entity, mode, rows, actorUserId);
    }

    getImportJob(jobId: string) {
        const job = this.jobStore.get(jobId);

        if (!job) {
            throw new AppError('Import job not found', 404);
        }

        return job;
    }

    private queueImport(
        entity: ImportEntity,
        mode: ImportMode,
        rows: ParsedImportRow[],
        actorUserId?: string,
    ) {
        const job = this.jobStore.create(entity, mode);

        setImmediate(async () => {
            this.jobStore.processing(job.id);

            try {
                const result = await this.processRows(entity, mode, rows, actorUserId);
                this.jobStore.complete(job.id, result);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Import failed';
                this.jobStore.fail(job.id, message);
            }
        });

        return job;
    }

    private async processRows(
        entity: ImportEntity,
        mode: ImportMode,
        rows: ParsedImportRow[],
        actorUserId?: string,
    ): Promise<ImportResult> {
        const { data, errors } = await this.validateRows(entity, rows);

        if (mode === 'strict' && errors.length > 0) {
            return {
                entity,
                mode,
                status: 'completed',
                totalRows: rows.length,
                importedRows: 0,
                skippedRows: rows.length,
                errors,
            };
        }

        const importedRows = await this.persistRows(
            entity,
            data,
            actorUserId,
            mode === 'strict',
        );

        return {
            entity,
            mode,
            status: 'completed',
            totalRows: rows.length,
            importedRows,
            skippedRows: rows.length - importedRows,
            errors,
        };
    }

    private async validateRows(entity: ImportEntity, rows: ParsedImportRow[]) {
        if (entity === 'patients') {
            return this.validatePatients(rows);
        }

        if (entity === 'lab-tests') {
            return this.validateLabTests(rows);
        }

        if (entity === 'inventory-items') {
            return this.validateInventoryItems(rows);
        }

        if (entity === 'service-catalog') {
            return this.validateServiceCatalog(rows);
        }

        return this.validateStaff(rows);
    }

    private async persistRows(
        entity: ImportEntity,
        rows:
            | PatientImportData[]
            | LabTestImportData[]
            | InventoryItemImportData[]
            | ServiceCatalogImportData[]
            | StaffImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        if (rows.length === 0) {
            return 0;
        }

        if (entity === 'patients') {
            return this.repository.importPatients(
                rows as PatientImportData[],
                actorUserId,
                strict,
            );
        }

        if (entity === 'lab-tests') {
            return this.repository.importLabTests(
                rows as LabTestImportData[],
                actorUserId,
                strict,
            );
        }

        if (entity === 'inventory-items') {
            return this.repository.importInventoryItems(
                rows as InventoryItemImportData[],
                actorUserId,
                strict,
            );
        }

        if (entity === 'service-catalog') {
            return this.repository.importServiceCatalog(
                rows as ServiceCatalogImportData[],
                actorUserId,
                strict,
            );
        }

        return this.repository.importStaff(rows as StaffImportData[], actorUserId, strict);
    }

    private async validatePatients(rows: ParsedImportRow[]) {
        const errors: ImportRowError[] = [];
        const candidates: Candidate<PatientImportData>[] = [];
        const emails: string[] = [];
        const hashes: string[] = [];
        const userIds: string[] = [];
        const seenEmails = new Set<string>();
        const seenHashes = new Set<string>();
        const seenUserIds = new Set<string>();

        for (const row of rows) {
            const rowErrors: ImportRowError[] = [];
            const email = normalizeEmail(optionalText(row, ['email']));
            const personalNumber = optionalText(row, ['personalNumber', 'personal_number']);
            const normalizedPersonalNumber = personalNumber?.replace(/\s+/g, '') ?? null;
            const personalNumberHash = hashPersonalNumber(normalizedPersonalNumber);
            const userId = optionalText(row, ['userId', 'user_id']);
            const bloodType = optionalText(row, ['bloodType', 'blood_type']);

            pushDuplicateError(seenEmails, email, row, 'email', rowErrors);
            pushDuplicateError(seenHashes, personalNumberHash, row, 'personalNumber', rowErrors);
            pushDuplicateError(seenUserIds, userId, row, 'userId', rowErrors);

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                addError(rowErrors, row.rowNumber, 'email', 'email must be valid');
            }

            if (userId && !isUuid(userId)) {
                addError(rowErrors, row.rowNumber, 'userId', 'userId must be a valid UUID');
            }

            if (bloodType && !Object.values(BloodType).includes(bloodType as BloodType)) {
                addError(rowErrors, row.rowNumber, 'bloodType', 'bloodType is invalid');
            }

            const data: PatientImportData = {
                userId,
                firstName: requiredText(row, ['firstName', 'first_name'], 'firstName', rowErrors),
                lastName: requiredText(row, ['lastName', 'last_name'], 'lastName', rowErrors),
                email,
                phone: optionalText(row, ['phone']),
                dateOfBirth: parseDateValue(
                    optionalText(row, ['dateOfBirth', 'date_of_birth']),
                    row,
                    'dateOfBirth',
                    rowErrors,
                ),
                gender: optionalText(row, ['gender']),
                bloodType,
                personalNumber: encryptPersonalNumber(normalizedPersonalNumber),
                personalNumberHash,
                address: optionalText(row, ['address']),
                emergencyContact: optionalText(row, ['emergencyContact', 'emergency_contact']),
                emergencyPhone: optionalText(row, ['emergencyPhone', 'emergency_phone']),
                allergies: parseJsonValue(optionalText(row, ['allergies'])),
                medicalNotes: parseJsonValue(optionalText(row, ['medicalNotes', 'medical_notes'])),
                isActive: parseBooleanValue(
                    optionalText(row, ['isActive', 'is_active']),
                    true,
                    row,
                    'isActive',
                    rowErrors,
                ),
            };

            if (rowErrors.length) {
                errors.push(...rowErrors);
                continue;
            }

            if (email) emails.push(email);
            if (personalNumberHash) hashes.push(personalNumberHash);
            if (userId) userIds.push(userId);
            candidates.push({ rowNumber: row.rowNumber, data });
        }

        const existing = await this.repository.findExistingPatientKeys(
            emails,
            hashes,
            userIds,
        );

        for (const candidate of candidates) {
            if (candidate.data.email && existing.emails.has(lower(candidate.data.email))) {
                addError(errors, candidate.rowNumber, 'email', 'email already exists');
            }

            if (
                candidate.data.personalNumberHash &&
                existing.personalNumberHashes.has(candidate.data.personalNumberHash)
            ) {
                addError(
                    errors,
                    candidate.rowNumber,
                    'personalNumber',
                    'personalNumber already exists',
                );
            }

            if (candidate.data.userId && existing.userIds.has(candidate.data.userId)) {
                addError(errors, candidate.rowNumber, 'userId', 'userId already has a patient profile');
            }
        }

        const badRows = invalidRows(errors);

        return {
            data: candidates
                .filter((candidate) => !badRows.has(candidate.rowNumber))
                .map((candidate) => candidate.data),
            errors,
        };
    }

    private async validateLabTests(rows: ParsedImportRow[]) {
        const errors: ImportRowError[] = [];
        const candidates: Candidate<LabTestImportData>[] = [];
        const codes: string[] = [];
        const seenCodes = new Set<string>();

        for (const row of rows) {
            const rowErrors: ImportRowError[] = [];
            const code = requiredText(row, ['code'], 'code', rowErrors).toUpperCase();

            pushDuplicateError(seenCodes, code, row, 'code', rowErrors);

            const data: LabTestImportData = {
                code,
                name: requiredText(row, ['name'], 'name', rowErrors),
                description: optionalText(row, ['description']),
                category: optionalText(row, ['category']),
                sampleType: optionalText(row, ['sampleType', 'sample_type']),
                defaultPrice: parseNumberValue(
                    optionalText(row, ['defaultPrice', 'default_price']),
                    null,
                    row,
                    'defaultPrice',
                    rowErrors,
                    { min: 0 },
                ),
                referenceRange: optionalText(row, ['referenceRange', 'reference_range']),
                isActive: parseBooleanValue(
                    optionalText(row, ['isActive', 'is_active']),
                    true,
                    row,
                    'isActive',
                    rowErrors,
                ),
            };

            if (rowErrors.length) {
                errors.push(...rowErrors);
                continue;
            }

            codes.push(code);
            candidates.push({ rowNumber: row.rowNumber, data });
        }

        const existingCodes = await this.repository.findExistingLabTestCodes(codes);

        for (const candidate of candidates) {
            if (existingCodes.has(candidate.data.code)) {
                addError(errors, candidate.rowNumber, 'code', 'code already exists');
            }
        }

        const badRows = invalidRows(errors);

        return {
            data: candidates
                .filter((candidate) => !badRows.has(candidate.rowNumber))
                .map((candidate) => candidate.data),
            errors,
        };
    }

    private async validateInventoryItems(rows: ParsedImportRow[]) {
        const errors: ImportRowError[] = [];
        const candidates: RefCandidate<InventoryItemImportData>[] = [];
        const skus: string[] = [];
        const categoryIds: string[] = [];
        const categoryNames: string[] = [];
        const departmentIds: string[] = [];
        const departmentNames: string[] = [];
        const seenSkus = new Set<string>();

        for (const row of rows) {
            const rowErrors: ImportRowError[] = [];
            const sku = requiredText(row, ['sku'], 'sku', rowErrors).toUpperCase();
            const categoryId = optionalText(row, ['inventoryCategoryId', 'categoryId']);
            const categoryName = optionalText(row, ['categoryName']);
            const departmentId = optionalText(row, ['departmentId']);
            const departmentName = optionalText(row, ['departmentName']);

            pushDuplicateError(seenSkus, sku, row, 'sku', rowErrors);

            if (!categoryId && !categoryName) {
                addError(rowErrors, row.rowNumber, 'inventoryCategoryId', 'category is required');
            }

            if (categoryId && !isUuid(categoryId)) {
                addError(rowErrors, row.rowNumber, 'inventoryCategoryId', 'inventoryCategoryId must be a valid UUID');
            }

            if (departmentId && !isUuid(departmentId)) {
                addError(rowErrors, row.rowNumber, 'departmentId', 'departmentId must be a valid UUID');
            }

            const data: InventoryItemImportData = {
                inventoryCategoryId: categoryId ?? '',
                departmentId: departmentId ?? null,
                sku,
                name: requiredText(row, ['name'], 'name', rowErrors),
                description: optionalText(row, ['description']),
                unitOfMeasure: requiredText(row, ['unitOfMeasure', 'unit'], 'unitOfMeasure', rowErrors),
                currentStock:
                    parseNumberValue(
                        optionalText(row, ['currentStock', 'stock']),
                        0,
                        row,
                        'currentStock',
                        rowErrors,
                        { min: 0 },
                    ) ?? 0,
                reorderLevel:
                    parseNumberValue(
                        optionalText(row, ['reorderLevel']),
                        0,
                        row,
                        'reorderLevel',
                        rowErrors,
                        { min: 0 },
                    ) ?? 0,
                unitCost: parseNumberValue(
                    optionalText(row, ['unitCost']),
                    null,
                    row,
                    'unitCost',
                    rowErrors,
                    { min: 0 },
                ),
                expiryDate: parseDateValue(optionalText(row, ['expiryDate']), row, 'expiryDate', rowErrors),
                isActive: parseBooleanValue(
                    optionalText(row, ['isActive', 'is_active']),
                    true,
                    row,
                    'isActive',
                    rowErrors,
                ),
            };

            if (rowErrors.length) {
                errors.push(...rowErrors);
                continue;
            }

            skus.push(sku);
            if (categoryId) categoryIds.push(categoryId);
            if (categoryName) categoryNames.push(categoryName);
            if (departmentId) departmentIds.push(departmentId);
            if (departmentName) departmentNames.push(departmentName);
            candidates.push({
                rowNumber: row.rowNumber,
                data,
                refs: { categoryId, categoryName, departmentId, departmentName },
            });
        }

        const [
            existingSkus,
            categoriesById,
            categoriesByName,
            departmentsById,
            departmentsByName,
        ] = await Promise.all([
            this.repository.findExistingInventorySkus(skus),
            this.repository.findInventoryCategoriesByIds(categoryIds),
            this.repository.findInventoryCategoriesByNames(categoryNames),
            this.repository.findDepartmentsByIds(departmentIds),
            this.repository.findDepartmentsByNames(departmentNames),
        ]);
        const categoryIdMap = mapById(categoriesById);
        const categoryNameMap = mapByName(categoriesByName);
        const departmentIdMap = mapById(departmentsById);
        const departmentNameMap = mapByName(departmentsByName);

        for (const candidate of candidates) {
            if (existingSkus.has(candidate.data.sku)) {
                addError(errors, candidate.rowNumber, 'sku', 'sku already exists');
            }

            const category =
                (candidate.refs.categoryId
                    ? categoryIdMap.get(candidate.refs.categoryId as string)
                    : undefined) ??
                (candidate.refs.categoryName
                    ? categoryNameMap.get(lower(candidate.refs.categoryName as string))
                    : undefined);

            if (!category) {
                addError(errors, candidate.rowNumber, 'inventoryCategoryId', 'category not found');
            } else if (!category.isActive) {
                addError(errors, candidate.rowNumber, 'inventoryCategoryId', 'category is inactive');
            } else {
                candidate.data.inventoryCategoryId = category.id;
            }

            const department =
                (candidate.refs.departmentId
                    ? departmentIdMap.get(candidate.refs.departmentId as string)
                    : undefined) ??
                (candidate.refs.departmentName
                    ? departmentNameMap.get(lower(candidate.refs.departmentName as string))
                    : undefined);

            if (candidate.refs.departmentId || candidate.refs.departmentName) {
                if (!department) {
                    addError(errors, candidate.rowNumber, 'departmentId', 'department not found');
                } else if (!department.isActive) {
                    addError(errors, candidate.rowNumber, 'departmentId', 'department is inactive');
                } else {
                    candidate.data.departmentId = department.id;
                }
            }
        }

        const badRows = invalidRows(errors);

        return {
            data: candidates
                .filter((candidate) => !badRows.has(candidate.rowNumber))
                .map((candidate) => candidate.data),
            errors,
        };
    }

    private async validateServiceCatalog(rows: ParsedImportRow[]) {
        const errors: ImportRowError[] = [];
        const candidates: RefCandidate<ServiceCatalogImportData>[] = [];
        const departmentIds: string[] = [];
        const departmentNames: string[] = [];

        for (const row of rows) {
            const rowErrors: ImportRowError[] = [];
            const departmentId = optionalText(row, ['departmentId']);
            const departmentName = optionalText(row, ['departmentName']);

            if (!departmentId && !departmentName) {
                addError(rowErrors, row.rowNumber, 'departmentId', 'department is required');
            }

            if (departmentId && !isUuid(departmentId)) {
                addError(rowErrors, row.rowNumber, 'departmentId', 'departmentId must be a valid UUID');
            }

            const data: ServiceCatalogImportData = {
                departmentId: departmentId ?? '',
                name: requiredText(row, ['name'], 'name', rowErrors),
                description: optionalText(row, ['description']),
                defaultDurationMinutes:
                    parseNumberValue(
                        optionalText(row, ['defaultDurationMinutes', 'duration']),
                        null,
                        row,
                        'defaultDurationMinutes',
                        rowErrors,
                        { required: true, integer: true, min: 1 },
                    ) ?? 0,
                defaultPrice:
                    parseNumberValue(
                        optionalText(row, ['defaultPrice', 'price']),
                        null,
                        row,
                        'defaultPrice',
                        rowErrors,
                        { required: true, min: 0 },
                    ) ?? 0,
                isActive: parseBooleanValue(
                    optionalText(row, ['isActive', 'is_active']),
                    true,
                    row,
                    'isActive',
                    rowErrors,
                ),
                sortOrder:
                    parseNumberValue(
                        optionalText(row, ['sortOrder']),
                        0,
                        row,
                        'sortOrder',
                        rowErrors,
                        { integer: true, min: 0 },
                    ) ?? 0,
            };

            if (rowErrors.length) {
                errors.push(...rowErrors);
                continue;
            }

            if (departmentId) departmentIds.push(departmentId);
            if (departmentName) departmentNames.push(departmentName);
            candidates.push({
                rowNumber: row.rowNumber,
                data,
                refs: { departmentId, departmentName },
            });
        }

        const [departmentsById, departmentsByName] = await Promise.all([
            this.repository.findDepartmentsByIds(departmentIds),
            this.repository.findDepartmentsByNames(departmentNames),
        ]);
        const departmentIdMap = mapById(departmentsById);
        const departmentNameMap = mapByName(departmentsByName);
        const seenKeys = new Set<string>();

        for (const candidate of candidates) {
            const department =
                (candidate.refs.departmentId
                    ? departmentIdMap.get(candidate.refs.departmentId as string)
                    : undefined) ??
                (candidate.refs.departmentName
                    ? departmentNameMap.get(lower(candidate.refs.departmentName as string))
                    : undefined);

            if (!department) {
                addError(errors, candidate.rowNumber, 'departmentId', 'department not found');
                continue;
            }

            candidate.data.departmentId = department.id;
            const key = serviceKey(candidate.data.departmentId, candidate.data.name);

            if (seenKeys.has(key)) {
                addError(errors, candidate.rowNumber, 'name', 'service is duplicated in the import file');
            }

            seenKeys.add(key);
        }

        const existingKeys = await this.repository.findExistingServiceCatalogKeys(
            candidates.map((candidate) => candidate.data.departmentId).filter(Boolean),
            candidates.map((candidate) => candidate.data.name).filter(Boolean),
        );

        for (const candidate of candidates) {
            if (existingKeys.has(serviceKey(candidate.data.departmentId, candidate.data.name))) {
                addError(errors, candidate.rowNumber, 'name', 'service already exists in this department');
            }
        }

        const badRows = invalidRows(errors);

        return {
            data: candidates
                .filter((candidate) => !badRows.has(candidate.rowNumber))
                .map((candidate) => candidate.data),
            errors,
        };
    }

    private async validateStaff(rows: ParsedImportRow[]) {
        const errors: ImportRowError[] = [];
        const candidates: RefCandidate<StaffImportData>[] = [];
        const userIds: string[] = [];
        const employeeCodes: string[] = [];
        const positionIds: string[] = [];
        const positionNames: string[] = [];
        const departmentIds: string[] = [];
        const departmentNames: string[] = [];
        const seenUserIds = new Set<string>();
        const seenEmployeeCodes = new Set<string>();

        for (const row of rows) {
            const rowErrors: ImportRowError[] = [];
            const userId = requiredText(row, ['userId'], 'userId', rowErrors);
            const staffPositionTypeId = optionalText(row, ['staffPositionTypeId', 'positionTypeId']);
            const staffPositionTypeName = optionalText(row, ['staffPositionTypeName', 'positionTypeName']);
            const employeeCode = requiredText(row, ['employeeCode'], 'employeeCode', rowErrors).toUpperCase();
            const ids = splitList(optionalText(row, ['departmentIds']));
            const names = splitList(optionalText(row, ['departmentNames']));
            const primaryDepartmentId = optionalText(row, ['primaryDepartmentId']);
            const primaryDepartmentName = optionalText(row, ['primaryDepartmentName']);
            const employmentStatus = normalizeEmploymentStatus(
                optionalText(row, ['employmentStatus']),
            );

            pushDuplicateError(seenUserIds, userId, row, 'userId', rowErrors);
            pushDuplicateError(
                seenEmployeeCodes,
                employeeCode,
                row,
                'employeeCode',
                rowErrors,
            );

            if (userId && !isUuid(userId)) {
                addError(rowErrors, row.rowNumber, 'userId', 'userId must be a valid UUID');
            }

            if (!staffPositionTypeId && !staffPositionTypeName) {
                addError(rowErrors, row.rowNumber, 'staffPositionTypeId', 'staff position type is required');
            }

            if (staffPositionTypeId && !isUuid(staffPositionTypeId)) {
                addError(rowErrors, row.rowNumber, 'staffPositionTypeId', 'staffPositionTypeId must be a valid UUID');
            }

            if (ids.some((id) => !isUuid(id))) {
                addError(rowErrors, row.rowNumber, 'departmentIds', 'departmentIds must contain UUID values');
            }

            if (ids.length + names.length === 0) {
                addError(rowErrors, row.rowNumber, 'departmentIds', 'at least one department is required');
            }

            if (
                !Object.values(EmploymentStatus).includes(
                    employmentStatus as EmploymentStatus,
                )
            ) {
                addError(rowErrors, row.rowNumber, 'employmentStatus', 'employmentStatus is invalid');
            }

            const data: StaffImportData = {
                userId,
                staffPositionTypeId: staffPositionTypeId ?? '',
                employeeCode,
                specialization: optionalText(row, ['specialization']),
                licenseNumber: optionalText(row, ['licenseNumber']),
                employmentStatus,
                hireDate: parseDateValue(optionalText(row, ['hireDate']), row, 'hireDate', rowErrors),
                bio: optionalText(row, ['bio']),
                isPublicProfile: parseBooleanValue(
                    optionalText(row, ['isPublicProfile']),
                    false,
                    row,
                    'isPublicProfile',
                    rowErrors,
                ),
                departments: [],
            };

            if (rowErrors.length) {
                errors.push(...rowErrors);
                continue;
            }

            userIds.push(userId);
            employeeCodes.push(employeeCode);
            if (staffPositionTypeId) positionIds.push(staffPositionTypeId);
            if (staffPositionTypeName) positionNames.push(staffPositionTypeName);
            departmentIds.push(...ids);
            departmentNames.push(...names);
            if (primaryDepartmentId) departmentIds.push(primaryDepartmentId);
            if (primaryDepartmentName) departmentNames.push(primaryDepartmentName);
            candidates.push({
                rowNumber: row.rowNumber,
                data,
                refs: {
                    staffPositionTypeId,
                    staffPositionTypeName,
                    departmentIds: ids,
                    departmentNames: names,
                    primaryDepartmentId,
                    primaryDepartmentName,
                },
            });
        }

        const [
            existingKeys,
            positionsById,
            positionsByName,
            departmentsById,
            departmentsByName,
        ] = await Promise.all([
            this.repository.findExistingStaffKeys(userIds, employeeCodes),
            this.repository.findStaffPositionTypesByIds(positionIds),
            this.repository.findStaffPositionTypesByNames(positionNames),
            this.repository.findDepartmentsByIds(departmentIds),
            this.repository.findDepartmentsByNames(departmentNames),
        ]);
        const positionIdMap = mapById(positionsById);
        const positionNameMap = mapByName(positionsByName);
        const departmentIdMap = mapById(departmentsById);
        const departmentNameMap = mapByName(departmentsByName);

        for (const candidate of candidates) {
            if (existingKeys.userIds.has(candidate.data.userId)) {
                addError(errors, candidate.rowNumber, 'userId', 'userId already has a staff profile');
            }

            if (existingKeys.employeeCodes.has(candidate.data.employeeCode)) {
                addError(errors, candidate.rowNumber, 'employeeCode', 'employeeCode already exists');
            }

            const position =
                (candidate.refs.staffPositionTypeId
                    ? positionIdMap.get(candidate.refs.staffPositionTypeId as string)
                    : undefined) ??
                (candidate.refs.staffPositionTypeName
                    ? positionNameMap.get(lower(candidate.refs.staffPositionTypeName as string))
                    : undefined);

            if (!position) {
                addError(errors, candidate.rowNumber, 'staffPositionTypeId', 'staff position type not found');
            } else if (!position.isActive) {
                addError(errors, candidate.rowNumber, 'staffPositionTypeId', 'staff position type is inactive');
            } else {
                candidate.data.staffPositionTypeId = position.id;
            }

            const departmentRefs = [
                ...((candidate.refs.departmentIds as string[] | undefined) ?? []).map(
                    (id) => departmentIdMap.get(id),
                ),
                ...((candidate.refs.departmentNames as string[] | undefined) ?? []).map(
                    (name) => departmentNameMap.get(lower(name)),
                ),
            ];
            const missingDepartment = departmentRefs.some((department) => !department);
            const inactiveDepartment = departmentRefs.some(
                (department) => department && !department.isActive,
            );

            if (missingDepartment) {
                addError(errors, candidate.rowNumber, 'departmentIds', 'one or more departments were not found');
            } else if (inactiveDepartment) {
                addError(errors, candidate.rowNumber, 'departmentIds', 'one or more departments are inactive');
            } else {
                const departmentIdsForRow = Array.from(
                    new Set(departmentRefs.map((department) => department?.id).filter(Boolean) as string[]),
                );
                const primaryDepartment =
                    (candidate.refs.primaryDepartmentId
                        ? departmentIdMap.get(candidate.refs.primaryDepartmentId as string)
                        : undefined) ??
                    (candidate.refs.primaryDepartmentName
                        ? departmentNameMap.get(lower(candidate.refs.primaryDepartmentName as string))
                        : undefined);
                const primaryDepartmentId = primaryDepartment?.id ?? departmentIdsForRow[0];

                candidate.data.departments = departmentIdsForRow.map((departmentId) => ({
                    departmentId,
                    isPrimary: departmentId === primaryDepartmentId,
                }));
            }
        }

        const badRows = invalidRows(errors);

        return {
            data: candidates
                .filter((candidate) => !badRows.has(candidate.rowNumber))
                .map((candidate) => candidate.data),
            errors,
        };
    }
}
