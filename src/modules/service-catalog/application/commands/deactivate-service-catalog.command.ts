import { Command } from '../../../../shared/core/buses/command-bus';

export class DeactivateServiceCatalogCommand implements Command {
    constructor(public readonly id: string) { }
}
