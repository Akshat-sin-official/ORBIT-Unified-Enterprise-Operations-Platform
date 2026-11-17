import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsNumber } from 'class-validator';

export class StockReceiptDto {
  @ApiProperty({ description: 'Destination Warehouse UUID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Part UUID' })
  @IsString()
  @IsNotEmpty()
  partId: string;

  @ApiProperty({ example: 10, description: 'Quantity received' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 6800.0, description: 'Unit cost at receipt' })
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({ example: 'PO-2026-0042', description: 'Purchase order or supplier invoice reference' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Vendor shipment arrived via Blue Dart' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Bin location UUID if known' })
  @IsString()
  @IsOptional()
  binLocationId?: string;
}

export class StockReservationDto {
  @ApiProperty({ description: 'Warehouse UUID where stock is held' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Part UUID' })
  @IsString()
  @IsNotEmpty()
  partId: string;

  @ApiProperty({ example: 1, description: 'Quantity to reserve' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Work Order UUID requiring the part' })
  @IsString()
  @IsOptional()
  workOrderId?: string;

  @ApiPropertyOptional({ example: 'Reserved for critical on-site motherboard swap' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StockIssueDto {
  @ApiProperty({ description: 'Source Warehouse UUID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Part UUID' })
  @IsString()
  @IsNotEmpty()
  partId: string;

  @ApiProperty({ example: 1, description: 'Quantity issued' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Technician UUID receiving the part' })
  @IsString()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Work Order UUID' })
  @IsString()
  @IsOptional()
  workOrderId?: string;

  @ApiPropertyOptional({ example: 'Dispatched to technician van inventory' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StockTransferDto {
  @ApiProperty({ description: 'Source Warehouse UUID' })
  @IsString()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @ApiProperty({ description: 'Destination Warehouse UUID' })
  @IsString()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @ApiProperty({ description: 'Part UUID' })
  @IsString()
  @IsNotEmpty()
  partId: string;

  @ApiProperty({ example: 5, description: 'Quantity to transfer' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'TR-BLR-DEL-2026-01', description: 'Transfer order reference' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Stock balancing transfer for Northern region demand' })
  @IsString()
  @IsOptional()
  notes?: string;
}
