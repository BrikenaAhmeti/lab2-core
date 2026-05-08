import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ServiceCatalogEntity } from '../../domain/service-catalog.entity';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { UpdateServiceCatalogCommand } from '../commands/update-service-catalog.command';

export class UpdateServiceCatalogHandler
    implements CommandHandler<UpdateServiceCatalogCommand, ServiceCatalogEntity> {
    constructor(private readonly serviceCatalogService: ServiceCatalogService) { }

    async execute(command: UpdateServiceCatalogCommand): Promise<ServiceCatalogEntity> {
        return this.serviceCatalogService.updateService(command.id, {
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
