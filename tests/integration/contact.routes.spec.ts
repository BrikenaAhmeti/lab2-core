import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ContactMessageView } from '../../src/modules/contact/domain/contact.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'contact-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    ContactPrismaRepository,
} = require('../../src/modules/contact/infrastructure/contact.prisma.repository');

const contactId = '9d8ae239-d774-45d1-b8c0-c7f566e0e604';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const adminUserId = '00000000-0000-0000-0000-000000000001';
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

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: actorUserId,
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Contact routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('accepts public contact form submissions', async () => {
        const createSpy = jest
            .spyOn(ContactPrismaRepository.prototype, 'createMessage')
            .mockResolvedValue(contactMessage);
        jest.spyOn(
            ContactPrismaRepository.prototype,
            'findAdminNotificationUserIds',
        ).mockResolvedValue([adminUserId]);

        const response = await request(app)
            .post('/api/contact')
            .send({
                name: ' Ada   Lovelace ',
                email: 'ADA@EXAMPLE.COM',
                phone: '+38344111222',
                subject: ' Appointment   question ',
                message: ' Can I move my appointment? ',
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(contactId);
        expect(createSpy).toHaveBeenCalledWith({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            phone: '+38344111222',
            subject: 'Appointment question',
            message: 'Can I move my appointment?',
        });
    });

    it('lists contact submissions for admins', async () => {
        const listSpy = jest
            .spyOn(ContactPrismaRepository.prototype, 'listMessages')
            .mockResolvedValue({
                items: [contactMessage],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/contact?status=new')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['contact:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'new',
            }),
        );
    });

    it('marks contact submissions as replied with notes', async () => {
        jest.spyOn(
            ContactPrismaRepository.prototype,
            'findMessageById',
        ).mockResolvedValue(contactMessage);
        const updateSpy = jest
            .spyOn(ContactPrismaRepository.prototype, 'updateMessageStatus')
            .mockResolvedValue({
                ...contactMessage,
                status: 'replied',
                replyNotes: 'Answered by email',
                repliedAt: now,
            });

        const response = await request(app)
            .patch(`/api/contact/${contactId}/status`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['contact:manage:all'])}`,
            )
            .send({
                status: 'replied',
                replyNotes: ' Answered   by email ',
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('replied');
        expect(updateSpy).toHaveBeenCalledWith(
            contactId,
            expect.objectContaining({
                status: 'replied',
                replyNotes: 'Answered by email',
            }),
        );
    });
});
