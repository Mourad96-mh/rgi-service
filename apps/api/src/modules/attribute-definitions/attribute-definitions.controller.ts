import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { AttributeDefinition } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttributeDefinitionsService } from './attribute-definitions.service';
import {
  CreateAttributeDefinitionDto,
  UpdateAttributeDefinitionDto,
} from './dto/attribute-definition.dto';

@Controller('attribute-definitions')
export class AttributeDefinitionsController {
  constructor(private readonly service: AttributeDefinitionsService) {}

  /** Public: the storefront needs the labels/units to render facets and spec tables. */
  @Public()
  @Get()
  list(@Query('categoryType') categoryType?: string): Promise<AttributeDefinition[]> {
    return categoryType
      ? this.service.findByCategoryType(categoryType)
      : this.service.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateAttributeDefinitionDto): Promise<AttributeDefinition> {
    return this.service.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDefinitionDto,
  ): Promise<AttributeDefinition> {
    return this.service.update(id, dto);
  }

  @Roles('admin')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
