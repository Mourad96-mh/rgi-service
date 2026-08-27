import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @MaxLength(72, { message: 'Mot de passe trop long.' })
  password!: string;

  @IsString()
  @MinLength(2, { message: 'Le nom est requis.' })
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Matches(/^\+?[0-9 -]{8,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
}
