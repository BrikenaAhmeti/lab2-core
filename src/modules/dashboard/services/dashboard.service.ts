import { DashboardStats } from '../domain/dashboard.entity';
import { DashboardRepository } from '../domain/dashboard.repository';

export class DashboardService {
    constructor(
        private readonly dashboardRepository: DashboardRepository,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    getStats(): Promise<DashboardStats> {
        return this.dashboardRepository.getStats(this.nowProvider());
    }
}
