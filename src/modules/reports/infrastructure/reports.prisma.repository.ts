import {
    AppointmentStatus,
    BillingStatus,
    InventoryTransactionType,
    LabOrderStatus,
    LabResultStatus,
    Prisma,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    ReportFilters,
    ReportResult,
    ReportRow,
    ReportRowValue,
} from '../domain/reports.entity';
import { ReportsRepository } from '../domain/reports.repository';

const EXPIRY_ALERT_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

function round(value: number, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
    return date.toISOString().slice(0, 7);
}

function hourKey(date: Date) {
    return `${String(date.getUTCHours()).padStart(2, '0')}:00`;
}

function minutesBetween(start: Date | null, end: Date | null) {
    if (!start || !end || end < start) {
        return null;
    }

    return (end.getTime() - start.getTime()) / 60000;
}

function hoursBetween(start: Date | null, end: Date | null) {
    const minutes = minutesBetween(start, end);
    return minutes === null ? null : minutes / 60;
}

function dateRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
        return undefined;
    }

    const range: Prisma.DateTimeFilter = {};

    if (from) {
        range.gte = from;
    }

    if (to) {
        range.lte = to;
    }

    return range;
}

function optionalDateFilter(from?: Date, to?: Date) {
    const range = dateRange(from, to);
    return range ? { createdAt: range } : {};
}

