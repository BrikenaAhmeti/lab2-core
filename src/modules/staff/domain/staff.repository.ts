import { EmploymentStatus } from '../../../generated/prisma';
import {
    StaffDepartmentSummary,
    StaffPositionTypeSummary,
    StaffProfileEntity,
    StaffProfileListResult,
    StaffProfileView,
} from './staff.entity';

export interface StaffDepartmentAssignmentData {
    departmentId: string;
    isPrimary?: boolean;
}

export interface CreateStaffProfileData {
    userId: string;
    staffPositionTypeId: string;
    employeeCode: string;
    specialization?: string | null;
    licenseNumber?: string | null;
    employmentStatus?: EmploymentStatus;
    hireDate?: Date | null;
    bio?: string | null;
    isPublicProfile?: boolean;
    departments: StaffDepartmentAssignmentData[];
    actorUserId?: string;
}

export interface ListStaffProfilesFilters {
    page: number;
    limit: number;
    departmentId?: string;
    positionTypeId?: string;
    status?: EmploymentStatus;
    search?: string;
    publicOnly?: boolean;
    roleKey?: string;
}

export interface UpdateStaffProfileData {
    staffPositionTypeId?: string;
    employeeCode?: string;
    specialization?: string | null;
    licenseNumber?: string | null;
    employmentStatus?: EmploymentStatus;
    hireDate?: Date | null;
    terminationDate?: Date | null;
    bio?: string | null;
    isPublicProfile?: boolean;
    actorUserId?: string;
}

export interface StaffRepository {
    createWithDepartments(data: CreateStaffProfileData): Promise<StaffProfileView>;
    findById(id: string): Promise<StaffProfileView | null>;
    findByUserId(userId: string): Promise<StaffProfileEntity | null>;
    findByEmployeeCode(employeeCode: string): Promise<StaffProfileEntity | null>;
    list(filters: ListStaffProfilesFilters): Promise<StaffProfileListResult>;
    update(id: string, data: UpdateStaffProfileData): Promise<StaffProfileView>;
    deactivate(id: string, actorUserId?: string): Promise<StaffProfileView>;
    addDepartment(
        staffProfileId: string,
        data: StaffDepartmentAssignmentData & { actorUserId?: string },
    ): Promise<StaffProfileView>;
    removeDepartment(
        staffProfileId: string,
        departmentId: string,
        actorUserId?: string,
    ): Promise<StaffProfileView>;
    countFutureAppointments(id: string, now: Date): Promise<number>;
    findPositionTypeById(id: string): Promise<StaffPositionTypeSummary | null>;
    findDepartmentsByIds(ids: string[]): Promise<StaffDepartmentSummary[]>;
}
