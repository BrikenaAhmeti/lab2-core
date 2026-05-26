import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { FeedbackListResult } from '../../domain/feedback.entity';
import { FeedbackService } from '../../services/feedback.service';
import { ListFeedbackQuery } from '../queries/list-feedback.query';

export class ListFeedbackHandler
    implements QueryHandler<ListFeedbackQuery, FeedbackListResult>
{
    constructor(private readonly service: FeedbackService) {}

    execute(query: ListFeedbackQuery) {
        return this.service.listFeedback(
            {
                page: query.page,
                limit: query.limit,
                staffProfileId: query.staffProfileId,
                departmentId: query.departmentId,
                status: query.status,
            },
            query.actorUserId,
            query.canReadAll,
        );
    }
}
