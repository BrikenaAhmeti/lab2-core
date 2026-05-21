import { CreatePrescriptionItemData } from '../../domain/prescription.repository';

export class CreatePrescriptionCommand {
    constructor(
        public readonly medicalRecordId: string,
        public readonly items: CreatePrescriptionItemData[],
        public readonly expiresAt?: Date | null,
        public readonly notes?: string | null,
        public readonly actorUserId?: string,
    ) {}
}
