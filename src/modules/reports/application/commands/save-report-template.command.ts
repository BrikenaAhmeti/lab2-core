import { Command } from '../../../../shared/core/buses/command-bus';
import { ReportType } from '../../domain/reports.entity';

export class SaveReportTemplateCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly reportType: ReportType,
        public readonly parameters: Record<string, unknown>,
        public readonly description?: string | null,
        public readonly createdBy?: string | null,
    ) {}
}
