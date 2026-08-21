import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { CategoryType, ComponentType } from '@rgi/types';

const CATEGORY_TYPES = [
  'component',
  'prebuilt',
  'laptop',
  'peripheral',
  'console',
  'monitor',
  'workstation',
];

const COMPONENT_TYPES = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooler',
  'storage',
  'fan',
];

export class LocalizedDto {
  @IsString()
  @MinLength(1, { message: 'Le libellé français est requis.' })
  @MaxLength(200)
  fr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ar?: string;
}

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => LocalizedDto)
  name!: LocalizedDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsMongoId({ message: 'Catégorie parente invalide.' })
  parent?: string | null;

  @IsIn(CATEGORY_TYPES, { message: 'Type de catégorie invalide.' })
  type!: CategoryType;

  @IsOptional()
  @IsIn(COMPONENT_TYPES, { message: 'Type de composant invalide.' })
  componentType?: ComponentType;

  @IsOptional()
  @IsString()
  configuratorSlot?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  name?: LocalizedDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsMongoId({ message: 'Catégorie parente invalide.' })
  parent?: string | null;

  @IsOptional()
  @IsIn(CATEGORY_TYPES, { message: 'Type de catégorie invalide.' })
  type?: CategoryType;

  @IsOptional()
  @IsIn(COMPONENT_TYPES, { message: 'Type de composant invalide.' })
  componentType?: ComponentType;

  @IsOptional()
  @IsString()
  configuratorSlot?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
