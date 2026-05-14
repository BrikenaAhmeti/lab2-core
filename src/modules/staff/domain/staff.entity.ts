import { EmploymentStatus } from '../../../generated/prisma';

export interface StaffPositionTypeSummary {
    id: string;
    name: string;
    defaultRoleKey: string;
    isActive: boolean;
}

export interface StaffDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface StaffDepartmentAssignmentView {
    id: string;
    departmentId: string;
    isPrimary: boolean;
    assignedAt: Date;
    unassignedAt: Date | null;
    department: StaffDepartmentSummary;
}

export interface StaffUserSummary {
    id: string;
}

export interface StaffProfileEntity {
    id: string;
    userId: string;
    staffPositionTypeId: string;
    employeeCode: string;
    specialization: string | null;
    licenseNumber: string | null;
    employmentStatus: EmploymentStatus;
    hireDate: Date | null;
    terminationDate: Date | null;
    bio: string | null;
    isPublicProfile: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface StaffProfileView extends StaffProfileEntity {
    user: StaffUserSummary;
    positionType: StaffPositionTypeSummary;
    departments: StaffDepartmentAssignmentView[];
}

export interface StaffProfileListResult {
    items: StaffProfileView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
