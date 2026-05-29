import { AdvancedSearchRepository } from '../../src/modules/search/domain/search.repository';
import { AdvancedSearchService } from '../../src/modules/search/services/search.service';

const emptyResult = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
};

function createRepositoryMock(): jest.Mocked<AdvancedSearchRepository> {
    return {
        searchPatients: jest.fn().mockResolvedValue(emptyResult),
        searchAppointments: jest.fn().mockResolvedValue(emptyResult),
        searchLabOrders: jest.fn().mockResolvedValue(emptyResult),
        searchInventoryItems: jest.fn().mockResolvedValue(emptyResult),
        searchStaff: jest.fn().mockResolvedValue(emptyResult),
        searchAuditLogs: jest.fn().mockResolvedValue(emptyResult),
    };
}

describe('AdvancedSearchService', () => {
    it('normalizes patient search and prepares personal number exact matching', async () => {
        const repository = createRepositoryMock();
        const service = new AdvancedSearchService(repository);

        await service.searchPatients({
            page: 1,
            limit: 10,
            search: '  Arta    Krasniqi  ',
        });

        expect(repository.searchPatients).toHaveBeenCalledWith(
            expect.objectContaining({
                search: 'Arta Krasniqi',
                personalNumberHash: expect.any(String),
            }),
        );
    });

    it('rejects inverted age filters', () => {
        const service = new AdvancedSearchService(createRepositoryMock());
        let error: unknown;

        try {
            service.searchPatients({
                page: 1,
                limit: 10,
                minAge: 65,
                maxAge: 20,
            });
        } catch (caught) {
            error = caught;
        }

        expect(error).toMatchObject({
            message: 'minAge must be less than or equal to maxAge',
            statusCode: 400,
        });
    });

    it('rejects inverted date filters', () => {
        const service = new AdvancedSearchService(createRepositoryMock());
        let error: unknown;

        try {
            service.searchAppointments({
                page: 1,
                limit: 10,
                from: new Date('2026-05-30T00:00:00.000Z'),
                to: new Date('2026-05-01T00:00:00.000Z'),
            });
        } catch (caught) {
            error = caught;
        }

        expect(error).toMatchObject({
            message: 'from must be before or equal to to',
            statusCode: 400,
        });
    });

    it('normalizes audit log text filters', async () => {
        const repository = createRepositoryMock();
        const service = new AdvancedSearchService(repository);

        await service.searchAuditLogs({
            page: 1,
            limit: 10,
            search: '  patient   updated ',
            action: ' UPDATE ',
            entity: ' patient ',
            ip: ' 127.0.0.1 ',
        });

        expect(repository.searchAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                search: 'patient updated',
                action: 'UPDATE',
                entity: 'patient',
                ip: '127.0.0.1',
            }),
        );
    });
});
