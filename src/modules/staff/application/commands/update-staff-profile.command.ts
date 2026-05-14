import { EmploymentStatus } from '../../../../generated/prisma';

export class UpdateStaffProfileCommand {
    constructor(
        public readonly id: string,
        public readonly staffPositionTypeId?: string,
        public readonly employeeCode?: string,
        public readonly specialization?: string | null,
        public readonly licenseNumber?: string | null,
        public readonly employmentStatus?: EmploymentStatus,
        public readonly hireDate?: Date | null,
        public readonly terminationDate?: Date | null,
        public readonly bio?: string | null,
        public readonly isPublicProfile?: boolean,
        public readonly actorUserId?: string,
    ) { }
}
