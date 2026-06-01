import { EmploymentStatus, Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    StaffDepartmentAssignmentView,
    StaffDepartmentSummary,
    StaffPositionTypeSummary,
    StaffProfileEntity,
    StaffProfileListResult,
    StaffProfileView,
} from '../domain/staff.entity';
import {
    CreateStaffProfileData,
    ListStaffProfilesFilters,
    StaffDepartmentAssignmentData,
    StaffRepository,
    UpdateStaffProfileData,
} from '../domain/staff.repository';

const staffProfileInclude = {
    staffPositionType: {
        select: {
            id: true,
            name: true,
            defaultRoleKey: true,
            isActive: true,
        },
    },
    departmentAssignments: {
        where: {
            unassignedAt: null,
        },
        orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }],
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                },
            },
        },
    },
};

type StaffProfileRecord = Prisma.StaffProfileGetPayload<{
    include: typeof staffProfileInclude;
}>;

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

function toEntity(staffProfile: StaffProfileRecord): StaffProfileEntity {
    return {
        id: staffProfile.id,
        userId: staffProfile.userId,
        staffPositionTypeId: staffProfile.staffPositionTypeId,
        employeeCode: staffProfile.employeeCode,
        specialization: staffProfile.specialization,
        licenseNumber: staffProfile.licenseNumber,
        employmentStatus: staffProfile.employmentStatus,
        hireDate: staffProfile.hireDate,
        terminationDate: staffProfile.terminationDate,
        bio: staffProfile.bio,
        isPublicProfile: staffProfile.isPublicProfile,
        createdAt: staffProfile.createdAt,
        updatedAt: staffProfile.updatedAt,
    };
}

function toDepartmentAssignmentView(
    assignment: StaffProfileRecord['departmentAssignments'][number],
): StaffDepartmentAssignmentView {
    return {
        id: assignment.id,
        departmentId: assignment.departmentId,
        isPrimary: assignment.isPrimary,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        department: assignment.department,
    };
}

function toView(staffProfile: StaffProfileRecord): StaffProfileView {
    return {
        ...toEntity(staffProfile),
        user: {
            id: staffProfile.userId,
        },
        positionType: staffProfile.staffPositionType,
        departments: staffProfile.departmentAssignments.map(toDepartmentAssignmentView),
    };
}

async function findStaffProfileById(
    client: PrismaClientOrTransaction,
    id: string,
) {
    return client.staffProfile.findUnique({
        where: { id },
        include: staffProfileInclude,
    });
}

