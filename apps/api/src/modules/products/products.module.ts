import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { InventoryLog, InventoryLogSchema } from '../../schemas/inventory-log.schema';
import { CategoriesModule } from '../categories/categories.module';
import { AttributeDefinitionsModule } from '../attribute-definitions/attribute-definitions.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: InventoryLog.name, schema: InventoryLogSchema },
    ]),
    CategoriesModule,
    AttributeDefinitionsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
