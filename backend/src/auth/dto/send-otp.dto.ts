import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}
