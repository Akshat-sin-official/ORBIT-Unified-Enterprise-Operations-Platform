import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';

export class BulkTicketActionDto {
  @ApiProperty({ description: 'Array of ticket IDs to operate on', type: [String] })
  @IsArray()
  @IsNotEmpty({ each: true })
  ticketIds: string[];

  @ApiProperty({
    description: 'Bulk action to execute',
    enum: ['status', 'priority', 'assign', 'delete'],
  })
  @IsEnum(['status', 'priority', 'assign', 'delete'])
  action: 'status' | 'priority' | 'assign' | 'delete';

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'User ID to assign tickets to' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Reason for bulk action' })
  @IsOptional()
  @IsString()
  reason?: string;
}
