import {
    PharmacyStatus,
    Prisma,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    PrescriptionListResult,
    PrescriptionMedicalRecordLink,
    PrescriptionPatientSummary,
    PrescriptionPharmacyQueueSummary,
    PrescriptionStaffSummary,
    PrescriptionView,
} from '../domain/prescription.entity';
import {
    CreatePrescriptionData,
    ListPrescriptionsFilters,
    PrescriptionRepository,
    VoidPrescriptionData,
} from '../domain/prescription.repository';

const prescriptionInclude = {
    patient: {
        select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            allergies: true,
        },
    },
    medicalRecord: {
        select: {
            id: true,
            diagnosis: true,
            isFinalized: true,
            createdAt: true,
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
    items: {
        orderBy: {
            createdAt: 'asc',
        },
    },
    pharmacyQueue: {
        orderBy: {
            requestedAt: 'asc',
        },
        include: {
            dispensingItems: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
    },
} satisfies Prisma.PrescriptionInclude;

type PrescriptionRecord = Prisma.PrescriptionGetPayload<{
    include: typeof prescriptionInclude;
}>;

function toPatientSummary(
    patient: PrescriptionRecord['patient'],
): PrescriptionPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffSummary(
    staff: PrescriptionRecord['staffProfile'],
): PrescriptionStaffSummary {
    return {
        ...staff,
        displayName: staff.specialization
            ? `${staff.employeeCode} - ${staff.specialization}`
            : staff.employeeCode,
    };
}

function toPharmacyQueueSummary(
    queue: PrescriptionRecord['pharmacyQueue'][number],
): PrescriptionPharmacyQueueSummary {
    return {
        id: queue.id,
        status: queue.status,
        requestedAt: queue.requestedAt,
        processedAt: queue.processedAt,
        notes: queue.notes,
        dispensingItems: queue.dispensingItems.map((item) => ({
            id: item.id,
            prescriptionItemId: item.prescriptionItemId,
            quantityToDispense: item.quantityToDispense,
            quantityDispensed: item.quantityDispensed,
            status: item.status,
            notes: item.notes,
        })),
    };
}

function toPrescriptionView(record: PrescriptionRecord): PrescriptionView {
    const firstQueue = record.pharmacyQueue[0] ?? null;

    return {
        id: record.id,
        patientId: record.patientId,
        medicalRecordId: record.medicalRecordId,
        appointmentId: record.appointmentId,
        staffProfileId: record.staffProfileId,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        notes: record.notes,
        isVoided: record.isVoided,
        voidedAt: record.voidedAt,
        voidReason: record.voidReason,
        voidedByUserId: record.voidedByUserId,
        status: record.isVoided ? 'VOIDED' : 'ACTIVE',
        pharmacyStatus: firstQueue?.status ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        patient: toPatientSummary(record.patient),
        medicalRecord: record.medicalRecord,
        appointment: record.appointment,
        staff: toStaffSummary(record.staffProfile),
        items: record.items.map((item) => ({
            id: item.id,
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            durationInstructions: item.durationInstructions,
            quantityPrescribed: item.quantityPrescribed,
            quantityDispensed: item.quantityDispensed,
            notes: item.notes,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        })),
        pharmacyQueue: record.pharmacyQueue.map(toPharmacyQueueSummary),
    };
}

export class PrescriptionPrismaRepository implements PrescriptionRepository {
    async createWithPharmacyQueue(
        data: CreatePrescriptionData,
    ): Promise<PrescriptionView> {
        const prescription = await prisma.prescription.create({
            data: {
                patientId: data.patientId,
                medicalRecordId: data.medicalRecordId,
                appointmentId: data.appointmentId ?? null,
                staffProfileId: data.staffProfileId,
                expiresAt: data.expiresAt ?? null,
                notes: data.notes ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
                items: {
                    create: data.items.map((item) => ({
                        medicationName: item.medicationName,
                        dosage: item.dosage,
                        frequency: item.frequency,
                        durationInstructions: item.durationInstructions ?? null,
                        quantityPrescribed: item.quantityPrescribed,
                        notes: item.notes ?? null,
                        createdBy: data.actorUserId,
                        updatedBy: data.actorUserId,
                    })),
                },
                pharmacyQueue: {
                    create: [
                        {
                            patientId: data.patientId,
                            createdBy: data.actorUserId,
                            updatedBy: data.actorUserId,
                        },
                    ],
                },
            },
            include: prescriptionInclude,
        });

        return toPrescriptionView(prescription);
    }

    async findById(id: string): Promise<PrescriptionView | null> {
        const prescription = await prisma.prescription.findUnique({
            where: { id },
            include: prescriptionInclude,
        });

        return prescription ? toPrescriptionView(prescription) : null;
    }

    async findMedicalRecordById(
        id: string,
    ): Promise<PrescriptionMedicalRecordLink | null> {
        return prisma.medicalRecord.findUnique({
            where: { id },
            select: {
                id: true,
                patientId: true,
                appointmentId: true,
                staffProfileId: true,
                diagnosis: true,
                isFinalized: true,
                createdAt: true,
            },
        });
    }

    async findPatientById(id: string): Promise<PrescriptionPatientSummary | null> {
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
                allergies: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findPatientByUserId(
        userId: string,
    ): Promise<PrescriptionPatientSummary | null> {
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
                allergies: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async list(
        filters: ListPrescriptionsFilters,
    ): Promise<PrescriptionListResult> {
        const where: Prisma.PrescriptionWhereInput = {};
        const skip = (filters.page - 1) * filters.limit;

        if (filters.patientId) {
            where.patientId = filters.patientId;
        }

        if (filters.isVoided !== undefined) {
            where.isVoided = filters.isVoided;
        }

        const [items, total] = await prisma.$transaction([
            prisma.prescription.findMany({
                where,
                include: prescriptionInclude,
                orderBy: [{ issuedAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.prescription.count({ where }),
        ]);

        return {
            items: items.map(toPrescriptionView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async hasDispensingActivity(id: string): Promise<boolean> {
        const activeStatuses = [
            PharmacyStatus.PARTIALLY_DISPENSED,
            PharmacyStatus.DISPENSED,
        ];

        const [queueCount, dispensingItemCount] = await prisma.$transaction([
            prisma.pharmacyQueue.count({
                where: {
                    prescriptionId: id,
                    status: {
                        in: activeStatuses,
                    },
                },
            }),
            prisma.pharmacyDispensingItem.count({
                where: {
                    prescriptionItem: {
                        is: {
                            prescriptionId: id,
                        },
                    },
                    OR: [
                        {
                            status: {
                                in: activeStatuses,
                            },
                        },
                        {
                            quantityDispensed: {
                                gt: 0,
                            },
                        },
                    ],
                },
            }),
        ]);

        return queueCount > 0 || dispensingItemCount > 0;
    }

    async voidPrescription(
        id: string,
        data: VoidPrescriptionData,
    ): Promise<PrescriptionView> {
        const prescription = await prisma.$transaction(async (tx) => {
            await tx.pharmacyQueue.updateMany({
                where: {
                    prescriptionId: id,
                    status: {
                        notIn: [
                            PharmacyStatus.PARTIALLY_DISPENSED,
                            PharmacyStatus.DISPENSED,
                        ],
                    },
                },
                data: {
                    status: PharmacyStatus.CANCELLED,
                    updatedBy: data.actorUserId,
                },
            });

            return tx.prescription.update({
                where: { id },
                data: {
                    isVoided: true,
                    voidedAt: data.voidedAt,
                    voidReason: data.reason,
                    voidedByUserId: data.actorUserId,
                    updatedBy: data.actorUserId,
                },
                include: prescriptionInclude,
            });
        });

        return toPrescriptionView(prescription);
    }
}
