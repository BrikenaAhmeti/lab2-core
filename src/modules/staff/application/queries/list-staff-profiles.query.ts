import { EmploymentStatus } from '../../../../generated/prisma';

export class ListStaffProfilesQuery {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly departmentId?: string,
        public readonly positionTypeId?: string,
        public readonly status?: EmploymentStatus,
        public readonly search?: string,
    ) { }
}
