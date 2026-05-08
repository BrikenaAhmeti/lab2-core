export interface ServiceCatalogEntity {
    id: string;
    departmentId: string;
    name: string;
    description: string | null;
    defaultDurationMinutes: number;
    defaultPrice: unknown;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ServiceCatalogListResult {
    items: ServiceCatalogEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
