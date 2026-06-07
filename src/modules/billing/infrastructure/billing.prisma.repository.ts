import {
    BillingStatus,
    LabOrderStatus,
    Prisma,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    BillingAppointmentSource,
    BillingItemView,
    BillingPatientSummary,
    BillingStats,
    BillingView,
    MedicationCatalogPrice,
    PaymentView,
} from '../domain/billing.entity';
import {
    BillingRepository,
    BillingStatsFilters,
    CreateBillingData,
    ListBillingsFilters,
    RecordPaymentData,
    UpdateBillingData,
} from '../domain/billing.repository';

const billingInclude = {
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
            serviceCatalog: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    items: {
        orderBy: {
            createdAt: 'asc',
        },
    },
    payments: {
        orderBy: {
            paidAt: 'asc',
        },
    },
} satisfies Prisma.BillingInclude;

const appointmentBillingInclude = {
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
    serviceCatalog: {
        select: {
            id: true,
            name: true,
            defaultPrice: true,
        },
    },
    labOrders: {
        where: {
            status: {
                not: LabOrderStatus.CANCELLED,
            },
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
                            defaultPrice: true,
                        },
                    },
                },
            },
        },
    },
    prescriptions: {
        where: {
            isVoided: false,
        },
        include: {
            items: {
                orderBy: {
                    createdAt: 'asc',
                },
                select: {
                    id: true,
                    medicationName: true,
                    dosage: true,
                    quantityPrescribed: true,
                },
            },
        },
    },
} satisfies Prisma.AppointmentInclude;

type BillingRecord = Prisma.BillingGetPayload<{
    include: typeof billingInclude;
}>;

type AppointmentBillingRecord = Prisma.AppointmentGetPayload<{
    include: typeof appointmentBillingInclude;
}>;

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

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toPatientSummary(
    patient: BillingRecord['patient'] | AppointmentBillingRecord['patient'],
): BillingPatientSummary {
    return {
        ...patient,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
    };
}

