export type AiLabResultFlag = 'low' | 'normal' | 'high' | 'critical';

export interface LabAiResultItem {
    name: string;
    value: string | number;
    unit?: string;
    referenceRange?: string;
    flag?: AiLabResultFlag;
}

export interface LabAiPatientContext {
    age?: number;
    gender?: string;
    knownConditions?: string[];
}

export interface LabAiInterpretationRequest {
    patientId: string;
    results: LabAiResultItem[];
    patientContext?: LabAiPatientContext;
}

export interface LabAiQueueResponse {
    labOrderId: string;
    status: 'queued' | 'not_configured';
    message?: string;
}

export interface LabAiClient {
    queueLabInterpretation(
        labOrderId: string,
        payload: LabAiInterpretationRequest,
    ): Promise<LabAiQueueResponse>;
}

export class NoopLabAiClient implements LabAiClient {
    async queueLabInterpretation(labOrderId: string): Promise<LabAiQueueResponse> {
        return {
            labOrderId,
            status: 'not_configured',
            message: 'AI interpretation is not configured in the core service yet',
        };
    }
}
