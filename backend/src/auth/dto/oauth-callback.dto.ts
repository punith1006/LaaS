import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty({ message: 'Authorization code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Redirect URI is required' })
  redirectUri: string;
}
