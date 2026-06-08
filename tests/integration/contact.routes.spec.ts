import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ContactMessageView } from '../../src/modules/contact/domain/contact.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'contact-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.INTERNAL_API_KEY = 'contact-routes-internal-key';
process.env.AUTH_SERVICE_URL = 'http://auth.local';
process.env.NOTIFICATION_SERVICE_URL = '';

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

    it('allows contact requests from the current local frontend origin', async () => {
        const response = await request(app)
            .options('/api/contact')
            .set('Origin', 'http://localhost:3002')
            .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3002');
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('accepts public contact form submissions', async () => {
        const createSpy = jest
            .spyOn(ContactPrismaRepository.prototype, 'createMessage')
            .mockResolvedValue(contactMessage);
        jest.spyOn(
            ContactPrismaRepository.prototype,
            'findAdminNotificationUserIds',
        ).mockResolvedValue([adminUserId]);
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

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
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe('http://auth.local/internal/auth/contact-acknowledgement');
        expect(options?.method).toBe('POST');
        expect(options?.headers).toEqual(
            expect.objectContaining({
                'content-type': 'application/json',
                'x-internal-api-key': 'contact-routes-internal-key',
            }),
        );
        expect(JSON.parse(options?.body as string)).toEqual({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            subject: 'Appointment question',
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
            .get('/api/contact?status=new&search=Ada&createdAtFrom=2026-05-26&createdAtTo=2026-05-26')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['contact:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'new',
                search: 'Ada',
                createdAtFrom: expect.any(Date),
                createdAtTo: expect.any(Date),
            }),
        );
        const filters = listSpy.mock.calls[0][0] as {
            createdAtFrom?: Date;
            createdAtTo?: Date;
        };
        expect(filters.createdAtFrom?.toISOString()).toBe('2026-05-26T00:00:00.000Z');
        expect(filters.createdAtTo?.toISOString()).toBe('2026-05-27T00:00:00.000Z');
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
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

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
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe('http://auth.local/internal/auth/contact-reply');
        expect(options?.method).toBe('POST');
        expect(JSON.parse(options?.body as string)).toEqual({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            subject: 'Appointment question',
            replyText: 'Answered by email',
        });
        expect(updateSpy).toHaveBeenCalledWith(
            contactId,
            expect.objectContaining({
                status: 'replied',
                replyNotes: 'Answered by email',
            }),
        );
    });
});
