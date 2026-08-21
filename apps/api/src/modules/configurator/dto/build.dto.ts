import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SlotId } from '@rgi/types';

/** ids only — the server re-reads every price (never trust the client with money). */
export class BuildSelectionInputDto {
  @IsObject({ message: 'Sélection invalide.' })
  selection!: Partial<Record<SlotId, string | string[]>>;
}

export class SaveBuildDto extends BuildSelectionInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
