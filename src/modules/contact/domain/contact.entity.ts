export type ContactMessageStatus = 'new' | 'read' | 'replied';

export interface ContactMessageView {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    status: ContactMessageStatus;
    replyNotes: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ContactMessageListResult {
    items: ContactMessageView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
