import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { DepartmentEntity } from '../../domain/department.entity';
import { DepartmentService } from '../../services/department.service';
import { UpdateDepartmentCommand } from '../commands/update-department.command';

export class UpdateDepartmentHandler
    implements CommandHandler<UpdateDepartmentCommand, DepartmentEntity> {
    constructor(private readonly departmentService: DepartmentService) { }

    async execute(command: UpdateDepartmentCommand): Promise<DepartmentEntity> {
        return this.departmentService.updateDepartment(command.id, {
            name: command.name,
            description: command.description,
            isActive: command.isActive,
        });
    }
}