function appointmentScope(filters: ReportFilters): Prisma.AppointmentWhereInput | undefined {
    const where: Prisma.AppointmentWhereInput = {};

    if (filters.departmentId) {
        where.departmentId = filters.departmentId;
    }

    if (filters.staffProfileId) {
        where.staffProfileId = filters.staffProfileId;
    }

    if (filters.serviceCatalogId) {
        where.serviceCatalogId = filters.serviceCatalogId;
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

function filterSnapshot(filters: ReportFilters) {
    return {
        from: filters.from?.toISOString() ?? null,
        to: filters.to?.toISOString() ?? null,
        departmentId: filters.departmentId ?? null,
        staffProfileId: filters.staffProfileId ?? null,
        serviceCatalogId: filters.serviceCatalogId ?? null,
        status: filters.status ?? null,
    };
}

function isEnumValue<T extends Record<string, string>>(
    enumObject: T,
    value: string,
): value is T[keyof T] {
    return Object.values(enumObject).includes(value);
}

function requireEnumValue<T extends Record<string, string>>(
    enumObject: T,
    value: string | undefined,
    label: string,
) {
    if (!value) {
        return undefined;
    }

    if (!isEnumValue(enumObject, value)) {
        throw new AppError(`Unsupported ${label} status`, 400);
    }

    return value;
}

function staffLabel(
    staffProfile: { employeeCode: string; specialization: string | null } | null,
) {
    if (!staffProfile) {
        return 'Unassigned';
    }

    return staffProfile.specialization
        ? `${staffProfile.employeeCode} - ${staffProfile.specialization}`
        : staffProfile.employeeCode;
}

function patientAgeGroup(dateOfBirth: Date | null, now: Date) {
    if (!dateOfBirth) {
        return 'Unknown';
    }

    const age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();

    if (age < 18) return '0-17';
    if (age < 31) return '18-30';
    if (age < 46) return '31-45';
    if (age < 61) return '46-60';
    return '61+';
}

function addMetric(
    summary: Array<{ label: string; value: string | number }>,
    label: string,
    value: string | number,
) {
    summary.push({ label, value });
}

function getOrCreate<T>(map: Map<string, T>, key: string, create: () => T) {
    const existing = map.get(key);

    if (existing) {
        return existing;
    }

    const next = create();
    map.set(key, next);
    return next;
}

function sumAverage(values: Array<number | null>) {
    const numeric = values.filter((value): value is number => value !== null);

    if (numeric.length === 0) {
        return null;
    }

    return round(
        numeric.reduce((total, value) => total + value, 0) / numeric.length,
    );
}

function valueOrNull(value: number | null): ReportRowValue {
    return value === null ? null : value;
}

function appointmentGroupKey(
    appointment: {
        status: AppointmentStatus;
        scheduledAt: Date;
        department: { name: string };
        serviceCatalog: { name: string };
        staffProfile: { employeeCode: string; specialization: string | null } | null;
    },
    groupBy: string,
) {
    if (groupBy === 'department') return appointment.department.name;
    if (groupBy === 'doctor') return staffLabel(appointment.staffProfile);
    if (groupBy === 'service') return appointment.serviceCatalog.name;
    if (groupBy === 'day') return dateKey(appointment.scheduledAt);
    if (groupBy === 'hour') return hourKey(appointment.scheduledAt);
    return appointment.status;
}

function clinicalGroupKey(
    item: {
        date: Date;
        department?: { name: string };
        staffProfile?: { employeeCode: string; specialization: string | null };
        label?: string;
    },
    groupBy: string,
) {
    if (groupBy === 'department') return item.department?.name ?? 'Unknown';
    if (groupBy === 'doctor') {
        return item.staffProfile ? staffLabel(item.staffProfile) : 'Unknown';
    }
    if (groupBy === 'day') return dateKey(item.date);
    return item.label ?? 'Other';
}

function financialGroupKey(
    billing: {
        status: BillingStatus;
        issuedAt: Date;
        dueDate: Date | null;
        appointment: {
            department: { name: string };
            serviceCatalog: { name: string };
            staffProfile: { employeeCode: string; specialization: string | null } | null;
        } | null;
    },
    groupBy: string,
    now: Date,
) {
    if (groupBy === 'month') return monthKey(billing.issuedAt);
    if (groupBy === 'department') {
        return billing.appointment?.department.name ?? 'Unassigned';
    }
    if (groupBy === 'service') {
        return billing.appointment?.serviceCatalog.name ?? 'Unassigned';
    }
    if (groupBy === 'doctor') {
        return staffLabel(billing.appointment?.staffProfile ?? null);
    }
    if (groupBy === 'status') return billing.status;
    if (groupBy === 'aging') return agingBucket(billing.dueDate, now);
    return dateKey(billing.issuedAt);
}

function agingBucket(dueDate: Date | null, now: Date) {
    if (!dueDate || dueDate >= now) {
        return 'Current';
    }

    const ageDays = Math.floor((now.getTime() - dueDate.getTime()) / DAY_IN_MS);

    if (ageDays <= 30) return '1-30 days';
    if (ageDays <= 60) return '31-60 days';
    if (ageDays <= 90) return '61-90 days';
    return '90+ days';
}

function inventoryGroupKey(
    item: {
        name: string;
        expiryDate: Date | null;
        inventoryCategory: { name: string };
        department: { name: string } | null;
    },
    groupBy: string,
) {
    if (groupBy === 'department') return item.department?.name ?? 'Unassigned';
    if (groupBy === 'item') return item.name;
    if (groupBy === 'expiry') {
        if (!item.expiryDate) return 'No expiry';
        return dateKey(item.expiryDate);
    }

    return item.inventoryCategory.name;
}

function parseTimeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map((part) => Number(part));

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return 0;
    }

    return hours * 60 + minutes;
}

function calculateScheduleCapacityMinutes(
    schedule: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        validFrom: Date | null;
        validTo: Date | null;
    },
    from: Date,
    to: Date,
) {
    let total = 0;
    const start = new Date(Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate(),
    ));
    const end = new Date(Date.UTC(
        to.getUTCFullYear(),
        to.getUTCMonth(),
        to.getUTCDate(),
    ));

    for (
        let cursor = start;
        cursor <= end;
        cursor = new Date(cursor.getTime() + DAY_IN_MS)
    ) {
        if (cursor.getUTCDay() !== schedule.dayOfWeek) {
            continue;
        }

        if (schedule.validFrom && cursor < schedule.validFrom) {
            continue;
        }

        if (schedule.validTo && cursor > schedule.validTo) {
            continue;
        }

        total += Math.max(
            parseTimeToMinutes(schedule.endTime) -
                parseTimeToMinutes(schedule.startTime),
            0,
        );
    }

    return total;
}

