import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    ContactMessageListResult,
    ContactMessageStatus,
    ContactMessageView,
} from '../domain/contact.entity';
import {
    ContactRepository,
    CreateContactMessageData,
    ListContactMessagesFilters,
    UpdateContactMessageStatusData,
} from '../domain/contact.repository';

type ContactMessageRecord = Prisma.ContactMessageGetPayload<object>;

function toContactStatus(value: string): ContactMessageStatus {
    if (value === 'read' || value === 'replied') {
        return value;
    }

    return 'new';
}

function toContactMessageView(
    message: ContactMessageRecord,
): ContactMessageView {
    return {
        id: message.id,
        name: message.name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        message: message.message,
        status: toContactStatus(message.status),
        replyNotes: message.replyNotes,
        repliedAt: message.repliedAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
    };
}

function textContains(value: string) {
    return {
        contains: value,
        mode: 'insensitive' as const,
    };
}

function toSearchTerms(value?: string) {
    const search = value?.trim().replace(/\s+/g, ' ');

    return search ? search.split(' ') : [];
}

function buildSenderSearchFilters(
    terms: string[],
): Prisma.ContactMessageWhereInput[] {
    return terms.map((term) => ({
        OR: [
            {
                name: textContains(term),
            },
            {
                email: textContains(term),
            },
            {
                phone: textContains(term),
            },
        ],
    }));
}

function buildListWhere(filters: ListContactMessagesFilters) {
    const where: Prisma.ContactMessageWhereInput = {};
    const andFilters = buildSenderSearchFilters(toSearchTerms(filters.search));

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.createdAtFrom || filters.createdAtTo) {
        where.createdAt = {
            gte: filters.createdAtFrom,
            lt: filters.createdAtTo,
        };
    }

    if (andFilters.length > 0) {
        where.AND = andFilters;
    }

    return where;
}

function readUserIdFromSetting(value: Prisma.JsonValue) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const userId = (value as { userId?: unknown }).userId;

    return typeof userId === 'string' && userId.length > 0 ? userId : null;
}

export class ContactPrismaRepository implements ContactRepository {
    async createMessage(
        data: CreateContactMessageData,
    ): Promise<ContactMessageView> {
        const message = await prisma.contactMessage.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone ?? null,
                subject: data.subject,
                message: data.message,
                status: 'new',
            },
        });

        return toContactMessageView(message);
    }

    async listMessages(
        filters: ListContactMessagesFilters,
    ): Promise<ContactMessageListResult> {
        const where = buildListWhere(filters);
        const skip = (filters.page - 1) * filters.limit;

        const [items, total] = await prisma.$transaction([
            prisma.contactMessage.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.contactMessage.count({ where }),
        ]);

        return {
            items: items.map(toContactMessageView),
            meta: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
            },
        };
    }

    async findMessageById(id: string): Promise<ContactMessageView | null> {
        const message = await prisma.contactMessage.findUnique({
            where: { id },
        });

        return message ? toContactMessageView(message) : null;
    }

    async updateMessageStatus(
        id: string,
        data: UpdateContactMessageStatusData,
    ): Promise<ContactMessageView> {
        const message = await prisma.contactMessage.update({
            where: { id },
            data: {
                status: data.status,
                replyNotes: data.replyNotes,
                repliedAt: data.repliedAt,
                updatedBy: data.actorUserId,
            },
        });

        return toContactMessageView(message);
    }

    async findAdminNotificationUserIds(): Promise<string[]> {
        const setting = await prisma.setting.findUnique({
            where: { key: 'auth.super_admin_reference' },
            select: { value: true },
        });

        const userId = setting ? readUserIdFromSetting(setting.value) : null;

        return userId ? [userId] : [];
    }
}
