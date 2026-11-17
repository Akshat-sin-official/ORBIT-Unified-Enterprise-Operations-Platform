import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({ example: 'admin@orbit.local', description: 'Destination email address for SMTP test' })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;
}
