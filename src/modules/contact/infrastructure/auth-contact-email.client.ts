import { env } from '../../../config/env';

export interface ContactAcknowledgementEmailClient {
    send(input: {
        name: string;
        email: string;
        subject: string;
    }): Promise<void>;
}

export class AuthContactEmailClient implements ContactAcknowledgementEmailClient {
    constructor(
        private readonly baseUrl = env.authServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async send(input: {
        name: string;
        email: string;
        subject: string;
    }): Promise<void> {
        if (!this.baseUrl || !this.internalApiKey) {
            return;
        }

        const response = await fetch(
            new URL('/internal/auth/contact-acknowledgement', this.baseUrl),
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
