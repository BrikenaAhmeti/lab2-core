import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'schedule-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');

const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const exceptionId = '19d58aae-448c-40fb-8c2b-17fdb09883b8';

const staff = {
    id: staffProfileId,
    employmentStatus: 'ACTIVE',
    departments: [
        {
            departmentId,
            unassignedAt: null,
            department: {
                id: departmentId,
                isActive: true,
            },
        },
    ],
};

const schedule = {
    id: 'schedule-1',
    staffProfileId,
    departmentId,
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    slotDurationMinutes: 30,
    breakStart: '10:00',
    breakEnd: '10:30',
    validFrom: null,
    validTo: null,
    isActive: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
};

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

function weeklyPayload() {
    return {
        days: Array.from({ length: 7 }, (_, dayOfWeek) =>
            dayOfWeek === 1
                ? {
                    dayOfWeek,
                    isActive: true,
                    departmentId,
                    startTime: '09:00',
                    endTime: '11:00',
                    slotDurationMinutes: 30,
                    breakStart: '10:00',
                    breakEnd: '10:30',
                }
                : {
                    dayOfWeek,
                    isActive: false,
                },
        ),
    };
}

describe('Schedule routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('returns a full seven-day weekly schedule', async () => {
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue(
            staff,
        );
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'listWeeklySchedules')
            .mockResolvedValue([schedule]);

        const response = await request(app)
            .get(`/api/staff/${staffProfileId}/schedules`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.days).toHaveLength(7);
        expect(response.body.days[1]).toEqual(
            expect.objectContaining({
                dayOfWeek: 1,
                isActive: true,
                breakStart: '10:00',
                breakEnd: '10:30',
            }),
        );
    });

    it('upserts a weekly schedule', async () => {
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue(
            staff,
        );
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'replaceWeeklySchedules')
            .mockResolvedValue([schedule]);
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'listWeeklySchedules')
            .mockResolvedValue([schedule]);

        const response = await request(app)
            .put(`/api/staff/${staffProfileId}/schedules`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:manage:all'])}`)
            .send(weeklyPayload());

        expect(response.status).toBe(200);
        expect(response.body.days[1].isActive).toBe(true);
        expect(
            SchedulePrismaRepository.prototype.replaceWeeklySchedules,
        ).toHaveBeenCalledWith(
            staffProfileId,
            [
                expect.objectContaining({
                    dayOfWeek: 1,
                    departmentId,
                    breakStart: '10:00',
                    breakEnd: '10:30',
                }),
            ],
            '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
        );
    });

    it('creates and deletes schedule exceptions', async () => {
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue(
            staff,
        );
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'createException')
            .mockResolvedValue({
                id: exceptionId,
                staffProfileId,
                departmentId,
                exceptionDate: new Date('2026-05-18T00:00:00.000Z'),
                startTime: null,
                endTime: null,
                isUnavailable: true,
                reason: 'Vacation',
                createdAt: new Date('2026-05-01T00:00:00.000Z'),
                updatedAt: new Date('2026-05-01T00:00:00.000Z'),
            });
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'deleteException')
            .mockResolvedValue(undefined);

        const created = await request(app)
            .post(`/api/staff/${staffProfileId}/schedule-exceptions`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:manage:all'])}`)
            .send({
                departmentId,
                exceptionDate: '2026-05-18',
                reason: 'Vacation',
            });

        expect(created.status).toBe(201);
        expect(created.body.reason).toBe('Vacation');

        const deleted = await request(app)
            .delete(`/api/staff/${staffProfileId}/schedule-exceptions/${exceptionId}`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:manage:all'])}`);

        expect(deleted.status).toBe(204);
    });

    it('returns available slots minus breaks and booked appointments', async () => {
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue(
            staff,
        );
        jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay')
            .mockResolvedValue([schedule]);
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
            .mockResolvedValue([]);
        jest
            .spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments')
            .mockResolvedValue([
                {
                    scheduledAt: new Date('2030-05-20T09:30:00.000Z'),
                    endAt: new Date('2030-05-20T10:00:00.000Z'),
                },
            ]);

        const response = await request(app)
            .get(
                `/api/staff/${staffProfileId}/available-slots?date=2030-05-20&serviceId=${serviceId}`,
            )
            .set('Authorization', `Bearer ${createAccessToken(['staff:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.slots.map((slot: { startTime: string }) => slot.startTime)).toEqual([
            '09:00',
            '10:30',
        ]);
    });
});
