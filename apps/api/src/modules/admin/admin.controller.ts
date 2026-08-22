import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import type { InventoryMovement, Order, Paginated, Product, ProductUsage } from '@rgi/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService, type AdminStats } from './admin.service';
import {
  OrderListQueryDto,
  ProductListQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/admin.dto';

/** Everything here is staff-only; the global JwtAuthGuard + RolesGuard enforce it. */
@Controller('admin')
@Roles('staff')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats(): Promise<AdminStats> {
    return this.admin.stats();
  }

  @Get('products')
  listProducts(@Query() query: ProductListQueryDto): Promise<Paginated<Product>> {
    return this.admin.listProducts(query);
  }

  @Get('products/:id')
  findProduct(@Param('id') id: string): Promise<Product> {
    return this.admin.findProduct(id);
  }

  /** What a product is referenced by — the Produits section asks before offering a delete. */
  @Get('products/:id/usage')
  productUsage(@Param('id') id: string): Promise<ProductUsage> {
    return this.admin.productUsage(id);
  }

  /** Stock movement history for one product — the Stock section. */
  @Get('products/:id/inventory')
  inventory(@Param('id') id: string): Promise<InventoryMovement[]> {
    return this.admin.inventoryMovements(id);
  }

  /**
   * Destroy a product for good, as opposed to `DELETE /products/:id`, which archives.
   *
   * `@Roles('admin')` on the method overrides the controller's class-level `@Roles('staff')`
   * (the guard resolves handler metadata first): ordinary staff archive, only an admin
   * destroys. The service refuses anything with order or build history.
   */
  @Roles('admin')
  @HttpCode(204)
  @Delete('products/:id/permanent')
  deleteProduct(@Param('id') id: string): Promise<void> {
    return this.admin.deleteProductPermanently(id);
  }

  @Get('orders')
  listOrders(@Query() query: OrderListQueryDto): Promise<Paginated<Order>> {
    return this.admin.listOrders(query);
  }

  @Get('orders/:id')
  findOrder(@Param('id') id: string): Promise<Order> {
    return this.admin.findOrder(id);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('userId') userId: string,
  ): Promise<Order> {
    return this.admin.updateOrderStatus(id, dto.status, userId);
  }

  @Patch('orders/:id/payment')
  updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<Order> {
    return this.admin.updatePaymentStatus(id, dto.status, dto.cmiRef);
  }
}
