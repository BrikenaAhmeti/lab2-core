import { CreateServiceCatalogCommand } from '../../src/modules/service-catalog/application/commands/create-service-catalog.command';
import { CreateServiceCatalogHandler } from '../../src/modules/service-catalog/application/handlers/create-service-catalog.handler';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

describe('CreateServiceCatalogHandler', () => {
    const serviceCatalog = {
        id: '7d6bc4ce-6a73-48cd-b27d-06fae03c8f67',
        departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Initial Consultation',
        description: 'Standard first visit',
        defaultDurationMinutes: 30,
        defaultPrice: 50,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const serviceCatalogService = {
        createService: jest.fn(),
    } as unknown as jest.Mocked<ServiceCatalogService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate creation to the service catalog service', async () => {
        (serviceCatalogService.createService as jest.Mock).mockResolvedValue(serviceCatalog);

        const handler = new CreateServiceCatalogHandler(serviceCatalogService);
        const command = new CreateServiceCatalogCommand(
            serviceCatalog.departmentId,
            'Initial Consultation',
            'Standard first visit',
            30,
            50,
        );

        const result = await handler.execute(command);

        expect(serviceCatalogService.createService).toHaveBeenCalledWith({
            departmentId: serviceCatalog.departmentId,
            name: 'Initial Consultation',
            description: 'Standard first visit',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: undefined,
            sortOrder: undefined,
        });
        expect(result).toEqual(serviceCatalog);
    });
});
