import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export function requestContext(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const headerRequestId = req.header('x-request-id');
    const requestId = headerRequestId && headerRequestId.trim()
        ? headerRequestId.trim()
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
}
