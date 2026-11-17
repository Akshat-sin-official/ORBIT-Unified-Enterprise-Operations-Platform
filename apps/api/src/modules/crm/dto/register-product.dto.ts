import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarrantyCoverageType } from '@prisma/client';

export class RegisterProductDto {
  @ApiProperty({ description: 'ID of customer owning the asset' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'ID of product model' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'SN-THINK-2026-9901' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  purchaseDate: string;

  @ApiPropertyOptional({ example: 'INV-2026-0891' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'Croma Retail / Reliance Digital' })
  @IsString()
  @IsOptional()
  sellerName?: string;

  @ApiPropertyOptional({ enum: WarrantyCoverageType, default: WarrantyCoverageType.STANDARD })
  @IsEnum(WarrantyCoverageType)
  @IsOptional()
  coverageType?: WarrantyCoverageType;

  @ApiPropertyOptional({ example: 24, description: 'Override default product warranty months' })
  @IsOptional()
  warrantyMonths?: number;

  @ApiPropertyOptional({ example: 'Standard manufacturer on-site warranty' })
  @IsString()
  @IsOptional()
  terms?: string;
}
