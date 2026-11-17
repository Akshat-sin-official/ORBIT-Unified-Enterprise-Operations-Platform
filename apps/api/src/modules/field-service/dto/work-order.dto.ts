import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority } from '@prisma/client';

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'Customer UUID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ example: 'Customer Address UUID' })
  @IsString()
  @IsOptional()
  customerAddressId?: string;

  @ApiPropertyOptional({ example: 'Ticket UUID' })
  @IsString()
  @IsOptional()
  ticketId?: string;

  @ApiPropertyOptional({ example: 'Product UUID' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ example: 'ProductRegistration UUID' })
  @IsString()
  @IsOptional()
  registrationId?: string;

  @ApiPropertyOptional({ example: 'Technician UUID' })
  @IsString()
  @IsOptional()
  technicianId?: string;

  @ApiProperty({ example: 'On-site 4K OLED Panel Diagnostic & Display Cable Replacement' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Replace flickering OLED screen panel assembly under active manufacturer warranty.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority, default: WorkOrderPriority.MEDIUM })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ example: '2026-11-18T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '10:00 AM - 01:00 PM' })
  @IsString()
  @IsOptional()
  timeSlot?: string;
}

export class AssignWorkOrderDto {
  @ApiProperty({ description: 'Technician profile ID' })
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @ApiPropertyOptional({ example: '2026-11-18T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '10:00 AM - 01:00 PM' })
  @IsString()
  @IsOptional()
  timeSlot?: string;
}

export class AddPartUsedDto {
  @ApiProperty({ example: 'PANEL-OLED-14' })
  @IsString()
  @IsNotEmpty()
  partNumber: string;

  @ApiProperty({ example: '14" 2.8K OLED Display Matrix Assembly' })
  @IsString()
  @IsNotEmpty()
  partName: string;

  @ApiPropertyOptional({ example: 'PART-SN-99812' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 14500.0 })
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  warrantyCovered?: boolean;
}

export class VerifyOtpCompleteDto {
  @ApiProperty({ example: '882104', description: '6-digit OTP provided by customer at service site' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({ example: 5, description: 'Customer satisfaction rating from 1 to 5' })
  @IsOptional()
  customerFeedbackRating?: number;

  @ApiPropertyOptional({ example: 'Screen replaced perfectly, technician was very professional' })
  @IsString()
  @IsOptional()
  customerFeedbackNotes?: string;

  @ApiPropertyOptional({ example: 'OLED panel ribbon replaced. Display stress tested with 4K video for 15 mins without flicker.' })
  @IsString()
  @IsOptional()
  repairResolutionSummary?: string;
}
