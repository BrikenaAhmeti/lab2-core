import { Request, Response } from 'express';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { GetDashboardStatsHandler } from '../application/handlers/get-dashboard-stats.handler';
import { GetDashboardStatsQuery } from '../application/queries/get-dashboard-stats.query';
import { DashboardPrismaRepository } from '../infrastructure/dashboard.prisma.repository';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
    private readonly queryBus = new QueryBus();
    private readonly service = new DashboardService(new DashboardPrismaRepository());
    private readonly getDashboardStatsHandler = new GetDashboardStatsHandler(
        this.service,
    );

    async stats(_req: Request, res: Response) {
        const result = await this.queryBus.execute(
            this.getDashboardStatsHandler,
            new GetDashboardStatsQuery(),
        );

        return res.status(200).json(result);
    }
}
