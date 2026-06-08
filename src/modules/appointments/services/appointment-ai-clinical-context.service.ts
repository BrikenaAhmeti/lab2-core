import { prisma } from '../../../infrastructure/db/prisma';
import { AppError } from '../../../shared/core/errors/app-error';

export interface AppointmentAiClinicalContext {
    appointment: {
        id: string;
        appointmentType: string;
        scheduledAt: Date;
        department: string;
        service: string;
        staffSpecialization: string | null;
    };
    patient: {
        gender: string | null;
        bloodType: string | null;
        allergies: unknown;
        medicalNotes: unknown;
    };
    recentMedicalRecords: Array<{
        createdAt: Date;
        department: string;
        chiefComplaint: string | null;
        diagnosis: string | null;
        treatmentPlan: string | null;
        followUpInstructions: string | null;
    }>;
    recentPrescriptions: Array<{
        issuedAt: Date;
        status: 'ACTIVE' | 'VOIDED';
        diagnosis: string | null;
        items: Array<{
            medicationName: string;
            dosage: string;
            frequency: string;
            durationInstructions: string | null;
            notes: string | null;
        }>;
    }>;
}

export class AppointmentAiClinicalContextService {
    async getByAppointmentId(appointmentId: string): Promise<AppointmentAiClinicalContext> {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: {
                id: true,
                patientId: true,
                appointmentType: true,
                scheduledAt: true,
                department: { select: { name: true } },
                serviceCatalog: { select: { name: true } },
                staffProfile: { select: { specialization: true } },
                patient: {
                    select: {
                        gender: true,
                        bloodType: true,
                        allergies: true,
                        medicalNotes: true,
                    },
                },
            },
        });

        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        const [recentMedicalRecords, recentPrescriptions] = await prisma.$transaction([
            prisma.medicalRecord.findMany({
                where: {
                    patientId: appointment.patientId,
                    appointmentId: {
                        not: appointment.id,
                    },
                },
                orderBy: [{ createdAt: 'desc' }],
                take: 5,
                select: {
                    createdAt: true,
                    chiefComplaint: true,
                    diagnosis: true,
                    treatmentPlan: true,
                    followUpInstructions: true,
                    department: { select: { name: true } },
                },
            }),
            prisma.prescription.findMany({
                where: { patientId: appointment.patientId },
                orderBy: [{ issuedAt: 'desc' }],
                take: 5,
                select: {
                    issuedAt: true,
                    isVoided: true,
                    medicalRecord: {
                        select: {
                            diagnosis: true,
                        },
                    },
                    items: {
                        orderBy: [{ createdAt: 'asc' }],
                        select: {
                            medicationName: true,
                            dosage: true,
                            frequency: true,
                            durationInstructions: true,
                            notes: true,
                        },
                    },
                },
            }),
        ]);

        return {
            appointment: {
                id: appointment.id,
                appointmentType: appointment.appointmentType,
                scheduledAt: appointment.scheduledAt,
                department: appointment.department.name,
                service: appointment.serviceCatalog.name,
                staffSpecialization: appointment.staffProfile?.specialization ?? null,
            },
            patient: {
                gender: appointment.patient.gender,
                bloodType: appointment.patient.bloodType,
                allergies: appointment.patient.allergies,
                medicalNotes: appointment.patient.medicalNotes,
            },
            recentMedicalRecords: recentMedicalRecords.map((record) => ({
                createdAt: record.createdAt,
                department: record.department.name,
                chiefComplaint: record.chiefComplaint,
                diagnosis: record.diagnosis,
                treatmentPlan: record.treatmentPlan,
                followUpInstructions: record.followUpInstructions,
            })),
            recentPrescriptions: recentPrescriptions.map((prescription) => ({
                issuedAt: prescription.issuedAt,
                status: prescription.isVoided ? 'VOIDED' : 'ACTIVE',
                diagnosis: prescription.medicalRecord?.diagnosis ?? null,
                items: prescription.items,
            })),
        };
    }
}