export class ReportsPrismaRepository implements ReportsRepository {
    async getAppointmentReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'status';
        const status = requireEnumValue(
            AppointmentStatus,
            filters.status,
            'appointment',
        );
        const where: Prisma.AppointmentWhereInput = {
            scheduledAt: dateRange(filters.from, filters.to),
            departmentId: filters.departmentId,
            staffProfileId: filters.staffProfileId,
            serviceCatalogId: filters.serviceCatalogId,
            status,
        };

        const appointments = await prisma.appointment.findMany({
            where,
            select: {
                status: true,
                scheduledAt: true,
                endAt: true,
                durationMinutes: true,
                checkedInAt: true,
                completedAt: true,
                department: { select: { name: true } },
                serviceCatalog: { select: { name: true } },
                staffProfile: {
                    select: {
                        employeeCode: true,
                        specialization: true,
                    },
                },
            },
        });

        const groups = new Map<
            string,
            {
                appointments: number;
                completed: number;
                cancelled: number;
                noShow: number;
                durations: Array<number | null>;
                waits: Array<number | null>;
            }
        >();

        for (const appointment of appointments) {
            const group = getOrCreate(groups, appointmentGroupKey(appointment, groupBy), () => ({
                appointments: 0,
                completed: 0,
                cancelled: 0,
                noShow: 0,
                durations: [],
                waits: [],
            }));

            group.appointments += 1;
            if (appointment.status === AppointmentStatus.COMPLETED) group.completed += 1;
            if (appointment.status === AppointmentStatus.CANCELLED) group.cancelled += 1;
            if (appointment.status === AppointmentStatus.NO_SHOW) group.noShow += 1;

            group.waits.push(minutesBetween(appointment.scheduledAt, appointment.checkedInAt));
            group.durations.push(
                appointment.completedAt
                    ? minutesBetween(appointment.scheduledAt, appointment.completedAt)
                    : appointment.durationMinutes,
            );
        }

        const rows = Array.from(groups.entries()).map<ReportRow>(
            ([group, values]) => ({
                group,
                appointments: values.appointments,
                completed: values.completed,
                cancelled: values.cancelled,
                noShow: values.noShow,
                averageWaitMinutes: valueOrNull(sumAverage(values.waits)),
                averageDurationMinutes: valueOrNull(sumAverage(values.durations)),
            }),
        );

        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Total appointments', appointments.length);
        addMetric(
            summary,
            'Completed',
            appointments.filter((item) => item.status === AppointmentStatus.COMPLETED).length,
        );
        addMetric(
            summary,
            'No-show rate',
            appointments.length
                ? `${round(
                    (appointments.filter((item) => item.status === AppointmentStatus.NO_SHOW).length /
                        appointments.length) *
                        100,
                )}%`
                : '0%',
        );

        return {
            type: 'appointments',
            title: 'Appointment Report',
            generatedAt: new Date(),
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }

    async getClinicalReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'category';
        const status = requireEnumValue(LabOrderStatus, filters.status, 'lab order');
        const labWhere: Prisma.LabOrderWhereInput = {
            orderedAt: dateRange(filters.from, filters.to),
            departmentId: filters.departmentId,
            orderedByStaffId: filters.staffProfileId,
            status,
            appointment: appointmentScope(filters),
        };
        const prescriptionWhere: Prisma.PrescriptionWhereInput = {
            issuedAt: dateRange(filters.from, filters.to),
            staffProfileId: filters.staffProfileId,
            isVoided: false,
            appointment: appointmentScope(filters),
        };
        const medicalRecordWhere: Prisma.MedicalRecordWhereInput = {
            ...optionalDateFilter(filters.from, filters.to),
            staffProfileId: filters.staffProfileId,
            departmentId: filters.departmentId,
            appointment: appointmentScope(filters),
        };

