import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateHb9SettingsDto {
  @IsOptional()
  @IsBoolean()
  hasRelatedEntities?: boolean;

  @IsOptional()
  @IsBoolean()
  electNotToRender?: boolean;
}
