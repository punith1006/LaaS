import { IsEmail } from 'class-validator';

export class CheckEmailDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

