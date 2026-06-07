import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ContactMessageListResult } from '../../domain/contact.entity';
import { ContactService } from '../../services/contact.service';
import { ListContactMessagesQuery } from '../queries/list-contact-messages.query';

export class ListContactMessagesHandler
    implements QueryHandler<ListContactMessagesQuery, ContactMessageListResult>
{
    constructor(private readonly service: ContactService) {}

    execute(query: ListContactMessagesQuery) {
        return this.service.listMessages({
            page: query.page,
            limit: query.limit,
            status: query.status,
            search: query.search,
            createdAtFrom: query.createdAtFrom,
            createdAtTo: query.createdAtTo,
        });
    }
}
