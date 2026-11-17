import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateSlaPolicyDto {
  @ApiProperty({ example: 'Enterprise 24x7 Critical SLA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Accelerated SLA for enterprise contracts with active warranty' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TicketPriority, example: TicketPriority.P1_CRITICAL })
  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;

  @ApiProperty({ example: 0.5, description: 'Response deadline in hours' })
  @IsNumber()
  @Min(0.1)
  responseHours: number;

  @ApiProperty({ example: 4.0, description: 'Resolution deadline in hours' })
  @IsNumber()
  @Min(0.5)
  resolutionHours: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
