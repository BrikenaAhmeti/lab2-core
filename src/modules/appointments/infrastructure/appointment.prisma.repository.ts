import { AppointmentStatus, Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    AppointmentListResult,
    AppointmentPatientSummary,
    AppointmentServiceSummary,
    AppointmentStaffAvailabilitySummary,
    AppointmentView,
} from '../domain/appointment.entity';
import {
    AppointmentConflictFilters,
    AppointmentRepository,
    CreateAppointmentData,
    ListAppointmentsFilters,
    RescheduleAppointmentData,
    UpdateAppointmentStatusData,
} from '../domain/appointment.repository';

const appointmentInclude = {
    patient: {
        select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
        },
    },
    staffProfile: {
        select: {
            id: true,
            userId: true,
            employeeCode: true,
            specialization: true,
        },
    },
    serviceCatalog: {
        select: {
            id: true,
            name: true,
            defaultDurationMinutes: true,
            defaultPrice: true,
        },
    },
    department: {
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    },
};

type AppointmentRecord = Prisma.AppointmentGetPayload<{
    include: typeof appointmentInclude;
}>;

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function startOfUtcDay(date: Date) {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
}

function decimalToNumber(value: unknown) {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        return Number(value);
    }

    if (value && typeof value === 'object' && 'toNumber' in value) {
        return (value as { toNumber: () => number }).toNumber();
    }

    return Number(value);
}

function toPatientSummary(patient: AppointmentRecord['patient']): AppointmentPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffDisplayName(staff: NonNullable<AppointmentRecord['staffProfile']>) {
    return staff.specialization
        ? `${staff.employeeCode} - ${staff.specialization}`
        : staff.employeeCode;
}

function toAppointmentView(appointment: AppointmentRecord): AppointmentView {
    return {
        id: appointment.id,
        patientId: appointment.patientId,
        departmentId: appointment.departmentId,
        serviceCatalogId: appointment.serviceCatalogId,
        staffProfileId: appointment.staffProfileId,
        status: appointment.status,
        appointmentType: appointment.appointmentType,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
        durationMinutes: appointment.durationMinutes,
        basePrice: decimalToNumber(appointment.basePrice),
        notes: appointment.notes,
        checkedInAt: appointment.checkedInAt,
        completedAt: appointment.completedAt,
        cancelledAt: appointment.cancelledAt,
        cancellationNote: appointment.cancellationNote,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        patient: toPatientSummary(appointment.patient),
        staff: appointment.staffProfile
            ? {
                ...appointment.staffProfile,
                displayName: toStaffDisplayName(appointment.staffProfile),
            }
            : null,
        service: {
            id: appointment.serviceCatalog.id,
            name: appointment.serviceCatalog.name,
            defaultDurationMinutes: appointment.serviceCatalog.defaultDurationMinutes,
            defaultPrice: decimalToNumber(appointment.serviceCatalog.defaultPrice),
        },
        department: appointment.department,
    };
}

const DEFAULT_BOOKING_SERVICE_NAME = 'General Consultation';
const DEFAULT_BOOKING_SERVICE_DURATION_MINUTES = 30;

const activeAppointmentStatuses = [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PROGRESS,
];

const appointmentServiceSelect = {
    id: true,
    departmentId: true,
    name: true,
    defaultDurationMinutes: true,
    defaultPrice: true,
    isActive: true,
    department: {
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    },
} satisfies Prisma.ServiceCatalogSelect;

function toAppointmentServiceSummary(
    service: Prisma.ServiceCatalogGetPayload<{ select: typeof appointmentServiceSelect }>,
): AppointmentServiceSummary {
    return {
        ...service,
        defaultPrice: decimalToNumber(service.defaultPrice),
    };
}

