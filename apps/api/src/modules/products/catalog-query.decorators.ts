import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import type { AttrFilters } from './products.service';
import { ProductListQueryDto } from './dto/product-list-query.dto';

/**
 * The catalog query minus the dynamic `attr.<key>` filters.
 *
 * Those keys *cannot* be declared on a DTO — staff invent new attributes from the
 * dashboard (ADMIN_DASHBOARD.md §3) — and the global ValidationPipe runs with
 * `forbidNonWhitelisted`, so they would 400. Splitting them off here keeps strict
 * validation for everything else: a custom param decorator is not covered by the global
 * pipe, so the DTO is validated explicitly below.
 */
export const CatalogQuery = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProductListQueryDto => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (!key.startsWith('attr.')) raw[key] = value;
    }

    const dto = plainToInstance(ProductListQueryDto, raw);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    });
    if (errors.length) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new BadRequestException(messages.length ? messages : 'Requête invalide.');
    }
    return dto;
  },
);

/** The `attr.socket=AM5&attr.ram_type=DDR5` half of the same query string. */
export const AttributeFilters = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AttrFilters => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const out: AttrFilters = {};
    for (const [rawKey, rawValue] of Object.entries(req.query)) {
      if (!rawKey.startsWith('attr.')) continue;
      const key = rawKey.slice('attr.'.length);
      // Same shape as an AttributeDefinition key — anything else is not a real filter.
      if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
      out[key] = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)];
    }
    return out;
  },
);
