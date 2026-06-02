import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SubmitContactMessageCommand } from '../application/commands/submit-contact-message.command';
import { UpdateContactMessageStatusCommand } from '../application/commands/update-contact-message-status.command';
import { ListContactMessagesHandler } from '../application/handlers/list-contact-messages.handler';
import { SubmitContactMessageHandler } from '../application/handlers/submit-contact-message.handler';
import { UpdateContactMessageStatusHandler } from '../application/handlers/update-contact-message-status.handler';
import { ListContactMessagesQuery } from '../application/queries/list-contact-messages.query';
import { ContactMessageStatus } from '../domain/contact.entity';
import { AuthContactEmailEventPublisher } from '../infrastructure/auth-contact-email-event.publisher';
import { CompositeContactEventPublisher } from '../infrastructure/composite-contact-event.publisher';
import { ContactPrismaRepository } from '../infrastructure/contact.prisma.repository';
import { NotificationContactEventPublisher } from '../infrastructure/notification-contact-event.publisher';
import { ContactService } from '../services/contact.service';

const contactStatusValues = ['new', 'read', 'replied'] as const;

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid contact message id'),
});

const submitContactBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(50).nullable().optional(),
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
});

const listContactQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(contactStatusValues).optional(),
});

const updateContactStatusBodySchema = z.object({
    status: z.enum(contactStatusValues),
    replyNotes: z.string().trim().max(2000).nullable().optional(),
});

export class ContactController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new ContactService(
        new ContactPrismaRepository(),
        new CompositeContactEventPublisher([
            new NotificationContactEventPublisher(),
            new AuthContactEmailEventPublisher(),
        ]),
    );
    private readonly submitContactHandler = new SubmitContactMessageHandler(
        this.service,
    );
    private readonly listContactMessagesHandler = new ListContactMessagesHandler(
        this.service,
    );
    private readonly updateContactMessageStatusHandler =
        new UpdateContactMessageStatusHandler(this.service);

    async submit(req: Request, res: Response) {
        const body = submitContactBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.submitContactHandler,
            new SubmitContactMessageCommand(
                body.name,
                body.email,
                body.subject,
                body.message,
                body.phone,
            ),
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const query = listContactQuerySchema.parse(req.query);
        const result = await this.queryBus.execute(
            this.listContactMessagesHandler,
            new ListContactMessagesQuery(
                query.page,
                query.limit,
                query.status as ContactMessageStatus | undefined,
            ),
        );

        return res.status(200).json(result);
    }

    async updateStatus(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateContactStatusBodySchema.parse(req.body);
        const result = await this.commandBus.execute(
            this.updateContactMessageStatusHandler,
            new UpdateContactMessageStatusCommand(
                params.id,
                body.status as ContactMessageStatus,
                body.replyNotes,
                req.user?.id,
            ),
        );

        return res.status(200).json(result);
    }
}
