import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentType, CarrierType } from '@prisma/client';

export class ShipmentItemInputDto {
  @ApiProperty({ description: 'Part UUID' })
  @IsString()
  @IsNotEmpty()
  partId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  serialNumbers?: string[];
}

export class CreateShipmentDto {
  @ApiPropertyOptional({ enum: ShipmentType, default: ShipmentType.FORWARD_PART_DISPATCH })
  @IsEnum(ShipmentType)
  @IsOptional()
  type?: ShipmentType;

  @ApiPropertyOptional({ enum: CarrierType, default: CarrierType.INTERNAL_FLEET })
  @IsEnum(CarrierType)
  @IsOptional()
  carrier?: CarrierType;

  @ApiPropertyOptional({ description: 'Origin warehouse UUID' })
  @IsString()
  @IsOptional()
  originWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Linked Field Service Work Order UUID' })
  @IsString()
  @IsOptional()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Fleet Vehicle UUID' })
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiProperty({ example: 'Tech Mahindra SEZ, Tower 4, Floor 3' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  destinationCity: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  destinationState: string;

  @ApiProperty({ example: '560100' })
  @IsString()
  @IsNotEmpty()
  destinationPostalCode: string;

  @ApiProperty({ example: 'Vikram Malhotra' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  recipientPhone: string;

  @ApiPropertyOptional({ example: '2026-11-18T18:00:00Z' })
  @IsOptional()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ example: 'Handle with extreme care, fragile OLED display unit' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [ShipmentItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemInputDto)
  @IsOptional()
  items?: ShipmentItemInputDto[];
}
