import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
    ReportExportFormat,
    ReportResult,
    ReportRow,
    ReportRowValue,
    ReportType,
} from '../domain/reports.entity';

export interface ReportExportFile {
    buffer: Buffer;
    contentType: string;
    filename: string;
}

const brand = {
    primary: '#1685b5',
    primaryDark: '#16426b',
    med: '#1da9c7',
    cobalt: '#2f6df6',
    accent: '#6cc5b6',
    warning: '#f59e0b',
    success: '#1f9d63',
    ink: '#142033',
    muted: '#60748a',
    border: '#d8e5ec',
    surface: '#f5fafc',
    surfaceStrong: '#eaf5f9',
    white: '#ffffff',
};

const reportTypeLabels: Record<ReportType, string> = {
    appointments: 'Appointments',
    clinical: 'Clinical',
    financial: 'Financial',
    inventory: 'Inventory',
    patients: 'Patients',
    'staff-workload': 'Staff Workload',
};

const page = {
    width: 595,
    left: 48,
    right: 547,
    top: 48,
    bottom: 760,
    footer: 790,
};

const contentWidth = page.right - page.left;
const dividerColors = [brand.med, brand.cobalt, brand.accent, brand.warning];

function toSpreadsheetCellValue(value: ReportRowValue) {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'string' && value.includes('_')) {
        return formatLabel(value);
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

function formatLabel(value: string) {
    return value
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function filenamePart(value?: string | null, fallback = 'report') {
    const normalized = value
        ?.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
}

function formatFilename(report: ReportResult, extension: string) {
    const generatedDate = report.generatedAt.toISOString().slice(0, 10);
    const reportName = filenamePart(report.title, `${report.type}-report`);
    const groupedBy = report.groupBy
        ? `-by-${filenamePart(formatLabel(report.groupBy), 'group')}`
        : '';

    return `medsphere-${reportName}${groupedBy}-${generatedDate}.${extension}`;
}

function formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(value);
}

function formatReportValue(value: ReportRowValue) {
    if (value === null || value === undefined) {
        return '-';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
        return new Intl.NumberFormat('en').format(value);
    }

    return value.includes('_') ? formatLabel(value) : value;
}

function stringifyValue(value: ReportRowValue) {
    return value === null ? '' : formatReportValue(value);
}

function collectPdf(doc: PDFKit.PDFDocument) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });
}

function addText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    options: PDFKit.Mixins.TextOptions = {},
) {
    doc.text(text, x, y, {
        width,
        lineGap: 2,
        ...options,
    });
}

function addLogo(doc: PDFKit.PDFDocument, x: number, y: number) {
    doc.save();
    doc.roundedRect(x, y, 52, 52, 10).fillAndStroke(brand.white, brand.border);
    doc.circle(x + 26, y + 26, 18).fill(brand.primary);
    doc.circle(x + 26, y + 26, 11).strokeColor(brand.surfaceStrong).lineWidth(2).stroke();
    doc.fillColor(brand.white).font('Helvetica-Bold').fontSize(15).text('MS', x, y + 18, {
        width: 52,
        align: 'center',
    });
    doc.restore();
}

function addFooter(doc: PDFKit.PDFDocument) {
    doc.save();
    doc.moveTo(page.left, page.footer)
        .lineTo(page.right, page.footer)
        .strokeColor(brand.border)
        .lineWidth(1)
        .stroke();
    doc.fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(
            'Prepared by MedSphere. This report is generated from operational healthcare records.',
            page.left,
            page.footer + 10,
            { width: 330 },
        )
        .text('PDF-ready document', 397, page.footer + 10, {
            width: 150,
            align: 'right',
        });
    doc.restore();
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, requiredHeight: number) {
    if (y + requiredHeight <= page.bottom) {
        return y;
    }

    addFooter(doc);
    doc.addPage();
    return page.top;
}

function addSectionTitle(
    doc: PDFKit.PDFDocument,
    title: string,
    y: number,
    accent = brand.primary,
) {
    doc.save();
    doc.roundedRect(page.left, y + 1, 4, 18, 2).fill(accent);
    doc.fillColor(brand.ink)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(title, page.left + 12, y, { width: contentWidth - 12 });
    doc.restore();

    return y + 30;
}

