import { InventoryTransactionType } from '../../src/generated/prisma';
import { AppError } from '../../src/shared/core/errors/app-error';
import { InventoryEventPublisher } from '../../src/modules/inventory/domain/inventory-event.publisher';
import { InventoryItemEntity } from '../../src/modules/inventory/domain/inventory.entity';
import { InventoryRepository } from '../../src/modules/inventory/domain/inventory.repository';
import { InventoryService } from '../../src/modules/inventory/services/inventory.service';

const categoryId = '4760f10d-74e6-4e79-a551-11604402dc94';
const departmentId = '955a7981-0a83-4db0-a486-a455e3cfa8bb';
const itemId = 'a8a82e43-b0b2-437a-9b04-6154da418a9a';
const actorUserId = 'eb428a9e-72ec-47d7-89a0-a32094a7bada';

function createRepositoryMock(): jest.Mocked<InventoryRepository> {
    return {
        createCategory: jest.fn(),
        findCategoryById: jest.fn(),
        findCategoryByName: jest.fn(),
        listCategories: jest.fn(),
        updateCategory: jest.fn(),
        deactivateCategory: jest.fn(),
        createItem: jest.fn(),
        findItemById: jest.fn(),
        findItemBySku: jest.fn(),
        listItems: jest.fn(),
        updateItem: jest.fn(),
        deactivateItem: jest.fn(),
        recordTransaction: jest.fn(),
        listTransactions: jest.fn(),
        getAlerts: jest.fn(),
        categoryExists: jest.fn(),
        departmentExists: jest.fn(),
    };
}

function createPublisherMock(): jest.Mocked<InventoryEventPublisher> {
    return {
        publish: jest.fn().mockResolvedValue(undefined),
    };
}

function createItem(overrides: Partial<InventoryItemEntity> = {}): InventoryItemEntity {
    return {
        id: itemId,
        categoryId,
        departmentId,
        sku: 'ASP-81',
        name: 'Aspirin 81 mg',
        description: 'Medication stock',
        unitOfMeasure: 'tablet',
        currentStock: 10,
        reorderLevel: 5,
        unitCost: 1,
        expiryDate: null,
        isActive: true,
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
        updatedAt: new Date('2026-05-20T10:00:00.000Z'),
        category: {
            id: categoryId,
            name: 'Medication',
            isActive: true,
        },
        department: {
            id: departmentId,
            name: 'Pharmacy',
            isActive: true,
        },
        ...overrides,
    };
}

describe('InventoryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('records outgoing stock and emits low stock when the item reaches reorder level', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        const service = new InventoryService(repository, publisher);
        const existingItem = createItem({ currentStock: 10, reorderLevel: 5 });
        const lowStockItem = createItem({ currentStock: 5, reorderLevel: 5 });

        repository.findItemById.mockResolvedValue(existingItem);
        repository.recordTransaction.mockResolvedValue({
            item: lowStockItem,
            transactions: [],
        });

        const result = await service.recordTransaction(itemId, {
            type: 'out',
            quantity: 5,
            reason: 'Ward supply usage',
            actorUserId,
        });

        expect(repository.recordTransaction).toHaveBeenCalledWith(itemId, {
            transactionType: InventoryTransactionType.WRITTEN_OFF,
            quantity: 5,
            resultingStock: 5,
            unitCost: null,
            batchNumber: undefined,
            expiryDate: null,
            referenceEntityType: undefined,
            referenceEntityId: undefined,
            notes: 'Ward supply usage',
            targetDepartmentId: null,
            actorUserId,
        });
        expect(publisher.publish).toHaveBeenCalledWith('InventoryLowStock', {
            item: lowStockItem,
            alertType: 'low_stock',
            actorUserId,
        });
        expect(result.item.currentStock).toBe(5);
    });

    it('emits critical shortage when stock reaches zero', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        const service = new InventoryService(repository, publisher);
        const existingItem = createItem({ currentStock: 4, reorderLevel: 5 });
        const depletedItem = createItem({ currentStock: 0, reorderLevel: 5 });

        repository.findItemById.mockResolvedValue(existingItem);
        repository.recordTransaction.mockResolvedValue({
            item: depletedItem,
            transactions: [],
        });

        await service.recordTransaction(itemId, {
            type: 'out',
            quantity: 4,
            reason: 'Emergency usage',
            actorUserId,
        });

        expect(publisher.publish).toHaveBeenCalledTimes(1);
        expect(publisher.publish).toHaveBeenCalledWith('InventoryCriticalShortage', {
            item: depletedItem,
            alertType: 'critical_shortage',
            actorUserId,
        });
    });

    it('rejects outgoing transactions that would make stock negative', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        const service = new InventoryService(repository, publisher);

        repository.findItemById.mockResolvedValue(createItem({ currentStock: 3 }));

        await expect(
            service.recordTransaction(itemId, {
                type: 'out',
                quantity: 4,
                reason: 'Manual usage',
            }),
        ).rejects.toMatchObject({
            message: 'Quantity cannot exceed current stock',
            statusCode: 409,
        });
        expect(repository.recordTransaction).not.toHaveBeenCalled();
        expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('requires a reason for adjustment transactions', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        const service = new InventoryService(repository, publisher);

        repository.findItemById.mockResolvedValue(createItem());

        await expect(
            service.recordTransaction(itemId, {
                type: 'adjustment',
                quantity: 8,
                reason: '   ',
            }),
        ).rejects.toBeInstanceOf(AppError);
        expect(repository.recordTransaction).not.toHaveBeenCalled();
    });

    it('records transfer transactions without changing stock', async () => {
        const repository = createRepositoryMock();
        const publisher = createPublisherMock();
        const service = new InventoryService(repository, publisher);
        const targetDepartmentId = 'fffb3ffd-7d1d-4487-bd14-af0eb803c1bc';
        const existingItem = createItem({ currentStock: 10 });

        repository.findItemById.mockResolvedValue(existingItem);
        repository.departmentExists.mockResolvedValue(true);
        repository.recordTransaction.mockResolvedValue({
            item: createItem({ currentStock: 10, departmentId: targetDepartmentId }),
            transactions: [],
        });

        await service.recordTransaction(itemId, {
            type: 'transfer',
            quantity: 3,
            reason: 'Move to cardiology',
            targetDepartmentId,
            actorUserId,
        });

        expect(repository.recordTransaction).toHaveBeenCalledWith(itemId, {
            transactionType: InventoryTransactionType.TRANSFERRED,
            quantity: 3,
            resultingStock: 10,
            unitCost: null,
            batchNumber: undefined,
            expiryDate: null,
            referenceEntityType: undefined,
            referenceEntityId: undefined,
            notes: 'Move to cardiology',
            targetDepartmentId,
            actorUserId,
        });
    });
});
