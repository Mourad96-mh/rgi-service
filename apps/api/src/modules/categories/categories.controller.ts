import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AttributeDefinition, Category, CategoryNode } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttributeDefinitionsService } from '../attribute-definitions/attribute-definitions.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly attributes: AttributeDefinitionsService,
  ) {}

  @Public()
  @Get()
  tree(): Promise<CategoryNode[]> {
    return this.categories.tree();
  }

  /**
   * One category plus the attribute definitions that drive its filters and forms.
   *
   * The wildcard matters: category slugs are full paths (`composants/cartes-graphiques`)
   * so the storefront URLs mirror the tree (SEO_STRATEGY.md §1). A plain `:slug` would
   * only ever match a single segment.
   */
  @Public()
  @Get('*')
  async detail(
    @Param('0') slug: string,
  ): Promise<{ category: Category; attributeDefinitions: AttributeDefinition[] }> {
    const doc = await this.categories.findBySlugOrFail(slug);
    const categoryType = doc.componentType ?? doc.type;
    return {
      category: CategoriesService.toDto(doc),
      attributeDefinitions: await this.attributes.findByCategoryType(categoryType),
    };
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categories.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<Category> {
    return this.categories.update(id, dto);
  }

  @Roles('admin')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.categories.remove(id);
  }
}
