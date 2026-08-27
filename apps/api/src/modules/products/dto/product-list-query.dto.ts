import { Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const SORTS = ['price_asc', 'price_desc', 'newest', 'popular'];

/**
 * `GET /products` query (API_SPEC.md). Attribute filters arrive as `attr.<key>=value`
 * and are read straight off the raw query string in the controller — they are dynamic by
 * design (staff can add a new attribute without a code change).
 */
export class ProductListQueryDto extends PaginationDto {
  /** category slug */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryType?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value).split(',')))
  @IsString({ each: true })
  brand?: string[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'minPrice doit être un entier (centimes).' })
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'maxPrice doit être un entier (centimes).' })
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBooleanString()
  inStock?: string;

  /**
   * `?promo=true` — only what is actually discounted right now. "Right now" matters: a
   * flash deal has a start and an end, so the same query answers differently an hour
   * later, and the promo section must never keep advertising a deal that has closed.
   */
  @IsOptional()
  @IsBooleanString()
  promo?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(SORTS, { message: 'Tri invalide.' })
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';

  /** staff-only: include drafts/archived in the admin product table */
  @IsOptional()
  @IsIn(['active', 'draft', 'archived', 'all'])
  status?: 'active' | 'draft' | 'archived' | 'all';
}
