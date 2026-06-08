import { Query } from '../../../../shared/core/buses/query-bus';
import { ContactMessageStatus } from '../../domain/contact.entity';

export class ListContactMessagesQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly status?: ContactMessageStatus,
        public readonly search?: string,
        public readonly createdAtFrom?: Date,
        public readonly createdAtTo?: Date,
    ) {}
}
