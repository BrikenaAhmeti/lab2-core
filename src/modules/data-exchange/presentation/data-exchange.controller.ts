import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { AppError } from '../../../shared/core/errors/app-error';
import { ImportEntityCommand } from '../application/commands/import-entity.command';
import { ExportEntityHandler } from '../application/handlers/export-entity.handler';
import { GetImportJobHandler } from '../application/handlers/get-import-job.handler';
import { GetImportTemplateHandler } from '../application/handlers/get-import-template.handler';
import { ImportEntityHandler } from '../application/handlers/import-entity.handler';
import { ExportEntityQuery } from '../application/queries/export-entity.query';
import { GetImportJobQuery } from '../application/queries/get-import-job.query';
import { GetImportTemplateQuery } from '../application/queries/get-import-template.query';
import {
    exchangeFormats,
    exportEntities,
    importEntities,
    ImportSource,
} from '../domain/data-exchange.entity';
import { DataExchangePrismaRepository } from '../infrastructure/data-exchange.prisma.repository';
import { importJobStore } from '../infrastructure/import-job.store';
import { DataExchangeFileService } from '../services/data-exchange-file.service';
import { DataExchangeService } from '../services/data-exchange.service';

const exportParamsSchema = z.object({
    entity: z.enum(exportEntities),
});

const importParamsSchema = z.object({
    entity: z.enum(importEntities),
});

const formatQuerySchema = z.object({
    format: z.enum(exchangeFormats).default('csv'),
});

const importQuerySchema = formatQuerySchema.extend({
    mode: z.enum(['strict', 'lenient']).default('strict'),
    format: z.enum(exchangeFormats).optional(),
    async: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
});

const jobParamsSchema = z.object({
    jobId: z.string().uuid('Invalid job id'),
});

function sendFile(res: Response, file: { contentType: string; filename: string; buffer: Buffer }) {
    res.setHeader('content-type', file.contentType);
    res.setHeader(
        'content-disposition',
        `attachment; filename="${file.filename}"`,
    );

    return res.status(200).send(file.buffer);
}

function bodyRows(req: Request) {
    if (Array.isArray(req.body)) {
        return req.body as Record<string, unknown>[];
    }

    if (
        req.body &&
        typeof req.body === 'object' &&
        'rows' in req.body &&
        Array.isArray(req.body.rows)
    ) {
        return req.body.rows as Record<string, unknown>[];
    }

    return undefined;
}

function bodyBuffer(req: Request) {
    if (Buffer.isBuffer(req.body)) {
        return req.body;
    }

    if (typeof req.body === 'string') {
        return Buffer.from(req.body);
    }

    if (
        req.body &&
        typeof req.body === 'object' &&
        'data' in req.body &&
        typeof req.body.data === 'string'
    ) {
        return Buffer.from(req.body.data);
    }

    return undefined;
}

function sourceFromRequest(req: Request): ImportSource {
    if (req.file) {
        return {
            buffer: req.file.buffer,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
        };
    }

    const rows = bodyRows(req);

    if (rows) {
        return { rows, format: 'json' };
    }

    const buffer = bodyBuffer(req);

    if (buffer) {
        return {
            buffer,
            mimeType: req.headers['content-type'],
        };
    }

    throw new AppError('Import file or rows are required', 400);
}

export class DataExchangeController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new DataExchangeService(
        new DataExchangePrismaRepository(),
        new DataExchangeFileService(),
        importJobStore,
    );
    private readonly exportEntityHandler = new ExportEntityHandler(this.service);
    private readonly getImportTemplateHandler = new GetImportTemplateHandler(
        this.service,
    );
    private readonly importEntityHandler = new ImportEntityHandler(this.service);
    private readonly getImportJobHandler = new GetImportJobHandler(this.service);

    async export(req: Request, res: Response) {
        const params = exportParamsSchema.parse(req.params);
        const query = formatQuerySchema.parse(req.query);
        const file = await this.queryBus.execute(
            this.exportEntityHandler,
            new ExportEntityQuery(params.entity, query.format),
        );

        return sendFile(res, file);
    }

    async template(req: Request, res: Response) {
        const params = importParamsSchema.parse(req.params);
        const query = formatQuerySchema.parse(req.query);
        const file = await this.queryBus.execute(
            this.getImportTemplateHandler,
            new GetImportTemplateQuery(params.entity, query.format),
        );

        return sendFile(res, file);
    }

    async import(req: Request, res: Response) {
        const params = importParamsSchema.parse(req.params);
        const query = importQuerySchema.parse({
            ...req.query,
            mode:
                typeof req.body === 'object' &&
                req.body &&
                'mode' in req.body &&
                typeof req.body.mode === 'string'
                    ? req.body.mode
                    : req.query.mode,
            async:
                typeof req.body === 'object' &&
                req.body &&
                'async' in req.body &&
                typeof req.body.async === 'string'
                    ? req.body.async
                    : req.query.async,
        });
        const source = sourceFromRequest(req);
        if (query.format) {
            source.format = query.format;
        }
        const result = await this.commandBus.execute(
            this.importEntityHandler,
            new ImportEntityCommand(
                params.entity,
                query.mode,
                source,
                req.user?.id,
                query.async,
            ),
        );

        if ('id' in result && result.status === 'queued') {
            return res.status(202).json(result);
        }

        return res.status(200).json(result);
    }

    async job(req: Request, res: Response) {
        const params = jobParamsSchema.parse(req.params);
        const job = await this.queryBus.execute(
            this.getImportJobHandler,
            new GetImportJobQuery(params.jobId),
        );

        return res.status(200).json(job);
    }
}
