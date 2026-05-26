import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { FeedbackListResult } from '../../domain/feedback.entity';
import { FeedbackService } from '../../services/feedback.service';
import { ListMyFeedbackQuery } from '../queries/list-my-feedback.query';

export class ListMyFeedbackHandler
    implements QueryHandler<ListMyFeedbackQuery, FeedbackListResult>
{
    constructor(private readonly service: FeedbackService) {}

    execute(query: ListMyFeedbackQuery) {
        return this.service.listMyFeedback(
            {
                page: query.page,
                limit: query.limit,
            },
            query.actorUserId,
        );
    }
}
