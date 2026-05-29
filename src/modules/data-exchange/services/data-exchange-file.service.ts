import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    DataExchangeFile,
    DataExchangeRow,
    ExchangeFormat,
    ExportDataset,
    ImportSource,
    ParsedImportRow,
} from '../domain/data-exchange.entity';

function normalizedCellValue(value: unknown): string {
    if (value === undefined || value === null) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object') {
        if ('text' in value && typeof value.text === 'string') {
            return value.text;
        }

        if ('result' in value) {
            return normalizedCellValue(value.result);
        }

        return JSON.stringify(value);
    }

    return String(value);
}

function toExportValue(value: unknown) {
    if (value === undefined || value === null) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object') {
        if ('toJSON' in value && typeof value.toJSON === 'function') {
            const json = value.toJSON() as unknown;

            if (typeof json !== 'object') {
                return json;
            }
        }

        return JSON.stringify(value);
    }

    return value;
}

function formatFilename(entity: string, extension: string) {
    return `${entity}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function detectFormat(source: ImportSource): ExchangeFormat {
    if (source.format) {
        return source.format;
    }

    const filename = source.filename?.toLowerCase() ?? '';
    const mimeType = source.mimeType?.toLowerCase() ?? '';

    if (filename.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) {
        return 'xlsx';
    }

    if (filename.endsWith('.json') || mimeType.includes('json')) {
        return 'json';
    }

    return 'csv';
}

function jsonRowsToParsed(rows: Record<string, unknown>[]) {
    return rows.map((row, index) => ({
        rowNumber: index + 1,
        values: Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
                key,
                normalizedCellValue(value).trim(),
            ]),
        ),
    }));
}

export class DataExchangeFileService {
    async export(dataset: ExportDataset, format: ExchangeFormat): Promise<DataExchangeFile> {
        if (format === 'json') {
            return this.toJson(dataset);
        }

        if (format === 'xlsx') {
            return this.toXlsx(dataset);
        }

        return this.toCsv(dataset);
    }

    async parseImportSource(source: ImportSource): Promise<ParsedImportRow[]> {
        if (source.rows) {
            return jsonRowsToParsed(source.rows);
        }

        if (!source.buffer) {
            throw new AppError('Import file or rows are required', 400);
        }

        const format = detectFormat(source);

        if (format === 'xlsx') {
            return this.parseXlsx(source.buffer);
        }

        if (format === 'json') {
            return this.parseJson(source.buffer);
        }

        return this.parseCsv(source.buffer);
    }

    private toJson(dataset: ExportDataset): DataExchangeFile {
        return {
            buffer: Buffer.from(
                JSON.stringify(
                    {
                        entity: dataset.entity,
                        generatedAt: dataset.generatedAt.toISOString(),
                        data: dataset.rows.map((row) =>
                            Object.fromEntries(
                                dataset.columns.map((column) => [
                                    column.key,
                                    toExportValue(row[column.key]),
                                ]),
                            ),
                        ),
                    },
                    null,
                    2,
                ),
            ),
            contentType: 'application/json',
            filename: formatFilename(dataset.entity, 'json'),
        };
    }

    private toCsv(dataset: ExportDataset): DataExchangeFile {
        const records = dataset.rows.map((row) =>
            Object.fromEntries(
                dataset.columns.map((column) => [
                    column.key,
                    toExportValue(row[column.key]),
                ]),
            ),
        );

        return {
            buffer: Buffer.from(
                stringify(records, {
                    header: true,
                    columns: dataset.columns,
                }),
            ),
            contentType: 'text/csv; charset=utf-8',
            filename: formatFilename(dataset.entity, 'csv'),
        };
    }

    private async toXlsx(dataset: ExportDataset): Promise<DataExchangeFile> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MedSphere Core Service';
        workbook.created = dataset.generatedAt;

        const worksheet = workbook.addWorksheet('Data');
        worksheet.columns = dataset.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: Math.min(Math.max(column.header.length + 6, 16), 42),
        }));
        worksheet.addRows(
            dataset.rows.map((row) =>
                Object.fromEntries(
                    dataset.columns.map((column) => [
                        column.key,
                        toExportValue(row[column.key]),
                    ]),
                ),
            ),
        );
        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();

        return {
            buffer: Buffer.from(buffer),
            contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename: formatFilename(dataset.entity, 'xlsx'),
        };
    }

    private parseCsv(buffer: Buffer): ParsedImportRow[] {
        const records = parse(buffer.toString('utf8').replace(/^\uFEFF/, ''), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }) as Record<string, unknown>[];

        return records.map((record, index) => ({
            rowNumber: index + 2,
            values: Object.fromEntries(
                Object.entries(record).map(([key, value]) => [
                    key,
                    normalizedCellValue(value).trim(),
                ]),
            ),
        }));
    }

    private parseJson(buffer: Buffer): ParsedImportRow[] {
        const parsed = JSON.parse(buffer.toString('utf8')) as unknown;
        const rows = Array.isArray(parsed)
            ? parsed
            : typeof parsed === 'object' &&
              parsed !== null &&
              'data' in parsed &&
              Array.isArray(parsed.data)
                ? parsed.data
                : null;

        if (!rows) {
            throw new AppError('JSON import must be an array or contain a data array', 400);
        }

        return jsonRowsToParsed(rows as Record<string, unknown>[]);
    }

    private async parseXlsx(buffer: Buffer): Promise<ParsedImportRow[]> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new AppError('Workbook must contain at least one worksheet', 400);
        }

        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values as unknown[];
        const parsed: ParsedImportRow[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                return;
            }

            const values: Record<string, string> = {};
            let hasValue = false;

            for (let index = 1; index < headers.length; index += 1) {
                const header = normalizedCellValue(headers[index]).trim();

                if (!header) {
                    continue;
                }

                const value = normalizedCellValue(row.getCell(index).value).trim();

                if (value) {
                    hasValue = true;
                }

                values[header] = value;
            }

            if (hasValue) {
                parsed.push({ rowNumber, values });
            }
        });

        return parsed;
    }
}
