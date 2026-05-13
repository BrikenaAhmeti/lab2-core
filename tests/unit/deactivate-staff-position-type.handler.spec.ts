import { DeactivateStaffPositionTypeCommand } from '../../src/modules/staff-position-types/application/commands/deactivate-staff-position-type.command';
import { DeactivateStaffPositionTypeHandler } from '../../src/modules/staff-position-types/application/handlers/deactivate-staff-position-type.handler';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

describe('DeactivateStaffPositionTypeHandler', () => {
    const staffPositionType = {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        isActive: false,
    };

    const staffPositionTypeService = {
        deactivateStaffPositionType: jest.fn(),
    } as unknown as jest.Mocked<StaffPositionTypeService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate deactivation to the staff position type service', async () => {
        (staffPositionTypeService.deactivateStaffPositionType as jest.Mock).mockResolvedValue(
            staffPositionType,
        );

        const handler = new DeactivateStaffPositionTypeHandler(staffPositionTypeService);
        const command = new DeactivateStaffPositionTypeCommand(staffPositionType.id);

        const result = await handler.execute(command);

        expect(staffPositionTypeService.deactivateStaffPositionType).toHaveBeenCalledWith(
            staffPositionType.id,
        );
        expect(result).toEqual(staffPositionType);
    });
});
