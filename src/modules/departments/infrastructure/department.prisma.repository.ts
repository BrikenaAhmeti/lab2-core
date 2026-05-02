import { prisma } from '../../../infrastructure/db/prisma';
import {
    CreateDepartmentData,
    DepartmentRepository,
    ListDepartmentsFilters,
    UpdateDepartmentData,
} from '../domain/department.repository';
import { DepartmentEntity, DepartmentListResult } from '../domain/department.entity';
import { Prisma } from '../../../generated/prisma';

export class DepartmentPrismaRepository implements DepartmentRepository {
    async create(data: CreateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.create({
            data: {
                name: data.name,
                description: data.description ?? null,
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
            ];
        }

        const skip = (filters.page - 1) * filters.limit;
        const [items, total] = await prisma.$transaction([
            prisma.department.findMany({
                where,
                orderBy: {
                    name: 'asc',
                },
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
            data,
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
