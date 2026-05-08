import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ServiceCatalogEntity } from '../../domain/service-catalog.entity';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { CreateServiceCatalogCommand } from '../commands/create-service-catalog.command';

export class CreateServiceCatalogHandler
    implements CommandHandler<CreateServiceCatalogCommand, ServiceCatalogEntity> {
    constructor(private readonly serviceCatalogService: ServiceCatalogService) { }

    async execute(command: CreateServiceCatalogCommand): Promise<ServiceCatalogEntity> {
        return this.serviceCatalogService.createService({
            departmentId: command.departmentId,
            name: command.name,
            description: command.description,
            defaultDurationMinutes: command.defaultDurationMinutes,
            defaultPrice: command.defaultPrice,
            isActive: command.isActive,
            sortOrder: command.sortOrder,
        });
    }
}
