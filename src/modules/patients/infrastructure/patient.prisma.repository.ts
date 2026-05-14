import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    decryptPersonalNumber,
} from '../domain/patient.crypto';
import {
    PatientEntity,
    PatientListResult,
    PatientTimelineItem,
} from '../domain/patient.entity';
import {
    CreatePatientData,
    ListPatientsFilters,
    PatientRepository,
    UpdatePatientData,
} from '../domain/patient.repository';

type PatientRecord = Prisma.PatientGetPayload<object>;

function toJsonInput(value: unknown) {
    return value as Prisma.InputJsonValue | undefined;
}

function toEntity(patient: PatientRecord): PatientEntity {
    return {
        id: patient.id,
        userId: patient.userId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodType: patient.bloodType,
        personalNumber: decryptPersonalNumber(patient.personalNumber),
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        emergencyPhone: patient.emergencyPhone,
        allergies: patient.allergies,
        medicalNotes: patient.medicalNotes,
        isActive: patient.isActive,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
    };
}

function buildPatientListWhere(filters: ListPatientsFilters) {
    const where: Prisma.PatientWhereInput = {};

    if (filters.gender) {
        where.gender = {
            equals: filters.gender,
            mode: 'insensitive',
        };
    }

    if (filters.bloodType) {
        where.bloodType = filters.bloodType;
    }

    if (filters.search) {
        where.OR = [
            {
                firstName: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                lastName: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                email: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
            {
                phone: {
                    contains: filters.search,
                    mode: 'insensitive',
                },
            },
        ];

        if (filters.personalNumberHash) {
            where.OR.push({
                personalNumberHash: filters.personalNumberHash,
            });
        }
    }

    return where;
}

export class PatientPrismaRepository implements PatientRepository {
    async create(data: CreatePatientData): Promise<PatientEntity> {
        const patient = await prisma.patient.create({
            data: {
                userId: data.userId ?? null,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email ?? null,
                phone: data.phone ?? null,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender ?? null,
                bloodType: data.bloodType,
                personalNumber: data.personalNumber ?? null,
                personalNumberHash: data.personalNumberHash ?? null,
                address: data.address ?? null,
                emergencyContact: data.emergencyContact ?? null,
                emergencyPhone: data.emergencyPhone ?? null,
                allergies: toJsonInput(data.allergies),
                medicalNotes: toJsonInput(data.medicalNotes),
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });

        return toEntity(patient);
    }

    async findById(id: string): Promise<PatientEntity | null> {
        const patient = await prisma.patient.findUnique({
            where: { id },
        });

        return patient ? toEntity(patient) : null;
    }

    async findByUserId(userId: string): Promise<PatientEntity | null> {
        const patient = await prisma.patient.findUnique({
            where: { userId },
        });

        return patient ? toEntity(patient) : null;
    }

    async findByEmail(email: string): Promise<PatientEntity | null> {
        const patient = await prisma.patient.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
        });

        return patient ? toEntity(patient) : null;
    }

    async findByPersonalNumberHash(hash: string): Promise<PatientEntity | null> {
        const patient = await prisma.patient.findUnique({
            where: { personalNumberHash: hash },
        });

        return patient ? toEntity(patient) : null;
    }

    async list(filters: ListPatientsFilters): Promise<PatientListResult> {
        const where = buildPatientListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.patient.findMany({
                where,
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                skip,
                take: filters.limit,
            }),
            prisma.patient.count({ where }),
        ]);

        return {
            items: items.map(toEntity),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async update(id: string, data: UpdatePatientData): Promise<PatientEntity> {
        const patient = await prisma.patient.update({
            where: { id },
            data: {
                userId: data.userId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                bloodType: data.bloodType,
                personalNumber: data.personalNumber,
                personalNumberHash: data.personalNumberHash,
                address: data.address,
                emergencyContact: data.emergencyContact,
                emergencyPhone: data.emergencyPhone,
                allergies: toJsonInput(data.allergies),
                medicalNotes: toJsonInput(data.medicalNotes),
                isActive: data.isActive,
                updatedBy: data.actorUserId,
            },
        });

        return toEntity(patient);
    }

    async getTimeline(patientId: string): Promise<PatientTimelineItem[]> {
        const [appointments, medicalRecords, prescriptions, labOrders, billings] =
            await prisma.$transaction([
                prisma.appointment.findMany({
                    where: { patientId },
                    select: {
                        id: true,
                        status: true,
                        appointmentType: true,
                        scheduledAt: true,
                        notes: true,
                        department: { select: { name: true } },
                        serviceCatalog: { select: { name: true } },
                    },
                }),
                prisma.medicalRecord.findMany({
                    where: { patientId },
                    select: {
                        id: true,
                        createdAt: true,
                        diagnosis: true,
                        chiefComplaint: true,
                        department: { select: { name: true } },
                    },
                }),
                prisma.prescription.findMany({
                    where: { patientId },
                    select: {
                        id: true,
                        issuedAt: true,
                        notes: true,
                        items: { select: { medicationName: true }, take: 3 },
                    },
                }),
                prisma.labOrder.findMany({
                    where: { patientId },
                    select: {
                        id: true,
                        status: true,
                        priority: true,
                        notes: true,
                        orderedAt: true,
                        department: { select: { name: true } },
                    },
                }),
                prisma.billing.findMany({
                    where: { patientId },
                    select: {
                        id: true,
                        billingNumber: true,
                        status: true,
                        totalAmount: true,
                        issuedAt: true,
                    },
                }),
            ]);

        const timeline: PatientTimelineItem[] = [
            ...appointments.map((appointment) => ({
                id: `appointment:${appointment.id}`,
                type: 'appointment' as const,
                occurredAt: appointment.scheduledAt,
                title: `${appointment.serviceCatalog.name} appointment`,
                status: appointment.status,
                summary: `${appointment.department.name} - ${appointment.appointmentType}`,
                reference: { entity: 'appointments', id: appointment.id },
            })),
            ...medicalRecords.map((record) => ({
                id: `medical_record:${record.id}`,
                type: 'medical_record' as const,
                occurredAt: record.createdAt,
                title: record.diagnosis || record.chiefComplaint || 'Medical record',
                status: null,
                summary: record.department.name,
                reference: { entity: 'medical_records', id: record.id },
            })),
            ...prescriptions.map((prescription) => ({
                id: `prescription:${prescription.id}`,
                type: 'prescription' as const,
                occurredAt: prescription.issuedAt,
                title: 'Prescription issued',
                status: null,
                summary:
                    prescription.items.map((item) => item.medicationName).join(', ') ||
                    prescription.notes,
                reference: { entity: 'prescriptions', id: prescription.id },
            })),
            ...labOrders.map((labOrder) => ({
                id: `lab_order:${labOrder.id}`,
                type: 'lab_order' as const,
                occurredAt: labOrder.orderedAt,
                title: 'Lab order',
                status: labOrder.status,
                summary: labOrder.priority
                    ? `${labOrder.department.name} - ${labOrder.priority}`
                    : labOrder.department.name,
                reference: { entity: 'lab_orders', id: labOrder.id },
            })),
            ...billings.map((billing) => ({
                id: `billing:${billing.id}`,
                type: 'billing' as const,
                occurredAt: billing.issuedAt,
                title: `Billing ${billing.billingNumber}`,
                status: billing.status,
                summary: `Total ${billing.totalAmount.toString()}`,
                reference: { entity: 'billings', id: billing.id },
            })),
        ];

        return timeline.sort(
            (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
        );
    }
}
