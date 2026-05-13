export interface StaffPositionTypeEntity {
    id: string;
    name: string;
    description: string | null;
    defaultRoleKey: string;
    applicableDepartmentIds: string[] | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface StaffPositionTypeDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface StaffPositionTypeView extends StaffPositionTypeEntity {
    defaultRoleName: string;
    applicableDepartments: StaffPositionTypeDepartmentSummary[];
}

export interface StaffPositionTypeListResult {
    items: StaffPositionTypeView[];
}
