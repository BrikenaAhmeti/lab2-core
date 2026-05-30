import jwt from 'jsonwebtoken';
import request from 'supertest';
import { InventoryTransactionType } from '../../src/generated/prisma';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'department-service-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    InventoryPrismaRepository,
} = require('../../src/modules/inventory/infrastructure/inventory.prisma.repository');

const categoryId = '4760f10d-74e6-4e79-a551-11604402dc94';
const departmentId = '955a7981-0a83-4db0-a486-a455e3cfa8bb';
const itemId = 'a8a82e43-b0b2-437a-9b04-6154da418a9a';
const actorUserId = 'eb428a9e-72ec-47d7-89a0-a32094a7bada';

const category = {
    id: categoryId,
    name: 'Medication',
    description: 'Medication stock',
    parentId: null,
    isActive: true,
    createdAt: new Date('2026-05-20T10:00:00.000Z'),
    updatedAt: new Date('2026-05-20T10:00:00.000Z'),
    parent: null,
};

const item = {
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
};

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: actorUserId,
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Inventory routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('creates inventory categories through the CQRS route', async () => {
        const createSpy = jest
            .spyOn(InventoryPrismaRepository.prototype, 'createCategory')
            .mockResolvedValue(category);

        jest.spyOn(InventoryPrismaRepository.prototype, 'findCategoryByName').mockResolvedValue(null);

        const response = await request(app)
            .post('/api/inventory/categories')
            .set('Authorization', `Bearer ${createAccessToken(['inventory:manage:all'])}`)
            .send({
                name: ' Medication ',
                description: ' Medication stock ',
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Medication');
        expect(createSpy).toHaveBeenCalledWith({
            name: 'Medication',
            description: 'Medication stock',
            parentId: null,
            isActive: undefined,
            actorUserId,
        });
    });

    it('lists inventory items with stock and expiry filters', async () => {
        const listSpy = jest
            .spyOn(InventoryPrismaRepository.prototype, 'listItems')
            .mockResolvedValue({
                items: [item],
                meta: {
                    page: 2,
                    limit: 5,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/inventory/items?page=2&limit=5&categoryId=${categoryId}&belowReorderLevel=true&expiringSoon=15`)
            .set('Authorization', `Bearer ${createAccessToken(['inventory:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith({
            page: 2,
            limit: 5,
            search: undefined,
            categoryId,
            departmentId: undefined,
            belowReorderLevel: true,
            expiringSoonDays: 15,
            isActive: undefined,
            sortBy: undefined,
            sortDirection: undefined,
            now: expect.any(Date),
        });
    });

    it('records inventory transactions through the item endpoint', async () => {
        const depletedItem = {
            ...item,
            currentStock: 5,
        };
        const recordSpy = jest
            .spyOn(InventoryPrismaRepository.prototype, 'recordTransaction')
            .mockResolvedValue({
                item: depletedItem,
                transactions: [
                    {
                        id: 'c6e1f25a-4e01-46f2-9a30-fcd27d69de0f',
                        itemId,
                        transactionType: InventoryTransactionType.WRITTEN_OFF,
                        quantity: 5,
                        unitCost: null,
                        batchNumber: null,
                        expiryDate: null,
                        referenceEntityType: null,
                        referenceEntityId: null,
                        notes: 'Ward supply usage',
                        performedByUserId: actorUserId,
                        createdAt: new Date('2026-05-20T10:00:00.000Z'),
                        updatedAt: new Date('2026-05-20T10:00:00.000Z'),
                    },
                ],
            });

        jest.spyOn(InventoryPrismaRepository.prototype, 'findItemById').mockResolvedValue(item);

        const response = await request(app)
            .post(`/api/inventory/items/${itemId}/transactions`)
            .set('Authorization', `Bearer ${createAccessToken(['inventory:manage:all'])}`)
            .send({
                type: 'out',
                quantity: 5,
                reason: ' Ward supply usage ',
            });

        expect(response.status).toBe(201);
        expect(response.body.item.currentStock).toBe(5);
        expect(recordSpy).toHaveBeenCalledWith(itemId, {
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
    });

    it('returns inventory alerts for authorized readers', async () => {
        jest.spyOn(InventoryPrismaRepository.prototype, 'getAlerts').mockResolvedValue({
            generatedAt: new Date('2026-05-20T10:00:00.000Z'),
            expiringSoonDays: 20,
            lowStock: [],
            criticalShortage: [],
            expiringSoon: [],
        });

        const response = await request(app)
            .get('/api/inventory/alerts?expiringSoonDays=20')
            .set('Authorization', `Bearer ${createAccessToken(['inventory:read'])}`);

        expect(response.status).toBe(200);
        expect(response.body.expiringSoonDays).toBe(20);
    });

    it('protects inventory alerts with inventory permissions', async () => {
        const response = await request(app)
            .get('/api/inventory/alerts')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(403);
    });
});
