import { ListStaffPositionTypesHandler } from '../../src/modules/staff-position-types/application/handlers/list-staff-position-types.handler';
import { ListStaffPositionTypesQuery } from '../../src/modules/staff-position-types/application/queries/list-staff-position-types.query';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

describe('ListStaffPositionTypesHandler', () => {
    const listResponse = {
        items: [
            {
                id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
                name: 'Radiologic Technologist',
            },
        ],
    };

    const staffPositionTypeService = {
        listStaffPositionTypes: jest.fn(),
    } as unknown as jest.Mocked<StaffPositionTypeService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate listing to the staff position type service', async () => {
        (staffPositionTypeService.listStaffPositionTypes as jest.Mock).mockResolvedValue(
            listResponse,
        );

        const handler = new ListStaffPositionTypesHandler(staffPositionTypeService);
        const query = new ListStaffPositionTypesQuery(true);

        const result = await handler.execute(query);

        expect(staffPositionTypeService.listStaffPositionTypes).toHaveBeenCalledWith({
            isActive: true,
        });
        expect(result).toEqual(listResponse);
    });
});
