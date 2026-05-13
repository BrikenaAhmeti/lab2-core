import { UpdateStaffPositionTypeCommand } from '../../src/modules/staff-position-types/application/commands/update-staff-position-type.command';
import { UpdateStaffPositionTypeHandler } from '../../src/modules/staff-position-types/application/handlers/update-staff-position-type.handler';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

describe('UpdateStaffPositionTypeHandler', () => {
    const staffPositionType = {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        name: 'Optometrist',
    };

    const staffPositionTypeService = {
        updateStaffPositionType: jest.fn(),
    } as unknown as jest.Mocked<StaffPositionTypeService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate updates to the staff position type service', async () => {
        (staffPositionTypeService.updateStaffPositionType as jest.Mock).mockResolvedValue(
            staffPositionType,
        );

        const handler = new UpdateStaffPositionTypeHandler(staffPositionTypeService);
        const command = new UpdateStaffPositionTypeCommand(
            staffPositionType.id,
            'Optometrist',
            'doctor',
            'Eye care specialist',
            ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
            true,
        );

        const result = await handler.execute(command);

        expect(staffPositionTypeService.updateStaffPositionType).toHaveBeenCalledWith(
            staffPositionType.id,
            {
                name: 'Optometrist',
                description: 'Eye care specialist',
                defaultRoleKey: 'doctor',
                applicableDepartmentIds: ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
                isActive: true,
            },
        );
        expect(result).toEqual(staffPositionType);
    });
});
