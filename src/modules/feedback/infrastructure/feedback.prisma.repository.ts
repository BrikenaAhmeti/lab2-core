import { AppointmentStatus, Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    FeedbackAppointmentSummary,
    FeedbackListResult,
    FeedbackPatientSummary,
    FeedbackStaffSummary,
    FeedbackStatus,
    FeedbackView,
} from '../domain/feedback.entity';
import {
    CreateFeedbackData,
    FeedbackRepository,
    ListFeedbackFilters,
    ListPatientFeedbackFilters,
    UpdateFeedbackStatusData,
} from '../domain/feedback.repository';

const patientSelect = {
    id: true,
    userId: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
};

const staffSelect = {
    id: true,
    userId: true,
    employeeCode: true,
    specialization: true,
};

const appointmentSelect = {
    id: true,
    patientId: true,
    departmentId: true,
    staffProfileId: true,
    status: true,
    scheduledAt: true,
    endAt: true,
    completedAt: true,
    serviceCatalog: {
        select: {
            id: true,
            name: true,
        },
    },
    staffProfile: {
        select: staffSelect,
    },
    department: {
        select: {
            id: true,
            name: true,
        },
    },
};

const feedbackInclude = {
    patient: {
        select: patientSelect,
    },
    appointment: {
        select: appointmentSelect,
    },
};

type PatientRecord = Prisma.PatientGetPayload<{
    select: typeof patientSelect;
}>;

type StaffRecord = Prisma.StaffProfileGetPayload<{
    select: typeof staffSelect;
}>;

type AppointmentRecord = Prisma.AppointmentGetPayload<{
    select: typeof appointmentSelect;
}>;

type FeedbackRecord = Prisma.FeedbackGetPayload<{
    include: typeof feedbackInclude;
}>;

function toPatientSummary(patient: PatientRecord): FeedbackPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffDisplayName(staff: StaffRecord) {
    return staff.specialization
        ? `${staff.employeeCode} - ${staff.specialization}`
        : staff.employeeCode;
}

function toStaffSummary(staff: StaffRecord): FeedbackStaffSummary {
    return {
        ...staff,
        displayName: toStaffDisplayName(staff),
    };
}

function toAppointmentSummary(
    appointment: AppointmentRecord,
): FeedbackAppointmentSummary {
    return {
        id: appointment.id,
        patientId: appointment.patientId,
        departmentId: appointment.departmentId,
        staffProfileId: appointment.staffProfileId,
        status: appointment.status,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
        completedAt: appointment.completedAt,
        service: appointment.serviceCatalog,
        staff: appointment.staffProfile
            ? toStaffSummary(appointment.staffProfile)
            : null,
        department: appointment.department,
    };
}

function toFeedbackStatus(value: string): FeedbackStatus {
    if (value === 'published' || value === 'hidden') {
        return value;
    }

    return 'pending';
}

function toFeedbackView(feedback: FeedbackRecord): FeedbackView {
    return {
        id: feedback.id,
        patientId: feedback.patientId,
        appointmentId: feedback.appointmentId,
        rating: feedback.rating,
        comment: feedback.comment,
        status: toFeedbackStatus(feedback.status),
        isAnonymous: feedback.isAnonymous,
        submittedAt: feedback.submittedAt,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        patient: toPatientSummary(feedback.patient),
        appointment: feedback.appointment
            ? toAppointmentSummary(feedback.appointment)
            : null,
    };
}

function buildListWhere(filters: ListFeedbackFilters) {
    const where: Prisma.FeedbackWhereInput = {};
    const appointmentWhere: Prisma.AppointmentWhereInput = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.staffProfileId) {
        appointmentWhere.staffProfileId = filters.staffProfileId;
    }

    if (filters.departmentId) {
        appointmentWhere.departmentId = filters.departmentId;
    }

    if (Object.keys(appointmentWhere).length > 0) {
        where.appointment = {
            is: appointmentWhere,
        };
    }

    return where;
}

export class FeedbackPrismaRepository implements FeedbackRepository {
    async findPatientByUserId(
        userId: string,
    ): Promise<FeedbackPatientSummary | null> {
        const patient = await prisma.patient.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: patientSelect,
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findStaffByUserId(userId: string): Promise<FeedbackStaffSummary | null> {
        const staff = await prisma.staffProfile.findFirst({
            where: {
                userId,
                employmentStatus: 'ACTIVE',
            },
            select: staffSelect,
        });

        return staff ? toStaffSummary(staff) : null;
    }

    async findCompletedAppointmentForFeedback(
        appointmentId: string,
    ): Promise<FeedbackAppointmentSummary | null> {
        const appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                status: AppointmentStatus.COMPLETED,
            },
            select: appointmentSelect,
        });

        return appointment ? toAppointmentSummary(appointment) : null;
    }

    async findFeedbackByAppointmentId(
        appointmentId: string,
    ): Promise<FeedbackView | null> {
        const feedback = await prisma.feedback.findFirst({
            where: { appointmentId },
            include: feedbackInclude,
        });

        return feedback ? toFeedbackView(feedback) : null;
    }

    async findFeedbackById(id: string): Promise<FeedbackView | null> {
        const feedback = await prisma.feedback.findUnique({
            where: { id },
            include: feedbackInclude,
        });

        return feedback ? toFeedbackView(feedback) : null;
    }

    async createFeedback(data: CreateFeedbackData): Promise<FeedbackView> {
        const feedback = await prisma.feedback.create({
            data: {
                patientId: data.patientId,
                appointmentId: data.appointmentId,
                rating: data.rating,
                comment: data.comment ?? null,
                status: data.status,
                isAnonymous: data.isAnonymous,
                submittedAt: data.submittedAt,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
            include: feedbackInclude,
        });

        return toFeedbackView(feedback);
    }

    async listFeedback(
        filters: ListFeedbackFilters,
    ): Promise<FeedbackListResult> {
        const where = buildListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.feedback.findMany({
                where,
                include: feedbackInclude,
                orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.feedback.count({ where }),
        ]);

        return {
            items: items.map(toFeedbackView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async listPatientFeedback(
        filters: ListPatientFeedbackFilters,
    ): Promise<FeedbackListResult> {
        const where: Prisma.FeedbackWhereInput = {
            patientId: filters.patientId,
        };
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.feedback.findMany({
                where,
                include: feedbackInclude,
                orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.feedback.count({ where }),
        ]);

        return {
            items: items.map(toFeedbackView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async updateFeedbackStatus(
        id: string,
        data: UpdateFeedbackStatusData,
    ): Promise<FeedbackView> {
        const feedback = await prisma.feedback.update({
            where: { id },
            data: {
                status: data.status,
                updatedBy: data.actorUserId,
            },
            include: feedbackInclude,
        });

        return toFeedbackView(feedback);
    }
}
