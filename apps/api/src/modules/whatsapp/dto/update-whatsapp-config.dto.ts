import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWhatsAppConfigDto {
  @ApiPropertyOptional({ example: 'https://nakshtraventures.in/wa-api' })
  @IsString()
  @IsOptional()
  apiUrl?: string;

  @ApiPropertyOptional({ example: '429683C4C977415CAAFCCE10F7D57E11' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'default' })
  @IsString()
  @IsOptional()
  sessionName?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  notifyCustomer?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  notifyStaff?: boolean;
}
