import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SubmitFeedbackCommand } from '../application/commands/submit-feedback.command';
import { UpdateFeedbackStatusCommand } from '../application/commands/update-feedback-status.command';
import { ListFeedbackHandler } from '../application/handlers/list-feedback.handler';
import { ListMyFeedbackHandler } from '../application/handlers/list-my-feedback.handler';
import { SubmitFeedbackHandler } from '../application/handlers/submit-feedback.handler';
import { UpdateFeedbackStatusHandler } from '../application/handlers/update-feedback-status.handler';
import { ListFeedbackQuery } from '../application/queries/list-feedback.query';
import { ListMyFeedbackQuery } from '../application/queries/list-my-feedback.query';
import { FeedbackStatus } from '../domain/feedback.entity';
import { FeedbackPrismaRepository } from '../infrastructure/feedback.prisma.repository';
import { NotificationFeedbackEventPublisher } from '../infrastructure/notification-feedback-event.publisher';
import { FeedbackService } from '../services/feedback.service';

const feedbackStatusValues = ['pending', 'published', 'hidden'] as const;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const optionalTrimmedQueryString = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, z.string().trim().min(1).max(120).optional());

function addUtcDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function parseDateOnly(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

function parseSubmittedDateBoundary(
    value: string,
    boundary: 'from' | 'to',
) {
    const trimmedValue = value.trim();
    const date = dateOnlyPattern.test(trimmedValue)
        ? parseDateOnly(trimmedValue)
        : new Date(trimmedValue);

    if (!date || Number.isNaN(date.getTime())) {
        return new Date(Number.NaN);
    }

    return dateOnlyPattern.test(trimmedValue) && boundary === 'to'
        ? addUtcDays(date, 1)
        : date;
}

const submittedDateBoundarySchema = (boundary: 'from' | 'to') =>
    z.preprocess((value) => {
        if (value === undefined || value === '') {
            return undefined;
        }

        return typeof value === 'string'
            ? parseSubmittedDateBoundary(value, boundary)
            : value;
    }, z.date().refine((value) => !Number.isNaN(value.getTime()), 'Invalid submitted date').optional());

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid feedback id'),
});

const submitFeedbackBodySchema = z.object({
    appointmentId: z.string().uuid('Invalid appointment id'),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).nullable().optional(),
    isAnonymous: z.boolean().optional(),
});

const listFeedbackQueryBaseSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    status: z.enum(feedbackStatusValues).optional(),
    patientSearch: optionalTrimmedQueryString,
    appointmentSearch: optionalTrimmedQueryString,
    submittedAtFrom: submittedDateBoundarySchema('from'),
    submittedAtTo: submittedDateBoundarySchema('to'),
});

const listFeedbackQuerySchema = listFeedbackQueryBaseSchema.refine(
    (query) =>
        !query.submittedAtFrom ||
        !query.submittedAtTo ||
        query.submittedAtFrom < query.submittedAtTo,
    {
        message: 'Submitted date range is invalid',
        path: ['submittedAtTo'],
    },
);

const updateFeedbackStatusBodySchema = z.object({
    status: z.enum(feedbackStatusValues),
});

function hasPermission(req: Request, permission: string, scope?: string) {
    const permissions = req.user?.permissions ?? [];

    if (scope) {
        return (
            permissions.includes(`${permission}:${scope}`) ||
            permissions.includes(permission)
        );
    }

    return (
        permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`))
    );
}

export class FeedbackController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new FeedbackService(
        new FeedbackPrismaRepository(),
        new NotificationFeedbackEventPublisher(),
    );
    private readonly submitFeedbackHandler = new SubmitFeedbackHandler(
        this.service,
    );
    private readonly listFeedbackHandler = new ListFeedbackHandler(this.service);
    private readonly listMyFeedbackHandler = new ListMyFeedbackHandler(
        this.service,
    );
    private readonly updateFeedbackStatusHandler =
        new UpdateFeedbackStatusHandler(this.service);

    async submit(req: Request, res: Response) {
        const body = submitFeedbackBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.submitFeedbackHandler,
            new SubmitFeedbackCommand(
                body.appointmentId,
                body.rating,
                body.comment,
                body.isAnonymous,
                req.user?.id,
            ),
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const query = listFeedbackQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listFeedbackHandler,
            new ListFeedbackQuery(
                query.page,
                query.limit,
                query.staffProfileId,
                query.departmentId,
                query.status as FeedbackStatus | undefined,
                query.patientSearch,
                query.appointmentSearch,
                query.submittedAtFrom,
                query.submittedAtTo,
                req.user?.id,
                hasPermission(req, 'feedback:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async my(req: Request, res: Response) {
        const query = listFeedbackQueryBaseSchema
            .pick({ page: true, limit: true })
            .parse(req.query);
        const result = await this.queryBus.execute(
            this.listMyFeedbackHandler,
            new ListMyFeedbackQuery(query.page, query.limit, req.user?.id),
        );

        return res.status(200).json(result);
    }

    async updateStatus(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateFeedbackStatusBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateFeedbackStatusHandler,
            new UpdateFeedbackStatusCommand(
                params.id,
                body.status as FeedbackStatus,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }
}
