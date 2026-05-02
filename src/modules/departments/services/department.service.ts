import { AppError } from '../../../shared/core/errors/app-error';
import { DepartmentEntity, DepartmentListResult } from '../domain/department.entity';
import { DepartmentRepository } from '../domain/department.repository';
import {
    normalizeDepartmentDescription,
    normalizeDepartmentName,
    normalizeDepartmentSearch,
} from '../domain/department.normalizer';

export class DepartmentService {
    constructor(private readonly departmentRepository: DepartmentRepository) { }

    async createDepartment(data: {
        name: string;
        description?: string | null;
    }): Promise<DepartmentEntity> {
        const normalizedName = normalizeDepartmentName(data.name);

        const existingDepartment =
            await this.departmentRepository.findByName(normalizedName);

        if (existingDepartment) {
            throw new AppError('Department already exists', 409);
        }

        return this.departmentRepository.create({
            name: normalizedName,
            description: normalizeDepartmentDescription(data.description),
        });
    }

    async getDepartmentById(id: string): Promise<DepartmentEntity> {
        const department = await this.departmentRepository.findById(id);

        if (!department) {
            throw new AppError('Department not found', 404);
        }

        return department;
    }

    async listDepartments(filters: {
        page: number;
        limit: number;
        search?: string;
        isActive?: boolean;
    }): Promise<DepartmentListResult> {
        return this.departmentRepository.list({
            page: filters.page,
            limit: filters.limit,
            search: normalizeDepartmentSearch(filters.search),
            isActive: filters.isActive,
        });
    }

    async updateDepartment(
        id: string,
        data: {
            name?: string;
            description?: string | null;
            isActive?: boolean;
        },
    ): Promise<DepartmentEntity> {
        const existingDepartment = await this.departmentRepository.findById(id);

        if (!existingDepartment) {
            throw new AppError('Department not found', 404);
        }

        const updateData: {
            name?: string;
            description?: string | null;
            isActive?: boolean;
        } = {};

        if (data.name !== undefined) {
            const normalizedName = normalizeDepartmentName(data.name);
            const duplicateDepartment =
                await this.departmentRepository.findByName(normalizedName);

            if (duplicateDepartment && duplicateDepartment.id !== id) {
                throw new AppError('Department already exists', 409);
            }

            updateData.name = normalizedName;
        }

        if (data.description !== undefined) {
            updateData.description = normalizeDepartmentDescription(data.description);
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError('At least one field is required', 400);
        }

        return this.departmentRepository.update(id, updateData);
    }

    async deactivateDepartment(id: string): Promise<DepartmentEntity> {
        const department = await this.departmentRepository.findById(id);

        if (!department) {
            throw new AppError('Department not found', 404);
        }

        if (!department.isActive) {
            return department;
        }

        return this.departmentRepository.deactivate(id);
    }
}
