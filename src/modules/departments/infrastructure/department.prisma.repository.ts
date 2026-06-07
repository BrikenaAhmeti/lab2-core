import { prisma } from '../../../infrastructure/db/prisma';
import {
    CreateDepartmentData,
    DepartmentRepository,
    ListDepartmentsFilters,
    UpdateDepartmentData,
} from '../domain/department.repository';
import { DepartmentEntity, DepartmentListResult } from '../domain/department.entity';
import { Prisma } from '../../../generated/prisma';

function toJsonInput(value: unknown | null | undefined) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
}

type DepartmentWorkingDay =
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

interface OpenHoursPoint {
    dateKey: string;
    day: DepartmentWorkingDay;
    time: string;
    timestamp: number;
}

const workingDays: DepartmentWorkingDay[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];

function dateOnly(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateTimePoint(value: string | undefined): OpenHoursPoint | undefined {
    if (!value) return undefined;

    const trimmed = value.trim();
    const localMatch = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(trimmed);

    if (localMatch) {
        const [, dateKey, time] = localMatch;
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        const timestamp = Date.parse(`${dateKey}T${time}:00.000Z`);

        if (Number.isNaN(date.getTime()) || Number.isNaN(timestamp)) return undefined;

        return {
            dateKey,
            day: workingDays[date.getUTCDay()],
            time,
            timestamp,
        };
    }

    const date = dateOnly(trimmed) ? new Date(`${trimmed}T00:00:00.000Z`) : new Date(trimmed);

    if (Number.isNaN(date.getTime())) return undefined;

    const dateKey = date.toISOString().slice(0, 10);
    const time = date.toISOString().slice(11, 16);

    return {
        dateKey,
        day: workingDays[date.getUTCDay()],
        time,
        timestamp: date.getTime(),
    };
}

function defaultSortDirection(sortBy: NonNullable<ListDepartmentsFilters['sortBy']>) {
    return sortBy === 'createdAt' || sortBy === 'updatedAt' ? 'desc' : 'asc';
}

function openWindowFilter(day: DepartmentWorkingDay, startTime: string, endTime: string): Prisma.DepartmentWhereInput {
    return {
        AND: [
            {
                operatingHours: {
                    path: [day, 'isOpen'],
                    equals: true,
                },
            },
            {
                operatingHours: {
                    path: [day, 'startTime'],
                    lte: endTime,
                },
            },
            {
                operatingHours: {
                    path: [day, 'endTime'],
                    gte: startTime,
                },
            },
        ],
    };
}

function dateFromKey(dateKey: string) {
    return new Date(`${dateKey}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function openRangeFilter(openFrom: string | undefined, openTo: string | undefined): Prisma.DepartmentWhereInput | undefined {
    const from = dateTimePoint(openFrom);
    const to = dateTimePoint(openTo);

    if (!from || !to || to.timestamp < from.timestamp) return undefined;

    const windows: Prisma.DepartmentWhereInput[] = [];
    let current = dateFromKey(from.dateKey);
    const end = dateFromKey(to.dateKey);

    while (current.getTime() <= end.getTime()) {
        const dateKey = current.toISOString().slice(0, 10);
        const isStart = dateKey === from.dateKey;
        const isEnd = dateKey === to.dateKey;

        windows.push(
            openWindowFilter(
                workingDays[current.getUTCDay()],
                isStart ? from.time : '00:00',
                isEnd ? to.time : '23:59',
            ),
        );

        current = addDays(current, 1);
    }

    return windows.length > 0 ? { OR: windows } : undefined;
}

function openAtFilter(openAt: string | undefined): Prisma.DepartmentWhereInput | undefined {
    const point = dateTimePoint(openAt);

    if (!point) return undefined;

    return openWindowFilter(point.day, point.time, point.time);
}

export class DepartmentPrismaRepository implements DepartmentRepository {
    async create(data: CreateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                floor: data.floor ?? null,
                phoneExtension: data.phoneExtension ?? null,
                operatingHours: toJsonInput(data.operatingHours),
                isActive: data.isActive,
                sortOrder: data.sortOrder,
            },
        });
    }

    async findById(id: string): Promise<DepartmentEntity | null> {
        return prisma.department.findUnique({
            where: { id },
        });
    }

    async findByName(name: string): Promise<DepartmentEntity | null> {
        return prisma.department.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });
    }

    async list(filters: ListDepartmentsFilters): Promise<DepartmentListResult> {
        const where: Prisma.DepartmentWhereInput = {};
        const andFilters: Prisma.DepartmentWhereInput[] = [];

        if (typeof filters.isActive === 'boolean') {
            where.isActive = filters.isActive;
        }

        if (filters.search) {
            where.OR = [
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
                {
                    floor: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
                {
                    phoneExtension: {
                        contains: filters.search,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const openHoursFilter = openAtFilter(filters.openAt) ?? openRangeFilter(filters.openFrom, filters.openTo);

        if (openHoursFilter) {
            andFilters.push(openHoursFilter);
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        const skip = (filters.page - 1) * filters.limit;
        const orderBy = filters.sortBy
            ? [{ [filters.sortBy]: filters.sortDirection ?? defaultSortDirection(filters.sortBy) }]
            : [{ createdAt: 'desc' as const }, { sortOrder: 'asc' as const }];

        const [items, total] = await prisma.$transaction([
            prisma.department.findMany({
                where,
                orderBy,
                skip,
                take: filters.limit,
            }),
            prisma.department.count({ where }),
        ]);

        return {
            items,
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async update(id: string, data: UpdateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.update({
            where: { id },
            data: {
                ...data,
                operatingHours: toJsonInput(data.operatingHours),
            },
        });
    }

    async deactivate(id: string): Promise<DepartmentEntity> {
        return prisma.department.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
    }
}
