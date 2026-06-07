const mockPrisma = {
    department: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
};

jest.mock('../../src/infrastructure/db/prisma', () => ({
    prisma: mockPrisma,
}));

import { DepartmentPrismaRepository } from '../../src/modules/departments/infrastructure/department.prisma.repository';

describe('DepartmentPrismaRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.department.findMany.mockResolvedValue([]);
        mockPrisma.department.count.mockResolvedValue(0);
    });

    it('filters by a single open-hours date time with newest default sorting', async () => {
        const repository = new DepartmentPrismaRepository();

        await repository.list({
            page: 2,
            limit: 5,
            isActive: true,
            openAt: '2026-01-05T10:30',
        });

        expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
            where: {
                isActive: true,
                AND: [
                    {
                        AND: [
                            {
                                operatingHours: {
                                    path: ['monday', 'isOpen'],
                                    equals: true,
                                },
                            },
                            {
                                operatingHours: {
                                    path: ['monday', 'startTime'],
                                    lte: '10:30',
                                },
                            },
                            {
                                operatingHours: {
                                    path: ['monday', 'endTime'],
                                    gte: '10:30',
                                },
                            },
                        ],
                    },
                ],
            },
            orderBy: [{ createdAt: 'desc' }, { sortOrder: 'asc' }],
            skip: 5,
            take: 5,
        });
        expect(mockPrisma.department.count).toHaveBeenCalledWith({
            where: {
                isActive: true,
                AND: [
                    {
                        AND: [
                            {
                                operatingHours: {
                                    path: ['monday', 'isOpen'],
                                    equals: true,
                                },
                            },
                            {
                                operatingHours: {
                                    path: ['monday', 'startTime'],
                                    lte: '10:30',
                                },
                            },
                            {
                                operatingHours: {
                                    path: ['monday', 'endTime'],
                                    gte: '10:30',
                                },
                            },
                        ],
                    },
                ],
            },
        });
    });

    it('filters by an open-hours date time range', async () => {
        const repository = new DepartmentPrismaRepository();

        await repository.list({
            page: 1,
            limit: 10,
            openFrom: '2026-01-05T09:00',
            openTo: '2026-01-07T15:30',
        });

        expect(mockPrisma.department.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    AND: [
                        {
                            OR: [
                                {
                                    AND: expect.arrayContaining([
                                        {
                                            operatingHours: {
                                                path: ['monday', 'isOpen'],
                                                equals: true,
                                            },
                                        },
                                        {
                                            operatingHours: {
                                                path: ['monday', 'startTime'],
                                                lte: '23:59',
                                            },
                                        },
                                        {
                                            operatingHours: {
                                                path: ['monday', 'endTime'],
                                                gte: '09:00',
                                            },
                                        },
                                    ]),
                                },
                                {
                                    AND: expect.arrayContaining([
                                        {
                                            operatingHours: {
                                                path: ['tuesday', 'isOpen'],
                                                equals: true,
                                            },
                                        },
                                    ]),
                                },
                                {
                                    AND: expect.arrayContaining([
                                        {
                                            operatingHours: {
                                                path: ['wednesday', 'isOpen'],
                                                equals: true,
                                            },
                                        },
                                        {
                                            operatingHours: {
                                                path: ['wednesday', 'endTime'],
                                                gte: '00:00',
                                            },
                                        },
                                    ]),
                                },
                            ],
                        },
                    ],
                },
            }),
        );
    });
});
