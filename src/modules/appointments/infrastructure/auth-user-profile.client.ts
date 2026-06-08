import { env } from '../../../config/env';

export interface AuthUserProfile {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    username?: string | null;
    phone?: string | null;
    roles?: string[];
    role?: string;
}

export interface AuthUserProfileClient {
    getProfiles(userIds: string[]): Promise<AuthUserProfile[]>;
}

export class HttpAuthUserProfileClient implements AuthUserProfileClient {
    async getProfiles(userIds: string[]): Promise<AuthUserProfile[]> {
        const uniqueIds = [...new Set(userIds)].filter(Boolean);

        if (
            uniqueIds.length === 0 ||
            !env.authServiceUrl ||
            !env.internalApiKey
        ) {
            return [];
        }

        try {
            const response = await fetch(
                `${env.authServiceUrl.replace(/\/$/, '')}/internal/users/profiles`,
                {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-internal-api-key': env.internalApiKey,
                    },
                    body: JSON.stringify({ userIds: uniqueIds }),
                },
            );

            if (!response.ok) {
                return [];
            }

            const payload = (await response.json()) as {
                data?: AuthUserProfile[];
            };

            return Array.isArray(payload.data) ? payload.data : [];
        } catch {
            return [];
        }
    }
}
