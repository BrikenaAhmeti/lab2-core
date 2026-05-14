import { BloodType } from '../../../../generated/prisma';
import { Command } from '../../../../shared/core/buses/command-bus';

export class CreatePatientCommand implements Command {
    constructor(
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly userId?: string | null,
        public readonly email?: string | null,
        public readonly phone?: string | null,
        public readonly dateOfBirth?: Date | null,
        public readonly gender?: string | null,
        public readonly bloodType?: BloodType | null,
        public readonly personalNumber?: string | null,
        public readonly address?: string | null,
        public readonly emergencyContact?: string | null,
        public readonly emergencyPhone?: string | null,
        public readonly allergies?: unknown,
        public readonly medicalNotes?: unknown,
        public readonly actorUserId?: string,
        public readonly canCreateAll = false,
    ) {}
}
