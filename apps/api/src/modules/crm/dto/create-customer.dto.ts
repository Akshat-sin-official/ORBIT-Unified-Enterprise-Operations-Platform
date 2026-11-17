import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus, CustomerType, AddressType } from '@prisma/client';

export class CustomerAddressDto {
  @ApiPropertyOptional({ enum: AddressType, default: AddressType.SERVICE_SITE })
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;

  @ApiProperty({ example: 'Flat 402, Lotus Towers, MG Road' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsString()
  @IsOptional()
  country?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Aarav Patel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'aarav.patel@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Apex Technologies Pvt Ltd' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.INDIVIDUAL })
  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: 'Key VIP account' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional()
  address?: CustomerAddressDto;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Aarav Patel' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'aarav.patel@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Apex Technologies Pvt Ltd' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
