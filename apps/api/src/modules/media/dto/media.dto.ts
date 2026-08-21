import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min, MaxLength } from 'class-validator';

/** `POST /media/attach` — record an uploaded asset against a product. */
export class AttachMediaDto {
  @IsString({ message: 'Le produit est obligatoire.' })
  productId!: string;

  @IsUrl({ require_tld: false }, { message: "L'URL de l'image est invalide." })
  url!: string;

  @IsString({ message: "L'identifiant Cloudinary est obligatoire." })
  publicId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180, { message: 'Le texte alternatif est trop long (180 caractères max).' })
  alt?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
