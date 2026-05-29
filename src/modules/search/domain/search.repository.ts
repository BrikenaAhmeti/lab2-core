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
} from './search.entity';

export interface AdvancedSearchRepository {
    searchPatients(filters: SearchPatientsFilters): Promise<SearchResult<PatientSearchItem>>;
    searchAppointments(filters: SearchAppointmentsFilters): Promise<SearchResult<AppointmentSearchItem>>;
    searchLabOrders(filters: SearchLabOrdersFilters): Promise<SearchResult<LabOrderSearchItem>>;
    searchInventoryItems(filters: SearchInventoryItemsFilters): Promise<SearchResult<InventoryItemSearchItem>>;
    searchStaff(filters: SearchStaffFilters): Promise<SearchResult<StaffSearchItem>>;
    searchAuditLogs(filters: SearchAuditLogsFilters): Promise<SearchResult<AuditLogSearchItem>>;
}
