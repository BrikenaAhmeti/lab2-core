import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ServiceCatalogEntity } from '../../domain/service-catalog.entity';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { DeactivateServiceCatalogCommand } from '../commands/deactivate-service-catalog.command';

export class DeactivateServiceCatalogHandler
    implements CommandHandler<DeactivateServiceCatalogCommand, ServiceCatalogEntity> {
    constructor(private readonly serviceCatalogService: ServiceCatalogService) { }

    async execute(command: DeactivateServiceCatalogCommand): Promise<ServiceCatalogEntity> {
        return this.serviceCatalogService.deactivateService(command.id);
    }
}
