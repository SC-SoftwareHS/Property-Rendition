import { IsOptional, IsInt, Min, IsArray, IsUUID } from 'class-validator';

export class BatchGenerateDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  taxYear?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  renditionIds?: string[];
}
