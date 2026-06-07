import { env } from '../../config/env';
import { AppError } from '../core/errors/app-error';

export interface ProvisionAuthAccountInput {
    actorUserId?: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    username?: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    personalNumber?: string | null;
}

export interface ProvisionedAuthAccount {
    id: string;
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    isActive: boolean;
    roles: string[];
}

export interface AuthAccountProvisioningClient {
    provisionAccount(input: ProvisionAuthAccountInput): Promise<ProvisionedAuthAccount>;
}

export class HttpAuthAccountProvisioningClient implements AuthAccountProvisioningClient {
    async provisionAccount(input: ProvisionAuthAccountInput): Promise<ProvisionedAuthAccount> {
        if (!env.authServiceUrl || !env.internalApiKey) {
            throw new AppError('Auth account provisioning is not configured', 503);
        }

        const response = await fetch(
            `${env.authServiceUrl.replace(/\/$/, '')}/internal/auth/provision-account`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': env.internalApiKey,
                },
                body: JSON.stringify({
                    ...input,
                    phone: input.phone ?? undefined,
                    dateOfBirth: input.dateOfBirth?.toISOString(),
                    gender: input.gender ?? undefined,
                    personalNumber: input.personalNumber ?? undefined,
                }),
            },
        );

        const payload = await response.json().catch(() => undefined) as
            | { message?: string; user?: ProvisionedAuthAccount }
            | undefined;

        if (!response.ok || !payload?.user) {
            throw new AppError(
                payload?.message || 'Auth account could not be provisioned',
                response.status || 502,
            );
        }

        return payload.user;
    }
}
