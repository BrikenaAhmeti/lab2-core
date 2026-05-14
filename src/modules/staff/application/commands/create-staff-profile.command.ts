import { EmploymentStatus } from '../../../../generated/prisma';
import { StaffDepartmentAssignmentData } from '../../domain/staff.repository';

export class CreateStaffProfileCommand {
    constructor(
        public readonly userId: string,
        public readonly staffPositionTypeId: string,
        public readonly employeeCode: string,
        public readonly departments: StaffDepartmentAssignmentData[],
        public readonly specialization?: string | null,
        public readonly licenseNumber?: string | null,
        public readonly employmentStatus?: EmploymentStatus,
        public readonly hireDate?: Date | null,
        public readonly bio?: string | null,
        public readonly isPublicProfile?: boolean,
        public readonly actorUserId?: string,
    ) { }
}
