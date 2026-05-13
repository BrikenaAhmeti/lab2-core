import { GetServiceCatalogByIdHandler } from '../../src/modules/service-catalog/application/handlers/get-service-catalog-by-id.handler';
import { GetServiceCatalogByIdQuery } from '../../src/modules/service-catalog/application/queries/get-service-catalog-by-id.query';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

describe('GetServiceCatalogByIdHandler', () => {
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
        getServiceById: jest.fn(),
    } as unknown as jest.Mocked<ServiceCatalogService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate get-by-id queries to the service catalog service', async () => {
        (serviceCatalogService.getServiceById as jest.Mock).mockResolvedValue(serviceCatalog);

        const handler = new GetServiceCatalogByIdHandler(serviceCatalogService);
        const query = new GetServiceCatalogByIdQuery(serviceCatalog.id);

        const result = await handler.execute(query);

        expect(serviceCatalogService.getServiceById).toHaveBeenCalledWith(serviceCatalog.id);
        expect(result).toEqual(serviceCatalog);
    });
});
