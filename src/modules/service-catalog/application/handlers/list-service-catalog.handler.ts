import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ServiceCatalogListResult } from '../../domain/service-catalog.entity';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { ListServiceCatalogQuery } from '../queries/list-service-catalog.query';

export class ListServiceCatalogHandler
    implements QueryHandler<ListServiceCatalogQuery, ServiceCatalogListResult> {
    constructor(private readonly serviceCatalogService: ServiceCatalogService) { }

    async execute(query: ListServiceCatalogQuery): Promise<ServiceCatalogListResult> {
        return this.serviceCatalogService.listServices({
            page: query.page,
            limit: query.limit,
            search: query.search,
            departmentId: query.departmentId,
            isActive: query.isActive,
            sortBy: query.sortBy,
            sortDirection: query.sortDirection,
        });
    }
}
