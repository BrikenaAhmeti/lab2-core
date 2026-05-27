import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    MedicalRecordAmendmentView,
    MedicalRecordAppointmentLink,
    MedicalRecordListResult,
    MedicalRecordPatientSummary,
    MedicalRecordStaffSummary,
    MedicalRecordView,
} from '../domain/medical-record.entity';
import {
    AddMedicalRecordAmendmentData,
    CreateMedicalRecordData,
    ListMedicalRecordsFilters,
    MedicalRecordRepository,
    UpdateMedicalRecordData,
} from '../domain/medical-record.repository';

const medicalRecordInclude = {
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
    appointment: {
        select: {
            id: true,
            status: true,
            scheduledAt: true,
            endAt: true,
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
    department: {
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    },
    amendments: {
        orderBy: {
            createdAt: 'desc',
        },
    },
    prescriptions: {
        orderBy: {
            issuedAt: 'desc',
        },
        include: {
            items: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    },
    labOrders: {
        orderBy: {
            orderedAt: 'desc',
        },
        include: {
            items: {
                orderBy: {
                    createdAt: 'asc',
                },
                include: {
                    labTest: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.MedicalRecordInclude;

type MedicalRecordRecord = Prisma.MedicalRecordGetPayload<{
    include: typeof medicalRecordInclude;
}>;

function toJsonInput(value: unknown) {
    return value as Prisma.InputJsonValue | undefined;
}

function toPatientSummary(
    patient: MedicalRecordRecord['patient'],
): MedicalRecordPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffSummary(
    staff: MedicalRecordRecord['staffProfile'],
): MedicalRecordStaffSummary {
    return {
        ...staff,
        displayName: staff.specialization
            ? `${staff.employeeCode} - ${staff.specialization}`
            : staff.employeeCode,
    };
}

function toAmendmentView(
    amendment: MedicalRecordRecord['amendments'][number],
): MedicalRecordAmendmentView {
    return {
        id: amendment.id,
        medicalRecordId: amendment.medicalRecordId,
        amendedByUserId: amendment.amendedByUserId,
        reason: amendment.reason,
        previousSnapshot: amendment.previousSnapshot,
        createdAt: amendment.createdAt,
        updatedAt: amendment.updatedAt,
    };
}

function toMedicalRecordView(record: MedicalRecordRecord): MedicalRecordView {
    return {
        id: record.id,
        patientId: record.patientId,
        appointmentId: record.appointmentId,
        staffProfileId: record.staffProfileId,
        departmentId: record.departmentId,
        chiefComplaint: record.chiefComplaint,
        vitals: record.vitals,
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan,
        notes: record.notes,
        followUpInstructions: record.followUpInstructions,
        isFinalized: record.isFinalized,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        patient: toPatientSummary(record.patient),
        appointment: record.appointment,
        staff: toStaffSummary(record.staffProfile),
        department: record.department,
        amendments: record.amendments.map(toAmendmentView),
        prescriptions: record.prescriptions.map((prescription) => ({
            id: prescription.id,
            issuedAt: prescription.issuedAt,
            expiresAt: prescription.expiresAt,
            notes: prescription.notes,
            items: prescription.items.map((item) => ({
                id: item.id,
                medicationName: item.medicationName,
                dosage: item.dosage,
                frequency: item.frequency,
                durationInstructions: item.durationInstructions,
                quantityPrescribed: item.quantityPrescribed,
                quantityDispensed: item.quantityDispensed,
                notes: item.notes,
            })),
        })),
        labOrders: record.labOrders.map((labOrder) => ({
            id: labOrder.id,
            status: labOrder.status,
            priority: labOrder.priority,
            notes: labOrder.notes,
            orderedAt: labOrder.orderedAt,
            completedAt: labOrder.completedAt,
            reviewedAt: labOrder.reviewedAt,
            items: labOrder.items.map((item) => ({
                id: item.id,
                resultValue: item.resultValue,
                resultUnit: item.resultUnit,
                resultNotes: item.resultNotes,
                resultStatus: item.resultStatus,
                isCritical: item.isCritical,
                completedAt: item.completedAt,
                labTest: item.labTest,
            })),
        })),
    };
}

function toPatchInput(data: UpdateMedicalRecordData) {
    return {
        chiefComplaint: data.chiefComplaint,
        vitals: data.vitals === undefined ? undefined : toJsonInput(data.vitals),
        diagnosis: data.diagnosis,
        treatmentPlan: data.treatmentPlan,
        notes: data.notes,
        followUpInstructions: data.followUpInstructions,
    };
}

export class MedicalRecordPrismaRepository implements MedicalRecordRepository {
    async create(data: CreateMedicalRecordData): Promise<MedicalRecordView> {
        const record = await prisma.medicalRecord.create({
            data: {
                patientId: data.patientId,
                appointmentId: data.appointmentId,
                staffProfileId: data.staffProfileId,
                departmentId: data.departmentId,
                chiefComplaint: data.chiefComplaint ?? null,
                vitals: data.vitals === undefined ? undefined : toJsonInput(data.vitals),
                diagnosis: data.diagnosis ?? null,
                treatmentPlan: data.treatmentPlan ?? null,
                notes: data.notes ?? null,
                followUpInstructions: data.followUpInstructions ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
            include: medicalRecordInclude,
        });

        return toMedicalRecordView(record);
    }

    async findById(id: string): Promise<MedicalRecordView | null> {
        const record = await prisma.medicalRecord.findUnique({
            where: { id },
            include: medicalRecordInclude,
        });

        return record ? toMedicalRecordView(record) : null;
    }

    async findPatientById(id: string): Promise<MedicalRecordPatientSummary | null> {
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

    async findPatientByUserId(
        userId: string,
    ): Promise<MedicalRecordPatientSummary | null> {
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

    async findAppointmentById(
        id: string,
    ): Promise<MedicalRecordAppointmentLink | null> {
        return prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true,
                patientId: true,
                staffProfileId: true,
                departmentId: true,
                status: true,
                scheduledAt: true,
                endAt: true,
            },
        });
    }

    async list(
        filters: ListMedicalRecordsFilters,
    ): Promise<MedicalRecordListResult> {
        const where: Prisma.MedicalRecordWhereInput = {};
        const skip = (filters.page - 1) * filters.limit;

        if (filters.patientId) {
            where.patientId = filters.patientId;
        }

        if (filters.isFinalized !== undefined) {
            where.isFinalized = filters.isFinalized;
        }

        const [items, total] = await prisma.$transaction([
            prisma.medicalRecord.findMany({
                where,
                include: medicalRecordInclude,
                orderBy: [{ createdAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.medicalRecord.count({ where }),
        ]);

        return {
            items: items.map(toMedicalRecordView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async updateDraft(
        id: string,
        data: UpdateMedicalRecordData,
    ): Promise<MedicalRecordView> {
        const record = await prisma.medicalRecord.update({
            where: { id },
            data: {
                ...toPatchInput(data),
                updatedBy: data.actorUserId,
            },
            include: medicalRecordInclude,
        });

        return toMedicalRecordView(record);
    }

    async finalize(id: string, actorUserId?: string): Promise<MedicalRecordView> {
        const record = await prisma.medicalRecord.update({
            where: { id },
            data: {
                isFinalized: true,
                updatedBy: actorUserId,
            },
            include: medicalRecordInclude,
        });

        return toMedicalRecordView(record);
    }

    async createAmendment(
        data: AddMedicalRecordAmendmentData,
    ): Promise<MedicalRecordAmendmentView> {
        const amendment = await prisma.medicalRecordAmendment.create({
            data: {
                medicalRecordId: data.medicalRecordId,
                amendedByUserId: data.amendedByUserId,
                reason: data.reason,
                previousSnapshot: toJsonInput(data.previousSnapshot),
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });

        return toAmendmentView(amendment);
    }
}