function buildListWhere(filters: ListAppointmentsFilters) {
    const where: Prisma.AppointmentWhereInput = {};

    if (filters.staffId) {
        where.staffProfileId = filters.staffId;
    }

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (filters.departmentId) {
        where.departmentId = filters.departmentId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.hasNoFeedback) {
        where.feedback = {
            none: {},
        };
    }

    if (filters.date) {
        const start = startOfUtcDay(filters.date);
        where.scheduledAt = {
            gte: start,
            lt: addDays(start, 1),
        };
    } else if (filters.from || filters.to) {
        where.scheduledAt = {};

        if (filters.from) {
            where.scheduledAt.gte = filters.from;
        }

        if (filters.to) {
            where.scheduledAt.lte = filters.to;
        }
    }

    return where;
}

export class AppointmentPrismaRepository implements AppointmentRepository {
    async create(data: CreateAppointmentData): Promise<AppointmentView> {
        const appointment = await prisma.appointment.create({
            data: {
                patientId: data.patientId,
                departmentId: data.departmentId,
                serviceCatalogId: data.serviceCatalogId,
                staffProfileId: data.staffProfileId,
                status: data.status ?? AppointmentStatus.SCHEDULED,
                appointmentType: data.appointmentType,
                scheduledAt: data.scheduledAt,
                endAt: data.endAt,
                durationMinutes: data.durationMinutes,
                basePrice: data.basePrice,
                notes: data.notes ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
            include: appointmentInclude,
        });

        return toAppointmentView(appointment);
    }

    async findById(id: string): Promise<AppointmentView | null> {
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: appointmentInclude,
        });

