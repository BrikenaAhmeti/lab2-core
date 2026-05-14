import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    BookedAppointmentSlot,
    ScheduleExceptionEntity,
    ServiceSlotSummary,
    StaffScheduleEntity,
    StaffScheduleStaffSummary,
} from '../domain/schedule.entity';
import {
    CreateScheduleExceptionData,
    ScheduleRepository,
    UpsertScheduleDayData,
} from '../domain/schedule.repository';

type StaffScheduleRecord = Prisma.StaffScheduleGetPayload<Record<string, never>>;
type ScheduleExceptionRecord = Prisma.ScheduleExceptionGetPayload<Record<string, never>>;

function toScheduleEntity(schedule: StaffScheduleRecord): StaffScheduleEntity {
    return {
        id: schedule.id,
        staffProfileId: schedule.staffProfileId,
        departmentId: schedule.departmentId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDurationMinutes: schedule.slotDurationMinutes,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        validFrom: schedule.validFrom,
        validTo: schedule.validTo,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
    };
}

function toExceptionEntity(
    exception: ScheduleExceptionRecord,
): ScheduleExceptionEntity {
    return {
        id: exception.id,
        staffProfileId: exception.staffProfileId,
        departmentId: exception.departmentId,
        exceptionDate: exception.exceptionDate,
        startTime: exception.startTime,
        endTime: exception.endTime,
        isUnavailable: exception.isUnavailable,
        reason: exception.reason,
        createdAt: exception.createdAt,
        updatedAt: exception.updatedAt,
    };
}

export class SchedulePrismaRepository implements ScheduleRepository {
    async findStaffById(id: string): Promise<StaffScheduleStaffSummary | null> {
        return prisma.staffProfile.findUnique({
            where: { id },
            select: {
                id: true,
                employmentStatus: true,
                departmentAssignments: {
                    select: {
                        departmentId: true,
                        unassignedAt: true,
                        department: {
                            select: {
                                id: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        }).then((staff) =>
            staff
                ? {
                    id: staff.id,
                    employmentStatus: staff.employmentStatus,
                    departments: staff.departmentAssignments,
                }
                : null,
        );
    }

    async findServiceById(id: string): Promise<ServiceSlotSummary | null> {
        return prisma.serviceCatalog.findUnique({
            where: { id },
            select: {
                id: true,
                departmentId: true,
                defaultDurationMinutes: true,
                isActive: true,
            },
        });
    }

    async listWeeklySchedules(staffProfileId: string): Promise<StaffScheduleEntity[]> {
        const schedules = await prisma.staffSchedule.findMany({
            where: { staffProfileId },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });

        return schedules.map(toScheduleEntity);
    }

    async replaceWeeklySchedules(
        staffProfileId: string,
        days: UpsertScheduleDayData[],
        actorUserId?: string,
    ): Promise<StaffScheduleEntity[]> {
        return prisma.$transaction(async (tx) => {
            await tx.staffSchedule.deleteMany({
                where: { staffProfileId },
            });

            if (days.length > 0) {
                await tx.staffSchedule.createMany({
                    data: days.map((day) => ({
                        staffProfileId,
                        departmentId: day.departmentId,
                        dayOfWeek: day.dayOfWeek,
                        startTime: day.startTime,
                        endTime: day.endTime,
                        slotDurationMinutes: day.slotDurationMinutes,
                        breakStart: day.breakStart ?? null,
                        breakEnd: day.breakEnd ?? null,
                        isActive: true,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    })),
                });
            }

            const schedules = await tx.staffSchedule.findMany({
                where: { staffProfileId },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            });

            return schedules.map(toScheduleEntity);
        });
    }

    async listExceptions(filters: {
        staffProfileId: string;
        from?: Date;
        to?: Date;
    }): Promise<ScheduleExceptionEntity[]> {
        const exceptions = await prisma.scheduleException.findMany({
            where: {
                staffProfileId: filters.staffProfileId,
                exceptionDate: {
                    gte: filters.from,
                    lte: filters.to,
                },
            },
            orderBy: [{ exceptionDate: 'asc' }, { startTime: 'asc' }],
        });

        return exceptions.map(toExceptionEntity);
    }

    async createException(
        staffProfileId: string,
        data: CreateScheduleExceptionData,
    ): Promise<ScheduleExceptionEntity> {
        const exception = await prisma.scheduleException.create({
            data: {
                staffProfileId,
                departmentId: data.departmentId ?? null,
                exceptionDate: data.exceptionDate,
                startTime: data.startTime ?? null,
                endTime: data.endTime ?? null,
                isUnavailable: data.isUnavailable,
                reason: data.reason ?? null,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });

        return toExceptionEntity(exception);
    }

    async deleteException(
        staffProfileId: string,
        exceptionId: string,
    ): Promise<void> {
        const result = await prisma.scheduleException.deleteMany({
            where: {
                id: exceptionId,
                staffProfileId,
            },
        });

        if (result.count === 0) {
            throw new AppError('Schedule exception not found', 404);
        }
    }

    async listSchedulesForDay(filters: {
        staffProfileId: string;
        dayOfWeek: number;
    }): Promise<StaffScheduleEntity[]> {
        const schedules = await prisma.staffSchedule.findMany({
            where: {
                staffProfileId: filters.staffProfileId,
                dayOfWeek: filters.dayOfWeek,
                isActive: true,
            },
            orderBy: { startTime: 'asc' },
        });

        return schedules.map(toScheduleEntity);
    }

    async listExceptionsForDate(filters: {
        staffProfileId: string;
        departmentId: string;
        date: Date;
    }): Promise<ScheduleExceptionEntity[]> {
        const exceptions = await prisma.scheduleException.findMany({
            where: {
                staffProfileId: filters.staffProfileId,
                exceptionDate: filters.date,
                OR: [{ departmentId: filters.departmentId }, { departmentId: null }],
            },
            orderBy: { startTime: 'asc' },
        });

        return exceptions.map(toExceptionEntity);
    }

    async listBookedAppointments(filters: {
        staffProfileId: string;
        start: Date;
        end: Date;
    }): Promise<BookedAppointmentSlot[]> {
        return prisma.appointment.findMany({
            where: {
                staffProfileId: filters.staffProfileId,
                scheduledAt: {
                    lt: filters.end,
                },
                endAt: {
                    gt: filters.start,
                },
                status: {
                    notIn: ['CANCELLED', 'NO_SHOW'],
                },
            },
            select: {
                scheduledAt: true,
                endAt: true,
            },
        });
    }
}
