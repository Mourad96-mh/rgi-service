import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { Order, Paginated, Product } from '@rgi/types';
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
