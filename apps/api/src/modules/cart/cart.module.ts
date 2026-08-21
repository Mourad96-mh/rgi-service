import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ConfiguratorModule } from '../configurator/configurator.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [ProductsModule, ConfiguratorModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
