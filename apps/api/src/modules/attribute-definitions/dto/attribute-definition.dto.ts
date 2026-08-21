import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import type { AttributeDataType } from '@rgi/types';
import { LocalizedDto } from '../../categories/dto/category.dto';

export class CreateAttributeDefinitionDto {
  @IsString()
  categoryType!: string;

  /** snake_case machine key — it is what the configurator rules reference. */
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'La clé doit être en minuscules, sans espaces (ex. : tdp_watts).',
  })
  key!: string;

  @ValidateNested()
  @Type(() => LocalizedDto)
  label!: LocalizedDto;

  @IsIn(['string', 'number', 'boolean', 'enum'], { message: 'Type de donnée invalide.' })
  dataType!: AttributeDataType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  enumValues?: string[];

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  usedInCompatibility?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateAttributeDefinitionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  label?: LocalizedDto;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enumValues?: string[];

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  usedInCompatibility?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
