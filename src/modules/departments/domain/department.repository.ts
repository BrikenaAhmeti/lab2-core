import { DepartmentEntity, DepartmentListResult } from './department.entity';

export interface CreateDepartmentData {
    name: string;
    description?: string | null;
    floor?: string | null;
    phoneExtension?: string | null;
    operatingHours?: unknown | null;
    isActive?: boolean;
    sortOrder?: number;
}

export interface ListDepartmentsFilters {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt';
    sortDirection?: 'asc' | 'desc';
    openAt?: string;
    openFrom?: string;
    openTo?: string;
}

export interface UpdateDepartmentData {
    name?: string;
    description?: string | null;
    floor?: string | null;
    phoneExtension?: string | null;
    operatingHours?: unknown | null;
    isActive?: boolean;
    sortOrder?: number;
}

export interface DepartmentRepository {
    create(data: CreateDepartmentData): Promise<DepartmentEntity>;
    findById(id: string): Promise<DepartmentEntity | null>;
    findByName(name: string): Promise<DepartmentEntity | null>;
    list(filters: ListDepartmentsFilters): Promise<DepartmentListResult>;
    update(id: string, data: UpdateDepartmentData): Promise<DepartmentEntity>;
    deactivate(id: string): Promise<DepartmentEntity>;
}
