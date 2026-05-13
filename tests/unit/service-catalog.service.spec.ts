import { AppError } from '../../src/shared/core/errors/app-error';
import { ServiceCatalogRepository } from '../../src/modules/service-catalog/domain/service-catalog.repository';
import { ServiceCatalogService } from '../../src/modules/service-catalog/services/service-catalog.service';

function createRepositoryMock(): jest.Mocked<ServiceCatalogRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        departmentExists: jest.fn(),
        countActiveAppointmentsByServiceId: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
    };
}

describe('ServiceCatalogService', () => {
    const serviceCatalog = {
        id: '7d6bc4ce-6a73-48cd-b27d-06fae03c8f67',
        departmentId: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
        name: 'Initial Consultation',
        description: 'Standard first visit',
        defaultDurationMinutes: 30,
        defaultPrice: 50,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        department: {
            id: '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e',
            name: 'Cardiology',
            isActive: true,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should normalize and create a service', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.departmentExists.mockResolvedValue(true);
        repository.create.mockResolvedValue(serviceCatalog);

        const result = await service.createService({
            departmentId: serviceCatalog.departmentId,
            name: '  Initial   Consultation  ',
            description: '  Standard   first visit  ',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
        });

        expect(repository.create).toHaveBeenCalledWith({
            departmentId: serviceCatalog.departmentId,
            name: 'Initial Consultation',
            description: 'Standard first visit',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: undefined,
            sortOrder: undefined,
        });
        expect(result).toEqual(serviceCatalog);
    });

    it('should reject create when the department does not exist', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.departmentExists.mockResolvedValue(false);

        await expect(
            service.createService({
                departmentId: serviceCatalog.departmentId,
                name: 'Initial Consultation',
                defaultDurationMinutes: 30,
                defaultPrice: 50,
            }),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('should list services with normalized filters', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.list.mockResolvedValue({
            items: [serviceCatalog],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });

        const result = await service.listServices({
            page: 1,
            limit: 10,
            search: '  initial   visit ',
            departmentId: serviceCatalog.departmentId,
            isActive: true,
        });

        expect(repository.list).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: 'initial visit',
            departmentId: serviceCatalog.departmentId,
            isActive: true,
            sortBy: undefined,
            sortDirection: undefined,
        });
        expect(result.items).toHaveLength(1);
    });

    it('should update a service', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.findById.mockResolvedValue(serviceCatalog);
        repository.update.mockResolvedValue({
            ...serviceCatalog,
            name: 'Follow-up Visit',
            description: 'Shorter visit',
            defaultDurationMinutes: 20,
            defaultPrice: 35,
        });

        const result = await service.updateService(serviceCatalog.id, {
            name: '  Follow-up   Visit ',
            description: '  Shorter  visit ',
            defaultDurationMinutes: 20,
            defaultPrice: 35,
        });

        expect(repository.update).toHaveBeenCalledWith(serviceCatalog.id, {
            name: 'Follow-up Visit',
            description: 'Shorter visit',
            defaultDurationMinutes: 20,
            defaultPrice: 35,
        });
        expect(result.name).toBe('Follow-up Visit');
    });

    it('should reject deactivation when active appointments exist', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.findById.mockResolvedValue(serviceCatalog);
        repository.countActiveAppointmentsByServiceId.mockResolvedValue(2);

        await expect(service.deactivateService(serviceCatalog.id)).rejects.toMatchObject({
            message: 'Service cannot be deactivated while active appointments reference it',
            statusCode: 409,
        });
    });

    it('should deactivate a service when it has no active appointments', async () => {
        const repository = createRepositoryMock();
        const service = new ServiceCatalogService(repository);

        repository.findById.mockResolvedValue(serviceCatalog);
        repository.countActiveAppointmentsByServiceId.mockResolvedValue(0);
        repository.deactivate.mockResolvedValue({
            ...serviceCatalog,
            isActive: false,
        });

        const result = await service.deactivateService(serviceCatalog.id);

        expect(repository.deactivate).toHaveBeenCalledWith(serviceCatalog.id);
        expect(result.isActive).toBe(false);
    });
});