function toBillingItemView(item: BillingRecord['items'][number]): BillingItemView {
    return {
        id: item.id,
        billingId: item.billingId,
        serviceCatalogId: item.serviceCatalogId,
        inventoryItemId: item.inventoryItemId,
        description: item.description,
        quantity: decimalToNumber(item.quantity),
        unitPrice: decimalToNumber(item.unitPrice),
        totalPrice: decimalToNumber(item.totalPrice),
        sourceEntityType: item.sourceEntityType,
        sourceEntityId: item.sourceEntityId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

function toPaymentView(payment: BillingRecord['payments'][number]): PaymentView {
    return {
        id: payment.id,
        billingId: payment.billingId,
        amount: decimalToNumber(payment.amount),
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        paidAt: payment.paidAt,
        receivedByUserId: payment.receivedByUserId,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    };
}

function toBillingView(record: BillingRecord): BillingView {
    const totalAmount = decimalToNumber(record.totalAmount);
    const amountPaid = decimalToNumber(record.amountPaid);

    return {
        id: record.id,
        patientId: record.patientId,
        appointmentId: record.appointmentId,
        billingNumber: record.billingNumber,
        status: record.status,
        subtotal: decimalToNumber(record.subtotal),
        taxAmount: decimalToNumber(record.taxAmount),
        discountAmount: decimalToNumber(record.discountAmount),
        totalAmount,
        amountPaid,
        outstandingAmount: roundMoney(Math.max(totalAmount - amountPaid, 0)),
        dueDate: record.dueDate,
        issuedAt: record.issuedAt,
        paidAt: record.paidAt,
        notes: record.notes,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        patient: toPatientSummary(record.patient),
        appointment: record.appointment
            ? {
                id: record.appointment.id,
                status: record.appointment.status,
                scheduledAt: record.appointment.scheduledAt,
                endAt: record.appointment.endAt,
                service: record.appointment.serviceCatalog,
            }
            : null,
        items: record.items.map(toBillingItemView),
        payments: record.payments.map(toPaymentView),
    };
}

function toAppointmentBillingSource(
    record: AppointmentBillingRecord,
): BillingAppointmentSource {
    return {
        id: record.id,
        patientId: record.patientId,
        status: record.status,
        scheduledAt: record.scheduledAt,
        endAt: record.endAt,
        completedAt: record.completedAt,
        basePrice: decimalToNumber(record.basePrice),
        serviceCatalogId: record.serviceCatalogId,
        patient: toPatientSummary(record.patient),
        service: {
            id: record.serviceCatalog.id,
            name: record.serviceCatalog.name,
            defaultPrice: decimalToNumber(record.serviceCatalog.defaultPrice),
        },
        labOrders: record.labOrders.map((order) => ({
            id: order.id,
            items: order.items.map((item) => ({
                id: item.id,
                labTest: {
                    id: item.labTest.id,
                    code: item.labTest.code,
                    name: item.labTest.name,
                    defaultPrice:
                        item.labTest.defaultPrice === null
                            ? null
                            : decimalToNumber(item.labTest.defaultPrice),
                },
            })),
        })),
        prescriptions: record.prescriptions.map((prescription) => ({
            id: prescription.id,
            items: prescription.items,
        })),
    };
}

function buildListWhere(filters: ListBillingsFilters) {
    const where: Prisma.BillingWhereInput = {};
    const search = filters.search?.trim().replace(/\s+/g, ' ');

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (search) {
        const terms = search.split(' ');

        where.AND = terms.map((term) => ({
            patient: {
                OR: [
                    {
                        firstName: {
                            contains: term,
                            mode: 'insensitive',
                        },
                    },
                    {
                        lastName: {
                            contains: term,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: term,
                            mode: 'insensitive',
                        },
                    },
                    {
                        phone: {
                            contains: term,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
        }));
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.from || filters.to) {
        where.issuedAt = {
            gte: filters.from,
            lte: filters.to,
        };
    }

    return where;
}

function buildStatsWhere(filters: BillingStatsFilters) {
    const where: Prisma.BillingWhereInput = {};

    if (filters.from || filters.to) {
        where.issuedAt = {
            gte: filters.from,
            lte: filters.to,
        };
    }

    return where;
}

export class BillingPrismaRepository implements BillingRepository {
    async findPatientById(id: string): Promise<BillingPatientSummary | null> {
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
    ): Promise<BillingPatientSummary | null> {
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

    async findBillingById(id: string): Promise<BillingView | null> {
        const billing = await prisma.billing.findUnique({
            where: { id },
            include: billingInclude,
        });

        return billing ? toBillingView(billing) : null;
    }

    async findBillingByAppointmentId(
        appointmentId: string,
    ): Promise<BillingView | null> {
        const billing = await prisma.billing.findFirst({
            where: { appointmentId },
            include: billingInclude,
        });

        return billing ? toBillingView(billing) : null;
    }

    async findCompletedAppointmentForBilling(
        appointmentId: string,
    ): Promise<BillingAppointmentSource | null> {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: appointmentBillingInclude,
        });

        return appointment ? toAppointmentBillingSource(appointment) : null;
    }

    async findMedicationCatalogPrices(
        medicationNames: string[],
    ): Promise<MedicationCatalogPrice[]> {
        const uniqueNames = Array.from(new Set(
            medicationNames
                .map((name) => name.trim())
                .filter((name) => name.length > 0),
        ));

        if (!uniqueNames.length) {
            return [];
        }

        const items = await prisma.inventoryItem.findMany({
            where: {
                isActive: true,
                OR: uniqueNames.map((name) => ({
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                })),
            },
            select: {
                id: true,
                name: true,
                unitCost: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return items.map((item) => ({
            medicationName: item.name,
            inventoryItemId: item.id,
            unitCost: item.unitCost === null ? null : decimalToNumber(item.unitCost),
        }));
    }

    async createBilling(data: CreateBillingData): Promise<BillingView> {
        const billing = await prisma.billing.create({
            data: {
                patientId: data.patientId,
                appointmentId: data.appointmentId ?? null,
                billingNumber: data.billingNumber,
                status: data.status,
                subtotal: data.subtotal,
                taxAmount: data.taxAmount,
                discountAmount: data.discountAmount,
                totalAmount: data.totalAmount,
                dueDate: data.dueDate ?? null,
                issuedAt: data.issuedAt,
                notes: data.notes ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
                items: {
                    create: data.items.map((item) => ({
                        serviceCatalogId: item.serviceCatalogId ?? null,
                        inventoryItemId: item.inventoryItemId ?? null,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        sourceEntityType: item.sourceEntityType ?? null,
                        sourceEntityId: item.sourceEntityId ?? null,
                        createdBy: data.actorUserId,
                        updatedBy: data.actorUserId,
                    })),
                },
            },
            include: billingInclude,
        });

        return toBillingView(billing);
    }

    async listBillings(filters: ListBillingsFilters): Promise<{
        items: BillingView[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const where = buildListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.billing.findMany({
                where,
                include: billingInclude,
                orderBy: [{ issuedAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.billing.count({ where }),
        ]);

        return {
            items: items.map(toBillingView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async updateBilling(id: string, data: UpdateBillingData): Promise<BillingView> {
        const billing = await prisma.$transaction(async (tx) => {
            if (data.items?.length) {
                await tx.billingItem.createMany({
                    data: data.items.map((item) => ({
                        billingId: id,
                        serviceCatalogId: item.serviceCatalogId ?? null,
                        inventoryItemId: item.inventoryItemId ?? null,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        sourceEntityType: item.sourceEntityType ?? null,
                        sourceEntityId: item.sourceEntityId ?? null,
                        createdBy: data.actorUserId,
                        updatedBy: data.actorUserId,
                    })),
                });
            }

            await tx.billing.update({
                where: { id },
                data: {
                    subtotal: data.subtotal,
                    taxAmount: data.taxAmount,
                    discountAmount: data.discountAmount,
                    totalAmount: data.totalAmount,
                    dueDate: data.dueDate,
                    notes: data.notes,
                    updatedBy: data.actorUserId,
                },
            });

            return tx.billing.findUniqueOrThrow({
                where: { id },
                include: billingInclude,
            });
        });

        return toBillingView(billing);
    }

    async recordPayment(
        id: string,
        data: RecordPaymentData,
    ): Promise<BillingView> {
        const billing = await prisma.$transaction(async (tx) => {
            await tx.payment.create({
                data: {
                    billingId: id,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    referenceNumber: data.referenceNumber ?? null,
                    paidAt: data.paidAt,
                    receivedByUserId: data.receivedByUserId,
                    notes: data.notes ?? null,
                    createdBy: data.receivedByUserId,
                    updatedBy: data.receivedByUserId,
                },
            });

            await tx.billing.update({
                where: { id },
                data: {
                    amountPaid: data.newAmountPaid,
                    status: data.newStatus,
                    paidAt: data.billingPaidAt,
                    updatedBy: data.receivedByUserId,
                },
            });

            return tx.billing.findUniqueOrThrow({
                where: { id },
                include: billingInclude,
            });
        });

        return toBillingView(billing);
    }

    async getBillingStats(filters: BillingStatsFilters): Promise<BillingStats> {
        const where = buildStatsWhere(filters);
        const billings = await prisma.billing.findMany({
            where,
            select: {
                status: true,
                totalAmount: true,
                amountPaid: true,
            },
        });
        const statusCounts = {
            [BillingStatus.DRAFT]: 0,
            [BillingStatus.PENDING]: 0,
            [BillingStatus.PARTIALLY_PAID]: 0,
            [BillingStatus.PAID]: 0,
            [BillingStatus.CANCELLED]: 0,
            [BillingStatus.OVERDUE]: 0,
        };

        let totalRevenue = 0;
        let outstanding = 0;

        for (const billing of billings) {
            const amountPaid = decimalToNumber(billing.amountPaid);
            const totalAmount = decimalToNumber(billing.totalAmount);

            statusCounts[billing.status] += 1;
            totalRevenue += amountPaid;

            if (billing.status !== BillingStatus.CANCELLED) {
                outstanding += Math.max(totalAmount - amountPaid, 0);
            }
        }

        return {
            totalRevenue: roundMoney(totalRevenue),
            outstanding: roundMoney(outstanding),
            statusCounts,
        };
    }
}
