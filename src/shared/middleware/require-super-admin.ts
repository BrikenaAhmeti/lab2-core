import { NextFunction, Request, Response } from 'express';

const SUPER_ADMIN_ROLE_ALIASES = new Set([
    'super admin',
    'super_admin',
    'superadmin',
]);

function normalizeRole(role: string) {
    return role.trim().toLowerCase();
}

export function requireSuperAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasSuperAdminRole = (req.user.roles ?? []).some((role) =>
        SUPER_ADMIN_ROLE_ALIASES.has(normalizeRole(role)),
    );

    if (!hasSuperAdminRole) {
        return res.status(403).json({ message: 'Super Admin access required' });
    }

    return next();
}
