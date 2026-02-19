import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(['admin', 'preparer', 'reviewer'])
  role?: string;
}
