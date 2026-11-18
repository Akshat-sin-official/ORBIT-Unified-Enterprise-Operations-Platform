import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RmaStatus } from '@prisma/client';

export class RecordPartSwapDto {
  @ApiPropertyOptional({ description: 'Catalog Part ID' })
  @IsOptional()
  @IsString()
  partId?: string;

  @ApiProperty({ description: 'Defective Serial Number removed from appliance' })
  @IsString()
  @IsNotEmpty()
  defectiveSerialNumber: string;

  @ApiProperty({ description: 'Replacement Serial Number installed from stock' })
  @IsString()
  @IsNotEmpty()
  replacementSerialNumber: string;
}

export class ScanReceiveDto {
  @ApiProperty({ description: 'RMA Barcode to scan at central hub' })
  @IsString()
  @IsNotEmpty()
  rmaBarcode: string;
}

export class TechnicalAuditDto {
  @ApiProperty({ description: 'RMA Barcode' })
  @IsString()
  @IsNotEmpty()
  rmaBarcode: string;

  @ApiProperty({ description: 'Audit result: true for passed, false for rejected' })
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional({ description: 'Technical notes or rejection reason' })
  @IsOptional()
  @IsString()
  auditNotes?: string;
}

export class QueryRmaDto {
  @ApiPropertyOptional({ enum: RmaStatus })
  @IsOptional()
  status?: RmaStatus;

  @ApiPropertyOptional()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
