export interface DepartmentEntity {
    id: string;
    name: string;
    description: string | null;
    floor: string | null;
    phoneExtension: string | null;
    operatingHours: unknown | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DepartmentListResult {
    items: DepartmentEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
