import { Request, Response } from 'express';
import { z } from 'zod';
import { EmploymentStatus } from '../../../generated/prisma';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { AppointmentPrismaRepository } from '../../appointments/infrastructure/appointment.prisma.repository';
import { createAppointmentSlotLockRepository } from '../../appointments/infrastructure/appointment-slot-lock.repository';
import { dateOnlyToUtcDate } from '../../schedules/domain/slot-generator';
import { SchedulePrismaRepository } from '../../schedules/infrastructure/schedule.prisma.repository';
import { ScheduleService } from '../../schedules/services/schedule.service';
import { AddStaffDepartmentCommand } from '../application/commands/add-staff-department.command';
import { CreateStaffProfileCommand } from '../application/commands/create-staff-profile.command';
import { DeactivateStaffProfileCommand } from '../application/commands/deactivate-staff-profile.command';
import { RemoveStaffDepartmentCommand } from '../application/commands/remove-staff-department.command';
import { UpdateStaffProfileCommand } from '../application/commands/update-staff-profile.command';
import { AddStaffDepartmentHandler } from '../application/handlers/add-staff-department.handler';
import { CreateStaffProfileHandler } from '../application/handlers/create-staff-profile.handler';
import { DeactivateStaffProfileHandler } from '../application/handlers/deactivate-staff-profile.handler';
import { GetStaffProfileByIdHandler } from '../application/handlers/get-staff-profile-by-id.handler';
import { ListDepartmentStaffHandler } from '../application/handlers/list-department-staff.handler';
import { ListPublicStaffProfilesHandler } from '../application/handlers/list-public-staff-profiles.handler';
import { ListStaffProfilesHandler } from '../application/handlers/list-staff-profiles.handler';
import { RemoveStaffDepartmentHandler } from '../application/handlers/remove-staff-department.handler';
import { UpdateStaffProfileHandler } from '../application/handlers/update-staff-profile.handler';
import { GetStaffProfileByIdQuery } from '../application/queries/get-staff-profile-by-id.query';
import { ListDepartmentStaffQuery } from '../application/queries/list-department-staff.query';
import { ListPublicStaffProfilesQuery } from '../application/queries/list-public-staff-profiles.query';
import { ListStaffProfilesQuery } from '../application/queries/list-staff-profiles.query';
import { StaffPrismaRepository } from '../infrastructure/staff.prisma.repository';
import { StaffService } from '../services/staff.service';

const employmentStatusSchema = z.enum([
    'ACTIVE',
    'INACTIVE',
    'ON_LEAVE',
    'TERMINATED',
]);

const idParamsSchema = z.object({
    id: z.string().uuid('Invalid staff profile id'),
});

const doctorIdParamsSchema = z.object({
    doctorId: z.string().uuid('Invalid doctor id'),
});

const departmentStaffParamsSchema = z.object({
    id: z.string().uuid('Invalid department id'),
});

const dateOnlySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
    .refine((value) => dateOnlyToUtcDate(value).toISOString().slice(0, 10) === value, {
        message: 'Invalid date',
    });

const departmentAssignmentSchema = z.object({
    departmentId: z.string().uuid('Invalid department id'),
    isPrimary: z.boolean().optional(),
});

const createStaffProfileSchema = z
    .object({
        userId: z.string().uuid('Invalid user id'),
        staffPositionTypeId: z.string().uuid('Invalid staff position type id'),
        employeeCode: z
            .string()
            .trim()
            .min(2, 'Employee code must be at least 2 characters')
            .max(50, 'Employee code must be at most 50 characters'),
        specialization: z.string().trim().max(120).optional(),
        licenseNumber: z.string().trim().max(80).optional(),
        employmentStatus: employmentStatusSchema.optional(),
        hireDate: z.coerce.date().nullable().optional(),
        bio: z.string().trim().max(2000).optional(),
        isPublicProfile: z.boolean().optional(),
        departmentIds: z
            .array(z.string().uuid('Invalid department id'))
            .min(1, 'At least one department assignment is required')
            .optional(),
        departments: z.array(departmentAssignmentSchema).min(1).optional(),
    })
    .refine((body) => body.departmentIds !== undefined || body.departments !== undefined, {
        message: 'At least one department assignment is required',
    });

