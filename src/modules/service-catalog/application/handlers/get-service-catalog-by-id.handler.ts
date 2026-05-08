import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ServiceCatalogEntity } from '../../domain/service-catalog.entity';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { GetServiceCatalogByIdQuery } from '../queries/get-service-catalog-by-id.query';

export class GetServiceCatalogByIdHandler
    implements QueryHandler<GetServiceCatalogByIdQuery, ServiceCatalogEntity> {
    constructor(private readonly serviceCatalogService: ServiceCatalogService) { }

    async execute(query: GetServiceCatalogByIdQuery): Promise<ServiceCatalogEntity> {
        return this.serviceCatalogService.getServiceById(query.id);
    }
}
