import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTestWhatsAppDto {
  @ApiProperty({ example: '+919876543210', description: 'Destination mobile number with or without country code' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Test message from ORBIT Operations Platform' })
  @IsString()
  @IsOptional()
  customMessage?: string;
}
