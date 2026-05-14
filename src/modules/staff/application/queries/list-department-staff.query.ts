import { EmploymentStatus } from '../../../../generated/prisma';

export class ListDepartmentStaffQuery {
    constructor(
        public readonly departmentId: string,
        public readonly page: number,
        public readonly limit: number,
        public readonly status?: EmploymentStatus,
        public readonly search?: string,
    ) { }
}
