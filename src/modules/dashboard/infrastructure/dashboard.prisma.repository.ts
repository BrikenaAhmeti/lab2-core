import {
    AppointmentStatus,
    LabOrderStatus,
} from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    DashboardAppointmentCounts,
    DashboardRevenueTrendPoint,
    DashboardStats,
} from '../domain/dashboard.entity';
import { DashboardRepository } from '../domain/dashboard.repository';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ACTIVE_LAB_STATUSES = [
    LabOrderStatus.PENDING,
    LabOrderStatus.COLLECTED,
    LabOrderStatus.IN_PROGRESS,
];
const CHECKED_IN_APPOINTMENT_STATUSES = [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PROGRESS,
];

function startOfUtcDay(date: Date) {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
}

function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_IN_MS);
}

function startOfUtcMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
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

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function emptyAppointmentCounts(): DashboardAppointmentCounts {
    return {
        scheduled: 0,
        checkedIn: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        total: 0,
    };
}

function buildRevenueTrend(
    trendStart: Date,
    payments: Array<{ paidAt: Date; amount: unknown }>,
) {
    const totalsByDate = new Map<string, number>();

    for (let index = 0; index < 7; index += 1) {
        totalsByDate.set(dateKey(addUtcDays(trendStart, index)), 0);
    }

    for (const payment of payments) {
        const key = dateKey(payment.paidAt);
        const current = totalsByDate.get(key) ?? 0;
        totalsByDate.set(key, current + decimalToNumber(payment.amount));
    }

    return Array.from(totalsByDate.entries()).map<DashboardRevenueTrendPoint>(
        ([date, total]) => ({
            date,
            total: roundMoney(total),
        }),
    );
}

export class DashboardPrismaRepository implements DashboardRepository {
    async getStats(now: Date): Promise<DashboardStats> {
        const todayStart = startOfUtcDay(now);
        const tomorrowStart = addUtcDays(todayStart, 1);
        const trendStart = addUtcDays(todayStart, -6);
        const monthStart = startOfUtcMonth(now);

        const [
            todayAppointments,
            checkedInPatients,
            pendingLabOrders,
            lowStockItems,
            monthRevenue,
            trendPayments,
        ] = await prisma.$transaction([
            prisma.appointment.findMany({
                where: {
                    scheduledAt: {
                        gte: todayStart,
                        lt: tomorrowStart,
                    },
                },
                select: {
                    status: true,
                },
            }),
            prisma.appointment.findMany({
                where: {
                    scheduledAt: {
                        gte: todayStart,
                        lt: tomorrowStart,
                    },
                    status: {
                        in: CHECKED_IN_APPOINTMENT_STATUSES,
                    },
                },
                select: {
                    patientId: true,
                },
                distinct: ['patientId'],
            }),
            prisma.labOrder.count({
                where: {
                    status: {
                        in: ACTIVE_LAB_STATUSES,
                    },
                },
            }),
            prisma.inventoryItem.count({
                where: {
                    isActive: true,
                    currentStock: {
                        lte: prisma.inventoryItem.fields.reorderLevel,
                    },
                },
            }),
            prisma.payment.aggregate({
                where: {
                    paidAt: {
                        gte: monthStart,
                        lt: tomorrowStart,
                    },
                },
                _sum: {
                    amount: true,
                },
            }),
            prisma.payment.findMany({
                where: {
                    paidAt: {
                        gte: trendStart,
                        lt: tomorrowStart,
                    },
                },
                select: {
                    paidAt: true,
                    amount: true,
                },
            }),
        ]);

        const appointments = emptyAppointmentCounts();

        for (const appointment of todayAppointments) {
            appointments.total += 1;

            if (
                appointment.status === AppointmentStatus.SCHEDULED ||
                appointment.status === AppointmentStatus.CONFIRMED
            ) {
                appointments.scheduled += 1;
            } else if (
                appointment.status === AppointmentStatus.CHECKED_IN ||
                appointment.status === AppointmentStatus.IN_PROGRESS
            ) {
                appointments.checkedIn += 1;
            } else if (appointment.status === AppointmentStatus.COMPLETED) {
                appointments.completed += 1;
            } else if (appointment.status === AppointmentStatus.CANCELLED) {
                appointments.cancelled += 1;
            } else if (appointment.status === AppointmentStatus.NO_SHOW) {
                appointments.noShow += 1;
            }
        }

        const revenueTrend = buildRevenueTrend(trendStart, trendPayments);
        const todayRevenue =
            revenueTrend.find((item) => item.date === dateKey(todayStart))?.total ?? 0;
        const weekRevenue = roundMoney(
            revenueTrend.reduce((total, item) => total + item.total, 0),
        );

        return {
            appointments,
            checkedInPatients: checkedInPatients.length,
            pendingLabOrders,
            lowStockItems,
            revenue: {
                today: todayRevenue,
                week: weekRevenue,
                month: roundMoney(decimalToNumber(monthRevenue._sum.amount ?? 0)),
            },
            revenueTrend,
            updatedAt: now,
        };
    }
}
