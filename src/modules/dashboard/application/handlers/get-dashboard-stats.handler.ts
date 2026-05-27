import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { DashboardStats } from '../../domain/dashboard.entity';
import { DashboardService } from '../../services/dashboard.service';
import { GetDashboardStatsQuery } from '../queries/get-dashboard-stats.query';

export class GetDashboardStatsHandler
    implements QueryHandler<GetDashboardStatsQuery, DashboardStats> {
    constructor(private readonly dashboardService: DashboardService) {}

    execute(_query: GetDashboardStatsQuery): Promise<DashboardStats> {
        return this.dashboardService.getStats();
    }
}
