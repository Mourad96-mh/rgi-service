import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import type { HeroSlideId, HeroSlideImage } from '@rgi/types';
import { HERO_SLIDE_IDS } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { HeroService } from './hero.service';
import { SetHeroSlideImageDto } from './dto/hero.dto';

/**
 * The homepage carousel photos (ADMIN_DASHBOARD.md — staff manage the shop without a
 * developer). Reading is public because the storefront renders the homepage for anonymous
 * visitors; writing is staff-only.
 */
@Controller('hero-slides')
export class HeroController {
  constructor(private readonly hero: HeroService) {}

  @Public()
  @Get()
  list(): Promise<HeroSlideImage[]> {
    return this.hero.findAll();
  }

  @Roles('staff')
  @Put(':slideId')
  set(@Param('slideId') slideId: string, @Body() dto: SetHeroSlideImageDto): Promise<HeroSlideImage> {
    return this.hero.set(this.assertSlideId(slideId), dto);
  }

  @Roles('staff')
  @HttpCode(204)
  @Delete(':slideId')
  reset(@Param('slideId') slideId: string): Promise<void> {
    return this.hero.reset(this.assertSlideId(slideId));
  }

  /**
   * A path parameter is not covered by the body DTO, so it is checked here — an unknown
   * id would otherwise create a row no slide will ever read.
   */
  private assertSlideId(value: string): HeroSlideId {
    if (!(HERO_SLIDE_IDS as readonly string[]).includes(value)) {
      throw new BadRequestException('Diapositive inconnue.');
    }
    return value as HeroSlideId;
  }
}
