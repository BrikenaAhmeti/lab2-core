import crypto from 'crypto';
import {
    ImportEntity,
    ImportJob,
    ImportMode,
    ImportResult,
} from '../domain/data-exchange.entity';

export class ImportJobStore {
    private readonly jobs = new Map<string, ImportJob>();

    create(entity: ImportEntity, mode: ImportMode) {
        const job: ImportJob = {
            id: crypto.randomUUID(),
            entity,
            mode,
            status: 'queued',
            createdAt: new Date(),
        };

        this.jobs.set(job.id, job);

        return job;
    }

    processing(id: string) {
        const job = this.jobs.get(id);

        if (job) {
            job.status = 'processing';
        }
    }

    complete(id: string, result: ImportResult) {
        const job = this.jobs.get(id);

        if (job) {
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
        }
    }

    fail(id: string, error: string) {
        const job = this.jobs.get(id);

        if (job) {
            job.status = 'failed';
            job.error = error;
            job.completedAt = new Date();
        }
    }

    get(id: string) {
        return this.jobs.get(id) ?? null;
    }
}

export const importJobStore = new ImportJobStore();
