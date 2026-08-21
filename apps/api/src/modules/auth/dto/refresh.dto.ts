import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(10, { message: 'Jeton de rafraîchissement invalide.' })
  refreshToken!: string;
}
