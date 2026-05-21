import { MedicalRecordPatchData } from '../../domain/medical-record.repository';

export class AddMedicalRecordAmendmentCommand {
    constructor(
        public readonly id: string,
        public readonly reason: string,
        public readonly changes: MedicalRecordPatchData,
        public readonly actorUserId?: string,
    ) {}
}
