import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { CartValidationResult, CheckoutQuote } from '@rgi/types';
import { Public } from '../../common/decorators/public.decorator';
import { CartService } from './cart.service';
import { QuoteDto, ValidateCartDto } from './dto/cart.dto';

@Controller()
export class CartController {
  constructor(private readonly cart: CartService) {}

  /** Re-price and stock-check the basket the browser is holding (API_SPEC.md §Cart). */
  @Public()
  @HttpCode(200)
  @Post('cart/validate')
  validate(@Body() dto: ValidateCartDto): Promise<CartValidationResult> {
    return this.cart.validate(dto.items);
  }

  /** Shipping cost + total for a basket and a delivery choice. */
  @Public()
  @HttpCode(200)
  @Post('checkout/quote')
  async quote(@Body() dto: QuoteDto): Promise<CheckoutQuote> {
    const priced = await this.cart.priceLines(dto.items);
    return this.cart.quote(CartService.subtotalOf(priced), dto.shipping);
  }
}
