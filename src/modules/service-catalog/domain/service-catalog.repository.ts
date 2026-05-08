import { ServiceCatalogEntity, ServiceCatalogListResult } from './service-catalog.entity';

export interface CreateServiceCatalogData {
    departmentId: string;
    name: string;
    description?: string | null;
    defaultDurationMinutes: number;
    defaultPrice: number;
    isActive?: boolean;
    sortOrder?: number;
}

export interface ListServiceCatalogFilters {
    page: number;
    limit: number;
    search?: string;
    departmentId?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'sortOrder' | 'defaultDurationMinutes' | 'defaultPrice' | 'createdAt' | 'updatedAt';
    sortDirection?: 'asc' | 'desc';
}

export interface UpdateServiceCatalogData {
    departmentId?: string;
    name?: string;
    description?: string | null;
    defaultDurationMinutes?: number;
    defaultPrice?: number;
    isActive?: boolean;
    sortOrder?: number;
}

export interface ServiceCatalogRepository {
    create(data: CreateServiceCatalogData): Promise<ServiceCatalogEntity>;
    findById(id: string): Promise<ServiceCatalogEntity | null>;
    departmentExists(id: string): Promise<boolean>;
    list(filters: ListServiceCatalogFilters): Promise<ServiceCatalogListResult>;
    update(id: string, data: UpdateServiceCatalogData): Promise<ServiceCatalogEntity>;
    deactivate(id: string): Promise<ServiceCatalogEntity>;
}
