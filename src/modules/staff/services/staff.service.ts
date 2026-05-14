import { EmploymentStatus } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import { normalizeEmployeeCode, normalizeOptionalText, normalizeSearch } from '../domain/staff.normalizer';
import {
    StaffDepartmentAssignmentData,
    StaffRepository,
    UpdateStaffProfileData,
} from '../domain/staff.repository';

export class StaffService {
    constructor(private readonly staffRepository: StaffRepository) { }

    async createStaffProfile(data: {
        userId: string;
        staffPositionTypeId: string;
        employeeCode: string;
        specialization?: string | null;
        licenseNumber?: string | null;
        employmentStatus?: EmploymentStatus;
        hireDate?: Date | null;
        bio?: string | null;
        isPublicProfile?: boolean;
        departments: StaffDepartmentAssignmentData[];
        actorUserId?: string;
    }) {
        const positionType = await this.staffRepository.findPositionTypeById(
            data.staffPositionTypeId,
        );

        if (!positionType || !positionType.isActive) {
            throw new AppError('Staff position type not found or inactive', 400);
        }

        const existingUserProfile = await this.staffRepository.findByUserId(data.userId);

        if (existingUserProfile) {
            throw new AppError('Staff profile already exists for this user', 409);
        }

        const employeeCode = normalizeEmployeeCode(data.employeeCode);
        const existingEmployeeCode =
            await this.staffRepository.findByEmployeeCode(employeeCode);

        if (existingEmployeeCode) {
            throw new AppError('Employee code already exists', 409);
        }

        const departments = this.normalizeDepartmentAssignments(data.departments);
        await this.ensureDepartmentsExist(departments.map((item) => item.departmentId));

        return this.staffRepository.createWithDepartments({
            userId: data.userId,
            staffPositionTypeId: data.staffPositionTypeId,
            employeeCode,
            specialization: normalizeOptionalText(data.specialization),
            licenseNumber: normalizeOptionalText(data.licenseNumber),
            employmentStatus: data.employmentStatus,
            hireDate: data.hireDate,
            bio: normalizeOptionalText(data.bio),
            isPublicProfile: data.isPublicProfile,
            departments,
            actorUserId: data.actorUserId,
        });
    }

    async getStaffProfileById(id: string) {
        const staffProfile = await this.staffRepository.findById(id);

        if (!staffProfile) {
            throw new AppError('Staff profile not found', 404);
        }

        return staffProfile;
    }

    async listStaffProfiles(filters: {
        page: number;
        limit: number;
        departmentId?: string;
        positionTypeId?: string;
        status?: EmploymentStatus;
        search?: string;
    }) {
        return this.staffRepository.list({
            page: filters.page,
            limit: filters.limit,
            departmentId: filters.departmentId,
            positionTypeId: filters.positionTypeId,
            status: filters.status,
            search: normalizeSearch(filters.search),
        });
    }

    async listPublicStaffProfiles(filters: {
        page: number;
        limit: number;
        departmentId?: string;
        positionTypeId?: string;
        search?: string;
    }) {
        return this.staffRepository.list({
            page: filters.page,
            limit: filters.limit,
            departmentId: filters.departmentId,
            positionTypeId: filters.positionTypeId,
            status: 'ACTIVE',
            search: normalizeSearch(filters.search),
            publicOnly: true,
        });
    }

    async listDepartmentStaff(filters: {
        departmentId: string;
        page: number;
        limit: number;
        status?: EmploymentStatus;
        search?: string;
    }) {
        const departments = await this.staffRepository.findDepartmentsByIds([
            filters.departmentId,
        ]);

        if (departments.length === 0) {
            throw new AppError('Department not found', 404);
        }

        return this.staffRepository.list({
            page: filters.page,
            limit: filters.limit,
            departmentId: filters.departmentId,
            status: filters.status,
            search: normalizeSearch(filters.search),
        });
    }

