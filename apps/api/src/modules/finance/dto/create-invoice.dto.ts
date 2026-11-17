import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: '57Wh 4-Cell Li-Polymer Battery Pack' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Spare Part SKU UUID if hardware' })
  @IsString()
  @IsOptional()
  partId?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 4600.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 18.0, default: 18.0 })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isWarrantyCovered?: boolean;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Linked Work Order UUID' })
  @IsString()
  @IsOptional()
  workOrderId?: string;

  @ApiPropertyOptional({ example: '2026-12-01T00:00:00Z' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Payment terms: Net 15 days' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}
