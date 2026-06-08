import { VapiAppointmentRepository } from '../domain/vapi-appointment.repository';
import {
    ResolveAppointmentContextInput,
    VapiClarificationOption,
    VapiClarificationResponse,
    VapiCompleteAppointmentContext,
    VapiDepartmentCandidate,
    VapiDoctorCandidate,
    VapiFailureResponse,
    VapiResolveResponse,
    VapiResolvedAppointmentContext,
    VapiServiceCandidate,
} from '../domain/vapi-appointment.types';

interface ResolveOptions {
    requireDoctor?: boolean;
    requireService?: boolean;
}

function hasContextValue(input: ResolveAppointmentContextInput) {
    return Boolean(input.doctorName || input.serviceName || input.departmentName);
}

function doctorDepartments(doctor: VapiDoctorCandidate) {
    return doctor.departments.filter(Boolean);
}

function doctorServesDepartment(doctor: VapiDoctorCandidate, departmentId: string) {
    return doctorDepartments(doctor).some((department) => department.id === departmentId);
}

function departmentFromService(
    service: VapiServiceCandidate,
): VapiDepartmentCandidate {
    return {
        id: service.departmentId,
        name: service.departmentName,
    };
}

function departmentFromDoctor(
    doctor: VapiDoctorCandidate,
    departmentId: string,
): VapiDepartmentCandidate | null {
    const department = doctorDepartments(doctor).find((item) => item.id === departmentId);

    return department
        ? {
              id: department.id,
              name: department.name,
          }
        : null;
}

function doctorOption(doctor: VapiDoctorCandidate): VapiClarificationOption {
    return {
        type: 'doctor',
        label: `${doctor.displayName}, ${doctorDepartments(doctor)
            .map((department) => department.name)
            .join(', ')}`,
    };
}

function serviceOption(service: VapiServiceCandidate): VapiClarificationOption {
    return {
        type: 'service',
        label: `${service.name}, ${service.departmentName}`,
    };
}

function departmentOption(
    department: VapiDepartmentCandidate,
): VapiClarificationOption {
    return {
        type: 'department',
        label: department.name,
    };
}

export class AppointmentContextResolverService {
    constructor(private readonly repository: VapiAppointmentRepository) {}

    async resolveAppointmentContext(
        input: ResolveAppointmentContextInput,
        options: ResolveOptions = {},
    ): Promise<VapiResolveResponse> {
        if (!hasContextValue(input)) {
            return {
                success: false,
                message: 'Please provide a doctor, service or department name.',
            };
        }

        let selectedDepartment: VapiDepartmentCandidate | null = null;
        let selectedService: VapiServiceCandidate | null = null;
        let selectedDoctor: VapiDoctorCandidate | null = null;

        if (input.departmentName) {
            const departments = await this.repository.searchDepartments({
                name: input.departmentName,
                limit: 6,
            });

            if (departments.length === 0) {
                return this.notFound();
            }

            if (departments.length > 1) {
                return this.clarify(
                    'I found more than one matching department. Please choose one.',
                    departments.map(departmentOption),
                );
            }

            selectedDepartment = departments[0];
        }

        if (input.serviceName) {
            const serviceResult = await this.resolveService(
                input.serviceName,
                selectedDepartment,
                selectedDoctor,
            );

            if ('response' in serviceResult) {
                return serviceResult.response;
            }

            selectedService = serviceResult.service;
            selectedDepartment = departmentFromService(selectedService);
        }

        if (input.doctorName) {
            const doctorResult = await this.resolveDoctor(
                input.doctorName,
                selectedDepartment,
                selectedService,
            );

            if ('response' in doctorResult) {
                return doctorResult.response;
            }

            selectedDoctor = doctorResult.doctor;
        }

        if (selectedService) {
            const serviceDepartment = departmentFromService(selectedService);

            if (
                selectedDepartment &&
                selectedDepartment.id !== serviceDepartment.id
            ) {
                return {
                    success: false,
                    message:
                        'The selected service does not belong to the selected department.',
                };
            }

            selectedDepartment = serviceDepartment;
        }

        if (selectedDoctor) {
            const departmentResult = this.resolveDepartmentForDoctor(
                selectedDoctor,
                selectedDepartment,
                selectedService,
            );

            if ('response' in departmentResult) {
                return departmentResult.response;
            }

            selectedDepartment = departmentResult.department;
        }

        if (options.requireDoctor && !selectedDoctor) {
            const doctorResult = await this.resolveDoctorFromDepartment(
                selectedDepartment,
            );

            if ('response' in doctorResult) {
                return doctorResult.response;
            }

            selectedDoctor = doctorResult.doctor;
        }

        if (options.requireService && !selectedService) {
            const serviceResult = await this.resolveServiceFromDepartment(
                selectedDepartment,
            );

            if ('response' in serviceResult) {
                return serviceResult.response;
            }

            selectedService = serviceResult.service;
            selectedDepartment = departmentFromService(selectedService);
        } else if (!selectedService && selectedDepartment && selectedDoctor) {
            const services = await this.repository.searchServices({
                departmentId: selectedDepartment.id,
                limit: 2,
            });

            if (services.length === 1) {
                selectedService = services[0];
            }
        }

        if (selectedDoctor && selectedService) {
            const serviceDepartmentId = selectedService.departmentId;

            if (!doctorServesDepartment(selectedDoctor, serviceDepartmentId)) {
                return {
                    success: false,
                    message:
                        'The selected doctor does not provide that service in the selected department.',
                };
            }

            selectedDepartment = departmentFromService(selectedService);
        }

        const resolved = this.toResolved({
            doctor: selectedDoctor,
            service: selectedService,
            department: selectedDepartment,
        });

        if (Object.keys(resolved).length === 0) {
            return this.notFound();
        }

        return {
            success: true,
            needsClarification: false,
            resolved,
            message:
                selectedDoctor && selectedService
                    ? 'Doctor and service resolved successfully.'
                    : 'Appointment context resolved successfully.',
        };
    }

