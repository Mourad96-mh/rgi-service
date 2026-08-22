import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { InventoryLog, InventoryLogSchema } from '../../schemas/inventory-log.schema';
import { Build, BuildSchema } from '../../schemas/build.schema';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: InventoryLog.name, schema: InventoryLogSchema },
      // Read-only here: a saved build is one of the three places a product can hide, and
      // the delete guard has to see it.
      { name: Build.name, schema: BuildSchema },
    ]),
    ProductsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
