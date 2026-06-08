import { Command } from '../../../../shared/core/buses/command-bus';

export class LinkPatientByPersonalNumberCommand implements Command {
    constructor(
        public readonly userId: string,
        public readonly personalNumber: string,
        public readonly firstName?: string,
        public readonly lastName?: string,
        public readonly email?: string | null,
        public readonly phone?: string | null,
        public readonly dateOfBirth?: Date | null,
        public readonly gender?: string | null,
    ) {}
}
