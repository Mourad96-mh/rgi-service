import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from '../../cart/dto/cart.dto';

/**
 * What a customer may change about themselves.
 *
 * **Not the e-mail**, deliberately: it is the login identifier and there is no mail service
 * in this project, so a change could not be verified and a typo would lock the account out
 * with no way back. Not the role or `isActive` either — those are staff decisions and live
 * behind the admin routes.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom est requis.' })
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Matches(/^\+?[0-9 -]{8,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
}

/** More than this is an address book nobody scrolls, and an unbounded array in a document. */
export const MAX_ADDRESSES = 5;

/**
 * The address book is replaced wholesale rather than patched entry by entry.
 *
 * The saved addresses are a fixed-size list owned by exactly one person, who edits them
 * from one screen. Per-entry routes would need stable ids, which the embedded `Address`
 * schema deliberately does not have (`_id: false`), and index-addressed routes break the
 * moment a delete shifts the list under a second tab. Sending the whole list makes
 * last-write-wins explicit, which is what a single user editing their own book expects.
 */
export class UpdateAddressesDto {
  @IsArray()
  @ArrayMaxSize(MAX_ADDRESSES, {
    message: `Vous ne pouvez enregistrer que ${MAX_ADDRESSES} adresses.`,
  })
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses!: AddressDto[];
}
