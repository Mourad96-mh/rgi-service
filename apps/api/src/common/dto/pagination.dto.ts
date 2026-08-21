import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_LIMIT } from '@rgi/types';

/** `?page=&limit=` on every list endpoint. Limit is capped server-side (API_SPEC.md). */
export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'page doit être un entier.' })
  @Min(1, { message: 'page doit être supérieur ou égal à 1.' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'limit doit être un entier.' })
  @Min(1, { message: 'limit doit être supérieur ou égal à 1.' })
  @Max(MAX_PAGE_LIMIT, { message: `limit ne peut pas dépasser ${MAX_PAGE_LIMIT}.` })
  limit?: number = 24;
}
