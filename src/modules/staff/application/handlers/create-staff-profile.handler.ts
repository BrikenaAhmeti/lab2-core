import { CreateStaffProfileCommand } from '../commands/create-staff-profile.command';
import { StaffService } from '../../services/staff.service';

export class CreateStaffProfileHandler {
    constructor(private readonly staffService: StaffService) { }

    async execute(command: CreateStaffProfileCommand) {
        return this.staffService.createStaffProfile({
            userId: command.userId,
            firstName: command.firstName,
            lastName: command.lastName,
            email: command.email,
            username: command.username,
            phone: command.phone,
            dateOfBirth: command.dateOfBirth,
            gender: command.gender,
            personalNumber: command.personalNumber,
            staffPositionTypeId: command.staffPositionTypeId,
            employeeCode: command.employeeCode,
            specialization: command.specialization,
            licenseNumber: command.licenseNumber,
            employmentStatus: command.employmentStatus,
            hireDate: command.hireDate,
            bio: command.bio,
            isPublicProfile: command.isPublicProfile,
            departments: command.departments,
            actorUserId: command.actorUserId,
        });
    }
}
