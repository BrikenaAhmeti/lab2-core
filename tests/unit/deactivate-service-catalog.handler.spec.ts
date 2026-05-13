import { DeactivateServiceCatalogCommand } from '../../src/modules/service-catalog/application/commands/deactivate-service-catalog.command';
import { DeactivateServiceCatalogHandler } from '../../src/modules/service-catalog/application/handlers/deactivate-service-catalog.handler';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

describe('DeactivateServiceCatalogHandler', () => {
    const serviceCatalog = {
        id: '7d6bc4ce-6a73-48cd-b27d-06fae03c8f67',
        departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Initial Consultation',
        description: 'Standard first visit',
        defaultDurationMinutes: 30,
        defaultPrice: 50,
        isActive: false,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const serviceCatalogService = {
        deactivateService: jest.fn(),
    } as unknown as jest.Mocked<ServiceCatalogService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate deactivation to the service catalog service', async () => {
        (serviceCatalogService.deactivateService as jest.Mock).mockResolvedValue(serviceCatalog);

        const handler = new DeactivateServiceCatalogHandler(serviceCatalogService);
        const command = new DeactivateServiceCatalogCommand(serviceCatalog.id);

        const result = await handler.execute(command);

        expect(serviceCatalogService.deactivateService).toHaveBeenCalledWith(serviceCatalog.id);
        expect(result).toEqual(serviceCatalog);
    });
});
