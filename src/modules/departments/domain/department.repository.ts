import { DepartmentEntity, DepartmentListResult } from './department.entity';

export interface CreateDepartmentData {
    name: string;
    description?: string | null;
}

export interface ListDepartmentsFilters {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
}

export interface UpdateDepartmentData {
    name?: string;
    description?: string | null;
    isActive?: boolean;
}

export interface DepartmentRepository {
    create(data: CreateDepartmentData): Promise<DepartmentEntity>;
    findById(id: string): Promise<DepartmentEntity | null>;
    findByName(name: string): Promise<DepartmentEntity | null>;
    list(filters: ListDepartmentsFilters): Promise<DepartmentListResult>;
    update(id: string, data: UpdateDepartmentData): Promise<DepartmentEntity>;
    deactivate(id: string): Promise<DepartmentEntity>;
}
