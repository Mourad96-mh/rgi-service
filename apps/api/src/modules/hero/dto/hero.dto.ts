import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * `PUT /hero-slides/:slideId` — replace the photo on one carousel slide.
 *
 * The URL is not free text. It is either a Cloudinary asset we minted the signature for,
 * or a catalogue photo already served from `/products`. Anything else — an arbitrary
 * third-party host, a `javascript:` string — is refused here rather than being rendered
 * on the homepage of the shop.
 */
export class SetHeroSlideImageDto {
  @IsString({ message: "L'URL de l'image est obligatoire." })
  @Matches(/^(https:\/\/res\.cloudinary\.com\/[\w./-]+|\/products\/[\w.-]+\.(webp|jpg|jpeg|png|avif))$/i, {
    message:
      "L'image doit être un fichier téléversé sur Cloudinary ou une photo du catalogue (/products/…).",
  })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  publicId?: string;

  @IsString({ message: 'Le texte alternatif est obligatoire.' })
  @MinLength(3, { message: 'Le texte alternatif est trop court.' })
  @MaxLength(180, { message: 'Le texte alternatif est trop long (180 caractères max).' })
  alt!: string;
}