function addHeader(doc: PDFKit.PDFDocument, report: ReportResult) {
    doc.save();
    const stripeWidth = page.width / dividerColors.length;
    dividerColors.forEach((color, index) => {
        doc.rect(index * stripeWidth, 0, stripeWidth + 1, 8).fill(color);
    });
    doc.rect(0, 8, page.width, 166).fill(brand.surface);
    doc.restore();

    addLogo(doc, page.left, 42);

    doc.fillColor(brand.primary)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('MEDSPHERE', 114, 45, { characterSpacing: 0.5 });
    doc.fillColor(brand.ink)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(report.title, 114, 66, { width: 260 });
    doc.fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(11)
        .text(`Generated ${formatDateTime(report.generatedAt)}`, 114, 96, {
            width: 260,
        });

    doc.roundedRect(405, 50, 142, 34, 17).fillAndStroke('#eef6ff', '#b8d6ff');
    doc.roundedRect(423, 59, 13, 16, 2).strokeColor(brand.primaryDark).lineWidth(1.3).stroke();
    doc.moveTo(427, 63).lineTo(433, 63).stroke();
    doc.moveTo(427, 67).lineTo(433, 67).stroke();
    doc.moveTo(427, 71).lineTo(432, 71).stroke();
    doc.fillColor(brand.primaryDark)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Report PDF', 445, 60, { width: 86 });

    doc.moveTo(page.left, 174)
        .lineTo(page.right, 174)
        .strokeColor(brand.border)
        .lineWidth(1)
        .stroke();

    return 198;
}

function addMetaCards(doc: PDFKit.PDFDocument, report: ReportResult, y: number) {
    const items = [
        { label: 'Report type', value: reportTypeLabels[report.type] },
        { label: 'Grouped by', value: formatLabel(report.groupBy) },
        { label: 'Rows', value: new Intl.NumberFormat('en').format(report.rows.length) },
        { label: 'Export style', value: 'Branded PDF' },
    ];
    const gap = 10;
    const width = (contentWidth - gap * (items.length - 1)) / items.length;
    const height = 62;

    items.forEach((item, index) => {
        const x = page.left + index * (width + gap);
        doc.roundedRect(x, y, width, height, 8).fillAndStroke(brand.white, brand.border);
        doc.fillColor(brand.muted)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(item.label.toUpperCase(), x + 12, y + 13, { width: width - 24 });
        doc.fillColor(brand.ink)
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(String(item.value), x + 12, y + 34, { width: width - 24 });
    });

    return y + height + 26;
}

function addSummary(doc: PDFKit.PDFDocument, report: ReportResult, y: number) {
    y = ensureSpace(doc, y, 126);
    y = addSectionTitle(doc, 'Summary', y, brand.med);

    if (report.summary.length === 0) {
        doc.roundedRect(page.left, y, contentWidth, 38, 8).fillAndStroke(brand.white, brand.border);
        doc.fillColor(brand.muted).font('Helvetica').fontSize(9).text('No summary metrics returned.', page.left + 12, y + 13);
        return y + 58;
    }

    const columns = 4;
    const gap = 12;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = 78;
    let rowY = y;

    report.summary.forEach((metric, index) => {
        const column = index % columns;
        if (column === 0) {
            rowY = ensureSpace(doc, rowY, cardHeight + 16);
        }

        const x = page.left + column * (cardWidth + gap);
        doc.roundedRect(x, rowY, cardWidth, cardHeight, 8).fillAndStroke(brand.white, brand.border);
        doc.rect(x, rowY, cardWidth, 4).fill(dividerColors[index % dividerColors.length]);
        doc.fillColor(brand.muted)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(formatLabel(metric.label).toUpperCase(), x + 12, rowY + 16, {
                width: cardWidth - 24,
            });
        doc.fillColor(brand.ink)
            .font('Helvetica-Bold')
            .fontSize(20)
            .text(formatReportValue(metric.value), x + 12, rowY + 43, {
                width: cardWidth - 24,
            });

        if (column === columns - 1 || index === report.summary.length - 1) {
            if (index < report.summary.length - 1) {
                rowY += cardHeight + 12;
            }
        }
    });

    return rowY + cardHeight + 28;
}

