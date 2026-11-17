import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { WarehouseType } from '@prisma/client';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-BLR-02', description: 'Unique warehouse code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Electronic City Regional Depot', description: 'Warehouse display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: WarehouseType, default: WarehouseType.REGIONAL_DEPOT })
  @IsEnum(WarehouseType)
  @IsOptional()
  type?: WarehouseType;

  @ApiProperty({ example: 'Plot 42, Electronic City Phase 1' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560100' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
