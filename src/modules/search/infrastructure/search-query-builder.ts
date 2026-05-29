import { Prisma } from '../../../generated/prisma';

export type SortableColumns = Record<string, Prisma.Sql>;

export function normalizeSearchTerm(search?: string) {
    const normalized = search?.trim().replace(/\s+/g, ' ');

    return normalized || undefined;
}

export function buildSearchQuery(
    search: string | undefined,
    vectors: Prisma.Sql[],
    exactConditions: Prisma.Sql[] = [],
) {
    const normalizedSearch = normalizeSearchTerm(search);

    if (!normalizedSearch) {
        return null;
    }

    const vectorConditions = vectors.map((vector) =>
        Prisma.sql`${vector} @@ websearch_to_tsquery('simple', ${normalizedSearch})`,
    );

    return Prisma.sql`(${Prisma.join([...vectorConditions, ...exactConditions], ' OR ')})`;
}

export function buildWhere(conditions: Prisma.Sql[]) {
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;
}

export function buildOrderBy(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' | undefined,
    sortableColumns: SortableColumns,
    defaultOrder: Prisma.Sql,
) {
    const column = sortBy ? sortableColumns[sortBy] : undefined;

    if (!column) {
        return Prisma.sql`ORDER BY ${defaultOrder}`;
    }

    const direction = sortOrder === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');

    return Prisma.sql`ORDER BY ${column} ${direction}, ${defaultOrder}`;
}

export function buildLimitOffset(page: number, limit: number) {
    return Prisma.sql`LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
}

export function buildPagedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
) {
    return {
        data,
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
}