        return appointment ? toAppointmentView(appointment) : null;
    }

    async findPatientById(id: string): Promise<AppointmentPatientSummary | null> {
        const patient = await prisma.patient.findFirst({
            where: {
                id,
                isActive: true,
            },
            select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findPatientByUserId(userId: string): Promise<AppointmentPatientSummary | null> {
        const patient = await prisma.patient.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findPatientByIdOrUserId(id: string): Promise<AppointmentPatientSummary | null> {
        const patient = await prisma.patient.findFirst({
            where: {
                isActive: true,
                OR: [
                    { id },
                    { userId: id },
                ],
            },
            select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findServiceById(id: string): Promise<AppointmentServiceSummary | null> {
        const service = await prisma.serviceCatalog.findUnique({
            where: { id },
            select: appointmentServiceSelect,
        });

        return service ? toAppointmentServiceSummary(service) : null;
    }

    async findDefaultServiceForStaff(staffProfileId: string): Promise<AppointmentServiceSummary | null> {
        const assignment = await prisma.staffDepartmentAssignment.findFirst({
            where: {
                staffProfileId,
                unassignedAt: null,
                department: {
                    isActive: true,
                },
            },
            orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
            select: {
                departmentId: true,
            },
        });

        if (!assignment) {
            return null;
        }

        const service = await prisma.serviceCatalog.findFirst({
            where: {
                departmentId: assignment.departmentId,
                isActive: true,
                department: {
                    isActive: true,
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: appointmentServiceSelect,
        });

        if (service) {
            return toAppointmentServiceSummary(service);
        }

        const defaultService = await prisma.serviceCatalog.upsert({
            where: {
                departmentId_name: {
                    departmentId: assignment.departmentId,
                    name: DEFAULT_BOOKING_SERVICE_NAME,
                },
            },
            update: {
                isActive: true,
                defaultDurationMinutes: DEFAULT_BOOKING_SERVICE_DURATION_MINUTES,
                defaultPrice: 0,
            },
            create: {
                departmentId: assignment.departmentId,
                name: DEFAULT_BOOKING_SERVICE_NAME,
                description: 'Default service used for mobile doctor booking.',
                defaultDurationMinutes: DEFAULT_BOOKING_SERVICE_DURATION_MINUTES,
                defaultPrice: 0,
                isActive: true,
                sortOrder: 999,
            },
            select: appointmentServiceSelect,
        });

        return toAppointmentServiceSummary(defaultService);
    }

    async findStaffById(id: string): Promise<AppointmentStaffAvailabilitySummary | null> {
        const staff = await prisma.staffProfile.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                employeeCode: true,
                specialization: true,
                employmentStatus: true,
                departmentAssignments: {
                    select: {
                        departmentId: true,
                        unassignedAt: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });

        return staff
            ? {
                id: staff.id,
                userId: staff.userId,
                employeeCode: staff.employeeCode,
                specialization: staff.specialization,
                employmentStatus: staff.employmentStatus,
                departments: staff.departmentAssignments,
            }
            : null;
    }

    async findStaffByIdOrUserId(id: string): Promise<AppointmentStaffAvailabilitySummary | null> {
        const staff = await prisma.staffProfile.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id },
                ],
            },
            select: {
                id: true,
                userId: true,
                employeeCode: true,
                specialization: true,
                employmentStatus: true,
                departmentAssignments: {
                    select: {
                        departmentId: true,
                        unassignedAt: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });

        return staff
            ? {
                id: staff.id,
                userId: staff.userId,
                employeeCode: staff.employeeCode,
                specialization: staff.specialization,
                employmentStatus: staff.employmentStatus,
                departments: staff.departmentAssignments,
            }
            : null;
    }

    async countConflictingAppointments(filters: AppointmentConflictFilters): Promise<number> {
        return prisma.appointment.count({
            where: {
                id: filters.excludeAppointmentId
                    ? { not: filters.excludeAppointmentId }
                    : undefined,
                staffProfileId: filters.staffProfileId,
                scheduledAt: {
                    lt: filters.endAt,
                },
                endAt: {
                    gt: filters.scheduledAt,
                },
                status: {
                    in: activeAppointmentStatuses,
                },
            },
        });
    }

    async listReminderCandidates(filters: {
        from: Date;
        to: Date;
    }): Promise<AppointmentView[]> {
        const appointments = await prisma.appointment.findMany({
            where: {
                scheduledAt: {
                    gte: filters.from,
                    lt: filters.to,
                },
                status: {
                    in: [
                        AppointmentStatus.SCHEDULED,
                        AppointmentStatus.CONFIRMED,
                    ],
                },
            },
            include: appointmentInclude,
            orderBy: { scheduledAt: 'asc' },
        });

        return appointments.map(toAppointmentView);
    }

    async list(filters: ListAppointmentsFilters): Promise<AppointmentListResult> {
        const where = buildListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.appointment.findMany({
                where,
                orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: filters.limit,
                include: appointmentInclude,
            }),
            prisma.appointment.count({ where }),
        ]);

        return {
            items: items.map(toAppointmentView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async listToday(now: Date): Promise<AppointmentView[]> {
        const start = startOfUtcDay(now);

        const appointments = await prisma.appointment.findMany({
            where: {
                scheduledAt: {
                    gte: start,
                    lt: addDays(start, 1),
                },
            },
            orderBy: { scheduledAt: 'asc' },
            include: appointmentInclude,
        });

        return appointments.map(toAppointmentView);
    }

    async reschedule(id: string, data: RescheduleAppointmentData): Promise<AppointmentView> {
        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                departmentId: data.departmentId,
                serviceCatalogId: data.serviceCatalogId,
                staffProfileId: data.staffProfileId,
                scheduledAt: data.scheduledAt,
                endAt: data.endAt,
                durationMinutes: data.durationMinutes,
                basePrice: data.basePrice,
                appointmentType: data.appointmentType,
                notes: data.notes,
                updatedBy: data.actorUserId,
            },
            include: appointmentInclude,
        });

        return toAppointmentView(appointment);
    }

    async updateStatus(id: string, data: UpdateAppointmentStatusData): Promise<AppointmentView> {
        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                status: data.status,
                checkedInAt: data.checkedInAt,
                completedAt: data.completedAt,
                cancelledAt: data.cancelledAt,
                cancellationNote: data.cancellationNote,
                updatedBy: data.actorUserId,
            },
            include: appointmentInclude,
        });

        return toAppointmentView(appointment);
    }
}
