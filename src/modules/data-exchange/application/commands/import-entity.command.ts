import { Command } from '../../../../shared/core/buses/command-bus';
import {
    ImportEntity,
    ImportMode,
    ImportSource,
} from '../../domain/data-exchange.entity';

export class ImportEntityCommand implements Command {
    constructor(
        public readonly entity: ImportEntity,
        public readonly mode: ImportMode,
        public readonly source: ImportSource,
        public readonly actorUserId?: string,
        public readonly asyncRequested = false,
    ) {}
}
