import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { ReportTemplate } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { SaveReportTemplateCommand } from '../commands/save-report-template.command';

export class SaveReportTemplateHandler
    implements CommandHandler<SaveReportTemplateCommand, ReportTemplate> {
    constructor(private readonly reportService: ReportService) {}

    execute(command: SaveReportTemplateCommand): Promise<ReportTemplate> {
        return this.reportService.saveTemplate({
            name: command.name,
            reportType: command.reportType,
            parameters: command.parameters,
            description: command.description,
            createdBy: command.createdBy,
        });
    }
}
