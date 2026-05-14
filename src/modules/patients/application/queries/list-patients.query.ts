import { BloodType } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';

export class ListPatientsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly gender?: string,
        public readonly bloodType?: BloodType,
    ) {}
}