    async resolveCompleteAppointmentContext(
        input: ResolveAppointmentContextInput,
    ): Promise<
        | VapiClarificationResponse
        | VapiFailureResponse
        | { success: true; context: VapiCompleteAppointmentContext }
    > {
        const response = await this.resolveAppointmentContext(input, {
            requireDoctor: true,
            requireService: true,
        });

        if (!response.success || response.needsClarification) {
            return response;
        }

        const resolved = response.resolved;

        if (
            !resolved.doctorId ||
            !resolved.doctorName ||
            !resolved.serviceId ||
            !resolved.serviceName ||
            !resolved.departmentId ||
            !resolved.departmentName ||
            !resolved.durationMinutes
        ) {
            return {
                success: false,
                message:
                    'I need a specific doctor and service before checking appointments.',
            };
        }

        return {
            success: true,
            context: {
                doctorId: resolved.doctorId,
                doctorName: resolved.doctorName,
                serviceId: resolved.serviceId,
                serviceName: resolved.serviceName,
                departmentId: resolved.departmentId,
                departmentName: resolved.departmentName,
                durationMinutes: resolved.durationMinutes,
            },
        };
    }

    private async resolveService(
        serviceName: string,
        selectedDepartment: VapiDepartmentCandidate | null,
        selectedDoctor: VapiDoctorCandidate | null,
    ): Promise<
        | { service: VapiServiceCandidate }
        | { response: VapiResolveResponse }
    > {
        const services = await this.repository.searchServices({
            name: serviceName,
            limit: 8,
        });
        let matches = services;

        if (selectedDepartment) {
            const departmentMatches = matches.filter(
                (service) => service.departmentId === selectedDepartment.id,
            );

            if (departmentMatches.length > 0) {
                matches = departmentMatches;
            }
        }

        if (selectedDoctor) {
            const doctorMatches = matches.filter((service) =>
                doctorServesDepartment(selectedDoctor, service.departmentId),
            );

            if (doctorMatches.length > 0) {
                matches = doctorMatches;
            }
        }

        if (matches.length === 0) {
            return { response: this.notFound() };
        }

        if (matches.length > 1) {
            return {
                response: this.clarify(
                    'I found more than one matching service. Please choose one.',
                    matches.map(serviceOption),
                ),
            };
        }

        return { service: matches[0] };
    }

    private async resolveDoctor(
        doctorName: string,
        selectedDepartment: VapiDepartmentCandidate | null,
        selectedService: VapiServiceCandidate | null,
    ): Promise<
        | { doctor: VapiDoctorCandidate }
        | { response: VapiResolveResponse }
    > {
        const doctors = await this.repository.searchDoctors({
            name: doctorName,
            limit: 8,
        });
        let matches = doctors;
        const departmentId = selectedService?.departmentId ?? selectedDepartment?.id;

        if (departmentId) {
            const departmentMatches = matches.filter((doctor) =>
                doctorServesDepartment(doctor, departmentId),
            );

            if (departmentMatches.length > 0) {
                matches = departmentMatches;
            }
        }

        if (matches.length === 0) {
            return { response: this.notFound() };
        }

        if (matches.length > 1) {
            return {
                response: this.clarify(
                    'I found more than one matching doctor. Please choose one.',
                    matches.map(doctorOption),
                ),
            };
        }

        return { doctor: matches[0] };
    }

