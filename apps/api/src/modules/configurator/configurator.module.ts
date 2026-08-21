import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Build, BuildSchema } from '../../schemas/build.schema';
import {
  CompatibilityRule,
  CompatibilityRuleSchema,
} from '../../schemas/compatibility-rule.schema';
import { ProductsModule } from '../products/products.module';
import { ConfiguratorController } from './configurator.controller';
import { ConfiguratorService } from './configurator.service';
import { CompatibilityRulesService } from './compatibility-rules.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Build.name, schema: BuildSchema },
      { name: CompatibilityRule.name, schema: CompatibilityRuleSchema },
    ]),
    ProductsModule,
  ],
  controllers: [ConfiguratorController],
  providers: [ConfiguratorService, CompatibilityRulesService],
  exports: [ConfiguratorService, CompatibilityRulesService, MongooseModule],
})
export class ConfiguratorModule {}
