import { env } from '../../../config/env';

export interface ContactEmailClient {
    sendAcknowledgement(input: {
        name: string;
        email: string;
        subject: string;
    }): Promise<void>;
    sendReply(input: {
        name: string;
        email: string;
        subject: string;
        replyText: string;
    }): Promise<void>;
}

export class AuthContactEmailClient implements ContactEmailClient {
    constructor(
        private readonly baseUrl = env.authServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async sendAcknowledgement(input: {
        name: string;
        email: string;
        subject: string;
    }): Promise<void> {
        await this.post('/internal/auth/contact-acknowledgement', input);
    }

    async sendReply(input: {
        name: string;
        email: string;
        subject: string;
        replyText: string;
    }): Promise<void> {
        await this.post('/internal/auth/contact-reply', input);
    }

    private async post(path: string, input: unknown): Promise<void> {
        if (!this.baseUrl || !this.internalApiKey) {
            return;
        }

        const response = await fetch(
            new URL(path, this.baseUrl),
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': this.internalApiKey,
                },
                body: JSON.stringify(input),
            },
        );

        if (!response.ok) {
            const problem = (await response.json().catch(() => undefined)) as
                | { message?: string }
                | undefined;
            throw new Error(
                problem?.message || `Auth service returned ${response.status}`,
            );
        }
    }
}
