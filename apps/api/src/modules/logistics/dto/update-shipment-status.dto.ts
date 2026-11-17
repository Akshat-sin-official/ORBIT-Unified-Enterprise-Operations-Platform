import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  @IsNotEmpty()
  status: ShipmentStatus;

  @ApiPropertyOptional({ example: 'Koramangala Hub Checkpoint' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'Arrived at sorting hub, sorted into local delivery route' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Suresh Kumar' })
  @IsString()
  @IsOptional()
  proofOfDeliverySignee?: string;

  @ApiPropertyOptional({ example: 'Signed on technician handheld terminal with verified OTP' })
  @IsString()
  @IsOptional()
  proofOfDeliveryNotes?: string;

  @ApiPropertyOptional({ example: 12.9352 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.6245 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
