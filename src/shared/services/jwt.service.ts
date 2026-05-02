import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AccessTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export class JwtService {
    verifyAccessToken(token: string): AccessTokenPayload {
        return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    }
}
