import { Command } from '../../../../shared/core/buses/command-bus';

export class SubmitContactMessageCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly email: string,
        public readonly subject: string,
        public readonly message: string,
        public readonly phone?: string | null,
    ) {}
}
