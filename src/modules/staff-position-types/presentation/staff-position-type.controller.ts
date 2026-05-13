import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { CreateStaffPositionTypeCommand } from '../application/commands/create-staff-position-type.command';
import { DeactivateStaffPositionTypeCommand } from '../application/commands/deactivate-staff-position-type.command';
import { UpdateStaffPositionTypeCommand } from '../application/commands/update-staff-position-type.command';
import { CreateStaffPositionTypeHandler } from '../application/handlers/create-staff-position-type.handler';
import { DeactivateStaffPositionTypeHandler } from '../application/handlers/deactivate-staff-position-type.handler';
import { GetStaffPositionTypeByIdHandler } from '../application/handlers/get-staff-position-type-by-id.handler';
import { ListStaffPositionTypesHandler } from '../application/handlers/list-staff-position-types.handler';
import { UpdateStaffPositionTypeHandler } from '../application/handlers/update-staff-position-type.handler';
import { GetStaffPositionTypeByIdQuery } from '../application/queries/get-staff-position-type-by-id.query';
import { ListStaffPositionTypesQuery } from '../application/queries/list-staff-position-types.query';
import { StaffPositionTypePrismaRepository } from '../infrastructure/staff-position-type.prisma.repository';
import { StaffPositionTypeService } from '../services/staff-position-type.service';

const staffPositionTypeIdParamsSchema = z.object({
    id: z.string().uuid('Invalid staff position type id'),
});

const applicableDepartmentIdsSchema = z
    .array(z.string().uuid('Invalid applicable department id'))
    .optional();

const createStaffPositionTypeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Staff position type name must be at least 2 characters')
        .max(100, 'Staff position type name must be at most 100 characters'),
    description: z
        .string()
        .trim()
        .max(255, 'Description must be at most 255 characters')
        .optional(),
    defaultRoleKey: z
        .string()
        .trim()
        .min(2, 'Default role is required')
        .max(100, 'Default role must be at most 100 characters')
        .regex(
            /^[A-Za-z][A-Za-z0-9_:\-\s]*$/,
            'Default role must start with a letter and contain only letters, numbers, spaces, hyphens, underscores, or colons',
        ),
    applicableDepartmentIds: applicableDepartmentIdsSchema.nullable().optional(),
    isActive: z.boolean().optional(),
});

const listStaffPositionTypesQuerySchema = z.object({
    isActive: z.preprocess((value) => {
        if (value === undefined || value === '') return undefined;
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    }, z.boolean().optional()),
});

const updateStaffPositionTypeSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, 'Staff position type name must be at least 2 characters')
            .max(100, 'Staff position type name must be at most 100 characters')
            .optional(),
        description: z
            .union([
                z.string().trim().max(255, 'Description must be at most 255 characters'),
                z.null(),
            ])
            .optional(),
        defaultRoleKey: z
            .string()
            .trim()
            .min(2, 'Default role is required')
            .max(100, 'Default role must be at most 100 characters')
            .regex(
                /^[A-Za-z][A-Za-z0-9_:\-\s]*$/,
                'Default role must start with a letter and contain only letters, numbers, spaces, hyphens, underscores, or colons',
            )
            .optional(),
        applicableDepartmentIds: applicableDepartmentIdsSchema.nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .refine(
        (body) =>
            body.name !== undefined ||
            body.description !== undefined ||
            body.defaultRoleKey !== undefined ||
            body.applicableDepartmentIds !== undefined ||
            body.isActive !== undefined,
        {
            message: 'At least one field is required',
        },
    );

export class StaffPositionTypeController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly service = new StaffPositionTypeService(
        new StaffPositionTypePrismaRepository(),
    );
    private readonly createStaffPositionTypeHandler = new CreateStaffPositionTypeHandler(
        this.service,
    );
    private readonly getStaffPositionTypeByIdHandler =
        new GetStaffPositionTypeByIdHandler(this.service);
    private readonly listStaffPositionTypesHandler = new ListStaffPositionTypesHandler(
        this.service,
    );
    private readonly updateStaffPositionTypeHandler = new UpdateStaffPositionTypeHandler(
        this.service,
    );
    private readonly deactivateStaffPositionTypeHandler =
        new DeactivateStaffPositionTypeHandler(this.service);

    async create(req: Request, res: Response) {
        const body = createStaffPositionTypeSchema.parse(req.body);
        const command = new CreateStaffPositionTypeCommand(
            body.name,
            body.defaultRoleKey,
            body.description,
            body.applicableDepartmentIds,
            body.isActive,
        );
        const result = await this.commandBus.execute(
            this.createStaffPositionTypeHandler,
            command,
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const queryData = listStaffPositionTypesQuerySchema.parse(req.query);
        const query = new ListStaffPositionTypesQuery(queryData.isActive);
        const result = await this.queryBus.execute(
            this.listStaffPositionTypesHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = staffPositionTypeIdParamsSchema.parse(req.params);
        const query = new GetStaffPositionTypeByIdQuery(params.id);
        const result = await this.queryBus.execute(
            this.getStaffPositionTypeByIdHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = staffPositionTypeIdParamsSchema.parse(req.params);
        const body = updateStaffPositionTypeSchema.parse(req.body);
        const command = new UpdateStaffPositionTypeCommand(
            params.id,
            body.name,
            body.defaultRoleKey,
            body.description,
            body.applicableDepartmentIds,
            body.isActive,
        );
        const result = await this.commandBus.execute(
            this.updateStaffPositionTypeHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async deactivate(req: Request, res: Response) {
        const params = staffPositionTypeIdParamsSchema.parse(req.params);
        const command = new DeactivateStaffPositionTypeCommand(params.id);
        const result = await this.commandBus.execute(
            this.deactivateStaffPositionTypeHandler,
            command,
        );

        return res.status(200).json(result);
    }
}
