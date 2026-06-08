const mockPrisma = {
    contactMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
    ),
};

jest.mock('../../src/infrastructure/db/prisma', () => ({
    prisma: mockPrisma,
}));

import { ContactPrismaRepository } from '../../src/modules/contact/infrastructure/contact.prisma.repository';

describe('ContactPrismaRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.contactMessage.findMany.mockResolvedValue([]);
        mockPrisma.contactMessage.count.mockResolvedValue(0);
    });

    it('filters contact messages by sender search and received date range', async () => {
        const repository = new ContactPrismaRepository();
        const createdAtFrom = new Date('2026-05-26T00:00:00.000Z');
        const createdAtTo = new Date('2026-05-27T00:00:00.000Z');

        await repository.listMessages({
            page: 1,
            limit: 25,
            status: 'new',
            search: ' Ada   Lovelace ',
            createdAtFrom,
            createdAtTo,
        });

        expect(mockPrisma.contactMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'new',
                    createdAt: {
                        gte: createdAtFrom,
                        lt: createdAtTo,
                    },
                    AND: expect.arrayContaining([
                        expect.objectContaining({
                            OR: expect.arrayContaining([
                                {
                                    name: {
                                        contains: 'Ada',
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    email: {
                                        contains: 'Ada',
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    phone: {
                                        contains: 'Ada',
                                        mode: 'insensitive',
                                    },
                                },
                            ]),
                        }),
                        expect.objectContaining({
                            OR: expect.arrayContaining([
                                {
                                    name: {
                                        contains: 'Lovelace',
                                        mode: 'insensitive',
                                    },
                                },
                            ]),
                        }),
                    ]),
                }),
                skip: 0,
                take: 25,
            }),
        );

        const where = mockPrisma.contactMessage.findMany.mock.calls[0][0].where;

        expect(mockPrisma.contactMessage.count).toHaveBeenCalledWith({ where });
    });
});
