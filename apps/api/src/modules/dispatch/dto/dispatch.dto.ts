import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateAssignmentDto {
  @ApiProperty({ description: 'Work Order ID' })
  @IsString()
  @IsNotEmpty()
  workOrderId: string;

  @ApiProperty({ description: 'Technician ID' })
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @ApiPropertyOptional({ description: 'Scheduled Date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Time Slot (e.g. 10:00 AM - 01:00 PM)' })
  @IsOptional()
  @IsString()
  timeSlot?: string;
}

export class ScheduleJobDto {
  @ApiProperty({ description: 'Work Order ID' })
  @IsString()
  @IsNotEmpty()
  workOrderId: string;

  @ApiProperty({ description: 'Technician ID' })
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @ApiPropertyOptional({ description: 'Scheduled Date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Time Slot' })
  @IsOptional()
  @IsString()
  timeSlot?: string;
}

export class NearestTechQueryDto {
  @ApiProperty({ description: 'Target Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Target Longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Limit results' })
  @IsOptional()
  limit?: number;
}
