import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import type { Order } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from '../cart/dto/cart.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Guest checkout is allowed (PROJECT_SPEC.md): the route is public, but when a token is
   * present the order is attached to that customer.
   */
  @Public()
  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('userId') userId?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Order> {
    return this.orders.create(dto, userId, idempotencyKey);
  }

  /** Own order history — requires a session (the global JwtAuthGuard covers it). */
  @Get()
  list(@CurrentUser('userId') userId: string): Promise<Order[]> {
    return this.orders.listForUser(userId);
  }

  @Public()
  @Get(':orderNumber')
  find(
    @Param('orderNumber') orderNumber: string,
    @Query('token') token?: string,
    @CurrentUser('userId') userId?: string,
    @CurrentUser('role') role?: string,
  ): Promise<Order> {
    return this.orders.findByNumber(orderNumber, {
      token,
      userId,
      isStaff: role === 'staff' || role === 'admin',
    });
  }
}
