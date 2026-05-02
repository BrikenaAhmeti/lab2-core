export interface RequestUser {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface RequestWithUser {
    user?: RequestUser;
}
