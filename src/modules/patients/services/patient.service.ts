import { BloodType } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    decryptPersonalNumber,
    encryptPersonalNumber,
    hashPersonalNumber,
} from '../domain/patient.crypto';
import {
    normalizeEmail,
    normalizeOptionalText,
    normalizePersonalNumber,
    normalizeSearch,
} from '../domain/patient.normalizer';
import {
    CreatePatientData,
    PatientRepository,
    UpdatePatientData,
} from '../domain/patient.repository';

export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}

    async createPatient(data: CreatePatientData) {
        const email = normalizeEmail(data.email);
        const personalNumber = normalizePersonalNumber(data.personalNumber);
        const personalNumberHash = hashPersonalNumber(personalNumber);

        if (data.userId) {
            const existingUserPatient = await this.patientRepository.findByUserId(
                data.userId,
            );

            if (existingUserPatient) {
                throw new AppError('Patient profile already exists for this user', 409);
            }
        }

        if (!data.canCreateAll && data.userId !== data.actorUserId) {
            throw new AppError('Forbidden', 403);
        }

        await this.ensureNoDuplicate(email, personalNumberHash);

        return this.patientRepository.create({
            userId: data.userId ?? null,
            firstName: this.requiredText(data.firstName, 'First name'),
            lastName: this.requiredText(data.lastName, 'Last name'),
            email,
            phone: normalizeOptionalText(data.phone),
            dateOfBirth: data.dateOfBirth,
            gender: normalizeOptionalText(data.gender),
            bloodType: data.bloodType,
            personalNumber: encryptPersonalNumber(personalNumber),
            personalNumberHash,
            address: normalizeOptionalText(data.address),
            emergencyContact: normalizeOptionalText(data.emergencyContact),
            emergencyPhone: normalizeOptionalText(data.emergencyPhone),
            allergies: data.allergies,
            medicalNotes: data.medicalNotes,
            actorUserId: data.actorUserId,
        });
    }

    async listPatients(filters: {
        page: number;
        limit: number;
        search?: string;
        gender?: string;
        bloodType?: BloodType;
    }) {
        const search = normalizeSearch(filters.search);
        const personalNumberHash = hashPersonalNumber(
            normalizePersonalNumber(search),
        );

        return this.patientRepository.list({
            page: filters.page,
            limit: filters.limit,
            search,
            gender: normalizeOptionalText(filters.gender) ?? undefined,
            bloodType: filters.bloodType,
            personalNumberHash,
        });
    }

    async getPatientById(id: string, actorUserId?: string, canReadAll = false) {
        const patient = await this.patientRepository.findById(id);

        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        this.ensureCanAccess(patient.userId, actorUserId, canReadAll);

        return patient;
    }

    async updatePatient(
        id: string,
        data: UpdatePatientData,
        actorUserId?: string,
        canUpdateAll = true,
    ) {
        const patient = await this.patientRepository.findById(id);

        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        this.ensureCanAccess(patient.userId, actorUserId, canUpdateAll);

        const updateData: UpdatePatientData = {
            actorUserId: data.actorUserId ?? actorUserId,
        };

        if (data.userId !== undefined) {
            if (data.userId) {
                const existingUserPatient =
                    await this.patientRepository.findByUserId(data.userId);

                if (existingUserPatient && existingUserPatient.id !== id) {
                    throw new AppError(
                        'Patient profile already exists for this user',
                        409,
                    );
                }
            }

            updateData.userId = data.userId;
        }

        if (data.email !== undefined) {
            const email = normalizeEmail(data.email);

            if (email) {
                const duplicate = await this.patientRepository.findByEmail(email);

                if (duplicate && duplicate.id !== id) {
                    throw new AppError('Patient email already registered', 409);
                }
            }

            updateData.email = email;
        }

        if (data.personalNumber !== undefined) {
            const personalNumber = normalizePersonalNumber(data.personalNumber);
            const personalNumberHash = hashPersonalNumber(personalNumber);

            if (personalNumberHash) {
                const duplicate =
                    await this.patientRepository.findByPersonalNumberHash(
                        personalNumberHash,
                    );

                if (duplicate && duplicate.id !== id) {
                    throw new AppError(
                        'Patient personal number already registered',
                        409,
                    );
                }
            }

            updateData.personalNumber = encryptPersonalNumber(personalNumber);
            updateData.personalNumberHash = personalNumberHash;
        }

        if (data.firstName !== undefined) {
            updateData.firstName = this.requiredText(data.firstName, 'First name');
        }

        if (data.lastName !== undefined) {
            updateData.lastName = this.requiredText(data.lastName, 'Last name');
        }

        if (data.phone !== undefined) {
            updateData.phone = normalizeOptionalText(data.phone);
        }

        if (data.dateOfBirth !== undefined) {
            updateData.dateOfBirth = data.dateOfBirth;
        }

        if (data.gender !== undefined) {
            updateData.gender = normalizeOptionalText(data.gender);
        }

        if (data.bloodType !== undefined) {
            updateData.bloodType = data.bloodType;
        }

        if (data.address !== undefined) {
            updateData.address = normalizeOptionalText(data.address);
        }

        if (data.emergencyContact !== undefined) {
            updateData.emergencyContact = normalizeOptionalText(data.emergencyContact);
        }

        if (data.emergencyPhone !== undefined) {
            updateData.emergencyPhone = normalizeOptionalText(data.emergencyPhone);
        }

        if (data.allergies !== undefined) {
            updateData.allergies = data.allergies;
        }

        if (data.medicalNotes !== undefined) {
            updateData.medicalNotes = data.medicalNotes;
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (Object.keys(updateData).filter((key) => key !== 'actorUserId').length === 0) {
            throw new AppError('At least one field is required', 400);
        }

        return this.patientRepository.update(id, updateData);
    }

    async getPatientTimeline(
        patientId: string,
        actorUserId?: string,
        canReadAll = false,
    ) {
        await this.getPatientById(patientId, actorUserId, canReadAll);

        return this.patientRepository.getTimeline(patientId);
    }

    async linkByPersonalNumber(userId: string, rawPersonalNumber: string) {
        const personalNumber = normalizePersonalNumber(rawPersonalNumber);
        const personalNumberHash = hashPersonalNumber(personalNumber);

        if (!personalNumberHash) {
            throw new AppError('Personal number is required', 400);
        }

        const [existingUserPatient, existingPersonalNumberPatient] =
            await Promise.all([
                this.patientRepository.findByUserId(userId),
                this.patientRepository.findByPersonalNumberHash(personalNumberHash),
            ]);

        if (!existingPersonalNumberPatient) {
            return {
                linked: false,
                patientId: null,
                userId,
            };
        }

        if (
            existingUserPatient &&
            existingUserPatient.id !== existingPersonalNumberPatient.id
        ) {
            throw new AppError('Patient profile already exists for this user', 409);
        }

        if (
            existingPersonalNumberPatient.userId &&
            existingPersonalNumberPatient.userId !== userId
        ) {
            throw new AppError(
                'Patient personal number already linked to another user',
                409,
            );
        }

        if (existingPersonalNumberPatient.userId === userId) {
            return {
                linked: false,
                patientId: existingPersonalNumberPatient.id,
                userId,
            };
        }

        const linkedPatient = await this.patientRepository.update(
            existingPersonalNumberPatient.id,
            {
                userId,
                actorUserId: userId,
            },
        );

        return {
            linked: true,
            patientId: linkedPatient.id,
            userId,
        };
    }

    decryptPersonalNumber(value: string | null) {
        return decryptPersonalNumber(value);
    }

    private async ensureNoDuplicate(
        email?: string | null,
        personalNumberHash?: string | null,
    ) {
        if (email) {
            const existingByEmail = await this.patientRepository.findByEmail(email);

            if (existingByEmail) {
                throw new AppError('Patient email already registered', 409);
            }
        }

        if (personalNumberHash) {
            const existingByPersonalNumber =
                await this.patientRepository.findByPersonalNumberHash(
                    personalNumberHash,
                );

            if (existingByPersonalNumber) {
                throw new AppError(
                    'Patient personal number already registered',
                    409,
                );
            }
        }
    }

    private ensureCanAccess(
        patientUserId: string | null,
        actorUserId?: string,
        canAccessAll = false,
    ) {
        if (canAccessAll || (patientUserId && patientUserId === actorUserId)) {
            return;
        }

        throw new AppError('Forbidden', 403);
    }

    private requiredText(value: string, fieldName: string) {
        const normalized = normalizeOptionalText(value);

        if (!normalized) {
            throw new AppError(`${fieldName} is required`, 400);
        }

        return normalized;
    }
}