        const [labOrders, prescriptions, medicalRecords] = await prisma.$transaction([
            prisma.labOrder.findMany({
                where: labWhere,
                select: {
                    orderedAt: true,
                    completedAt: true,
                    reviewedAt: true,
                    department: { select: { name: true } },
                    orderedByStaff: {
                        select: {
                            employeeCode: true,
                            specialization: true,
                        },
                    },
                    items: {
                        select: {
                            resultStatus: true,
                            isCritical: true,
                            labTest: { select: { name: true, code: true } },
                        },
                    },
                },
            }),
            prisma.prescription.findMany({
                where: prescriptionWhere,
                select: {
                    issuedAt: true,
                    staffProfile: {
                        select: {
                            employeeCode: true,
                            specialization: true,
                        },
                    },
                    appointment: {
                        select: {
                            department: { select: { name: true } },
                        },
                    },
                    items: {
                        select: {
                            medicationName: true,
                            quantityPrescribed: true,
                        },
                    },
                },
            }),
            prisma.medicalRecord.findMany({
                where: medicalRecordWhere,
                select: {
                    createdAt: true,
                    diagnosis: true,
                    department: { select: { name: true } },
                    staffProfile: {
                        select: {
                            employeeCode: true,
                            specialization: true,
                        },
                    },
                },
            }),
        ]);

        const rowsByKey = new Map<
            string,
            {
                section: string;
                group: string;
                count: number;
                turnaroundHours: Array<number | null>;
                criticalResults: number;
                abnormalResults: number;
            }
        >();

        for (const order of labOrders) {
            for (const item of order.items) {
                const label =
                    groupBy === 'labTest'
                        ? `${item.labTest.code} ${item.labTest.name}`
                        : 'Lab volume';
                const group = clinicalGroupKey(
                    {
                        date: order.orderedAt,
                        department: order.department,
                        staffProfile: order.orderedByStaff,
                        label,
                    },
                    groupBy,
                );
                const row = getOrCreate(rowsByKey, `lab:${group}`, () => ({
                    section: 'Lab orders',
                    group,
                    count: 0,
                    turnaroundHours: [],
                    criticalResults: 0,
                    abnormalResults: 0,
                }));

                row.count += 1;
                row.turnaroundHours.push(hoursBetween(order.orderedAt, order.completedAt));
                if (item.isCritical) row.criticalResults += 1;
                if (
                    item.resultStatus === LabResultStatus.ABNORMAL ||
                    item.resultStatus === LabResultStatus.CRITICAL
                ) {
                    row.abnormalResults += 1;
                }
            }
        }

        for (const prescription of prescriptions) {
            for (const item of prescription.items) {
                const label =
                    groupBy === 'medication'
                        ? item.medicationName
                        : 'Prescription volume';
                const group = clinicalGroupKey(
                    {
                        date: prescription.issuedAt,
                        department: prescription.appointment?.department,
                        staffProfile: prescription.staffProfile,
                        label,
                    },
                    groupBy,
                );
                const row = getOrCreate(rowsByKey, `rx:${group}`, () => ({
                    section: 'Prescriptions',
                    group,
                    count: 0,
                    turnaroundHours: [],
                    criticalResults: 0,
                    abnormalResults: 0,
                }));

                row.count += item.quantityPrescribed;
            }
        }

        for (const record of medicalRecords) {
            if (!record.diagnosis) {
                continue;
            }

            const group = clinicalGroupKey(
                {
                    date: record.createdAt,
                    department: record.department,
                    staffProfile: record.staffProfile,
                    label: record.diagnosis,
                },
                groupBy === 'diagnosis' ? 'diagnosis' : groupBy,
            );
            const row = getOrCreate(rowsByKey, `diagnosis:${group}`, () => ({
                section: 'Diagnoses',
                group,
                count: 0,
                turnaroundHours: [],
                criticalResults: 0,
                abnormalResults: 0,
            }));

            row.count += 1;
        }

        const rows = Array.from(rowsByKey.values()).map<ReportRow>((row) => ({
            section: row.section,
            group: row.group,
            count: row.count,
            averageTurnaroundHours: valueOrNull(sumAverage(row.turnaroundHours)),
            abnormalResults: row.abnormalResults,
            criticalResults: row.criticalResults,
        }));

