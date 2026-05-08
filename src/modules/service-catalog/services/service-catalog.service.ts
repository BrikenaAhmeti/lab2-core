import { AppError } from '../../../shared/core/errors/app-error';
import { ServiceCatalogEntity, ServiceCatalogListResult } from '../domain/service-catalog.entity';
import { ServiceCatalogRepository } from '../domain/service-catalog.repository';
import {
    normalizeServiceCatalogDescription,
    normalizeServiceCatalogName,
    normalizeServiceCatalogSearch,
} from '../domain/service-catalog.normalizer';

export class ServiceCatalogService {
    constructor(private readonly serviceCatalogRepository: ServiceCatalogRepository) { }

    async createService(data: {
        departmentId: string;
        name: string;
        description?: string | null;
        defaultDurationMinutes: number;
        defaultPrice: number;
        isActive?: boolean;
        sortOrder?: number;
    }): Promise<ServiceCatalogEntity> {
        const departmentExists = await this.serviceCatalogRepository.departmentExists(data.departmentId);

        if (!departmentExists) {
            throw new AppError('Department not found', 404);
        }

        return this.serviceCatalogRepository.create({
            departmentId: data.departmentId,
            name: normalizeServiceCatalogName(data.name),
            description: normalizeServiceCatalogDescription(data.description),
            defaultDurationMinutes: data.defaultDurationMinutes,
            defaultPrice: data.defaultPrice,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
        });
    }

    async getServiceById(id: string): Promise<ServiceCatalogEntity> {
        const service = await this.serviceCatalogRepository.findById(id);

        if (!service) {
            throw new AppError('Service not found', 404);
        }

        return service;
    }

    async listServices(filters: {
        page: number;
        limit: number;
        search?: string;
        departmentId?: string;
        isActive?: boolean;
        sortBy?: 'name' | 'sortOrder' | 'defaultDurationMinutes' | 'defaultPrice' | 'createdAt' | 'updatedAt';
        sortDirection?: 'asc' | 'desc';
    }): Promise<ServiceCatalogListResult> {
        return this.serviceCatalogRepository.list({
            page: filters.page,
            limit: filters.limit,
            search: normalizeServiceCatalogSearch(filters.search),
            departmentId: filters.departmentId,
            isActive: filters.isActive,
            sortBy: filters.sortBy,
            sortDirection: filters.sortDirection,
        });
    }

    async updateService(
        id: string,
        data: {
            departmentId?: string;
            name?: string;
            description?: string | null;
            defaultDurationMinutes?: number;
            defaultPrice?: number;
            isActive?: boolean;
            sortOrder?: number;
        },
    ): Promise<ServiceCatalogEntity> {
        const existingService = await this.serviceCatalogRepository.findById(id);

        if (!existingService) {
            throw new AppError('Service not found', 404);
        }

        const updateData: {
            departmentId?: string;
            name?: string;
            description?: string | null;
            defaultDurationMinutes?: number;
            defaultPrice?: number;
            isActive?: boolean;
            sortOrder?: number;
        } = {};

        if (data.departmentId !== undefined) {
            const departmentExists = await this.serviceCatalogRepository.departmentExists(data.departmentId);

            if (!departmentExists) {
                throw new AppError('Department not found', 404);
            }

            updateData.departmentId = data.departmentId;
        }

        if (data.name !== undefined) {
            updateData.name = normalizeServiceCatalogName(data.name);
        }

        if (data.description !== undefined) {
            updateData.description = normalizeServiceCatalogDescription(data.description);
        }

        if (data.defaultDurationMinutes !== undefined) {
            updateData.defaultDurationMinutes = data.defaultDurationMinutes;
        }

        if (data.defaultPrice !== undefined) {
            updateData.defaultPrice = data.defaultPrice;
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (data.sortOrder !== undefined) {
            updateData.sortOrder = data.sortOrder;
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError('At least one field is required', 400);
        }

        return this.serviceCatalogRepository.update(id, updateData);
    }

    async deactivateService(id: string): Promise<ServiceCatalogEntity> {
        const service = await this.serviceCatalogRepository.findById(id);

        if (!service) {
            throw new AppError('Service not found', 404);
        }

        if (!service.isActive) {
            return service;
        }

        return this.serviceCatalogRepository.deactivate(id);
    }
}
