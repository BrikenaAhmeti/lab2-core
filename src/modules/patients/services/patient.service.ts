import { BloodType } from '../../../generated/prisma';
import type { AuthAccountProvisioningClient } from '../../../shared/auth/auth-account-provisioning.client';
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
    private readonly selfUpdateAllowedFields = new Set([
        'phone',
        'address',
        'emergencyContact',
        'emergencyPhone',
    ]);

    constructor(
        private readonly patientRepository: PatientRepository,
        private readonly authAccountProvisioningClient?: AuthAccountProvisioningClient,
    ) {}

    async createPatient(data: CreatePatientData) {
        const email = normalizeEmail(data.email);
        const personalNumber = normalizePersonalNumber(data.personalNumber);
        const personalNumberHash = hashPersonalNumber(personalNumber);

        if (!personalNumberHash) {
            throw new AppError('Personal number is required', 400);
        }

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

        let userId = data.userId ?? null;

        if (!userId) {
            if (!email) {
                throw new AppError('Patient email is required to create an account', 400);
            }

            if (!this.authAccountProvisioningClient) {
                throw new AppError('Auth account provisioning is not configured', 503);
            }

            const account = await this.authAccountProvisioningClient.provisionAccount({
                actorUserId: data.actorUserId,
                firstName: data.firstName,
                lastName: data.lastName,
                email,
                roles: ['Patient'],
                phone: data.phone,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                personalNumber,
            });
            userId = account.id;
        }

        return this.patientRepository.create({
            userId,
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

    async getPatientByUserId(userId: string) {
        const patient = await this.patientRepository.findByUserId(userId);

        if (!patient) {
            throw new AppError('Patient profile not found', 404);
        }

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

        if (!canUpdateAll) {
            this.ensureSelfUpdateAllowed(data);
        }

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

    async findOrCreatePublicPatient(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dateOfBirth: Date;
        gender: string;
        personalNumber: string;
    }) {
        const email = normalizeEmail(data.email);
        const phone = normalizeOptionalText(data.phone);
        const gender = normalizeOptionalText(data.gender);
        const personalNumber = normalizePersonalNumber(data.personalNumber);
        const personalNumberHash = hashPersonalNumber(personalNumber);

        if (!email) {
            throw new AppError('Patient email is required', 400);
        }

        if (!phone) {
            throw new AppError('Patient phone number is required', 400);
        }

        if (!gender) {
            throw new AppError('Patient gender is required', 400);
        }

        if (!personalNumberHash) {
            throw new AppError('Personal number is required', 400);
        }

        const [existingByPersonalNumber, existingByEmail] = await Promise.all([
            this.patientRepository.findByPersonalNumberHash(personalNumberHash),
            this.patientRepository.findByEmail(email),
        ]);

        if (
            existingByPersonalNumber &&
            existingByEmail &&
            existingByPersonalNumber.id !== existingByEmail.id
        ) {
            throw new AppError(
                'Patient email is already registered to another profile',
                409,
            );
        }

        if (existingByPersonalNumber) {
            if (
                existingByPersonalNumber.email &&
                existingByPersonalNumber.email.toLowerCase() !== email
            ) {
                throw new AppError(
                    'Patient personal number already registered with a different email',
                    409,
                );
            }

            const updateData: UpdatePatientData = {};

            if (!existingByPersonalNumber.email) {
                updateData.email = email;
            }

            if (!existingByPersonalNumber.phone) {
                updateData.phone = phone;
            }

            if (!existingByPersonalNumber.dateOfBirth) {
                updateData.dateOfBirth = data.dateOfBirth;
            }

            if (!existingByPersonalNumber.gender) {
                updateData.gender = gender;
            }

            if (Object.keys(updateData).length > 0) {
                return this.patientRepository.update(
                    existingByPersonalNumber.id,
                    updateData,
                );
            }

            return existingByPersonalNumber;
        }

        if (existingByEmail) {
            if (existingByEmail.personalNumber) {
                throw new AppError(
                    'Patient email already registered with a different personal number',
                    409,
                );
            }

            return this.patientRepository.update(existingByEmail.id, {
                firstName: this.requiredText(data.firstName, 'First name'),
                lastName: this.requiredText(data.lastName, 'Last name'),
                phone,
                dateOfBirth: data.dateOfBirth,
                gender,
                personalNumber: encryptPersonalNumber(personalNumber),
                personalNumberHash,
            });
        }

        return this.patientRepository.create({
            userId: null,
            firstName: this.requiredText(data.firstName, 'First name'),
            lastName: this.requiredText(data.lastName, 'Last name'),
            email,
            phone,
            dateOfBirth: data.dateOfBirth,
            gender,
            personalNumber: encryptPersonalNumber(personalNumber),
            personalNumberHash,
        });
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

    private ensureSelfUpdateAllowed(data: UpdatePatientData) {
        const requestedFields = Object.entries(data)
            .filter(
                ([field, value]) =>
                    !['actorUserId', 'canCreateAll'].includes(field) &&
                    value !== undefined,
            )
            .map(([field]) => field);
        const protectedFields = requestedFields.filter(
            (field) => !this.selfUpdateAllowedFields.has(field),
        );

        if (protectedFields.length > 0) {
            throw new AppError(
                'Only clinic staff can update protected patient profile fields',
                403,
            );
        }
    }

    private requiredText(value: string, fieldName: string) {
        const normalized = normalizeOptionalText(value);

        if (!normalized) {
            throw new AppError(`${fieldName} is required`, 400);
        }

        return normalized;
    }
}
