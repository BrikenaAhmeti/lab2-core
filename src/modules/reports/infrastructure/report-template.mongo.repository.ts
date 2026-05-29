import {
    Collection,
    MongoClient,
    ObjectId,
    WithId,
} from 'mongodb';
import { env } from '../../../config/env';
import {
    ReportTemplate,
    ReportType,
    SaveReportTemplateData,
} from '../domain/reports.entity';
import { ReportTemplateRepository } from '../domain/reports.repository';

interface ReportTemplateDocument {
    name: string;
    description: string | null;
    reportType: ReportType;
    parameters: Record<string, unknown>;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const collectionName = 'report_templates';

function toTemplate(document: WithId<ReportTemplateDocument>): ReportTemplate {
    return {
        id: document._id.toString(),
        name: document.name,
        description: document.description,
        reportType: document.reportType,
        parameters: document.parameters,
        createdBy: document.createdBy,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

export class MongoReportTemplateRepository implements ReportTemplateRepository {
    private static clientPromise: Promise<MongoClient> | null = null;
    private static memoryTemplates: ReportTemplate[] = [];

    async saveTemplate(data: SaveReportTemplateData): Promise<ReportTemplate> {
        const now = new Date();

        if (!env.mongodbUri) {
            const template: ReportTemplate = {
                id: new ObjectId().toString(),
                name: data.name,
                description: data.description ?? null,
                reportType: data.reportType,
                parameters: data.parameters,
                createdBy: data.createdBy ?? null,
                createdAt: now,
                updatedAt: now,
            };
            MongoReportTemplateRepository.memoryTemplates.unshift(template);
            return template;
        }

        const collection = await this.getCollection();
        const document: ReportTemplateDocument = {
            name: data.name,
            description: data.description ?? null,
            reportType: data.reportType,
            parameters: data.parameters,
            createdBy: data.createdBy ?? null,
            createdAt: now,
            updatedAt: now,
        };
        const result = await collection.insertOne(document);

        return {
            id: result.insertedId.toString(),
            ...document,
        };
    }

    async listTemplates(reportType?: ReportType): Promise<ReportTemplate[]> {
        if (!env.mongodbUri) {
            return MongoReportTemplateRepository.memoryTemplates.filter(
                (template) => !reportType || template.reportType === reportType,
            );
        }

        const collection = await this.getCollection();
        const documents = await collection
            .find(reportType ? { reportType } : {})
            .sort({ updatedAt: -1 })
            .toArray();

        return documents.map(toTemplate);
    }

    private async getCollection(): Promise<Collection<ReportTemplateDocument>> {
        if (!MongoReportTemplateRepository.clientPromise) {
            MongoReportTemplateRepository.clientPromise = MongoClient.connect(
                env.mongodbUri,
            );
        }

        const client = await MongoReportTemplateRepository.clientPromise;
        return client.db().collection<ReportTemplateDocument>(collectionName);
    }
}
