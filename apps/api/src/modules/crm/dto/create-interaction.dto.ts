import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InteractionChannel } from '@prisma/client';

export class CreateCustomerInteractionDto {
  @ApiPropertyOptional({ enum: InteractionChannel, default: InteractionChannel.PORTAL })
  @IsEnum(InteractionChannel)
  @IsOptional()
  channel?: InteractionChannel;

  @ApiProperty({ example: 'Customer inquired about extended warranty coverage' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Shared warranty renewal options for ThinkPro X1. Customer agreed to review.' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
