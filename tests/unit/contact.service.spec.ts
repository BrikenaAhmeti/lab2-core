import { ContactEventPublisher } from '../../src/modules/contact/domain/contact-event.publisher';
import { ContactMessageView } from '../../src/modules/contact/domain/contact.entity';
import { ContactRepository } from '../../src/modules/contact/domain/contact.repository';
import { ContactService } from '../../src/modules/contact/services/contact.service';

const contactId = '9d8ae239-d774-45d1-b8c0-c7f566e0e604';
const adminUserId = '00000000-0000-0000-0000-000000000001';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const now = new Date('2026-05-26T10:00:00.000Z');

const contactMessage: ContactMessageView = {
    id: contactId,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+38344111222',
    subject: 'Appointment question',
    message: 'Can I move my appointment?',
    status: 'new',
    replyNotes: null,
    repliedAt: null,
    createdAt: now,
    updatedAt: now,
};

function createRepositoryMock(): jest.Mocked<ContactRepository> {
    return {
        createMessage: jest.fn(),
        listMessages: jest.fn(),
        findMessageById: jest.fn(),
        updateMessageStatus: jest.fn(),
        findAdminNotificationUserIds: jest.fn(),
    };
}

function createPublisherMock(): jest.Mocked<ContactEventPublisher> {
    return {
        publish: jest.fn(),
    };
}

describe('ContactService', () => {
    it('submits a public contact message and notifies configured admins', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.createMessage.mockResolvedValue(contactMessage);
        repository.findAdminNotificationUserIds.mockResolvedValue([adminUserId]);
        const service = new ContactService(repository, publisher, () => now);

        const result = await service.submitContactMessage({
            name: ' Ada   Lovelace ',
            email: ' ADA@EXAMPLE.COM ',
            phone: ' +38344111222 ',
            subject: ' Appointment   question ',
            message: ' Can I move my appointment? ',
        });

        expect(result.id).toBe(contactId);
        expect(repository.createMessage).toHaveBeenCalledWith({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            phone: '+38344111222',
            subject: 'Appointment question',
            message: 'Can I move my appointment?',
        });
        expect(publisher.publish).toHaveBeenCalledWith(
            'ContactMessageSubmitted',
            {
                message: contactMessage,
                adminUserIds: [adminUserId],
            },
        );
    });

    it('requires reply notes when marking a contact message as replied', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findMessageById.mockResolvedValue(contactMessage);
        const service = new ContactService(repository, publisher, () => now);

        await expect(
            service.updateMessageStatus(contactId, {
                status: 'replied',
                actorUserId,
            }),
        ).rejects.toMatchObject({
            message: 'Reply text is required before sending a reply',
            statusCode: 400,
        });

        expect(repository.updateMessageStatus).not.toHaveBeenCalled();
    });

    it('marks a contact message as replied with notes', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findMessageById.mockResolvedValue(contactMessage);
        repository.updateMessageStatus.mockResolvedValue({
            ...contactMessage,
            status: 'replied',
            replyNotes: 'Answered by email',
            repliedAt: now,
        });
        const service = new ContactService(repository, publisher, () => now);

        const result = await service.updateMessageStatus(contactId, {
            status: 'replied',
            replyNotes: ' Answered   by email ',
            actorUserId,
        });

        expect(result.status).toBe('replied');
        expect(publisher.publish).toHaveBeenCalledWith(
            'ContactMessageReplied',
            {
                message: contactMessage,
                replyText: 'Answered by email',
                actorUserId,
            },
        );
        expect(repository.updateMessageStatus).toHaveBeenCalledWith(
            contactId,
            {
                status: 'replied',
                replyNotes: 'Answered by email',
                repliedAt: now,
                actorUserId,
            },
        );
    });

    it('does not mark replied when reply email delivery fails', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        repository.findMessageById.mockResolvedValue(contactMessage);
        publisher.publish.mockRejectedValue(new Error('Email failed'));
        const service = new ContactService(repository, publisher, () => now);

        await expect(
            service.updateMessageStatus(contactId, {
                status: 'replied',
                replyNotes: 'Answered by email',
                actorUserId,
            }),
        ).rejects.toThrow('Email failed');

        expect(repository.updateMessageStatus).not.toHaveBeenCalled();
    });
});