        const labTurnarounds = labOrders.map((order) =>
            hoursBetween(order.orderedAt, order.completedAt),
        );
        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Lab orders', labOrders.length);
        addMetric(summary, 'Prescription items', prescriptions.flatMap((item) => item.items).length);
        addMetric(summary, 'Diagnoses', medicalRecords.filter((item) => item.diagnosis).length);
        addMetric(
            summary,
            'Average lab turnaround hours',
            sumAverage(labTurnarounds) ?? 0,
        );

        return {
            type: 'clinical',
            title: 'Clinical Report',
            generatedAt: new Date(),
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }

    async getFinancialReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'day';
        const status = requireEnumValue(BillingStatus, filters.status, 'billing');
        const appointmentFilter = appointmentScope(filters);
        const billingWhere: Prisma.BillingWhereInput = {
            issuedAt: dateRange(filters.from, filters.to),
            status,
            appointment: appointmentFilter,
        };
        const paymentWhere: Prisma.PaymentWhereInput = {
            paidAt: dateRange(filters.from, filters.to),
            billing: appointmentFilter ? { appointment: appointmentFilter } : undefined,
        };

        const [billings, payments] = await prisma.$transaction([
            prisma.billing.findMany({
                where: billingWhere,
                select: {
                    status: true,
                    issuedAt: true,
                    dueDate: true,
                    totalAmount: true,
                    amountPaid: true,
                    discountAmount: true,
                    appointment: {
                        select: {
                            department: { select: { name: true } },
                            serviceCatalog: { select: { name: true } },
                            staffProfile: {
                                select: {
                                    employeeCode: true,
                                    specialization: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.payment.findMany({
                where: paymentWhere,
                select: {
                    amount: true,
                    paymentMethod: true,
                    paidAt: true,
                    billing: {
                        select: {
                            issuedAt: true,
                            dueDate: true,
                            status: true,
                            appointment: {
                                select: {
                                    department: { select: { name: true } },
                                    serviceCatalog: { select: { name: true } },
                                    staffProfile: {
                                        select: {
                                            employeeCode: true,
                                            specialization: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        const now = new Date();
        const rowsByGroup = new Map<
            string,
            {
                billings: number;
                billedAmount: number;
                paidAmount: number;
                outstandingAmount: number;
                discountAmount: number;
            }
        >();

        for (const billing of billings) {
            const group = financialGroupKey(billing, groupBy, now);
            const row = getOrCreate(rowsByGroup, group, () => ({
                billings: 0,
                billedAmount: 0,
                paidAmount: 0,
                outstandingAmount: 0,
                discountAmount: 0,
            }));
            const totalAmount = decimalToNumber(billing.totalAmount);
            const amountPaid = decimalToNumber(billing.amountPaid);

            row.billings += 1;
            row.billedAmount += totalAmount;
            row.paidAmount += amountPaid;
            row.outstandingAmount += Math.max(totalAmount - amountPaid, 0);
            row.discountAmount += decimalToNumber(billing.discountAmount);
        }

        for (const payment of payments) {
            if (groupBy !== 'paymentMethod') {
                continue;
            }

            const row = getOrCreate(rowsByGroup, payment.paymentMethod, () => ({
                billings: 0,
                billedAmount: 0,
                paidAmount: 0,
                outstandingAmount: 0,
                discountAmount: 0,
            }));

            row.paidAmount += decimalToNumber(payment.amount);
        }

        const rows = Array.from(rowsByGroup.entries()).map<ReportRow>(
            ([group, value]) => ({
                group,
                billings: value.billings,
                billedAmount: round(value.billedAmount),
                paidAmount: round(value.paidAmount),
                outstandingAmount: round(value.outstandingAmount),
                discountAmount: round(value.discountAmount),
            }),
        );

        const totalBilled = billings.reduce(
            (total, billing) => total + decimalToNumber(billing.totalAmount),
            0,
        );
        const totalPaid = payments.reduce(
            (total, payment) => total + decimalToNumber(payment.amount),
            0,
        );
        const totalOutstanding = billings.reduce((total, billing) => {
            const totalAmount = decimalToNumber(billing.totalAmount);
            const amountPaid = decimalToNumber(billing.amountPaid);
            return total + Math.max(totalAmount - amountPaid, 0);
        }, 0);
        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Total billed', round(totalBilled));
        addMetric(summary, 'Total paid', round(totalPaid));
        addMetric(summary, 'Outstanding balance', round(totalOutstanding));
        addMetric(summary, 'Billing records', billings.length);

        return {
            type: 'financial',
            title: 'Financial Report',
            generatedAt: now,
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }

    async getInventoryReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'category';
        const status = requireEnumValue(
            InventoryTransactionType,
            filters.status,
            'inventory transaction',
        );
        const now = new Date();
        const expiryAlertDate = new Date(now.getTime() + EXPIRY_ALERT_DAYS * DAY_IN_MS);
        const itemWhere: Prisma.InventoryItemWhereInput = {
            departmentId: filters.departmentId,
            isActive: true,
        };
        const transactionWhere: Prisma.InventoryTransactionWhereInput = {
            createdAt: dateRange(filters.from, filters.to),
            transactionType: status,
            inventoryItem: {
                departmentId: filters.departmentId,
            },
        };

        const [items, transactions] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where: itemWhere,
                select: {
                    id: true,
                    name: true,
                    currentStock: true,
                    reorderLevel: true,
                    expiryDate: true,
                    inventoryCategory: { select: { name: true } },
                    department: { select: { name: true } },
                },
            }),
            prisma.inventoryTransaction.findMany({
                where: transactionWhere,
                select: {
                    transactionType: true,
                    quantity: true,
                    createdAt: true,
                    inventoryItem: {
                        select: {
                            id: true,
                            name: true,
                            expiryDate: true,
                            inventoryCategory: { select: { name: true } },
                            department: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);

        const rowsByGroup = new Map<
            string,
            {
                itemCount: number;
                currentStock: number;
                reorderLevel: number;
                lowStockItems: number;
                consumedQuantity: number;
                receivedQuantity: number;
                expiringItems: number;
            }
        >();

        for (const item of items) {
            const group = inventoryGroupKey(item, groupBy);
            const row = getOrCreate(rowsByGroup, group, () => ({
                itemCount: 0,
                currentStock: 0,
                reorderLevel: 0,
                lowStockItems: 0,
                consumedQuantity: 0,
                receivedQuantity: 0,
                expiringItems: 0,
            }));
            const currentStock = decimalToNumber(item.currentStock);
            const reorderLevel = decimalToNumber(item.reorderLevel);

            row.itemCount += 1;
            row.currentStock += currentStock;
            row.reorderLevel += reorderLevel;
            if (currentStock <= reorderLevel) row.lowStockItems += 1;
            if (item.expiryDate && item.expiryDate <= expiryAlertDate) {
                row.expiringItems += 1;
            }
        }

        for (const transaction of transactions) {
            const group =
                groupBy === 'transactionType'
                    ? transaction.transactionType
                    : inventoryGroupKey(transaction.inventoryItem, groupBy);
            const row = getOrCreate(rowsByGroup, group, () => ({
                itemCount: 0,
                currentStock: 0,
                reorderLevel: 0,
                lowStockItems: 0,
                consumedQuantity: 0,
                receivedQuantity: 0,
                expiringItems: 0,
            }));
            const quantity = decimalToNumber(transaction.quantity);

            if (
                transaction.transactionType === InventoryTransactionType.DISPENSED ||
                transaction.transactionType === InventoryTransactionType.WRITTEN_OFF
            ) {
                row.consumedQuantity += quantity;
            } else if (transaction.transactionType === InventoryTransactionType.RECEIVED) {
                row.receivedQuantity += quantity;
            }
        }

        const rows = Array.from(rowsByGroup.entries()).map<ReportRow>(
            ([group, value]) => ({
                group,
                itemCount: value.itemCount,
                currentStock: round(value.currentStock),
                reorderLevel: round(value.reorderLevel),
                lowStockItems: value.lowStockItems,
                consumedQuantity: round(value.consumedQuantity),
                receivedQuantity: round(value.receivedQuantity),
                expiringItems: value.expiringItems,
            }),
        );

        const lowStockItems = items.filter(
            (item) => decimalToNumber(item.currentStock) <= decimalToNumber(item.reorderLevel),
        ).length;
        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Active items', items.length);
        addMetric(summary, 'Low stock items', lowStockItems);
        addMetric(
            summary,
            'Expiring within 30 days',
            items.filter((item) => item.expiryDate && item.expiryDate <= expiryAlertDate).length,
        );
        addMetric(
            summary,
            'Consumed quantity',
            round(
                transactions
                    .filter((item) =>
                        item.transactionType === InventoryTransactionType.DISPENSED ||
                        item.transactionType === InventoryTransactionType.WRITTEN_OFF,
                    )
                    .reduce((total, item) => total + decimalToNumber(item.quantity), 0),
            ),
        );

        return {
            type: 'inventory',
            title: 'Inventory Report',
            generatedAt: now,
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }

    async getPatientsReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'month';
        const now = new Date();
        const appointmentFilter = appointmentScope(filters);
        const where: Prisma.PatientWhereInput = {
            createdAt: dateRange(filters.from, filters.to),
            appointments: appointmentFilter
                ? {
                    some: appointmentFilter,
                }
                : undefined,
        };

        const patients = await prisma.patient.findMany({
            where,
            select: {
                createdAt: true,
                isActive: true,
                gender: true,
                bloodType: true,
                dateOfBirth: true,
                appointments: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        const rowsByGroup = new Map<
            string,
            {
                patients: number;
                activePatients: number;
                returningPatients: number;
            }
        >();

        for (const patient of patients) {
            let group = monthKey(patient.createdAt);
            if (groupBy === 'day') group = dateKey(patient.createdAt);
            if (groupBy === 'gender') group = patient.gender ?? 'Unknown';
            if (groupBy === 'bloodType') group = patient.bloodType ?? 'Unknown';
            if (groupBy === 'ageGroup') group = patientAgeGroup(patient.dateOfBirth, now);
            if (groupBy === 'returning') {
                group = patient.appointments.length > 1 ? 'Returning' : 'New';
            }

            const row = getOrCreate(rowsByGroup, group, () => ({
                patients: 0,
                activePatients: 0,
                returningPatients: 0,
            }));

            row.patients += 1;
            if (patient.isActive) row.activePatients += 1;
            if (patient.appointments.length > 1) row.returningPatients += 1;
        }

        const rows = Array.from(rowsByGroup.entries()).map<ReportRow>(
            ([group, value]) => ({
                group,
                patients: value.patients,
                activePatients: value.activePatients,
                returningPatients: value.returningPatients,
            }),
        );
        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Patients', patients.length);
        addMetric(
            summary,
            'Active patients',
            patients.filter((patient) => patient.isActive).length,
        );
        addMetric(
            summary,
            'Returning patients',
            patients.filter((patient) => patient.appointments.length > 1).length,
        );

        return {
            type: 'patients',
            title: 'Patient Demographics Report',
            generatedAt: now,
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }

    async getStaffWorkloadReport(filters: ReportFilters): Promise<ReportResult> {
        const groupBy = filters.groupBy ?? 'doctor';
        const status = requireEnumValue(
            AppointmentStatus,
            filters.status,
            'appointment',
        );
        const appointmentWhere: Prisma.AppointmentWhereInput = {
            scheduledAt: dateRange(filters.from, filters.to),
            departmentId: filters.departmentId,
            staffProfileId: filters.staffProfileId,
            serviceCatalogId: filters.serviceCatalogId,
            status,
            staffProfile: {
                isNot: null,
            },
        };

        const appointments = await prisma.appointment.findMany({
            where: appointmentWhere,
            select: {
                id: true,
                status: true,
                scheduledAt: true,
                durationMinutes: true,
                staffProfileId: true,
                department: { select: { name: true } },
                staffProfile: {
                    select: {
                        employeeCode: true,
                        specialization: true,
                    },
                },
                feedback: {
                    select: {
                        rating: true,
                        status: true,
                    },
                },
            },
        });
        const staffIds = Array.from(
            new Set(
                appointments
                    .map((appointment) => appointment.staffProfileId)
                    .filter((id): id is string => Boolean(id)),
            ),
        );
        const schedules =
            filters.from && filters.to && staffIds.length > 0
                ? await prisma.staffSchedule.findMany({
                    where: {
                        staffProfileId: { in: staffIds },
                        isActive: true,
                    },
                    select: {
                        staffProfileId: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                        validFrom: true,
                        validTo: true,
                    },
                })
                : [];
        const capacityByStaff = new Map<string, number>();

        if (filters.from && filters.to) {
            for (const schedule of schedules) {
                const current = capacityByStaff.get(schedule.staffProfileId) ?? 0;
                capacityByStaff.set(
                    schedule.staffProfileId,
                    current +
                        calculateScheduleCapacityMinutes(
                            schedule,
                            filters.from,
                            filters.to,
                        ),
                );
            }
        }

        const rowsByGroup = new Map<
            string,
            {
                appointments: number;
                completed: number;
                bookedMinutes: number;
                feedbackRatings: number[];
                staffIds: Set<string>;
            }
        >();

        for (const appointment of appointments) {
            const group =
                groupBy === 'department'
                    ? appointment.department.name
                    : groupBy === 'day'
                        ? dateKey(appointment.scheduledAt)
                        : staffLabel(appointment.staffProfile);
            const row = getOrCreate(rowsByGroup, group, () => ({
                appointments: 0,
                completed: 0,
                bookedMinutes: 0,
                feedbackRatings: [],
                staffIds: new Set<string>(),
            }));

            row.appointments += 1;
            row.bookedMinutes += appointment.durationMinutes;
            if (appointment.status === AppointmentStatus.COMPLETED) {
                row.completed += 1;
            }
            if (appointment.staffProfileId) {
                row.staffIds.add(appointment.staffProfileId);
            }

            for (const feedback of appointment.feedback) {
                if (feedback.status === 'published') {
                    row.feedbackRatings.push(feedback.rating);
                }
            }
        }

        const rows = Array.from(rowsByGroup.entries()).map<ReportRow>(
            ([group, value]) => {
                const capacityMinutes = Array.from(value.staffIds).reduce(
                    (total, staffId) => total + (capacityByStaff.get(staffId) ?? 0),
                    0,
                );
                const feedbackScore =
                    value.feedbackRatings.length === 0
                        ? null
                        : round(
                            value.feedbackRatings.reduce(
                                (total, rating) => total + rating,
                                0,
                            ) / value.feedbackRatings.length,
                        );

                return {
                    group,
                    appointments: value.appointments,
                    completed: value.completed,
                    averagePatientsPerDoctor: round(
                        value.appointments / Math.max(value.staffIds.size, 1),
                    ),
                    utilizationRate: capacityMinutes
                        ? `${round((value.bookedMinutes / capacityMinutes) * 100)}%`
                        : null,
                    averageFeedbackScore: feedbackScore,
                };
            },
        );
        const allRatings = appointments.flatMap((appointment) =>
            appointment.feedback
                .filter((feedback) => feedback.status === 'published')
                .map((feedback) => feedback.rating),
        );
        const summary: ReportResult['summary'] = [];
        addMetric(summary, 'Appointments', appointments.length);
        addMetric(summary, 'Staff with appointments', staffIds.length);
        addMetric(
            summary,
            'Average feedback score',
            allRatings.length
                ? round(allRatings.reduce((total, rating) => total + rating, 0) / allRatings.length)
                : 0,
        );

        return {
            type: 'staff-workload',
            title: 'Staff Workload Report',
            generatedAt: new Date(),
            groupBy,
            filters: filterSnapshot(filters),
            summary,
            rows,
        };
    }
}
