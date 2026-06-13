import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateScheduleExceptionCommand } from '../application/commands/create-schedule-exception.command';
import { DeleteScheduleExceptionCommand } from '../application/commands/delete-schedule-exception.command';
import { UpsertWeeklyScheduleCommand } from '../application/commands/upsert-weekly-schedule.command';
import { CreateScheduleExceptionHandler } from '../application/handlers/create-schedule-exception.handler';
import { DeleteScheduleExceptionHandler } from '../application/handlers/delete-schedule-exception.handler';
import { GetAvailableSlotsHandler } from '../application/handlers/get-available-slots.handler';
import { GetWeeklyScheduleHandler } from '../application/handlers/get-weekly-schedule.handler';
import { ListScheduleExceptionsHandler } from '../application/handlers/list-schedule-exceptions.handler';
import { UpsertWeeklyScheduleHandler } from '../application/handlers/upsert-weekly-schedule.handler';
import { GetAvailableSlotsQuery } from '../application/queries/get-available-slots.query';
import { GetWeeklyScheduleQuery } from '../application/queries/get-weekly-schedule.query';
import { ListScheduleExceptionsQuery } from '../application/queries/list-schedule-exceptions.query';
import { createAppointmentSlotLockRepository } from '../../appointments/infrastructure/appointment-slot-lock.repository';
import { SchedulePrismaRepository } from '../infrastructure/schedule.prisma.repository';
import { ScheduleService } from '../services/schedule.service';
import { TIME_PATTERN, dateOnlyToUtcDate } from '../domain/slot-generator';

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid staff profile id'),
});

const exceptionIdParamsSchema = idParamsSchema.extend({
    exceptionId: z.string().uuid('Invalid schedule exception id').optional(),
});

const dateOnlySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
    .refine((value) => dateOnlyToUtcDate(value).toISOString().slice(0, 10) === value, {
        message: 'Invalid date',
    });

const timeSchema = z.string().regex(TIME_PATTERN, 'Time must use HH:mm format');

const weeklyScheduleDaySchema = z.object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    isActive: z.boolean(),
    departmentId: z.string().uuid('Invalid department id').nullable().optional(),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    slotDurationMinutes: z.coerce.number().int().min(5).max(480).nullable().optional(),
    breakStart: timeSchema.nullable().optional(),
    breakEnd: timeSchema.nullable().optional(),
});

const weeklyScheduleBodySchema = z.preprocess(
    (value) => {
        if (Array.isArray(value)) {
            return { days: value };
        }

        return value;
    },
    z.object({
        days: z.array(weeklyScheduleDaySchema).length(7),
    }),
);

const listExceptionsQuerySchema = z
    .object({
        from: dateOnlySchema.optional(),
        to: dateOnlySchema.optional(),
    })
    .transform((query) => ({
        from: query.from ? dateOnlyToUtcDate(query.from) : undefined,
        to: query.to ? dateOnlyToUtcDate(query.to) : undefined,
    }));

const createExceptionBodySchema = z
    .object({
        departmentId: z.string().uuid('Invalid department id').nullable().optional(),
        exceptionDate: dateOnlySchema,
        isUnavailable: z.boolean().default(true),
        startTime: timeSchema.nullable().optional(),
        endTime: timeSchema.nullable().optional(),
        reason: z.string().trim().max(500).nullable().optional(),
    })
    .transform((body) => ({
        ...body,
        exceptionDate: dateOnlyToUtcDate(body.exceptionDate),
    }));

const availableSlotsQuerySchema = z.object({
    date: dateOnlySchema,
    serviceId: z.string().uuid('Invalid service id'),
});

const deleteExceptionBodySchema = z.object({
    exceptionId: z.string().uuid('Invalid schedule exception id'),
});

export class ScheduleController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new ScheduleService(
        new SchedulePrismaRepository(),
        createAppointmentSlotLockRepository(),
    );
    private readonly getWeeklyScheduleHandler = new GetWeeklyScheduleHandler(
        this.service,
    );
    private readonly upsertWeeklyScheduleHandler = new UpsertWeeklyScheduleHandler(
        this.service,
    );
    private readonly listScheduleExceptionsHandler =
        new ListScheduleExceptionsHandler(this.service);
    private readonly createScheduleExceptionHandler =
        new CreateScheduleExceptionHandler(this.service);
    private readonly deleteScheduleExceptionHandler =
        new DeleteScheduleExceptionHandler(this.service);
    private readonly getAvailableSlotsHandler = new GetAvailableSlotsHandler(
        this.service,
    );

    async getWeeklySchedule(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const result = await this.queryBus.execute(
            this.getWeeklyScheduleHandler,
            new GetWeeklyScheduleQuery(params.id),
        );

        return res.status(200).json(result);
    }

    async upsertWeeklySchedule(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = weeklyScheduleBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.upsertWeeklyScheduleHandler,
            new UpsertWeeklyScheduleCommand(params.id, body.days, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async listExceptions(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = listExceptionsQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listScheduleExceptionsHandler,
            new ListScheduleExceptionsQuery(params.id, query.from, query.to),
        );

        return res.status(200).json(result);
    }

    async createException(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = createExceptionBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.createScheduleExceptionHandler,
            new CreateScheduleExceptionCommand(
                params.id,
                body.exceptionDate,
                body.isUnavailable,
                body.departmentId,
                body.startTime,
                body.endTime,
                body.reason,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async deleteException(req: Request, res: Response) {
        const params = exceptionIdParamsSchema.parse(req.params);
        const source = {
            exceptionId:
                params.exceptionId ??
                req.query.exceptionId ??
                (typeof req.body === 'object' && req.body !== null
                    ? req.body.exceptionId
                    : undefined),
        };
        const body = deleteExceptionBodySchema.parse(source);

        await this.commandBus.execute(
            this.deleteScheduleExceptionHandler,
            new DeleteScheduleExceptionCommand(params.id, body.exceptionId),
        );

        return res.status(204).send();
    }

    async getAvailableSlots(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = availableSlotsQuerySchema.parse(req.query);
        res.set('Cache-Control', 'no-store');
        const result = await this.queryBus.execute(
            this.getAvailableSlotsHandler,
            new GetAvailableSlotsQuery(params.id, query.serviceId, query.date),
        );

        return res.status(200).json(result);
    }
}
