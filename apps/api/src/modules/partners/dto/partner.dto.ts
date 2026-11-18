import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartnerTier, PartnerStatus, SettlementStatus } from '@prisma/client';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Contractor / Partner Company Name' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Primary Contact Person Name' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ description: 'Official Email' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contact Phone Number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Service Region / Territory' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiPropertyOptional({ enum: PartnerTier, default: PartnerTier.SILVER })
  @IsOptional()
  @IsEnum(PartnerTier)
  tier?: PartnerTier;

  @ApiPropertyOptional({ description: 'GST Registration Number' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'Bank Details (account number, IFSC, bank name)' })
  @IsOptional()
  bankAccountInfo?: any;
}

export class CreateRateCardDto {
  @ApiProperty({ description: 'Product Category (e.g. Air Conditioners, Refrigerators)' })
  @IsString()
  @IsNotEmpty()
  productCategory: string;

  @ApiProperty({ description: 'Standard Labour Allowance per completed repair' })
  @IsNumber()
  labourAllowance: number;

  @ApiPropertyOptional({ description: 'Turnaround Time (TAT) speed bonus percentage', default: 5.0 })
  @IsOptional()
  @IsNumber()
  tatBonusPercent?: number;

  @ApiPropertyOptional({ description: 'Repeat Call Rate (RCR) penalty percentage on rework', default: 10.0 })
  @IsOptional()
  @IsNumber()
  rcrPenaltyPercent?: number;
}

export class GenerateSettlementDto {
  @ApiProperty({ description: 'Partner ID' })
  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @ApiProperty({ description: 'Settlement Billing Period Start (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({ description: 'Settlement Billing Period End (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Notes or adjustments' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSettlementStatusDto {
  @ApiProperty({ enum: SettlementStatus })
  @IsEnum(SettlementStatus)
  status: SettlementStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
