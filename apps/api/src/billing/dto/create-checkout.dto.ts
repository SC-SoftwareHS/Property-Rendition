import { IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['starter', 'professional', 'firm'])
  tier!: string;

  @IsIn(['monthly', 'yearly'])
  interval!: string;
}
