import {
    StaffPositionTypeDepartmentSummary,
    StaffPositionTypeEntity,
    StaffPositionTypeListResult,
    StaffPositionTypeView,
} from './staff-position-type.entity';

export interface CreateStaffPositionTypeData {
    name: string;
    description?: string | null;
    defaultRoleKey: string;
    applicableDepartmentIds?: string[] | null;
    isActive?: boolean;
}

export interface ListStaffPositionTypesFilters {
    isActive?: boolean;
}

export interface UpdateStaffPositionTypeData {
    name?: string;
    description?: string | null;
    defaultRoleKey?: string;
    applicableDepartmentIds?: string[] | null;
    isActive?: boolean;
}

export interface StaffPositionTypeRepository {
    create(data: CreateStaffPositionTypeData): Promise<StaffPositionTypeEntity>;
    findById(id: string): Promise<StaffPositionTypeView | null>;
    findByName(name: string): Promise<StaffPositionTypeEntity | null>;
    list(filters: ListStaffPositionTypesFilters): Promise<StaffPositionTypeListResult>;
    update(id: string, data: UpdateStaffPositionTypeData): Promise<StaffPositionTypeEntity>;
    deactivate(id: string): Promise<StaffPositionTypeEntity>;
    findDepartmentsByIds(ids: string[]): Promise<StaffPositionTypeDepartmentSummary[]>;
    countAssignedStaffProfiles(id: string): Promise<number>;
}