const updateStaffProfileSchema = z
    .object({
        staffPositionTypeId: z.string().uuid('Invalid staff position type id').optional(),
        employeeCode: z.string().trim().min(2).max(50).optional(),
        specialization: z.union([z.string().trim().max(120), z.null()]).optional(),
        licenseNumber: z.union([z.string().trim().max(80), z.null()]).optional(),
        employmentStatus: employmentStatusSchema.optional(),
        hireDate: z.coerce.date().nullable().optional(),
        terminationDate: z.coerce.date().nullable().optional(),
        bio: z.union([z.string().trim().max(2000), z.null()]).optional(),
        isPublicProfile: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: 'At least one field is required',
    });

const addDepartmentSchema = departmentAssignmentSchema;

const removeDepartmentSchema = z.object({
    departmentId: z.string().uuid('Invalid department id'),
});

const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    departmentId: z.string().uuid('Invalid department id').optional(),
    positionTypeId: z.string().uuid('Invalid staff position type id').optional(),
    status: employmentStatusSchema.optional(),
    search: z.string().trim().max(120).optional(),
});

const listDepartmentStaffQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: employmentStatusSchema.optional(),
    search: z.string().trim().max(120).optional(),
});

const doctorAvailableSlotsQuerySchema = z.object({
    date: dateOnlySchema,
});

function toEmploymentStatus(value?: z.infer<typeof employmentStatusSchema>) {
    return value as EmploymentStatus | undefined;
}

function toDepartmentAssignments(
    body: z.infer<typeof createStaffProfileSchema>,
) {
    if (body.departments) {
        return body.departments;
    }

    return (body.departmentIds ?? []).map((departmentId, index) => ({
        departmentId,
        isPrimary: index === 0,
    }));
}

function toBookableDoctor(staffProfile: Awaited<ReturnType<StaffService['listBookableDoctors']>>['items'][number]) {
    const name = staffProfile.specialization
        ? `${staffProfile.employeeCode} - ${staffProfile.specialization}`
        : staffProfile.employeeCode;

    return {
        id: staffProfile.id,
        _id: staffProfile.id,
        userId: staffProfile.userId,
        name,
        fullName: name,
        specialty: staffProfile.specialization,
        specialization: staffProfile.specialization,
        employeeCode: staffProfile.employeeCode,
        departments: staffProfile.departments.map((assignment) => ({
            id: assignment.department.id,
            name: assignment.department.name,
            isPrimary: assignment.isPrimary,
        })),
    };
}

