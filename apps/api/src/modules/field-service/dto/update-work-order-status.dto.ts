import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@prisma/client';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatus, example: WorkOrderStatus.ON_SITE })
  @IsEnum(WorkOrderStatus)
  @IsNotEmpty()
  status: WorkOrderStatus;

  @ApiPropertyOptional({ example: 'Arrived at customer premises' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Microscopic fracture observed on right flex cable ribbon' })
  @IsString()
  @IsOptional()
  diagnosisNotes?: string;

  @ApiPropertyOptional({ example: 'Replaced panel with Part #PANEL-OLED-14' })
  @IsString()
  @IsOptional()
  repairResolutionSummary?: string;
}
