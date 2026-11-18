import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleJobPublicDto {
  @ApiProperty({ description: 'New requested date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  newDate: string;

  @ApiProperty({ description: 'New requested time slot' })
  @IsString()
  @IsNotEmpty()
  newTimeSlot: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateTechnicianLocationDto {
  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiPropertyOptional({ description: 'Estimated minutes to arrival' })
  @IsOptional()
  etaMinutes?: number;
}
