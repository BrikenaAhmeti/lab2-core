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

const staffPositionTypeInclude = {
    applicableDepartments: {
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                },
            },
        },
        orderBy: {
            department: {
                name: 'asc',
            },
        },
    },
} satisfies Prisma.StaffPositionTypeInclude;

type StaffPositionTypeRecord = Prisma.StaffPositionTypeGetPayload<{
    include: typeof staffPositionTypeInclude;
}>;

function applicableDepartmentIds(positionType: StaffPositionTypeRecord) {
    if (positionType.appliesToAllDepartments) {
        return null;
    }

    return positionType.applicableDepartments.map(
        (assignment) => assignment.departmentId,
    );
}

function applicableDepartmentSummaries(
    positionType: StaffPositionTypeRecord,
): StaffPositionTypeDepartmentSummary[] {
    if (positionType.appliesToAllDepartments) {
        return [];
    }

    return positionType.applicableDepartments.map((assignment) => assignment.department);
}

function toEntity(positionType: StaffPositionTypeRecord): StaffPositionTypeEntity {
    return {
        id: positionType.id,
        name: positionType.name,
        description: positionType.description,
        defaultRoleKey: positionType.defaultRoleKey,
        applicableDepartmentIds: applicableDepartmentIds(positionType),
        isActive: positionType.isActive,
        createdAt: positionType.createdAt,
        updatedAt: positionType.updatedAt,
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
                appliesToAllDepartments: data.applicableDepartmentIds == null,
                applicableDepartments: data.applicableDepartmentIds?.length
                    ? {
                        create: data.applicableDepartmentIds.map((departmentId) => ({
                            departmentId,
                        })),
                    }
                    : undefined,
                isActive: data.isActive,
            },
            include: staffPositionTypeInclude,
        });

        return toEntity(positionType);
    }

    async findById(id: string): Promise<StaffPositionTypeView | null> {
        const positionType = await prisma.staffPositionType.findUnique({
            where: { id },
            include: staffPositionTypeInclude,
        });

        if (!positionType) {
            return null;
        }

        return toView(toEntity(positionType), applicableDepartmentSummaries(positionType));
    }

    async findByName(name: string): Promise<StaffPositionTypeEntity | null> {
        const positionType = await prisma.staffPositionType.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
            include: staffPositionTypeInclude,
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
            include: staffPositionTypeInclude,
        });

        return {
            items: positionTypes.map((positionType) =>
                toView(toEntity(positionType), applicableDepartmentSummaries(positionType)),
            ),
        };
    }

    async update(
        id: string,
        data: UpdateStaffPositionTypeData,
    ): Promise<StaffPositionTypeEntity> {
        const updateData: Prisma.StaffPositionTypeUpdateInput = {
            name: data.name,
            description: data.description,
            defaultRoleKey: data.defaultRoleKey,
            isActive: data.isActive,
        };

        if (data.applicableDepartmentIds !== undefined) {
            updateData.appliesToAllDepartments = data.applicableDepartmentIds === null;
            updateData.applicableDepartments = {
                deleteMany: {},
                ...(data.applicableDepartmentIds?.length
                    ? {
                        create: data.applicableDepartmentIds.map((departmentId) => ({
                            departmentId,
                        })),
                    }
                    : {}),
            };
        }

        const positionType = await prisma.staffPositionType.update({
            where: { id },
            data: updateData,
            include: staffPositionTypeInclude,
        });

        return toEntity(positionType);
    }

    async deactivate(id: string): Promise<StaffPositionTypeEntity> {
        const positionType = await prisma.staffPositionType.update({
            where: { id },
            data: {
                isActive: false,
            },
            include: staffPositionTypeInclude,
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
