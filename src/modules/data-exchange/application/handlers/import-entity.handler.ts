import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import {
    ImportJob,
    ImportResult,
} from '../../domain/data-exchange.entity';
import { DataExchangeService } from '../../services/data-exchange.service';
import { ImportEntityCommand } from '../commands/import-entity.command';

export class ImportEntityHandler
    implements CommandHandler<ImportEntityCommand, ImportResult | ImportJob>
{
    constructor(private readonly service: DataExchangeService) {}

    execute(command: ImportEntityCommand) {
        return this.service.importEntity(
            command.entity,
            command.mode,
            command.source,
            command.actorUserId,
            command.asyncRequested,
        );
    }
}
