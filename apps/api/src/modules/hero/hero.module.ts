import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HeroSlideImage, HeroSlideImageSchema } from '../../schemas/hero-slide-image.schema';
import { HeroController } from './hero.controller';
import { HeroService } from './hero.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HeroSlideImage.name, schema: HeroSlideImageSchema }]),
  ],
  controllers: [HeroController],
  providers: [HeroService],
})
export class HeroModule {}
