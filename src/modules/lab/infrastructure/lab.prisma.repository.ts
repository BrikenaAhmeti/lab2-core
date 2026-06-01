import {
    LabOrderStatus,
    Prisma,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    deriveLabResultFlag,
} from '../domain/lab-result-evaluator';
import {
    LabOrderAppointmentLink,
    LabOrderListResult,
    LabOrderMedicalRecordLink,
    LabOrderPatientLink,
    LabOrderPriority,
    LabOrderView,
    LabTestEntity,
    LabTestListResult,
} from '../domain/lab.entity';
import {
    CreateLabOrderData,
    CreateLabTestData,
    EnterLabOrderResultsData,
    LabRepository,
    ListLabOrdersFilters,
    ListLabTestsFilters,
    ReviewLabOrderData,
    UpdateLabOrderStatusData,
    UpdateLabTestData,
} from '../domain/lab.repository';

const labOrderInclude = {
    patient: {
        select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
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
    medicalRecord: {
        select: {
            id: true,
            diagnosis: true,
            isFinalized: true,
            createdAt: true,
        },
    },
    orderedByStaff: {
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
                    description: true,
                    category: true,
                    sampleType: true,
                    defaultPrice: true,
                    referenceRange: true,
                    isActive: true,
                },
            },
        },
    },
} satisfies Prisma.LabOrderInclude;

type LabOrderRecord = Prisma.LabOrderGetPayload<{
    include: typeof labOrderInclude;
}>;