    async updateStaffProfile(id: string, data: UpdateStaffProfileData) {
        const existingStaffProfile = await this.staffRepository.findById(id);

        if (!existingStaffProfile) {
            throw new AppError('Staff profile not found', 404);
        }

        const updateData: UpdateStaffProfileData = {
            actorUserId: data.actorUserId,
        };

        if (data.staffPositionTypeId !== undefined) {
            const positionType = await this.staffRepository.findPositionTypeById(
                data.staffPositionTypeId,
            );

            if (!positionType || !positionType.isActive) {
                throw new AppError('Staff position type not found or inactive', 400);
            }

            updateData.staffPositionTypeId = data.staffPositionTypeId;
        }

        if (data.employeeCode !== undefined) {
            const employeeCode = normalizeEmployeeCode(data.employeeCode);
            const duplicate = await this.staffRepository.findByEmployeeCode(employeeCode);

            if (duplicate && duplicate.id !== id) {
                throw new AppError('Employee code already exists', 409);
            }

            updateData.employeeCode = employeeCode;
        }

        if (data.specialization !== undefined) {
            updateData.specialization = normalizeOptionalText(data.specialization);
        }

        if (data.licenseNumber !== undefined) {
            updateData.licenseNumber = normalizeOptionalText(data.licenseNumber);
        }

        if (data.employmentStatus !== undefined) {
            updateData.employmentStatus = data.employmentStatus;
        }

        if (data.hireDate !== undefined) {
            updateData.hireDate = data.hireDate;
        }

        if (data.terminationDate !== undefined) {
            updateData.terminationDate = data.terminationDate;
        }

        if (data.bio !== undefined) {
            updateData.bio = normalizeOptionalText(data.bio);
        }

        if (data.isPublicProfile !== undefined) {
            updateData.isPublicProfile = data.isPublicProfile;
        }

        if (Object.keys(updateData).filter((key) => key !== 'actorUserId').length === 0) {
            throw new AppError('At least one field is required', 400);
        }

        return this.staffRepository.update(id, updateData);
    }

    async deactivateStaffProfile(id: string, actorUserId?: string) {
        const existingStaffProfile = await this.staffRepository.findById(id);

        if (!existingStaffProfile) {
            throw new AppError('Staff profile not found', 404);
        }

        if (existingStaffProfile.employmentStatus === 'INACTIVE') {
            return existingStaffProfile;
        }

        const futureAppointments = await this.staffRepository.countFutureAppointments(
            id,
            new Date(),
        );

        if (futureAppointments > 0) {
            throw new AppError(
                'Staff profile cannot be deactivated while future appointments exist',
                409,
            );
        }

        return this.staffRepository.deactivate(id, actorUserId);
    }

    async addDepartment(
        id: string,
        data: StaffDepartmentAssignmentData & { actorUserId?: string },
    ) {
        await this.getStaffProfileById(id);
        await this.ensureDepartmentsExist([data.departmentId]);

        return this.staffRepository.addDepartment(id, data);
    }

    async removeDepartment(
        id: string,
        departmentId: string,
        actorUserId?: string,
    ) {
        const staffProfile = await this.getStaffProfileById(id);

        const activeDepartments = staffProfile.departments.filter(
            (department) => department.unassignedAt === null,
        );

        if (!activeDepartments.some((department) => department.departmentId === departmentId)) {
            throw new AppError('Staff department assignment not found', 404);
        }

        if (activeDepartments.length === 1) {
            throw new AppError('Staff profile must have at least one department', 409);
        }

        return this.staffRepository.removeDepartment(id, departmentId, actorUserId);
    }

    private normalizeDepartmentAssignments(
        departments: StaffDepartmentAssignmentData[],
    ) {
        if (departments.length === 0) {
            throw new AppError('At least one department assignment is required', 400);
        }

        const seen = new Set<string>();
        const uniqueDepartments = departments.filter((department) => {
            if (seen.has(department.departmentId)) {
                return false;
            }

            seen.add(department.departmentId);
            return true;
        });
        const primaryIndex = uniqueDepartments.findIndex((department) => department.isPrimary);

        return uniqueDepartments.map((department, index) => ({
            departmentId: department.departmentId,
            isPrimary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
        }));
    }

    private async ensureDepartmentsExist(departmentIds: string[]) {
        const departments = await this.staffRepository.findDepartmentsByIds(departmentIds);

        if (departments.length !== departmentIds.length) {
            throw new AppError('One or more departments are invalid', 400);
        }

        if (departments.some((department) => !department.isActive)) {
            throw new AppError('One or more departments are inactive', 400);
        }
    }
}
