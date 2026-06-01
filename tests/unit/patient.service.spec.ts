import { PatientService } from '../../src/modules/patients/services/patient.service';
import { PatientRepository } from '../../src/modules/patients/domain/patient.repository';
import { PatientEntity } from '../../src/modules/patients/domain/patient.entity';

const patient: PatientEntity = {
    id: '6d8ad35f-76cc-4cf7-bc12-065ac46a3f7f',
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    firstName: 'Arta',
    lastName: 'Krasniqi',
    email: 'arta@example.com',
    phone: '+38344111222',
    dateOfBirth: new Date('1995-04-10T00:00:00.000Z'),
    gender: 'female',
    bloodType: 'A_POSITIVE',
    personalNumber: '1234567890',
    address: null,
    emergencyContact: null,
    emergencyPhone: null,
    allergies: ['penicillin'],
    medicalNotes: null,
    isActive: true,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
};

function createRepositoryMock(): jest.Mocked<PatientRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findByUserId: jest.fn(),
        findByEmail: jest.fn(),
        findByPersonalNumberHash: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        getTimeline: jest.fn(),
    };
}

describe('PatientService', () => {
    beforeEach(() => {
        process.env.PATIENT_DATA_ENCRYPTION_KEY = 'patient-service-test-key';
    });

    it('creates a patient with normalized fields and encrypted personal number', async () => {
        const repository = createRepositoryMock();
        repository.findByUserId.mockResolvedValue(null);
        repository.findByEmail.mockResolvedValue(null);
        repository.findByPersonalNumberHash.mockResolvedValue(null);
        repository.create.mockResolvedValue(patient);
        const service = new PatientService(repository);

        const result = await service.createPatient({
            userId: patient.userId,
            firstName: ' Arta ',
            lastName: ' Krasniqi ',
            email: ' ARTA@EXAMPLE.COM ',
            personalNumber: ' 1234567890 ',
            actorUserId: 'admin-user',
            canCreateAll: true,
        });

        expect(result.id).toBe(patient.id);
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Arta',
                lastName: 'Krasniqi',
                email: 'arta@example.com',
                personalNumber: expect.stringMatching(/^enc:/),
                personalNumberHash: expect.any(String),
            }),
        );
    });

    it('rejects duplicate email', async () => {
        const repository = createRepositoryMock();
        repository.findByEmail.mockResolvedValue(patient);
        const service = new PatientService(repository);

        await expect(
            service.createPatient({
                firstName: 'Arta',
                lastName: 'Krasniqi',
                email: patient.email,
                actorUserId: 'admin-user',
                canCreateAll: true,
            }),
        ).rejects.toMatchObject({
            message: 'Patient email already registered',
            statusCode: 409,
        });
    });

    it('creates a self patient profile for a normal authenticated user', async () => {
        const repository = createRepositoryMock();
        const actorUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
        repository.findByUserId.mockResolvedValue(null);
        repository.findByEmail.mockResolvedValue(null);
        repository.findByPersonalNumberHash.mockResolvedValue(null);
        repository.create.mockResolvedValue({
            ...patient,
            userId: actorUserId,
        });
        const service = new PatientService(repository);

        await service.createPatient({
            userId: '11111111-1111-4111-8111-111111111111',
            firstName: 'Elizabeta',
            lastName: 'Bajrami',
            email: 'elizabetabajrami2001@gmail.com',
            actorUserId,
            canCreateAll: false,
        });

        expect(repository.findByUserId).toHaveBeenCalledWith(actorUserId);
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: actorUserId,
                actorUserId,
            }),
        );
    });

    it('allows a patient to read their own profile without broad staff permission', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(patient);
        const service = new PatientService(repository);

        const result = await service.getPatientById(
            patient.id,
            patient.userId as string,
            false,
        );

        expect(result.id).toBe(patient.id);
    });

    it('blocks another patient from reading the profile', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(patient);
        const service = new PatientService(repository);

        await expect(
            service.getPatientById(patient.id, 'other-user', false),
        ).rejects.toMatchObject({
            message: 'Forbidden',
            statusCode: 403,
        });
    });

    it('links an unlinked patient profile by personal number', async () => {
        const repository = createRepositoryMock();
        const unlinkedPatient = {
            ...patient,
            userId: null,
        };
        const linkedUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
        repository.findByUserId.mockResolvedValue(null);
        repository.findByPersonalNumberHash.mockResolvedValue(unlinkedPatient);
        repository.update.mockResolvedValue({
            ...unlinkedPatient,
            userId: linkedUserId,
        });
        const service = new PatientService(repository);

        const result = await service.linkByPersonalNumber(
            linkedUserId,
            ' 1234567890 ',
        );

        expect(result).toEqual({
            linked: true,
            patientId: patient.id,
            userId: linkedUserId,
        });
        expect(repository.update).toHaveBeenCalledWith(patient.id, {
            userId: linkedUserId,
            actorUserId: linkedUserId,
        });
    });

    it('returns an empty link result when no profile matches the personal number', async () => {
        const repository = createRepositoryMock();
        const linkedUserId = '15e1a6c6-998a-4d47-a1de-a55859e958cc';
        repository.findByUserId.mockResolvedValue(null);
        repository.findByPersonalNumberHash.mockResolvedValue(null);
        const service = new PatientService(repository);

        const result = await service.linkByPersonalNumber(
            linkedUserId,
            '1234567890',
        );

        expect(result).toEqual({
            linked: false,
            patientId: null,
            userId: linkedUserId,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects linking a personal number already attached to another user', async () => {
        const repository = createRepositoryMock();
        repository.findByUserId.mockResolvedValue(null);
        repository.findByPersonalNumberHash.mockResolvedValue(patient);
        const service = new PatientService(repository);

        await expect(
            service.linkByPersonalNumber(
                '15e1a6c6-998a-4d47-a1de-a55859e958cc',
                patient.personalNumber as string,
            ),
        ).rejects.toMatchObject({
            message: 'Patient personal number already linked to another user',
            statusCode: 409,
        });
    });
});
