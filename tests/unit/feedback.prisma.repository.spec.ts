const mockPrisma = {
    feedback: {
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

import { FeedbackPrismaRepository } from '../../src/modules/feedback/infrastructure/feedback.prisma.repository';

const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const departmentId = '6b2d5084-453e-471d-8a51-9ad8fe1f5f8d';

describe('FeedbackPrismaRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.feedback.findMany.mockResolvedValue([]);
        mockPrisma.feedback.count.mockResolvedValue(0);
    });

    it('filters feedback by patient, appointment, and submitted date range', async () => {
        const repository = new FeedbackPrismaRepository();
        const submittedAtFrom = new Date('2026-05-01T00:00:00.000Z');
        const submittedAtTo = new Date('2026-06-01T00:00:00.000Z');

        await repository.listFeedback({
            page: 1,
            limit: 25,
            staffProfileId,
            departmentId,
            status: 'pending',
            patientSearch: ' Ada   Lovelace ',
            appointmentSearch: ' Initial   Cardiology ',
            submittedAtFrom,
            submittedAtTo,
        });

        expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'pending',
                    submittedAt: {
                        gte: submittedAtFrom,
                        lt: submittedAtTo,
                    },
                    appointment: {
                        is: expect.objectContaining({
                            staffProfileId,
                            departmentId,
                            AND: expect.arrayContaining([
                                expect.objectContaining({
                                    OR: expect.arrayContaining([
                                        {
                                            serviceCatalog: {
                                                name: {
                                                    contains: 'Initial',
                                                    mode: 'insensitive',
                                                },
                                            },
                                        },
                                    ]),
                                }),
                                expect.objectContaining({
                                    OR: expect.arrayContaining([
                                        {
                                            department: {
                                                name: {
                                                    contains: 'Cardiology',
                                                    mode: 'insensitive',
                                                },
                                            },
                                        },
                                    ]),
                                }),
                            ]),
                        }),
                    },
                    AND: expect.arrayContaining([
                        expect.objectContaining({
                            patient: expect.objectContaining({
                                OR: expect.arrayContaining([
                                    {
                                        firstName: {
                                            contains: 'Ada',
                                            mode: 'insensitive',
                                        },
                                    },
                                ]),
                            }),
                        }),
                        expect.objectContaining({
                            patient: expect.objectContaining({
                                OR: expect.arrayContaining([
                                    {
                                        lastName: {
                                            contains: 'Lovelace',
                                            mode: 'insensitive',
                                        },
                                    },
                                ]),
                            }),
                        }),
                    ]),
                }),
                skip: 0,
                take: 25,
            }),
        );

        const where = mockPrisma.feedback.findMany.mock.calls[0][0].where;

        expect(mockPrisma.feedback.count).toHaveBeenCalledWith({ where });
    });
});
