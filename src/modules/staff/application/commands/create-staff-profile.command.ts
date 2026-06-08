import { EmploymentStatus } from '../../../../generated/prisma';
import { StaffDepartmentAssignmentData } from '../../domain/staff.repository';

export class CreateStaffProfileCommand {
    constructor(
        public readonly userId: string | null | undefined,
        public readonly staffPositionTypeId: string,
        public readonly employeeCode: string,
        public readonly departments: StaffDepartmentAssignmentData[],
        public readonly firstName?: string | null,
        public readonly lastName?: string | null,
        public readonly email?: string | null,
        public readonly username?: string | null,
        public readonly phone?: string | null,
        public readonly dateOfBirth?: Date | null,
        public readonly gender?: string | null,
        public readonly personalNumber?: string | null,
        public readonly specialization?: string | null,
        public readonly licenseNumber?: string | null,
        public readonly employmentStatus?: EmploymentStatus,
        public readonly hireDate?: Date | null,
        public readonly bio?: string | null,
        public readonly isPublicProfile?: boolean,
        public readonly actorUserId?: string,
    ) { }
}
