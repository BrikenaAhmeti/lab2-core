import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { MedicalRecordPdfService } from '../../services/medical-record-pdf.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { GetMedicalRecordPdfQuery } from '../queries/get-medical-record-pdf.query';

export class GetMedicalRecordPdfHandler
implements QueryHandler<GetMedicalRecordPdfQuery, Buffer> {
    constructor(
        private readonly medicalRecordService: MedicalRecordService,
        private readonly medicalRecordPdfService: MedicalRecordPdfService,
    ) {}

    async execute(query: GetMedicalRecordPdfQuery): Promise<Buffer> {
        const record = await this.medicalRecordService.getMedicalRecordById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );

        return this.medicalRecordPdfService.build(record);
    }
}
