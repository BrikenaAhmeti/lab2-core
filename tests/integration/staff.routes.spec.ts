import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'staff-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    StaffPrismaRepository,
} = require('../../src/modules/staff/infrastructure/staff.prisma.repository');
const {
    AppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/appointment.prisma.repository');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');

const department = {
    id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
    name: 'Cardiology',
    isActive: true,
};

const positionType = {
    id: '19d58aae-448c-40fb-8c2b-17fdb09883b8',
    name: 'Doctor',
    defaultRoleKey: 'doctor',
    isActive: true,
};

const staffProfile = {
    id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    user: {
        id: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    },
    staffPositionTypeId: positionType.id,
    positionType,
    employeeCode: 'DR-001',
    specialization: 'Cardiology',
    licenseNumber: 'LIC-100',
    employmentStatus: 'ACTIVE',
    hireDate: new Date('2026-01-10T00:00:00.000Z'),
    terminationDate: null,
    bio: 'Heart care specialist',
    isPublicProfile: true,
    departments: [
        {
            id: 'ca0c7c75-3e7d-4887-98bb-a13fd3dc7d3c',
            departmentId: department.id,
            isPrimary: true,
            assignedAt: new Date('2026-01-10T00:00:00.000Z'),
            unassignedAt: null,
            department,
        },
    ],
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
};

const service = {
    id: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
    departmentId: department.id,
    name: 'General Consultation',
    defaultDurationMinutes: 30,
    defaultPrice: 50,
    isActive: true,
    department,
};

const schedule = {
    id: 'schedule-1',
    staffProfileId: staffProfile.id,
    departmentId: department.id,
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '10:00',
    slotDurationMinutes: 30,
    breakStart: null,
    breakEnd: null,
    validFrom: null,
    validTo: null,
    isActive: true,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
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

describe('Staff routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates a staff profile successfully', async () => {
        jest.spyOn(StaffPrismaRepository.prototype, 'findPositionTypeById').mockResolvedValue(
            positionType,
        );
        jest.spyOn(StaffPrismaRepository.prototype, 'findByUserId').mockResolvedValue(null);
        jest.spyOn(StaffPrismaRepository.prototype, 'findByEmployeeCode').mockResolvedValue(
            null,
        );
        jest.spyOn(StaffPrismaRepository.prototype, 'findDepartmentsByIds').mockResolvedValue([
            department,
        ]);
        jest.spyOn(
            StaffPrismaRepository.prototype,
            'createWithDepartments',
        ).mockResolvedValue(staffProfile);

        const response = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${createAccessToken(['staff:manage:all'])}`)
            .send({
                userId: staffProfile.userId,
                staffPositionTypeId: positionType.id,
                employeeCode: ' dr-001 ',
                specialization: ' Cardiology ',
                departmentIds: [department.id],
            });

        expect(response.status).toBe(201);
        expect(response.body.employeeCode).toBe('DR-001');
        expect(response.body.departments).toHaveLength(1);
    });

    it('lists staff with filters and pagination', async () => {
        const listSpy = jest.spyOn(StaffPrismaRepository.prototype, 'list').mockResolvedValue({
            items: [staffProfile],
            meta: {
                page: 2,
                limit: 5,
                total: 1,
                totalPages: 1,
            },
        });

        const response = await request(app)
            .get(
                `/api/staff?page=2&limit=5&departmentId=${department.id}&positionTypeId=${positionType.id}&status=ACTIVE&search=cardio`,
            )
            .set('Authorization', `Bearer ${createAccessToken(['staff:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith({
            page: 2,
            limit: 5,
            departmentId: department.id,
            positionTypeId: positionType.id,
            status: 'ACTIVE',
            search: 'cardio',
        });
    });

    it('exposes the public staff directory without auth', async () => {
        const listSpy = jest.spyOn(StaffPrismaRepository.prototype, 'list').mockResolvedValue({
            items: [staffProfile],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });

        const response = await request(app).get('/api/staff/public?search=cardio');

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                publicOnly: true,
                status: 'ACTIVE',
            }),
        );
    });

    it('exposes bookable doctors with core staff ids for appointment booking', async () => {
        const listSpy = jest.spyOn(StaffPrismaRepository.prototype, 'list').mockResolvedValue({
            items: [staffProfile],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });

        const response = await request(app).get('/api/staff/doctors?search=cardio');

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0]).toEqual(expect.objectContaining({
            id: staffProfile.id,
            _id: staffProfile.id,
            userId: staffProfile.userId,
            name: 'DR-001 - Cardiology',
            specialty: 'Cardiology',
            specialization: 'Cardiology',
            employeeCode: 'DR-001',
        }));
        expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({
            roleKey: 'doctor',
            status: 'ACTIVE',
        }));
    });

    it('exposes patient-facing available slots for a bookable doctor', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff')
            .mockResolvedValue(service);
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfile.id,
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId: department.id,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: service.id,
            departmentId: department.id,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay')
            .mockResolvedValue([schedule]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments')
            .mockResolvedValue([]);

        const response = await request(app)
            .get(`/api/staff/doctors/${staffProfile.id}/available-slots?date=2026-06-03`);

        expect(response.status).toBe(200);
        expect(response.body.doctorId).toBe(staffProfile.id);
        expect(response.body.serviceId).toBe(service.id);
        expect(Array.isArray(response.body.slots)).toBe(true);
        expect(response.body.slots.map((slot: { startTime: string }) => slot.startTime))
            .toEqual(['09:00', '09:30']);
    });

    it('returns an empty slots array for a bookable doctor with no availability', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff')
            .mockResolvedValue(service);
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfile.id,
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId: department.id,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: service.id,
            departmentId: department.id,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
            .mockResolvedValue([]);

        const response = await request(app)
            .get(`/api/staff/doctors/${staffProfile.id}/available-slots?date=2026-06-03`);

        expect(response.status).toBe(200);
        expect(response.body.doctorId).toBe(staffProfile.id);
        expect(response.body.serviceId).toBe(service.id);
        expect(response.body.slots).toEqual([]);
    });

    it('returns staff directory for a department', async () => {
        jest.spyOn(StaffPrismaRepository.prototype, 'findDepartmentsByIds').mockResolvedValue([
            department,
        ]);
        const listSpy = jest.spyOn(StaffPrismaRepository.prototype, 'list').mockResolvedValue({
            items: [staffProfile],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });

        const response = await request(app)
            .get(`/api/departments/${department.id}/staff`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                departmentId: department.id,
            }),
        );
    });

    it('blocks deactivation when future appointments exist', async () => {
        jest.spyOn(StaffPrismaRepository.prototype, 'findById').mockResolvedValue(
            staffProfile,
        );
        jest.spyOn(
            StaffPrismaRepository.prototype,
            'countFutureAppointments',
        ).mockResolvedValue(1);

        const response = await request(app)
            .delete(`/api/staff/${staffProfile.id}`)
            .set('Authorization', `Bearer ${createAccessToken(['staff:manage:all'])}`);

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            'Staff profile cannot be deactivated while future appointments exist',
        );
    });

    it('rejects unauthorized requests', async () => {
        const response = await request(app).get('/api/staff');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('rejects forbidden requests', async () => {
        const response = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${createAccessToken(['staff:read'])}`)
            .send({
                userId: staffProfile.userId,
                staffPositionTypeId: positionType.id,
                employeeCode: 'DR-001',
                departmentIds: [department.id],
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden');
    });
});
