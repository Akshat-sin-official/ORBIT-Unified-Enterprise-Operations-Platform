import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketSource } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Customer UUID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ example: 'Product UUID' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: 'ProductRegistration UUID' })
  @IsString()
  @IsOptional()
  registrationId?: string;

  @ApiProperty({ example: 'Display flickering and blanking intermittently during video calls' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'OLED screen starts flashing with horizontal lines whenever GPU usage spikes.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: TicketCategory, default: TicketCategory.HARDWARE_FAILURE })
  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.P3_MEDIUM })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketSource, default: TicketSource.PORTAL })
  @IsEnum(TicketSource)
  @IsOptional()
  source?: TicketSource;

  @ApiPropertyOptional({ example: 'Assigned User UUID' })
  @IsString()
  @IsOptional()
  assignedToId?: string;
}
