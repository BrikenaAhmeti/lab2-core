import { CreateStaffPositionTypeCommand } from '../../src/modules/staff-position-types/application/commands/create-staff-position-type.command';
import { CreateStaffPositionTypeHandler } from '../../src/modules/staff-position-types/application/handlers/create-staff-position-type.handler';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

describe('CreateStaffPositionTypeHandler', () => {
    const staffPositionType = {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        name: 'Radiologic Technologist',
    };

    const staffPositionTypeService = {
        createStaffPositionType: jest.fn(),
    } as unknown as jest.Mocked<StaffPositionTypeService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate creation to the staff position type service', async () => {
        (staffPositionTypeService.createStaffPositionType as jest.Mock).mockResolvedValue(
            staffPositionType,
        );

        const handler = new CreateStaffPositionTypeHandler(staffPositionTypeService);
        const command = new CreateStaffPositionTypeCommand(
            'Radiologic Technologist',
            'lab_technician',
            'Imaging specialist',
            ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
        );

        const result = await handler.execute(command);

        expect(staffPositionTypeService.createStaffPositionType).toHaveBeenCalledWith({
            name: 'Radiologic Technologist',
            description: 'Imaging specialist',
            defaultRoleKey: 'lab_technician',
            applicableDepartmentIds: ['8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e'],
            isActive: undefined,
        });
        expect(result).toEqual(staffPositionType);
    });
});
