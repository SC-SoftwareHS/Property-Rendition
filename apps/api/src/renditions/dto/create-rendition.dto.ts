import { IsInt, Min } from 'class-validator';

export class CreateRenditionDto {
  @IsInt()
  @Min(2000)
  taxYear!: number;
}
