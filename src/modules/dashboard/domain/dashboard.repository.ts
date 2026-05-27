import { DashboardStats } from './dashboard.entity';

export interface DashboardRepository {
    getStats(now: Date): Promise<DashboardStats>;
}
