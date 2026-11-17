import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export class BulkWorkOrderActionDto {
  @ApiProperty({ description: 'Array of work order IDs to operate on', type: [String] })
  @IsArray()
  @IsNotEmpty({ each: true })
  workOrderIds: string[];

  @ApiProperty({
    description: 'Bulk action to execute',
    enum: ['status', 'priority', 'assign'],
  })
  @IsEnum(['status', 'priority', 'assign'])
  action: 'status' | 'priority' | 'assign';

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: WorkOrderPriority })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ description: 'Technician ID to assign work orders to' })
  @IsOptional()
  @IsString()
  technicianId?: string;
}
