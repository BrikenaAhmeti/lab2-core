export interface DepartmentEntity {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
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
