export const vapiAppointmentToolNames = [
    'resolveAppointmentContext',
    'checkAvailability',
    'bookAppointment',
] as const;

export type VapiAppointmentToolName = (typeof vapiAppointmentToolNames)[number];

export interface ResolveAppointmentContextInput {
    doctorName?: string;
    serviceName?: string;
    departmentName?: string;
}

export interface CheckAvailabilityInput extends ResolveAppointmentContextInput {
    date: string;
    preferredTime?: string;
}

export interface BookAppointmentInput extends ResolveAppointmentContextInput {
    startTime: string;
    personalNumber: string;
    patientFirstName: string;
    patientLastName: string;
    patientPhone?: string;
    patientEmail?: string;
    dateOfBirth?: string;
    notes?: string;
}

export type VapiToolInput =
    | ResolveAppointmentContextInput
    | CheckAvailabilityInput
    | BookAppointmentInput;

export interface VapiClarificationOption {
    type: 'doctor' | 'service' | 'department';
    label: string;
}

export interface VapiResolvedAppointmentContext {
    doctorId?: string;
    doctorName?: string;
    serviceId?: string;
    serviceName?: string;
    departmentId?: string;
    departmentName?: string;
    durationMinutes?: number;
}

export interface VapiCompleteAppointmentContext {
    doctorId: string;
    doctorName: string;
    serviceId: string;
    serviceName: string;
    departmentId: string;
    departmentName: string;
    durationMinutes: number;
}

export interface VapiResolveSuccessResponse {
    success: true;
    needsClarification: false;
    resolved: VapiResolvedAppointmentContext;
    message: string;
}

export interface VapiClarificationResponse {
    success: true;
    needsClarification: true;
    message: string;
    options: VapiClarificationOption[];
    originalDate?: string;
    resolvedDate?: string;
    preferredTime?: string;
}

export interface VapiFailureResponse {
    success: false;
    message: string;
}

export type VapiResolveResponse =
    | VapiResolveSuccessResponse
    | VapiClarificationResponse
    | VapiFailureResponse;

export interface VapiAvailabilitySlot {
    label: string;
    startTime: string;
    endTime: string;
}

export interface VapiAvailabilitySuccessResponse {
    success: true;
    available: boolean;
    needsClarification: false;
    message: string;
    resolvedDate: string;
    resolved: Omit<
        VapiCompleteAppointmentContext,
        'doctorId' | 'serviceId' | 'departmentId'
    >;
    slots: VapiAvailabilitySlot[];
}

export type VapiAvailabilityResponse =
    | VapiAvailabilitySuccessResponse
    | VapiClarificationResponse
    | VapiFailureResponse;

export interface VapiBookingSuccessResponse {
    success: true;
    appointmentId: string;
    message: string;
    appointment: {
        patientName: string;
        personalNumberMasked: string;
        doctorName: string;
        departmentName: string;
        serviceName: string;
        startTime: string;
    };
}

export type VapiBookingResponse =
    | VapiBookingSuccessResponse
    | VapiClarificationResponse
    | VapiFailureResponse;

export type VapiToolResponse =
    | VapiResolveResponse
    | VapiAvailabilityResponse
    | VapiBookingResponse;

export interface VapiDepartmentCandidate {
    id: string;
    name: string;
}

export interface VapiServiceCandidate {
    id: string;
    name: string;
    departmentId: string;
    departmentName: string;
    defaultDurationMinutes: number;
    defaultPrice: number;
}

export interface VapiDoctorCandidate {
    id: string;
    userId: string;
    displayName: string;
    employeeCode: string;
    specialization: string | null;
    departments: Array<{
        id: string;
        name: string;
        isPrimary: boolean;
    }>;
}

export interface VapiPatientCandidate {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    personalNumber: string | null;
}