function buildStaffListWhere(filters: ListStaffProfilesFilters) {
    const where: Prisma.StaffProfileWhereInput = {};

    if (filters.departmentId) {
        where.departmentAssignments = {
            some: {
                departmentId: filters.departmentId,
                unassignedAt: null,
            },
        };
    }

    if (filters.positionTypeId) {
        where.staffPositionTypeId = filters.positionTypeId;
    }

    if (filters.status) {
        where.employmentStatus = filters.status;
    }

    if (filters.roleKey) {
        where.staffPositionType = {
            defaultRoleKey: filters.roleKey,
            isActive: true,
        };
    }

    if (filters.publicOnly) {
        where.isPublicProfile = true;
        where.employmentStatus = 'ACTIVE';
    }

    if (filters.search) {
        where.OR = [
            {
                employeeCode: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                specialization: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                licenseNumber: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                bio: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                staffPositionType: {
                    name: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
            },
            {
                departmentAssignments: {
                    some: {
                        unassignedAt: null,
                        department: {
                            name: {
                                contains: filters.search,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            },
        ];
    }

    return where;
}

export class StaffPrismaRepository implements StaffRepository {
    async createWithDepartments(
        data: CreateStaffProfileData,
    ): Promise<StaffProfileView> {
        return prisma.$transaction(async (tx) => {
            const staffProfile = await tx.staffProfile.create({
                data: {
                    userId: data.userId,
                    staffPositionTypeId: data.staffPositionTypeId,
                    employeeCode: data.employeeCode,
                    specialization: data.specialization ?? null,
                    licenseNumber: data.licenseNumber ?? null,
                    employmentStatus: data.employmentStatus,
                    hireDate: data.hireDate,
                    bio: data.bio ?? null,
                    isPublicProfile: data.isPublicProfile,
                    createdBy: data.actorUserId,
                    updatedBy: data.actorUserId,
                },
            });

            await tx.staffDepartmentAssignment.createMany({
                data: data.departments.map((department) => ({
                    staffProfileId: staffProfile.id,
                    departmentId: department.departmentId,
                    isPrimary: department.isPrimary ?? false,
                    createdBy: data.actorUserId,
                    updatedBy: data.actorUserId,
                })),
            });

            const createdStaffProfile = await findStaffProfileById(tx, staffProfile.id);

            if (!createdStaffProfile) {
                throw new Error('Staff profile was not found after creation');
            }

            return toView(createdStaffProfile);
        });
    }

    async findById(id: string): Promise<StaffProfileView | null> {
        const staffProfile = await findStaffProfileById(prisma, id);

        return staffProfile ? toView(staffProfile) : null;
    }

    async findByUserId(userId: string): Promise<StaffProfileEntity | null> {
        const staffProfile = await prisma.staffProfile.findUnique({
            where: { userId },
            include: staffProfileInclude,
        });

        return staffProfile ? toEntity(staffProfile) : null;
    }

    async findByEmployeeCode(
        employeeCode: string,
    ): Promise<StaffProfileEntity | null> {
        const staffProfile = await prisma.staffProfile.findFirst({
            where: {
                employeeCode: {
                    equals: employeeCode,
                    mode: 'insensitive',
                },
            },
            include: staffProfileInclude,
        });

        return staffProfile ? toEntity(staffProfile) : null;
    }

    async list(
        filters: ListStaffProfilesFilters,
    ): Promise<StaffProfileListResult> {
        const where = buildStaffListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.staffProfile.findMany({
                where,
                orderBy: [{ employeeCode: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: filters.limit,
                include: staffProfileInclude,
            }),
            prisma.staffProfile.count({ where }),
        ]);

        return {
            items: items.map(toView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async update(
        id: string,
        data: UpdateStaffProfileData,
    ): Promise<StaffProfileView> {
        const staffProfile = await prisma.staffProfile.update({
            where: { id },
            data: {
                staffPositionTypeId: data.staffPositionTypeId,
                employeeCode: data.employeeCode,
                specialization: data.specialization,
                licenseNumber: data.licenseNumber,
                employmentStatus: data.employmentStatus,
                hireDate: data.hireDate,
                terminationDate: data.terminationDate,
                bio: data.bio,
                isPublicProfile: data.isPublicProfile,
                updatedBy: data.actorUserId,
            },
            include: staffProfileInclude,
        });

        return toView(staffProfile);
    }

    async deactivate(
        id: string,
        actorUserId?: string,
    ): Promise<StaffProfileView> {
        const staffProfile = await prisma.staffProfile.update({
            where: { id },
            data: {
                employmentStatus: 'INACTIVE',
                terminationDate: new Date(),
                updatedBy: actorUserId,
            },
            include: staffProfileInclude,
        });

        return toView(staffProfile);
    }

    async addDepartment(
        staffProfileId: string,
        data: StaffDepartmentAssignmentData & { actorUserId?: string },
    ): Promise<StaffProfileView> {
        return prisma.$transaction(async (tx) => {
            if (data.isPrimary) {
                await tx.staffDepartmentAssignment.updateMany({
                    where: {
                        staffProfileId,
                        unassignedAt: null,
                    },
                    data: {
                        isPrimary: false,
                        updatedBy: data.actorUserId,
                    },
                });
            }

            await tx.staffDepartmentAssignment.upsert({
                where: {
                    staffProfileId_departmentId: {
                        staffProfileId,
                        departmentId: data.departmentId,
                    },
                },
                create: {
                    staffProfileId,
                    departmentId: data.departmentId,
                    isPrimary: data.isPrimary ?? false,
                    createdBy: data.actorUserId,
                    updatedBy: data.actorUserId,
                },
                update: {
                    isPrimary: data.isPrimary,
                    assignedAt: new Date(),
                    unassignedAt: null,
                    updatedBy: data.actorUserId,
                },
            });

            const staffProfile = await findStaffProfileById(tx, staffProfileId);

            if (!staffProfile) {
                throw new Error('Staff profile was not found after department update');
            }

            return toView(staffProfile);
        });
    }

    async removeDepartment(
        staffProfileId: string,
        departmentId: string,
        actorUserId?: string,
    ): Promise<StaffProfileView> {
        return prisma.$transaction(async (tx) => {
            await tx.staffDepartmentAssignment.update({
                where: {
                    staffProfileId_departmentId: {
                        staffProfileId,
                        departmentId,
                    },
                },
                data: {
                    isPrimary: false,
                    unassignedAt: new Date(),
                    updatedBy: actorUserId,
                },
            });

            const firstActiveAssignment = await tx.staffDepartmentAssignment.findFirst({
                where: {
                    staffProfileId,
                    unassignedAt: null,
                },
                orderBy: {
                    assignedAt: 'asc',
                },
            });

            if (firstActiveAssignment) {
                await tx.staffDepartmentAssignment.update({
                    where: { id: firstActiveAssignment.id },
                    data: {
                        isPrimary: true,
                        updatedBy: actorUserId,
                    },
                });
            }

            const staffProfile = await findStaffProfileById(tx, staffProfileId);

            if (!staffProfile) {
                throw new Error('Staff profile was not found after department removal');
            }

            return toView(staffProfile);
        });
    }

    async countFutureAppointments(id: string, now: Date): Promise<number> {
        return prisma.appointment.count({
            where: {
                staffProfileId: id,
                scheduledAt: {
                    gt: now,
                },
                status: {
                    notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
                },
            },
        });
    }

    async findPositionTypeById(
        id: string,
    ): Promise<StaffPositionTypeSummary | null> {
        return prisma.staffPositionType.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                defaultRoleKey: true,
                isActive: true,
            },
        });
    }

    async findDepartmentsByIds(ids: string[]): Promise<StaffDepartmentSummary[]> {
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
                ): department is StaffDepartmentSummary => Boolean(department),
            );
    }
}
