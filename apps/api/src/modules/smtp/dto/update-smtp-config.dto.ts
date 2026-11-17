import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, Max, IsEmail } from 'class-validator';

export class UpdateSmtpConfigDto {
  @ApiProperty({ example: 'smtp.gmail.com', description: 'SMTP mail server host' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ example: 587, description: 'SMTP port (587 for TLS, 465 for SSL)' })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiPropertyOptional({ default: false, description: 'True for 465 (SSL), false for 587 (STARTTLS)' })
  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @ApiPropertyOptional({ example: 'notifications@orbit.io', description: 'SMTP login username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'app-specific-password-or-secret', description: 'SMTP login password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'no-reply@orbit.io', description: 'Sender email address' })
  @IsEmail()
  @IsNotEmpty()
  fromEmail: string;

  @ApiPropertyOptional({ example: 'ORBIT Enterprise Operations', description: 'Sender display name' })
  @IsString()
  @IsOptional()
  fromName?: string;
}
