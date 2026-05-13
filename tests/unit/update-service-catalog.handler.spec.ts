import { UpdateServiceCatalogCommand } from '../../src/modules/service-catalog/application/commands/update-service-catalog.command';
import { UpdateServiceCatalogHandler } from '../../src/modules/service-catalog/application/handlers/update-service-catalog.handler';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

describe('UpdateServiceCatalogHandler', () => {
    const serviceCatalog = {
        id: '7d6bc4ce-6a73-48cd-b27d-06fae03c8f67',
        departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Follow-up Visit',
        description: 'Shorter visit',
        defaultDurationMinutes: 20,
        defaultPrice: 35,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const serviceCatalogService = {
        updateService: jest.fn(),
    } as unknown as jest.Mocked<ServiceCatalogService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate updates to the service catalog service', async () => {
        (serviceCatalogService.updateService as jest.Mock).mockResolvedValue(serviceCatalog);

        const handler = new UpdateServiceCatalogHandler(serviceCatalogService);
        const command = new UpdateServiceCatalogCommand(
            serviceCatalog.id,
            undefined,
            'Follow-up Visit',
            'Shorter visit',
            20,
            35,
        );

        const result = await handler.execute(command);

        expect(serviceCatalogService.updateService).toHaveBeenCalledWith(serviceCatalog.id, {
            departmentId: undefined,
            name: 'Follow-up Visit',
            description: 'Shorter visit',
            defaultDurationMinutes: 20,
            defaultPrice: 35,
            isActive: undefined,
            sortOrder: undefined,
        });
        expect(result).toEqual(serviceCatalog);
    });
});
