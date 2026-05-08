import { prisma } from '../../../infrastructure/db/prisma';
import {
    CreateDepartmentData,
    DepartmentRepository,
    ListDepartmentsFilters,
    UpdateDepartmentData,
} from '../domain/department.repository';
import { DepartmentEntity, DepartmentListResult } from '../domain/department.entity';
import { Prisma } from '../../../generated/prisma';

function toJsonInput(value: unknown | null | undefined) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
}

export class DepartmentPrismaRepository implements DepartmentRepository {
    async create(data: CreateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                floor: data.floor ?? null,
                phoneExtension: data.phoneExtension ?? null,
                operatingHours: toJsonInput(data.operatingHours),
                isActive: data.isActive,
                sortOrder: data.sortOrder,
            },
        });
    }

    async findById(id: string): Promise<DepartmentEntity | null> {
        return prisma.department.findUnique({
            where: { id },
        });
    }

    async findByName(name: string): Promise<DepartmentEntity | null> {
        return prisma.department.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });
    }

    async list(filters: ListDepartmentsFilters): Promise<DepartmentListResult> {
        const where: Prisma.DepartmentWhereInput = {};

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
                {
                    floor: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
                {
                    phoneExtension: {
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
            prisma.department.findMany({
                where,
                orderBy,
                skip,
                take: filters.limit,
            }),
            prisma.department.count({ where }),
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

    async update(id: string, data: UpdateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.update({
            where: { id },
            data: {
                ...data,
                operatingHours: toJsonInput(data.operatingHours),
            },
        });
    }

    async deactivate(id: string): Promise<DepartmentEntity> {
        return prisma.department.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
    }
}
