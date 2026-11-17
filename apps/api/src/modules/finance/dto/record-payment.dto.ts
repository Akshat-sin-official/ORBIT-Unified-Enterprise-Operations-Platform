import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @ApiProperty({ example: 2183.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.UPI })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'UPI/20261117/HDFC/998124801' })
  @IsString()
  @IsOptional()
  transactionRef?: string;

  @ApiPropertyOptional({ example: 'Customer paid via Google Pay QR' })
  @IsString()
  @IsOptional()
  notes?: string;
}
