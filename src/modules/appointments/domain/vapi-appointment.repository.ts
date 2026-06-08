import {
    VapiDepartmentCandidate,
    VapiDoctorCandidate,
    VapiPatientCandidate,
    VapiServiceCandidate,
} from './vapi-appointment.types';

export interface SearchDoctorsFilters {
    name?: string;
    departmentId?: string;
    limit?: number;
}

export interface SearchServicesFilters {
    name?: string;
    departmentId?: string;
    limit?: number;
}

export interface SearchDepartmentsFilters {
    name?: string;
    limit?: number;
}

export interface CreateVapiPatientData {
    firstName: string;
    lastName: string;
    personalNumber: string;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: Date | null;
}

export interface VapiAppointmentRepository {
    searchDoctors(filters: SearchDoctorsFilters): Promise<VapiDoctorCandidate[]>;
    searchServices(filters: SearchServicesFilters): Promise<VapiServiceCandidate[]>;
    searchDepartments(
        filters: SearchDepartmentsFilters,
    ): Promise<VapiDepartmentCandidate[]>;
    findPatientByPersonalNumber(
        personalNumber: string,
    ): Promise<VapiPatientCandidate | null>;
    createPatient(data: CreateVapiPatientData): Promise<VapiPatientCandidate>;
}
