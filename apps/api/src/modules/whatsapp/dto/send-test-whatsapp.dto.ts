import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendTestWhatsAppDto {
  @ApiPropertyOptional({ example: '919876543210', description: 'Destination mobile number with country code' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '919876543210', description: 'Destination mobile number (alias)' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'Test message from ORBIT Operations Platform' })
  @IsString()
  @IsOptional()
  customMessage?: string;

  @ApiPropertyOptional({ example: 'Test message from ORBIT Operations Platform' })
  @IsString()
  @IsOptional()
  message?: string;
}
