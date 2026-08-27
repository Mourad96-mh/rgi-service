import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  ArrayNotEmpty,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { PaymentMethod, ShippingMethod, SlotId } from '@rgi/types';

/** A cart line as the client describes it: ids and quantities only, never prices. */
export class CartLineDto {
  @IsIn(['product', 'build'], { message: 'Type de ligne invalide.' })
  kind!: 'product' | 'build';

  @IsOptional()
  @IsString({ message: 'Produit invalide.' })
  productId?: string;

  @IsOptional()
  @IsObject({ message: 'Configuration invalide.' })
  buildSelection?: Partial<Record<SlotId, string | string[]>>;

  @IsInt({ message: 'Quantité invalide.' })
  @Min(1, { message: 'La quantité doit être d’au moins 1.' })
  @Max(20, { message: 'Quantité maximale : 20.' })
  quantity!: number;
}

export class ValidateCartDto {
  @ArrayNotEmpty({ message: 'Le panier est vide.' })
  @ArrayMaxSize(50, { message: 'Trop d’articles dans le panier.' })
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  items!: CartLineDto[];
}

export class ShippingInputDto {
  @IsIn(['delivery', 'pickup'], { message: 'Mode de livraison invalide.' })
  method!: ShippingMethod;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;
}

/**
 * `@IsDefined()` is not decoration. `@ValidateNested()` alone skips a value that is
 * `undefined`, so an omitted block passed validation and the service then dereferenced it
 * — `POST /checkout/quote` and `POST /orders` answered 500 « Une erreur interne est
 * survenue » instead of a French 400. Sending the same key as `null` was always rejected
 * correctly, which is what kept it hidden.
 */
export class QuoteDto extends ValidateCartDto {
  @IsDefined({ message: 'Le mode de livraison est requis.' })
  @ValidateNested()
  @Type(() => ShippingInputDto)
  shipping!: ShippingInputDto;
}

export class ContactDto {
  @IsString()
  @MinLength(3, { message: 'Nom trop court.' })
  @MaxLength(80)
  name!: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email!: string;

  /** Moroccan mobile numbers, written the way customers actually type them. */
  @IsString()
  @MinLength(9, { message: 'Numéro de téléphone invalide.' })
  @MaxLength(20, { message: 'Numéro de téléphone invalide.' })
  phone!: string;
}

export class AddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsString()
  @MinLength(5, { message: 'Adresse trop courte.' })
  @MaxLength(160)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @MinLength(2, { message: 'Ville invalide.' })
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @MinLength(9, { message: 'Numéro de téléphone invalide.' })
  @MaxLength(20)
  phone!: string;

  /** Only meaningful on a saved user address; an order address is a snapshot. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class OrderShippingDto extends ShippingInputDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

export class PaymentDto {
  @IsIn(['cod', 'cmi'], { message: 'Moyen de paiement invalide.' })
  method!: PaymentMethod;
}

export class CreateOrderDto extends ValidateCartDto {
  // See QuoteDto above for why each block needs @IsDefined(). `contact` matters most: it is
  // read *after* nextOrderNumber(), so omitting it burned a real number out of the
  // RGI-2026-… sequence before failing.
  @IsDefined({ message: 'Les coordonnées du client sont requises.' })
  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;

  @IsDefined({ message: 'Le mode de livraison est requis.' })
  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping!: OrderShippingDto;

  @IsDefined({ message: 'Le moyen de paiement est requis.' })
  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
