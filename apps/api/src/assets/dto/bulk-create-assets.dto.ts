import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateAssetDto } from './create-asset.dto';

export class BulkCreateAssetsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateAssetDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  assets!: CreateAssetDto[];
}
