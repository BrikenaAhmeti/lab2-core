import { Query } from '../../../../shared/core/buses/query-bus';

export class ListMyFeedbackQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly actorUserId?: string,
    ) {}
}
