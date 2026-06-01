import { env } from '../../../config/env';
import {
    LabAiClient,
    LabAiInterpretationRequest,
    LabAiQueueResponse,
} from '../domain/lab-ai.client';

function toAiInterpretationUrl(baseUrl: string, labOrderId: string) {
    return new URL(
        `/api/ai/internal/lab-results/${encodeURIComponent(labOrderId)}/interpret`,
        baseUrl,
    );
}

export class HttpLabAiClient implements LabAiClient {
    constructor(
        private readonly baseUrl = env.aiServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async queueLabInterpretation(
        labOrderId: string,
        payload: LabAiInterpretationRequest,
    ): Promise<LabAiQueueResponse> {
        if (!this.baseUrl || !this.internalApiKey) {
            return {
                labOrderId,
                status: 'not_configured',
                message: 'AI service URL or internal API key is not configured',
            };
        }

        const response = await fetch(toAiInterpretationUrl(this.baseUrl, labOrderId), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-internal-api-key': this.internalApiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`AI service returned ${response.status}`);
        }

        const body = (await response.json()) as Partial<LabAiQueueResponse>;

        return {
            labOrderId: body.labOrderId ?? labOrderId,
            status: body.status === 'queued' ? 'queued' : 'not_configured',
            message: body.message,
        };
    }
}