function toPatientSummary(
    patient: LabOrderRecord['patient'],
): LabOrderPatientLink {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toStaffSummary(staff: LabOrderRecord['orderedByStaff']) {
    return {
        ...staff,
        displayName: staff.specialization
            ? `${staff.employeeCode} - ${staff.specialization}`
            : staff.employeeCode,
    };
}

function toLabTestEntity(record: Prisma.LabTestGetPayload<object>): LabTestEntity {
    return {
        id: record.id,
        code: record.code,
        name: record.name,
        description: record.description,
        category: record.category,
        sampleType: record.sampleType,
        defaultPrice: record.defaultPrice,
        referenceRange: record.referenceRange,
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

function toLabOrderView(record: LabOrderRecord): LabOrderView {
    return {
        id: record.id,
        patientId: record.patientId,
        appointmentId: record.appointmentId,
        medicalRecordId: record.medicalRecordId,
        orderedByStaffId: record.orderedByStaffId,
        departmentId: record.departmentId,
        status: record.status,
        priority: record.priority as LabOrderPriority | null,
        notes: record.notes,
        orderedAt: record.orderedAt,
        collectedAt: record.collectedAt,
        completedAt: record.completedAt,
        reviewedAt: record.reviewedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        patient: toPatientSummary(record.patient),
        appointment: record.appointment,
        medicalRecord: record.medicalRecord,
        orderedByStaff: toStaffSummary(record.orderedByStaff),
        department: record.department,
        items: record.items.map((item) => ({
            id: item.id,
            labTestId: item.labTestId,
            resultValue: item.resultValue,
            resultUnit: item.resultUnit,
            resultNotes: item.resultNotes,
            resultStatus: item.resultStatus,
            isCritical: item.isCritical,
            completedAt: item.completedAt,
            flag: deriveLabResultFlag({
                resultValue: item.resultValue,
                resultStatus: item.resultStatus,
                isCritical: item.isCritical,
                referenceRange: item.labTest.referenceRange,
            }),
            labTest: item.labTest,
        })),
    };
}

export class LabPrismaRepository implements LabRepository {
    async createLabTest(data: CreateLabTestData): Promise<LabTestEntity> {
        const labTest = await prisma.labTest.create({
            data: {
                code: data.code,
                name: data.name,
                description: data.description ?? null,
                category: data.category ?? null,
                sampleType: data.sampleType ?? null,
                defaultPrice: data.defaultPrice ?? null,
                referenceRange: data.referenceRange ?? null,
                isActive: data.isActive,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });

        return toLabTestEntity(labTest);
    }

    async findLabTestById(id: string): Promise<LabTestEntity | null> {
        const labTest = await prisma.labTest.findUnique({
            where: { id },
        });

        return labTest ? toLabTestEntity(labTest) : null;
    }

    async findLabTestByCode(code: string): Promise<LabTestEntity | null> {
        const labTest = await prisma.labTest.findUnique({
            where: { code },
        });

        return labTest ? toLabTestEntity(labTest) : null;
    }

    async findLabTestsByIds(ids: string[]): Promise<LabTestEntity[]> {
        const labTests = await prisma.labTest.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        return labTests.map(toLabTestEntity);
    }

    async listLabTests(filters: ListLabTestsFilters): Promise<LabTestListResult> {
        const where: Prisma.LabTestWhereInput = {};

        if (filters.category) {
            where.category = {
                equals: filters.category,
                mode: 'insensitive',
            };
        }

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
                {
                    code: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
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
            prisma.labTest.findMany({
                where,
                orderBy: [{ category: 'asc' }, { name: 'asc' }],
                skip,
                take: filters.limit,
            }),
            prisma.labTest.count({ where }),
        ]);

        return {
            items: items.map(toLabTestEntity),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async updateLabTest(id: string, data: UpdateLabTestData): Promise<LabTestEntity> {
        const labTest = await prisma.labTest.update({
            where: { id },
            data: {
                code: data.code,
                name: data.name,
                description: data.description,
                category: data.category,
                sampleType: data.sampleType,
                defaultPrice: data.defaultPrice,
                referenceRange: data.referenceRange,
                isActive: data.isActive,
                updatedBy: data.actorUserId,
            },
        });

        return toLabTestEntity(labTest);
    }

    async deactivateLabTest(id: string, actorUserId?: string): Promise<LabTestEntity> {
        const labTest = await prisma.labTest.update({
            where: { id },
            data: {
                isActive: false,
                updatedBy: actorUserId,
            },
        });

        return toLabTestEntity(labTest);
    }

    async findPatientById(id: string): Promise<LabOrderPatientLink | null> {
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
                dateOfBirth: true,
                gender: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findPatientByUserId(userId: string): Promise<LabOrderPatientLink | null> {
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
                dateOfBirth: true,
                gender: true,
            },
        });

        return patient ? toPatientSummary(patient) : null;
    }

    async findAppointmentById(id: string): Promise<LabOrderAppointmentLink | null> {
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

    async findMedicalRecordById(
        id: string,
    ): Promise<LabOrderMedicalRecordLink | null> {
        return prisma.medicalRecord.findUnique({
            where: { id },
            select: {
                id: true,
                patientId: true,
                appointmentId: true,
                staffProfileId: true,
                departmentId: true,
                diagnosis: true,
                isFinalized: true,
                createdAt: true,
            },
        });
    }

    async createLabOrder(data: CreateLabOrderData): Promise<LabOrderView> {
        const order = await prisma.labOrder.create({
            data: {
                patientId: data.patientId,
                appointmentId: data.appointmentId ?? null,
                medicalRecordId: data.medicalRecordId ?? null,
                orderedByStaffId: data.orderedByStaffId,
                departmentId: data.departmentId,
                priority: data.priority ?? null,
                notes: data.notes ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
                items: {
                    create: data.items.map((item) => ({
                        labTestId: item.labTestId,
                        createdBy: data.actorUserId,
                        updatedBy: data.actorUserId,
                    })),
                },
            },
            include: labOrderInclude,
        });

        return toLabOrderView(order);
    }

    async findLabOrderById(id: string): Promise<LabOrderView | null> {
        const order = await prisma.labOrder.findUnique({
            where: { id },
            include: labOrderInclude,
        });

        return order ? toLabOrderView(order) : null;
    }

    async listLabOrders(filters: ListLabOrdersFilters): Promise<LabOrderListResult> {
        const where: Prisma.LabOrderWhereInput = {};

        if (filters.patientId) {
            where.patientId = filters.patientId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.priority) {
            where.priority = filters.priority;
        }

        if (filters.from || filters.to) {
            where.orderedAt = {
                gte: filters.from,
                lte: filters.to,
            };
        }

        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.labOrder.findMany({
                where,
                orderBy: [{ orderedAt: 'desc' }],
                skip,
                take: filters.limit,
                include: labOrderInclude,
            }),
            prisma.labOrder.count({ where }),
        ]);

        return {
            items: items.map(toLabOrderView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async listPendingLabOrders(): Promise<LabOrderView[]> {
        const orders = await prisma.labOrder.findMany({
            where: {
                status: {
                    in: [
                        LabOrderStatus.PENDING,
                        LabOrderStatus.COLLECTED,
                        LabOrderStatus.IN_PROGRESS,
                    ],
                },
            },
            orderBy: [{ priority: 'desc' }, { orderedAt: 'asc' }],
            include: labOrderInclude,
        });

        return orders.map(toLabOrderView);
    }

    async updateLabOrderStatus(
        id: string,
        data: UpdateLabOrderStatusData,
    ): Promise<LabOrderView> {
        const order = await prisma.labOrder.update({
            where: { id },
            data: {
                status: data.status,
                collectedAt: data.collectedAt,
                completedAt: data.completedAt,
                updatedBy: data.actorUserId,
            },
            include: labOrderInclude,
        });

        return toLabOrderView(order);
    }

    async enterLabOrderResults(
        id: string,
        data: EnterLabOrderResultsData,
    ): Promise<LabOrderView> {
        const order = await prisma.$transaction(async (tx) => {
            for (const item of data.items) {
                await tx.labOrderItem.update({
                    where: { id: item.itemId },
                    data: {
                        resultValue: item.resultValue,
                        resultUnit: item.resultUnit ?? null,
                        resultNotes: item.resultNotes ?? null,
                        resultStatus: item.resultStatus,
                        isCritical: item.isCritical,
                        completedAt: item.completedAt ?? null,
                        updatedBy: data.actorUserId,
                    },
                });
            }

            await tx.labOrder.update({
                where: { id },
                data: {
                    updatedBy: data.actorUserId,
                },
            });

            return tx.labOrder.findUniqueOrThrow({
                where: { id },
                include: labOrderInclude,
            });
        });

        return toLabOrderView(order);
    }

    async reviewLabOrder(id: string, data: ReviewLabOrderData): Promise<LabOrderView> {
        const order = await prisma.labOrder.update({
            where: { id },
            data: {
                reviewedAt: data.reviewedAt,
                notes: data.notes === undefined ? undefined : data.notes,
                updatedBy: data.actorUserId,
            },
            include: labOrderInclude,
        });

        return toLabOrderView(order);
    }
}
