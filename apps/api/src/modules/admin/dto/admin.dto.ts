import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { OrderStatus, PaymentStatus } from '@rgi/types';

export class OrderListQueryDto {
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'], {
    message: 'Statut de commande inconnu.',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['pending', 'paid', 'failed', 'refunded'], { message: 'Statut de paiement inconnu.' })
  paymentStatus?: PaymentStatus;

  /** Order number, customer name, e-mail or phone. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page invalide.' })
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite invalide.' })
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'], {
    message: 'Statut de commande inconnu.',
  })
  status!: OrderStatus;
}

export class UpdatePaymentStatusDto {
  @IsIn(['pending', 'paid', 'failed', 'refunded'], { message: 'Statut de paiement inconnu.' })
  status!: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cmiRef?: string;
}

export class ProductListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsIn(['active', 'draft', 'archived'], { message: 'Statut de produit inconnu.' })
  status?: 'active' | 'draft' | 'archived';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page invalide.' })
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite invalide.' })
  @Min(1)
  @Max(100)
  limit?: number;
}
