import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  Matches,
} from 'class-validator';

const ASSET_CATEGORIES = [
  'furniture_fixtures',
  'machinery_equipment',
  'computer_equipment',
  'leasehold_improvements',
  'vehicles',
  'inventory',
  'supplies',
  'leased_equipment',
  'other',
] as const;

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ASSET_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'originalCost must be a valid decimal (e.g. 1234.56)' })
  originalCost?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsDateString()
  disposalDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isLeased?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lessorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lessorAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
