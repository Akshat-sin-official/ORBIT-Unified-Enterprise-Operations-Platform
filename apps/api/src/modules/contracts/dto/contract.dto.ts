import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus } from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Product Serial Number' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ enum: ContractType, default: ContractType.BASIC_AMC })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiProperty({ description: 'Contract start date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Contract end date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: 'Number of included preventive maintenance visits', default: 4 })
  @IsOptional()
  @IsNumber()
  visitsIncluded?: number;

  @ApiPropertyOptional({ description: 'Interval in days between visits (e.g. 90 for quarterly)', default: 90 })
  @IsOptional()
  @IsNumber()
  visitIntervalDays?: number;

  @ApiPropertyOptional({ description: 'Contract fee paid', default: 0 })
  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @ApiPropertyOptional({ description: 'Contract terms or notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryContractDto {
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
