import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    StaffPositionTypeDepartmentSummary,
    StaffPositionTypeEntity,
    StaffPositionTypeListResult,
    StaffPositionTypeView,
} from '../domain/staff-position-type.entity';
import { formatRoleName } from '../domain/staff-position-type.roles';
import {
    CreateStaffPositionTypeData,
    ListStaffPositionTypesFilters,
    StaffPositionTypeRepository,
    UpdateStaffPositionTypeData,
} from '../domain/staff-position-type.repository';

function toJsonInput(value: string[] | null | undefined) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
}

function parseApplicableDepartmentIds(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
        return null;
    }

    return value.filter((item): item is string => typeof item === 'string');
}

function toEntity(
    positionType: {
        id: string;
        name: string;
        description: string | null;
        defaultRoleKey: string;
        applicableDepartmentIds: Prisma.JsonValue | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    },
): StaffPositionTypeEntity {
    return {
        ...positionType,
        applicableDepartmentIds: parseApplicableDepartmentIds(
            positionType.applicableDepartmentIds,
        ),
    };
}

function toView(
    positionType: StaffPositionTypeEntity,
    departments: StaffPositionTypeDepartmentSummary[],
): StaffPositionTypeView {
    return {
        ...positionType,
        defaultRoleName: formatRoleName(positionType.defaultRoleKey),
        applicableDepartments: departments,
    };
}

export class StaffPositionTypePrismaRepository
    implements StaffPositionTypeRepository {
    async create(data: CreateStaffPositionTypeData): Promise<StaffPositionTypeEntity> {
        const positionType = await prisma.staffPositionType.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                defaultRoleKey: data.defaultRoleKey,
                applicableDepartmentIds: toJsonInput(data.applicableDepartmentIds),
                isActive: data.isActive,
            },
        });

        return toEntity(positionType);
    }

    async findById(id: string): Promise<StaffPositionTypeView | null> {
        const positionType = await prisma.staffPositionType.findUnique({
            where: { id },
        });

        if (!positionType) {
            return null;
        }

        const entity = toEntity(positionType);
        const departments = await this.findDepartmentsByIds(
            entity.applicableDepartmentIds ?? [],
        );

        return toView(entity, departments);
    }

    async findByName(name: string): Promise<StaffPositionTypeEntity | null> {
        const positionType = await prisma.staffPositionType.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });

        return positionType ? toEntity(positionType) : null;
    }

    async list(
        filters: ListStaffPositionTypesFilters,
    ): Promise<StaffPositionTypeListResult> {
        const where: Prisma.StaffPositionTypeWhereInput = {};

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        const positionTypes = await prisma.staffPositionType.findMany({
            where,
            orderBy: [{ name: 'asc' }],
        });

        const entities = positionTypes.map((positionType) => toEntity(positionType));
        const departmentIds = [
            ...new Set(
                entities.flatMap(
                    (positionType) => positionType.applicableDepartmentIds ?? [],
                ),
            ),
        ];
        const departments = await this.findDepartmentsByIds(departmentIds);
        const departmentsById = new Map(departments.map((department) => [department.id, department]));

        return {
            items: entities.map((positionType) =>
                toView(
                    positionType,
                    (positionType.applicableDepartmentIds ?? [])
                        .map((departmentId) => departmentsById.get(departmentId))
                        .filter(
                            (
                                department,
                            ): department is StaffPositionTypeDepartmentSummary =>
                                Boolean(department),
                        ),
                ),
            ),
        };
    }

    async update(
        id: string,
        data: UpdateStaffPositionTypeData,
    ): Promise<StaffPositionTypeEntity> {
        const positionType = await prisma.staffPositionType.update({
            where: { id },
            data: {
                ...data,
                applicableDepartmentIds: toJsonInput(data.applicableDepartmentIds),
            },
        });

        return toEntity(positionType);
    }

    async deactivate(id: string): Promise<StaffPositionTypeEntity> {
        const positionType = await prisma.staffPositionType.update({
            where: { id },
            data: {
                isActive: false,
            },
        });

        return toEntity(positionType);
    }

    async findDepartmentsByIds(
        ids: string[],
    ): Promise<StaffPositionTypeDepartmentSummary[]> {
        if (ids.length === 0) {
            return [];
        }

        const departments = await prisma.department.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
            select: {
                id: true,
                name: true,
                isActive: true,
            },
        });

        const departmentsById = new Map(
            departments.map((department) => [department.id, department]),
        );

        return ids
            .map((id) => departmentsById.get(id))
            .filter(
                (
                    department,
                ): department is StaffPositionTypeDepartmentSummary => Boolean(department),
            );
    }

    async countAssignedStaffProfiles(id: string): Promise<number> {
        return prisma.staffProfile.count({
            where: {
                staffPositionTypeId: id,
            },
        });
    }
}
