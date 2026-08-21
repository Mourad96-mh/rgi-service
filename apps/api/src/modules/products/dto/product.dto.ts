import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { Attributes, ProductStatus } from '@rgi/types';
import { LocalizedDto } from '../../categories/dto/category.dto';

export class ProductImageDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class FlashDealDto {
  /** centimes */
  @IsInt({ message: 'Le prix promo doit être en centimes (entier).' })
  @Min(0)
  price!: number;

  @IsDateString({}, { message: 'Date de début invalide.' })
  startsAt!: string;

  @IsDateString({}, { message: 'Date de fin invalide.' })
  endsAt!: string;
}

export class CreateProductDto {
  @ValidateNested()
  @Type(() => LocalizedDto)
  name!: LocalizedDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(1, { message: 'La référence (SKU) est requise.' })
  @MaxLength(60)
  sku!: string;

  @IsString()
  @MinLength(1, { message: 'La marque est requise.' })
  brand!: string;

  @IsMongoId({ message: 'Catégorie invalide.' })
  category!: string;

  @ValidateNested()
  @Type(() => LocalizedDto)
  description!: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  shortDescription?: LocalizedDto;

  /** centimes — never a float (CLAUDE.md §6) */
  @IsInt({ message: 'Le prix doit être exprimé en centimes (entier).' })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt({ message: 'Le prix barré doit être exprimé en centimes (entier).' })
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlashDealDto)
  flashDeal?: FlashDealDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsObject({ message: 'Les attributs techniques doivent être un objet.' })
  attributes?: Attributes;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isConfiguratorPart?: boolean;

  @IsOptional()
  @IsIn(['active', 'draft', 'archived'], { message: 'Statut invalide.' })
  status?: ProductStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  metaTitle?: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  metaDescription?: LocalizedDto;
}

export class UpdateProductDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  name?: LocalizedDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsMongoId({ message: 'Catégorie invalide.' })
  category?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  description?: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  shortDescription?: LocalizedDto;

  @IsOptional()
  @IsInt({ message: 'Le prix doit être exprimé en centimes (entier).' })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlashDealDto)
  flashDeal?: FlashDealDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsObject()
  attributes?: Attributes;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isConfiguratorPart?: boolean;

  @IsOptional()
  @IsIn(['active', 'draft', 'archived'], { message: 'Statut invalide.' })
  status?: ProductStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  metaTitle?: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  metaDescription?: LocalizedDto;
}

export class UpdateStockDto {
  /** absolute new stock value, or a delta when `mode` is 'delta' */
  @IsInt({ message: 'La quantité doit être un entier.' })
  quantity!: number;

  @IsOptional()
  @IsIn(['set', 'delta'])
  mode?: 'set' | 'delta';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