function firstNumericKey(rows: ReportRow[]) {
    const firstRow = rows[0];
    if (!firstRow) {
        return '';
    }

    return Object.keys(firstRow).find((key) => key !== 'group' && typeof firstRow[key] === 'number') ?? '';
}

function shortText(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function addVisualization(doc: PDFKit.PDFDocument, report: ReportResult, y: number) {
    y = ensureSpace(doc, y, 236);
    y = addSectionTitle(doc, 'Visualization', y, brand.cobalt);

    const metricKey = firstNumericKey(report.rows);
    if (!metricKey) {
        doc.roundedRect(page.left, y, contentWidth, 48, 8).fillAndStroke(brand.white, brand.border);
        doc.fillColor(brand.muted).font('Helvetica').fontSize(9).text('No chart data returned.', page.left + 12, y + 17);
        return y + 68;
    }

    const data = report.rows.slice(0, 12).map((row) => ({
        label: String(row.group ?? '-'),
        value: Number(row[metricKey] ?? 0),
    }));
    const rawMax = Math.max(...data.map((item) => item.value), 0);
    const maxValue = rawMax || 1;
    const frameHeight = 178;
    const plotX = page.left + 46;
    const plotY = y + 44;
    const plotWidth = contentWidth - 82;
    const plotHeight = 88;

    doc.roundedRect(page.left, y, contentWidth, frameHeight, 8).fillAndStroke(brand.white, brand.border);
    doc.fillColor(brand.muted)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`${formatLabel(metricKey)} by ${formatLabel(report.groupBy)}`.toUpperCase(), page.left + 14, y + 14);

    doc.strokeColor('#d4dde7').lineWidth(0.7);
    for (let index = 0; index <= 4; index += 1) {
        const gridY = plotY + plotHeight - (index / 4) * plotHeight;
        doc.moveTo(plotX, gridY).lineTo(plotX + plotWidth, gridY).stroke();
        doc.fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(7.5)
            .text(formatReportValue(Math.round((rawMax * index) / 4)), page.left + 12, gridY - 4, {
                width: 28,
                align: 'right',
            });
    }

    const isLineChart = report.type === 'financial' && ['day', 'month'].includes(report.groupBy);
    const points = data.map((item, index) => {
        const x = data.length === 1 ? plotX + plotWidth / 2 : plotX + (plotWidth / (data.length - 1)) * index;
        const yPoint = plotY + plotHeight - (item.value / maxValue) * plotHeight;
        return { ...item, x, y: yPoint };
    });

    if (isLineChart && points.length > 0) {
        doc.strokeColor(brand.primary).lineWidth(2);
        points.forEach((point, index) => {
            if (index === 0) {
                doc.moveTo(point.x, point.y);
                return;
            }
            doc.lineTo(point.x, point.y);
        });
        doc.stroke();
        points.forEach((point) => {
            doc.circle(point.x, point.y, 4).fillAndStroke(brand.white, brand.primary);
        });
    } else {
        const gap = 10;
        const barWidth = Math.min(34, (plotWidth - gap * Math.max(data.length - 1, 0)) / Math.max(data.length, 1));
        const totalBarsWidth = data.length * barWidth + Math.max(data.length - 1, 0) * gap;
        const startX = plotX + (plotWidth - totalBarsWidth) / 2;

        data.forEach((item, index) => {
            const barHeight = Math.max((item.value / maxValue) * plotHeight, item.value > 0 ? 3 : 0);
            const x = startX + index * (barWidth + gap);
            doc.roundedRect(x, plotY + plotHeight - barHeight, barWidth, barHeight, 3).fill(dividerColors[index % dividerColors.length]);
        });
    }

    points.forEach((point) => {
        doc.fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(7)
            .text(shortText(point.label, 10), point.x - 28, plotY + plotHeight + 10, {
                width: 56,
                align: 'center',
            });
    });

    return y + frameHeight + 28;
}

function drawTableHeader(doc: PDFKit.PDFDocument, columns: string[], widths: number[], y: number) {
    doc.roundedRect(page.left, y, contentWidth, 26, 6).fill(brand.primary);
    doc.fillColor(brand.white).font('Helvetica-Bold').fontSize(8.5);

    let x = page.left;
    columns.forEach((column, index) => {
        addText(doc, formatLabel(column), x + 8, y + 8, widths[index] - 14);
        x += widths[index];
    });
}

