import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type {
  Build,
  BuildEvaluation,
  ProductSummary,
  SlotDefinition,
  SlotId,
} from '@rgi/types';
import { CONFIGURATOR_DISCOUNT_PCT, SLOTS } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfiguratorService } from './configurator.service';
import { BuildSelectionInputDto, SaveBuildDto } from './dto/build.dto';

/**
 * The selection travels in a query string on GET (`?selection=<url-encoded JSON>`), which
 * keeps the parts endpoint cacheable and shareable.
 */
function parseSelection(raw?: string): Record<string, string | string[]> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, string | string[]>)
      : {};
  } catch {
    return {};
  }
}

@Controller('configurator')
export class ConfiguratorController {
  constructor(private readonly configurator: ConfiguratorService) {}

  @Public()
  @Get('slots')
  slots(): { slots: SlotDefinition[]; discountPct: number } {
    return { slots: SLOTS, discountPct: CONFIGURATOR_DISCOUNT_PCT };
  }

  @Public()
  @Get('parts')
  parts(
    @Query('slot') slot: SlotId,
    @Query('selection') selection?: string,
    @Query('inStock') inStock?: string,
  ): Promise<{ parts: ProductSummary[]; incompatibleCount: number }> {
    return this.configurator.partsForSlot(
      slot,
      parseSelection(selection),
      inStock === 'true',
    );
  }

  @Public()
  @HttpCode(200)
  @Post('validate')
  validate(@Body() dto: BuildSelectionInputDto): Promise<BuildEvaluation> {
    return this.configurator.validate(dto.selection);
  }

  @Public()
  @Post('builds')
  save(
    @Body() dto: SaveBuildDto,
    @CurrentUser('userId') userId?: string,
  ): Promise<Build> {
    return this.configurator.save(dto, userId);
  }

  @Public()
  @Get('builds/:shareId')
  load(@Param('shareId') shareId: string): Promise<Build> {
    return this.configurator.findByShareId(shareId);
  }
}
