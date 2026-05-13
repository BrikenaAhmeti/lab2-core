import { prisma } from '../../../infrastructure/db/prisma';
import { Prisma } from '../../../generated/prisma';
import { ServiceCatalogEntity, ServiceCatalogListResult } from '../domain/service-catalog.entity';
import {
    CreateServiceCatalogData,
    ListServiceCatalogFilters,
    ServiceCatalogRepository,
    UpdateServiceCatalogData,
} from '../domain/service-catalog.repository';

export class ServiceCatalogPrismaRepository implements ServiceCatalogRepository {
    async create(data: CreateServiceCatalogData): Promise<ServiceCatalogEntity> {
        return prisma.serviceCatalog.create({
            data: {
                departmentId: data.departmentId,
                name: data.name,
                description: data.description ?? null,
                defaultDurationMinutes: data.defaultDurationMinutes,
                defaultPrice: data.defaultPrice,
                isActive: data.isActive,
                sortOrder: data.sortOrder,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
    }

    async findById(id: string): Promise<ServiceCatalogEntity | null> {
        return prisma.serviceCatalog.findUnique({
            where: { id },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
    }

    async departmentExists(id: string): Promise<boolean> {
        const department = await prisma.department.findUnique({
            where: { id },
            select: { id: true },
        });

        return Boolean(department);
    }

    async countActiveAppointmentsByServiceId(id: string): Promise<number> {
        return prisma.appointment.count({
            where: {
                serviceCatalogId: id,
                status: {
                    notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
                },
            },
        });
    }

    async list(filters: ListServiceCatalogFilters): Promise<ServiceCatalogListResult> {
        const where: Prisma.ServiceCatalogWhereInput = {};

        if (filters.departmentId) {
            where.departmentId = filters.departmentId;
        }

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                {
                    name: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
                {
                    description: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (filters.page - 1) * filters.limit;
        const orderBy = filters.sortBy
            ? [{ [filters.sortBy]: filters.sortDirection ?? 'asc' }]
            : [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

        const [items, total] = await prisma.$transaction([
            prisma.serviceCatalog.findMany({
                where,
                orderBy,
                skip,
                take: filters.limit,
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true,
                        },
                    },
                },
            }),
            prisma.serviceCatalog.count({ where }),
        ]);

        return {
            items,
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async update(id: string, data: UpdateServiceCatalogData): Promise<ServiceCatalogEntity> {
        return prisma.serviceCatalog.update({
            where: { id },
            data,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
    }

    async deactivate(id: string): Promise<ServiceCatalogEntity> {
        return prisma.serviceCatalog.update({
            where: { id },
            data: {
                isActive: false,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
    }
}
