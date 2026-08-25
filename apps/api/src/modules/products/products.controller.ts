import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Product, ProductListResponse, ProductSummary } from '@rgi/types';
import { hasAtLeastRole } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/current-user.decorator';
import { ProductsService, type AttrFilters } from './products.service';
import { AttributeFilters, CatalogQuery } from './catalog-query.decorators';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /**
   * Public, but not identical for everyone: the guard now attaches the user when the
   * request carries a valid token, so the admin table keeps its `status` lens while an
   * anonymous visitor only ever sees what is on sale.
   */
  @Public()
  @Get()
  list(
    @CatalogQuery() query: ProductListQueryDto,
    @AttributeFilters() attrs: AttrFilters,
    @CurrentUser() user?: RequestUser,
  ): Promise<ProductListResponse> {
    return this.products.list(query, attrs, Boolean(user && hasAtLeastRole(user.role, 'staff')));
  }

  @Public()
  @Get('search')
  search(
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ): Promise<ProductSummary[]> {
    return this.products.search(q, limit ? Number(limit) : 8);
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<Product> {
    return ProductsService.toDto(await this.products.findBySlugOrFail(slug));
  }

  @Roles('staff')
  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.products.create(dto);
  }

  @Roles('staff')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<Product> {
    return this.products.update(id, dto);
  }

  @Roles('staff')
  @Patch(':id/stock')
  stock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser('userId') userId: string,
  ): Promise<Product> {
    return this.products.adjustStock(id, dto, userId);
  }

  @Roles('staff')
  @HttpCode(204)
  @Delete(':id')
  archive(@Param('id') id: string): Promise<void> {
    return this.products.archive(id);
  }
}
