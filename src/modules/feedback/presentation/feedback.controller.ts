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

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid feedback id'),
});

const submitFeedbackBodySchema = z.object({
    appointmentId: z.string().uuid('Invalid appointment id'),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).nullable().optional(),
    isAnonymous: z.boolean().optional(),
});

const listFeedbackQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    departmentId: z.string().uuid('Invalid department id').optional(),
    status: z.enum(feedbackStatusValues).optional(),
});

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
                req.user?.id,
                hasPermission(req, 'feedback:read', 'all'),
            ),
        );

        return res.status(200).json(result);
    }

    async my(req: Request, res: Response) {
        const query = listFeedbackQuerySchema
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
