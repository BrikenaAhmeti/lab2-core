import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateDepartmentCommand } from '../application/commands/create-department.command';
import { DeactivateDepartmentCommand } from '../application/commands/deactivate-department.command';
import { UpdateDepartmentCommand } from '../application/commands/update-department.command';
import { CreateDepartmentHandler } from '../application/handlers/create-department.handler';
import { DeactivateDepartmentHandler } from '../application/handlers/deactivate-department.handler';
import { GetDepartmentByIdQuery } from '../application/queries/get-department-by-id.query';
import { GetDepartmentByIdHandler } from '../application/handlers/get-department-by-id.handler';
import { ListDepartmentsHandler } from '../application/handlers/list-departments.handler';
import { UpdateDepartmentHandler } from '../application/handlers/update-department.handler';
import { ListDepartmentsQuery } from '../application/queries/list-departments.query';
import { DepartmentPrismaRepository } from '../infrastructure/department.prisma.repository';
import { DepartmentService } from '../services/department.service';

const createDepartmentSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Department name must be at least 2 characters')
        .max(100, 'Department name must be at most 100 characters'),
    description: z
        .string()
        .trim()
        .max(255, 'Description must be at most 255 characters')
        .optional(),
    floor: z.string().trim().max(50, 'Floor must be at most 50 characters').optional(),
    phoneExtension: z
        .string()
        .trim()
        .max(30, 'Phone extension must be at most 30 characters')
        .optional(),
    operatingHours: z.unknown().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

const departmentIdParamsSchema = z.object({
    id: z.string().uuid('Invalid department id'),
});

const listDepartmentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    isActive: z.preprocess((value) => {
        if (value === undefined || value === '') return undefined;
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    }, z.boolean().optional()),
    sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'updatedAt']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
});

const updateDepartmentSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, 'Department name must be at least 2 characters')
            .max(100, 'Department name must be at most 100 characters')
            .optional(),
        description: z
            .union([
                z.string().trim().max(255, 'Description must be at most 255 characters'),
                z.null(),
            ])
            .optional(),
        floor: z
            .union([z.string().trim().max(50, 'Floor must be at most 50 characters'), z.null()])
            .optional(),
        phoneExtension: z
            .union([
                z.string().trim().max(30, 'Phone extension must be at most 30 characters'),
                z.null(),
            ])
            .optional(),
        operatingHours: z.unknown().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
    })
    .refine(
        (body) =>
            body.name !== undefined ||
            body.description !== undefined ||
            body.floor !== undefined ||
            body.phoneExtension !== undefined ||
            body.operatingHours !== undefined ||
            body.isActive !== undefined ||
            body.sortOrder !== undefined,
        {
            message: 'At least one field is required',
        },
    );

export class DepartmentController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new DepartmentService(new DepartmentPrismaRepository());
    private readonly createDepartmentHandler = new CreateDepartmentHandler(this.service);
    private readonly getDepartmentByIdHandler = new GetDepartmentByIdHandler(this.service);
    private readonly listDepartmentsHandler = new ListDepartmentsHandler(this.service);
    private readonly updateDepartmentHandler = new UpdateDepartmentHandler(this.service);
    private readonly deactivateDepartmentHandler = new DeactivateDepartmentHandler(
        this.service,
    );

    async create(req: Request, res: Response) {
        const body = createDepartmentSchema.parse(req.body);
        const command = new CreateDepartmentCommand(
            body.name,
            body.description,
            body.floor,
            body.phoneExtension,
            body.operatingHours,
            body.isActive,
            body.sortOrder,
        );
        const result = await this.commandBus.execute(this.createDepartmentHandler, command);

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const queryData = listDepartmentsQuerySchema.parse(req.query);
        const query = new ListDepartmentsQuery(
            queryData.page,
            queryData.limit,
            queryData.search,
            queryData.isActive,
            queryData.sortBy,
            queryData.sortDirection,
        );
        const result = await this.queryBus.execute(this.listDepartmentsHandler, query);

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = departmentIdParamsSchema.parse(req.params);
        const query = new GetDepartmentByIdQuery(params.id);
        const result = await this.queryBus.execute(this.getDepartmentByIdHandler, query);

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = departmentIdParamsSchema.parse(req.params);
        const body = updateDepartmentSchema.parse(req.body);
        const command = new UpdateDepartmentCommand(
            params.id,
            body.name,
            body.description,
            body.floor,
            body.phoneExtension,
            body.operatingHours,
            body.isActive,
            body.sortOrder,
        );
        const result = await this.commandBus.execute(this.updateDepartmentHandler, command);

        return res.status(200).json(result);
    }

    async deactivate(req: Request, res: Response) {
        const params = departmentIdParamsSchema.parse(req.params);
        const command = new DeactivateDepartmentCommand(params.id);
        const result = await this.commandBus.execute(
            this.deactivateDepartmentHandler,
            command,
        );

        return res.status(200).json(result);
    }
}
