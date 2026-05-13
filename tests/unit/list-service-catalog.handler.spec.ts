import { ListServiceCatalogHandler } from '../../src/modules/service-catalog/application/handlers/list-service-catalog.handler';
import { ListServiceCatalogQuery } from '../../src/modules/service-catalog/application/queries/list-service-catalog.query';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

describe('ListServiceCatalogHandler', () => {
    const serviceCatalogService = {
        listServices: jest.fn(),
    } as unknown as jest.Mocked<ServiceCatalogService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate list queries to the service catalog service', async () => {
        (serviceCatalogService.listServices as jest.Mock).mockResolvedValue({
            items: [],
            meta: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });

        const handler = new ListServiceCatalogHandler(serviceCatalogService);
        const query = new ListServiceCatalogQuery(1, 10, 'consult', undefined, true);

        const result = await handler.execute(query);

        expect(serviceCatalogService.listServices).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: 'consult',
            departmentId: undefined,
            isActive: true,
            sortBy: undefined,
            sortDirection: undefined,
        });
        expect(result.meta.total).toBe(0);
    });
});
