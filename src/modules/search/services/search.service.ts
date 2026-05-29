import { AppError } from '../../../shared/core/errors/app-error';
import { hashPersonalNumber } from '../../patients/domain/patient.crypto';
import {
    SearchAppointmentsFilters,
    SearchAuditLogsFilters,
    SearchInventoryItemsFilters,
    SearchLabOrdersFilters,
    SearchPatientsFilters,
    SearchStaffFilters,
} from '../domain/search.entity';
import { AdvancedSearchRepository } from '../domain/search.repository';
import { normalizeSearchTerm } from '../infrastructure/search-query-builder';

export class AdvancedSearchService {
    constructor(private readonly searchRepository: AdvancedSearchRepository) {}

    searchPatients(filters: SearchPatientsFilters) {
        this.ensureAgeRange(filters.minAge, filters.maxAge);
        const search = normalizeSearchTerm(filters.search);

        return this.searchRepository.searchPatients({
            ...filters,
            search,
            personalNumberHash: hashPersonalNumber(search) ?? undefined,
        });
    }

    searchAppointments(filters: SearchAppointmentsFilters) {
        this.ensureDateRange(filters.from, filters.to);

        return this.searchRepository.searchAppointments({
            ...filters,
            search: normalizeSearchTerm(filters.search),
        });
    }

    searchLabOrders(filters: SearchLabOrdersFilters) {
        this.ensureDateRange(filters.from, filters.to);

        return this.searchRepository.searchLabOrders({
            ...filters,
            search: normalizeSearchTerm(filters.search),
        });
    }

    searchInventoryItems(filters: SearchInventoryItemsFilters) {
        this.ensureDateRange(filters.expiryFrom, filters.expiryTo);

        return this.searchRepository.searchInventoryItems({
            ...filters,
            search: normalizeSearchTerm(filters.search),
        });
    }

    searchStaff(filters: SearchStaffFilters) {
        return this.searchRepository.searchStaff({
            ...filters,
            search: normalizeSearchTerm(filters.search),
        });
    }

    searchAuditLogs(filters: SearchAuditLogsFilters) {
        this.ensureDateRange(filters.from, filters.to);

        return this.searchRepository.searchAuditLogs({
            ...filters,
            search: normalizeSearchTerm(filters.search),
            action: normalizeSearchTerm(filters.action),
            entity: normalizeSearchTerm(filters.entity),
            ip: normalizeSearchTerm(filters.ip),
        });
    }

    private ensureAgeRange(minAge?: number, maxAge?: number) {
        if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
            throw new AppError('minAge must be less than or equal to maxAge', 400);
        }
    }

    private ensureDateRange(from?: Date, to?: Date) {
        if (from && to && from > to) {
            throw new AppError('from must be before or equal to to', 400);
        }
    }
}