    private resolveDepartmentForDoctor(
        doctor: VapiDoctorCandidate,
        selectedDepartment: VapiDepartmentCandidate | null,
        selectedService: VapiServiceCandidate | null,
    ):
        | { department: VapiDepartmentCandidate | null }
        | { response: VapiResolveResponse } {
        const departments = doctorDepartments(doctor);

        if (selectedService) {
            if (!doctorServesDepartment(doctor, selectedService.departmentId)) {
                return {
                    response: {
                        success: false,
                        message:
                            'The selected doctor does not provide that service in the selected department.',
                    },
                };
            }

            return { department: departmentFromService(selectedService) };
        }

        if (selectedDepartment) {
            if (!doctorServesDepartment(doctor, selectedDepartment.id)) {
                return {
                    response: {
                        success: false,
                        message:
                            'The selected doctor is not assigned to that department.',
                    },
                };
            }

            return { department: selectedDepartment };
        }

        if (departments.length === 1) {
            return {
                department: {
                    id: departments[0].id,
                    name: departments[0].name,
                },
            };
        }

        if (departments.length > 1) {
            return {
                response: this.clarify(
                    'That doctor works in more than one department. Please choose the department.',
                    departments.map((department) =>
                        departmentOption({
                            id: department.id,
                            name: department.name,
                        }),
                    ),
                ),
            };
        }

        return {
            response: {
                success: false,
                message: 'The selected doctor is not assigned to an active department.',
            },
        };
    }

    private async resolveDoctorFromDepartment(
        selectedDepartment: VapiDepartmentCandidate | null,
    ): Promise<
        | { doctor: VapiDoctorCandidate }
        | { response: VapiResolveResponse }
    > {
        if (!selectedDepartment) {
            return {
                response: {
                    success: false,
                    message:
                        'Please choose a doctor or department before checking availability.',
                },
            };
        }

        const doctors = await this.repository.searchDoctors({
            departmentId: selectedDepartment.id,
            limit: 8,
        });

        if (doctors.length === 0) {
            return {
                response: {
                    success: false,
                    message: 'I could not find a doctor in that department.',
                },
            };
        }

        if (doctors.length > 1) {
            return {
                response: this.clarify(
                    'I found more than one doctor for that department. Please choose one.',
                    doctors.map(doctorOption),
                ),
            };
        }

        return { doctor: doctors[0] };
    }

    private async resolveServiceFromDepartment(
        selectedDepartment: VapiDepartmentCandidate | null,
    ): Promise<
        | { service: VapiServiceCandidate }
        | { response: VapiResolveResponse }
    > {
        if (!selectedDepartment) {
            return {
                response: {
                    success: false,
                    message:
                        'Please choose a service or department before checking availability.',
                },
            };
        }

        const services = await this.repository.searchServices({
            departmentId: selectedDepartment.id,
            limit: 8,
        });

        if (services.length === 0) {
            return {
                response: {
                    success: false,
                    message: 'I could not find an active service in that department.',
                },
            };
        }

        if (services.length > 1) {
            return {
                response: this.clarify(
                    'I found more than one service for that department. Please choose one.',
                    services.map(serviceOption),
                ),
            };
        }

        return { service: services[0] };
    }

    private toResolved(input: {
        doctor: VapiDoctorCandidate | null;
        service: VapiServiceCandidate | null;
        department: VapiDepartmentCandidate | null;
    }): VapiResolvedAppointmentContext {
        return {
            doctorId: input.doctor?.id,
            doctorName: input.doctor?.displayName,
            serviceId: input.service?.id,
            serviceName: input.service?.name,
            departmentId: input.department?.id,
            departmentName: input.department?.name,
            durationMinutes: input.service?.defaultDurationMinutes,
        };
    }

    private clarify(
        message: string,
        options: VapiClarificationOption[],
    ): VapiResolveResponse {
        return {
            success: true,
            needsClarification: true,
            message,
            options,
        };
    }

    private notFound(): VapiResolveResponse {
        return {
            success: false,
            message: 'I could not find a matching doctor, service or department.',
        };
    }
}
