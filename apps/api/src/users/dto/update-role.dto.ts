import { IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsIn(['admin', 'preparer', 'reviewer'])
  role!: string;
}
