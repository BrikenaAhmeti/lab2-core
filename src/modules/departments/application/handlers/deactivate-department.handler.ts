import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { DepartmentEntity } from '../../domain/department.entity';
import { DepartmentService } from '../../services/department.service';
import { DeactivateDepartmentCommand } from '../commands/deactivate-department.command';

export class DeactivateDepartmentHandler
    implements CommandHandler<DeactivateDepartmentCommand, DepartmentEntity> {
    constructor(private readonly departmentService: DepartmentService) { }

    async execute(command: DeactivateDepartmentCommand): Promise<DepartmentEntity> {
        return this.departmentService.deactivateDepartment(command.id);
    }
}
