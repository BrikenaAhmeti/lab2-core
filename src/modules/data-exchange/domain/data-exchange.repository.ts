import {
    DataExchangeRow,
    DepartmentReference,
    ExportEntity,
    InventoryCategoryReference,
    InventoryItemImportData,
    LabTestImportData,
    PatientExistingKeys,
    PatientImportData,
    ServiceCatalogImportData,
    StaffExistingKeys,
    StaffImportData,
    StaffPositionTypeReference,
} from './data-exchange.entity';

export interface DataExchangeRepository {
    exportRows(entity: ExportEntity): Promise<DataExchangeRow[]>;
    findExistingPatientKeys(
        emails: string[],
        personalNumberHashes: string[],
        userIds: string[],
    ): Promise<PatientExistingKeys>;
    findExistingLabTestCodes(codes: string[]): Promise<Set<string>>;
    findExistingInventorySkus(skus: string[]): Promise<Set<string>>;
    findExistingServiceCatalogKeys(
        departmentIds: string[],
        names: string[],
    ): Promise<Set<string>>;
    findExistingStaffKeys(
        userIds: string[],
        employeeCodes: string[],
    ): Promise<StaffExistingKeys>;
    findDepartmentsByIds(ids: string[]): Promise<DepartmentReference[]>;
    findDepartmentsByNames(names: string[]): Promise<DepartmentReference[]>;
    findInventoryCategoriesByIds(
        ids: string[],
    ): Promise<InventoryCategoryReference[]>;
    findInventoryCategoriesByNames(
        names: string[],
    ): Promise<InventoryCategoryReference[]>;
    findStaffPositionTypesByIds(
        ids: string[],
    ): Promise<StaffPositionTypeReference[]>;
    findStaffPositionTypesByNames(
        names: string[],
    ): Promise<StaffPositionTypeReference[]>;
    importPatients(
        rows: PatientImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ): Promise<number>;
    importLabTests(
        rows: LabTestImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ): Promise<number>;
    importInventoryItems(
        rows: InventoryItemImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ): Promise<number>;
    importServiceCatalog(
        rows: ServiceCatalogImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ): Promise<number>;
    importStaff(
        rows: StaffImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ): Promise<number>;
}