function addDataTable(doc: PDFKit.PDFDocument, report: ReportResult, y: number) {
    y = ensureSpace(doc, y, 116);
    y = addSectionTitle(doc, 'Data table', y, brand.success);

    const columns = collectColumns(report.rows).slice(0, 6);
    if (columns.length === 0 || report.rows.length === 0) {
        doc.roundedRect(page.left, y, contentWidth, 48, 8).fillAndStroke(brand.white, brand.border);
        doc.fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(9)
            .text('No rows for the selected filters.', page.left + 12, y + 17);
        return y + 68;
    }

    const firstColumnWidth = columns.length === 1 ? contentWidth : 126;
    const otherColumnWidth = columns.length === 1 ? 0 : (contentWidth - firstColumnWidth) / (columns.length - 1);
    const widths = columns.map((_, index) => (index === 0 ? firstColumnWidth : otherColumnWidth));
    const rows = report.rows.slice(0, 60);

    drawTableHeader(doc, columns, widths, y);
    y += 31;

    rows.forEach((row, rowIndex) => {
        doc.font('Helvetica').fontSize(8.5);
        const values = columns.map((column) => stringifyValue(row[column] ?? null));
        const rowHeight = Math.max(
            30,
            ...values.map((value, index) =>
                doc.heightOfString(value, { width: widths[index] - 14 }) + 14,
            ),
        );

        const nextY = ensureSpace(doc, y, rowHeight + 7);
        if (nextY === page.top) {
            y = nextY;
            drawTableHeader(doc, columns, widths, y);
            y += 31;
        } else {
            y = nextY;
        }

        doc.roundedRect(page.left, y, contentWidth, rowHeight, 5).fill(rowIndex % 2 === 0 ? brand.white : brand.surface);
        let x = page.left;
        values.forEach((value, index) => {
            doc.fillColor(brand.ink).font(index === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
            addText(doc, value, x + 8, y + 9, widths[index] - 14);
            x += widths[index];
        });
        y += rowHeight + 7;
    });

    if (report.rows.length > rows.length) {
        y = ensureSpace(doc, y, 30);
        doc.fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(8.5)
            .text(`Showing first ${rows.length} of ${report.rows.length} rows.`, page.left, y);
        y += 24;
    }

    return y + 12;
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
            Object.fromEntries(
                columns.map((column) => [
                    formatLabel(column),
                    row[column] === null || row[column] === undefined
                        ? ''
                        : formatReportValue(row[column]),
                ]),
            ),
        );

        return {
            buffer: Buffer.from(
                stringify(records, {
                    header: true,
                    columns: columns.map(formatLabel),
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
        summary.addRows(
            report.summary.map((metric) => ({
                label: formatLabel(metric.label),
                value: toSpreadsheetCellValue(metric.value),
            })),
        );
        summary.getRow(1).font = { bold: true };

        const data = workbook.addWorksheet('Data');
        const columns = collectColumns(report.rows);
        data.columns = columns.map((column) => ({
            header: formatLabel(column),
            key: column,
            width: Math.min(Math.max(column.length + 6, 16), 36),
        }));
        data.addRows(
            report.rows.map((row) =>
                Object.fromEntries(
                    columns.map((column) => [
                        column,
                        toSpreadsheetCellValue(row[column] ?? null),
                    ]),
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

    private async toPdf(report: ReportResult): Promise<ReportExportFile> {
        const document = new PDFDocument({
            margin: page.left,
            size: 'A4',
            info: {
                Title: report.title,
                Author: 'MedSphere',
                Subject: `${reportTypeLabels[report.type]} report`,
            },
        });
        const pdf = collectPdf(document);

        let y = addHeader(document, report);
        y = addMetaCards(document, report, y);
        y = addSummary(document, report, y);
        y = addVisualization(document, report, y);
        addDataTable(document, report, y);
        addFooter(document);

        document.end();

        return {
            buffer: await pdf,
            contentType: 'application/pdf',
            filename: formatFilename(report, 'pdf'),
        };
    }
}
