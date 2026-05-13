import { GetStaffPositionTypeByIdHandler } from '../../src/modules/staff-position-types/application/handlers/get-staff-position-type-by-id.handler';
import { GetStaffPositionTypeByIdQuery } from '../../src/modules/staff-position-types/application/queries/get-staff-position-type-by-id.query';
import { StaffPositionTypeService } from '../../src/modules/staff-position-types/services/staff-position-type.service';

describe('GetStaffPositionTypeByIdHandler', () => {
    const staffPositionType = {
        id: '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86',
        name: 'Radiologic Technologist',
    };

    const staffPositionTypeService = {
        getStaffPositionTypeById: jest.fn(),
    } as unknown as jest.Mocked<StaffPositionTypeService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate lookup to the staff position type service', async () => {
        (staffPositionTypeService.getStaffPositionTypeById as jest.Mock).mockResolvedValue(
            staffPositionType,
        );

        const handler = new GetStaffPositionTypeByIdHandler(staffPositionTypeService);
        const query = new GetStaffPositionTypeByIdQuery(staffPositionType.id);

        const result = await handler.execute(query);

        expect(staffPositionTypeService.getStaffPositionTypeById).toHaveBeenCalledWith(
            staffPositionType.id,
        );
        expect(result).toEqual(staffPositionType);
    });
});
