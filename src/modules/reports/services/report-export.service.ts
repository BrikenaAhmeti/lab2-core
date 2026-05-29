import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
    ReportExportFormat,
    ReportResult,
    ReportRow,
    ReportRowValue,
} from '../domain/reports.entity';

export interface ReportExportFile {
    buffer: Buffer;
    contentType: string;
    filename: string;
}

function toCellValue(value: ReportRowValue) {
    if (value === null) {
        return '';
    }

    return value;
}

function collectColumns(rows: ReportRow[]) {
    const columns = new Set<string>();

    for (const row of rows) {
        Object.keys(row).forEach((key) => columns.add(key));
    }

    return Array.from(columns);
}

function formatFilename(report: ReportResult, extension: string) {
    const generatedDate = report.generatedAt.toISOString().slice(0, 10);
    return `${report.type}-report-${generatedDate}.${extension}`;
}

function stringifyValue(value: ReportRowValue) {
    if (value === null) {
        return '';
    }

    return String(value);
}

export class ReportExportService {
    async export(
        report: ReportResult,
        format: ReportExportFormat,
    ): Promise<ReportExportFile> {
        if (format === 'csv') {
            return this.toCsv(report);
        }

        if (format === 'xlsx') {
            return this.toXlsx(report);
        }

        return this.toPdf(report);
    }

    private toCsv(report: ReportResult): ReportExportFile {
        const columns = collectColumns(report.rows);
        const records = report.rows.map((row) =>
            Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])),
        );

        return {
            buffer: Buffer.from(
                stringify(records, {
                    header: true,
                    columns,
                }),
            ),
            contentType: 'text/csv',
            filename: formatFilename(report, 'csv'),
        };
    }

    private async toXlsx(report: ReportResult): Promise<ReportExportFile> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MedSphere Core Service';
        workbook.created = report.generatedAt;

        const summary = workbook.addWorksheet('Summary');
        summary.columns = [
            { header: 'Metric', key: 'label', width: 36 },
            { header: 'Value', key: 'value', width: 24 },
        ];
        summary.addRows(report.summary);
        summary.getRow(1).font = { bold: true };

        const data = workbook.addWorksheet('Data');
        const columns = collectColumns(report.rows);
        data.columns = columns.map((column) => ({
            header: column,
            key: column,
            width: Math.min(Math.max(column.length + 6, 16), 36),
        }));
        data.addRows(
            report.rows.map((row) =>
                Object.fromEntries(
                    columns.map((column) => [column, toCellValue(row[column] ?? null)]),
                ),
            ),
        );
        data.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();

        return {
            buffer: Buffer.from(buffer),
            contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: formatFilename(report, 'xlsx'),
        };
    }

    private toPdf(report: ReportResult): Promise<ReportExportFile> {
        return new Promise((resolve, reject) => {
            const document = new PDFDocument({
                margin: 40,
                size: 'A4',
            });
            const chunks: Buffer[] = [];

            document.on('data', (chunk: Buffer) => chunks.push(chunk));
            document.on('error', reject);
            document.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: 'application/pdf',
                    filename: formatFilename(report, 'pdf'),
                });
            });

            document.fontSize(18).text(report.title, { align: 'left' });
            document.moveDown(0.5);
            document
                .fontSize(9)
                .fillColor('#555555')
                .text(`Generated at: ${report.generatedAt.toISOString()}`)
                .text(`Grouped by: ${report.groupBy}`);
            document.moveDown();

            document.fillColor('#000000').fontSize(12).text('Summary');
            for (const metric of report.summary) {
                document
                    .fontSize(10)
                    .text(`${metric.label}: ${metric.value}`);
            }

            document.moveDown();
            document.fontSize(12).text('Data');
            document.moveDown(0.5);

            const columns = collectColumns(report.rows).slice(0, 6);
            if (columns.length === 0 || report.rows.length === 0) {
                document.fontSize(10).text('No rows for the selected filters.');
                document.end();
                return;
            }

            document.fontSize(8).font('Helvetica-Bold');
            document.text(columns.join(' | '));
            document.font('Helvetica');

            for (const row of report.rows.slice(0, 60)) {
                const line = columns
                    .map((column) => stringifyValue(row[column] ?? null))
                    .join(' | ');
                document.text(line.slice(0, 140));
            }

            if (report.rows.length > 60) {
                document.moveDown(0.5);
                document.text(`Showing first 60 of ${report.rows.length} rows.`);
            }

            document.end();
        });
    }
}
