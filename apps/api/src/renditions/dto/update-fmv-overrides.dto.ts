import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';

export class FmvOverrideItemDto {
  @IsUUID('4')
  assetId!: string;

  @IsNumber()
  @Min(0)
  @Max(999_999_999_999.99)
  overrideValue!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class UpdateFmvOverridesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FmvOverrideItemDto)
  overrides!: FmvOverrideItemDto[];
}