export class StaffController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly appointmentRepository = new AppointmentPrismaRepository();
    private readonly scheduleService = new ScheduleService(
        new SchedulePrismaRepository(),
        createAppointmentSlotLockRepository(),
    );
    private readonly service = new StaffService(new StaffPrismaRepository());
    private readonly createStaffProfileHandler = new CreateStaffProfileHandler(
        this.service,
    );
    private readonly listStaffProfilesHandler = new ListStaffProfilesHandler(
        this.service,
    );
    private readonly listPublicStaffProfilesHandler =
        new ListPublicStaffProfilesHandler(this.service);
    private readonly listDepartmentStaffHandler = new ListDepartmentStaffHandler(
        this.service,
    );
    private readonly getStaffProfileByIdHandler = new GetStaffProfileByIdHandler(
        this.service,
    );
    private readonly updateStaffProfileHandler = new UpdateStaffProfileHandler(
        this.service,
    );
    private readonly deactivateStaffProfileHandler =
        new DeactivateStaffProfileHandler(this.service);
    private readonly addStaffDepartmentHandler = new AddStaffDepartmentHandler(
        this.service,
    );
    private readonly removeStaffDepartmentHandler =
        new RemoveStaffDepartmentHandler(this.service);

    async create(req: Request, res: Response) {
        const body = createStaffProfileSchema.parse(req.body);
        const command = new CreateStaffProfileCommand(
            body.userId,
            body.staffPositionTypeId,
            body.employeeCode,
            toDepartmentAssignments(body),
            body.specialization,
            body.licenseNumber,
            toEmploymentStatus(body.employmentStatus),
            body.hireDate,
            body.bio,
            body.isPublicProfile,
            req.user?.id,
        );
        const result = await this.commandBus.execute(
            this.createStaffProfileHandler,
            command,
        );

        return res.status(201).json(result);
    }

    async list(req: Request, res: Response) {
        const queryData = listQuerySchema.parse(req.query);
        const query = new ListStaffProfilesQuery(
            queryData.page,
            queryData.limit,
            queryData.departmentId,
            queryData.positionTypeId,
            toEmploymentStatus(queryData.status),
            queryData.search,
        );
        const result = await this.queryBus.execute(
            this.listStaffProfilesHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async listPublic(req: Request, res: Response) {
        const queryData = listQuerySchema.parse(req.query);
        const query = new ListPublicStaffProfilesQuery(
            queryData.page,
            queryData.limit,
            queryData.departmentId,
            queryData.positionTypeId,
            queryData.search,
        );
        const result = await this.queryBus.execute(
            this.listPublicStaffProfilesHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async listDoctors(req: Request, res: Response) {
        const queryData = listQuerySchema.parse(req.query);
        const result = await this.service.listBookableDoctors({
            page: queryData.page,
            limit: queryData.limit,
            departmentId: queryData.departmentId,
            search: queryData.search,
        });

        return res.status(200).json({
            ...result,
            items: result.items.map(toBookableDoctor),
        });
    }

    async getDoctorAvailableSlots(req: Request, res: Response) {
        const params = doctorIdParamsSchema.parse(req.params);
        const query = doctorAvailableSlotsQuerySchema.parse(req.query);
        const service = await this.appointmentRepository.findDefaultServiceForStaff(
            params.doctorId,
        );

        if (!service) {
            return res.status(404).json({
                message: 'Service not found or inactive',
            });
        }

        const result = await this.scheduleService.getAvailableSlots({
            staffProfileId: params.doctorId,
            serviceId: service.id,
            date: query.date,
        });

        return res.status(200).json({
            ...result,
            doctorId: params.doctorId,
            serviceId: service.id,
            service: {
                id: service.id,
                name: service.name,
                defaultDurationMinutes: service.defaultDurationMinutes,
            },
        });
    }

    async listByDepartment(req: Request, res: Response) {
        const params = departmentStaffParamsSchema.parse(req.params);
        const queryData = listDepartmentStaffQuerySchema.parse(req.query);
        const query = new ListDepartmentStaffQuery(
            params.id,
            queryData.page,
            queryData.limit,
            toEmploymentStatus(queryData.status),
            queryData.search,
        );
        const result = await this.queryBus.execute(
            this.listDepartmentStaffHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async getById(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const query = new GetStaffProfileByIdQuery(params.id);
        const result = await this.queryBus.execute(
            this.getStaffProfileByIdHandler,
            query,
        );

        return res.status(200).json(result);
    }

    async update(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = updateStaffProfileSchema.parse(req.body);
        const command = new UpdateStaffProfileCommand(
            params.id,
            body.staffPositionTypeId,
            body.employeeCode,
            body.specialization,
            body.licenseNumber,
            toEmploymentStatus(body.employmentStatus),
            body.hireDate,
            body.terminationDate,
            body.bio,
            body.isPublicProfile,
            req.user?.id,
        );
        const result = await this.commandBus.execute(
            this.updateStaffProfileHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async deactivate(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const command = new DeactivateStaffProfileCommand(params.id, req.user?.id);
        const result = await this.commandBus.execute(
            this.deactivateStaffProfileHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async addDepartment(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = addDepartmentSchema.parse(req.body);
        const command = new AddStaffDepartmentCommand(
            params.id,
            body.departmentId,
            body.isPrimary,
            req.user?.id,
        );
        const result = await this.commandBus.execute(
            this.addStaffDepartmentHandler,
            command,
        );

        return res.status(200).json(result);
    }

    async removeDepartment(req: Request, res: Response) {
        const params = idParamsSchema.parse(req.params);
        const body = removeDepartmentSchema.parse(req.body);
        const command = new RemoveStaffDepartmentCommand(
            params.id,
            body.departmentId,
            req.user?.id,
        );
        const result = await this.commandBus.execute(
            this.removeStaffDepartmentHandler,
            command,
        );

        return res.status(200).json(result);
    }
}
