import { ScheduleRepository } from '../../src/modules/schedules/domain/schedule.repository';
import { SlotLockRepository } from '../../src/modules/schedules/domain/slot-lock.repository';
import { ScheduleService } from '../../src/modules/schedules/services/schedule.service';

const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';

function createRepository(): jest.Mocked<ScheduleRepository> {
    return {
        findStaffById: jest.fn(),
        listWeeklySchedules: jest.fn(),
        replaceWeeklySchedules: jest.fn(),
        listExceptions: jest.fn(),
        createException: jest.fn(),
        deleteException: jest.fn(),
        findServiceById: jest.fn(),
        listSchedulesForDay: jest.fn(),
        listExceptionsForDate: jest.fn(),
        listBookedAppointments: jest.fn(),
    };
}

describe('ScheduleService', () => {
    it('removes slots that are already past in the clinic timezone', async () => {
        const repository = createRepository();
        const locks: jest.Mocked<SlotLockRepository> = {
            findLockedSlots: jest.fn().mockResolvedValue([]),
        };
        repository.findStaffById.mockResolvedValue({
            id: staffProfileId,
            employmentStatus: 'ACTIVE',
            departments: [{ departmentId, unassignedAt: null, department: { id: departmentId, isActive: true } }],
        });
        repository.findServiceById.mockResolvedValue({
            id: serviceId,
            departmentId,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        repository.listSchedulesForDay.mockResolvedValue([
            {
                id: 'schedule-1',
                staffProfileId,
                departmentId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '10:30',
                slotDurationMinutes: 30,
                breakStart: null,
                breakEnd: null,
                validFrom: null,
                validTo: null,
                isActive: true,
                createdAt: new Date('2030-01-01T00:00:00.000Z'),
                updatedAt: new Date('2030-01-01T00:00:00.000Z'),
            },
        ]);
        repository.listExceptionsForDate.mockResolvedValue([]);
        repository.listBookedAppointments.mockResolvedValue([]);
        const service = new ScheduleService(
            repository,
            locks,
            () => new Date('2030-05-20T07:15:00.000Z'),
        );

        const result = await service.getAvailableSlots({
            staffProfileId,
            serviceId,
            date: '2030-05-20',
        });

        expect(result.slots.map((slot) => slot.startTime)).toEqual(['09:30', '10:00']);
    });
});
