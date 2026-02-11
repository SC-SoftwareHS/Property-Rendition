import { IsIn } from 'class-validator';

export class UpdateRenditionStatusDto {
  @IsIn(['in_progress', 'review', 'approved', 'filed'])
  status!: string;
}
