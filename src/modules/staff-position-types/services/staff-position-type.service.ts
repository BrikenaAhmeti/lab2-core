import { AppError } from '../../../shared/core/errors/app-error';
import {
    StaffPositionTypeListResult,
    StaffPositionTypeView,
} from '../domain/staff-position-type.entity';
import { StaffPositionTypeRepository } from '../domain/staff-position-type.repository';
import {
    normalizeApplicableDepartmentIds,
    normalizeDefaultRoleKey,
    normalizeStaffPositionTypeDescription,
    normalizeStaffPositionTypeName,
} from '../domain/staff-position-type.normalizer';

export class StaffPositionTypeService {
    constructor(
        private readonly staffPositionTypeRepository: StaffPositionTypeRepository,
    ) { }

    async createStaffPositionType(data: {
        name: string;
        description?: string | null;
        defaultRoleKey: string;
        applicableDepartmentIds?: string[] | null;
        isActive?: boolean;
    }): Promise<StaffPositionTypeView> {
        const normalizedName = normalizeStaffPositionTypeName(data.name);
        const existingPositionType =
            await this.staffPositionTypeRepository.findByName(normalizedName);

        if (existingPositionType) {
            throw new AppError('Staff position type already exists', 409);
        }

        const normalizedDepartmentIds = normalizeApplicableDepartmentIds(
            data.applicableDepartmentIds,
        );

        await this.ensureDepartmentsExist(normalizedDepartmentIds);

        const createdPositionType = await this.staffPositionTypeRepository.create({
            name: normalizedName,
            description: normalizeStaffPositionTypeDescription(data.description),
            defaultRoleKey: normalizeDefaultRoleKey(data.defaultRoleKey),
            applicableDepartmentIds: normalizedDepartmentIds,
            isActive: data.isActive,
        });

        return this.getStaffPositionTypeById(createdPositionType.id);
    }

    async getStaffPositionTypeById(id: string): Promise<StaffPositionTypeView> {
        const positionType = await this.staffPositionTypeRepository.findById(id);

        if (!positionType) {
            throw new AppError('Staff position type not found', 404);
        }

        return positionType;
    }

    async listStaffPositionTypes(filters: {
        isActive?: boolean;
    }): Promise<StaffPositionTypeListResult> {
        return this.staffPositionTypeRepository.list({
            isActive: filters.isActive,
        });
    }

    async updateStaffPositionType(
        id: string,
        data: {
            name?: string;
            description?: string | null;
            defaultRoleKey?: string;
            applicableDepartmentIds?: string[] | null;
            isActive?: boolean;
        },
    ): Promise<StaffPositionTypeView> {
        const existingPositionType = await this.staffPositionTypeRepository.findById(id);

        if (!existingPositionType) {
            throw new AppError('Staff position type not found', 404);
        }

        const updateData: {
            name?: string;
            description?: string | null;
            defaultRoleKey?: string;
            applicableDepartmentIds?: string[] | null;
            isActive?: boolean;
        } = {};

        if (data.name !== undefined) {
            const normalizedName = normalizeStaffPositionTypeName(data.name);
            const duplicatePositionType =
                await this.staffPositionTypeRepository.findByName(normalizedName);

            if (duplicatePositionType && duplicatePositionType.id !== id) {
                throw new AppError('Staff position type already exists', 409);
            }

            updateData.name = normalizedName;
        }

        if (data.description !== undefined) {
            updateData.description = normalizeStaffPositionTypeDescription(data.description);
        }

        if (data.defaultRoleKey !== undefined) {
            updateData.defaultRoleKey = normalizeDefaultRoleKey(data.defaultRoleKey);
        }

        if (data.applicableDepartmentIds !== undefined) {
            const normalizedDepartmentIds = normalizeApplicableDepartmentIds(
                data.applicableDepartmentIds,
            );

            await this.ensureDepartmentsExist(normalizedDepartmentIds);
            updateData.applicableDepartmentIds = normalizedDepartmentIds;
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError('At least one field is required', 400);
        }

        await this.staffPositionTypeRepository.update(id, updateData);

        return this.getStaffPositionTypeById(id);
    }

    async deactivateStaffPositionType(id: string): Promise<StaffPositionTypeView> {
        const existingPositionType = await this.staffPositionTypeRepository.findById(id);

        if (!existingPositionType) {
            throw new AppError('Staff position type not found', 404);
        }

        if (!existingPositionType.isActive) {
            return existingPositionType;
        }

        const assignedStaffProfiles =
            await this.staffPositionTypeRepository.countAssignedStaffProfiles(id);

        if (assignedStaffProfiles > 0) {
            throw new AppError(
                'Staff position type cannot be deactivated while staff profiles are assigned to it',
                409,
            );
        }

        await this.staffPositionTypeRepository.deactivate(id);

        return this.getStaffPositionTypeById(id);
    }

    private async ensureDepartmentsExist(
        applicableDepartmentIds?: string[] | null,
    ) {
        if (!applicableDepartmentIds || applicableDepartmentIds.length === 0) {
            return;
        }

        const departments = await this.staffPositionTypeRepository.findDepartmentsByIds(
            applicableDepartmentIds,
        );

        if (departments.length !== applicableDepartmentIds.length) {
            throw new AppError('One or more applicable departments are invalid', 400);
        }
    }
}
