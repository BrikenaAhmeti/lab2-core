import {
    ContactMessageListResult,
    ContactMessageStatus,
    ContactMessageView,
} from './contact.entity';

export interface CreateContactMessageData {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
}

export interface ListContactMessagesFilters {
    page: number;
    limit: number;
    status?: ContactMessageStatus;
}

export interface UpdateContactMessageStatusData {
    status: ContactMessageStatus;
    replyNotes?: string | null;
    repliedAt?: Date | null;
    actorUserId?: string;
}

export interface ContactRepository {
    createMessage(data: CreateContactMessageData): Promise<ContactMessageView>;
    listMessages(
        filters: ListContactMessagesFilters,
    ): Promise<ContactMessageListResult>;
    findMessageById(id: string): Promise<ContactMessageView | null>;
    updateMessageStatus(
        id: string,
        data: UpdateContactMessageStatusData,
    ): Promise<ContactMessageView>;
    findAdminNotificationUserIds(): Promise<string[]>;
}
