import { env } from '../../config/env';

export interface AuthUserProfile {
    id: string;
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    username?: string | null;
    phone?: string | null;
    avatarFileId?: string | null;
    roles?: string[];
    role?: string;
}

export interface AuthUserProfilesClient {
    getProfiles(userIds: string[]): Promise<AuthUserProfile[]>;
}

export class HttpAuthUserProfilesClient implements AuthUserProfilesClient {
    async getProfiles(userIds: string[]): Promise<AuthUserProfile[]> {
        const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

        if (uniqueUserIds.length === 0 || !env.authServiceUrl || !env.internalApiKey) {
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
                    body: JSON.stringify({ userIds: uniqueUserIds }),
                },
            );

            const payload = await response.json().catch(() => undefined) as
                | { data?: AuthUserProfile[] }
                | undefined;

            if (!response.ok || !Array.isArray(payload?.data)) {
                return [];
            }

            return payload.data;
        } catch {
            return [];
        }
    }
}
