import { Prisma } from '../../src/generated/prisma';
import {
    buildPagedResult,
    buildSearchQuery,
    buildWhere,
    normalizeSearchTerm,
} from '../../src/modules/search/infrastructure/search-query-builder';

describe('search query builder', () => {
    it('normalizes empty and multi-word search terms', () => {
        expect(normalizeSearchTerm('  Ada    Lovelace  ')).toBe('Ada Lovelace');
        expect(normalizeSearchTerm('   ')).toBeUndefined();
    });

    it('builds parameterized full-text search conditions', () => {
        const condition = buildSearchQuery(
            '  Ada    Lovelace ',
            [Prisma.sql`p.search_vector`],
            [Prisma.sql`p.personal_number_hash = ${'hash-value'}`],
        );
        const query = condition as unknown as { sql: string; values: unknown[] };

        expect(query.sql).toContain('websearch_to_tsquery');
        expect(query.values).toContain('Ada Lovelace');
        expect(query.values).toContain('hash-value');
    });

    it('combines where conditions only when present', () => {
        const empty = buildWhere([]) as unknown as { sql: string };
        const where = buildWhere([Prisma.sql`p.id = ${'1'}`]) as unknown as {
            sql: string;
        };

        expect(empty.sql).toBe('');
        expect(where.sql).toContain('WHERE');
    });

    it('builds pagination metadata', () => {
        expect(buildPagedResult([{ id: '1' }], 21, 2, 10)).toEqual({
            data: [{ id: '1' }],
            total: 21,
            page: 2,
            limit: 10,
            totalPages: 3,
        });
    });
});
