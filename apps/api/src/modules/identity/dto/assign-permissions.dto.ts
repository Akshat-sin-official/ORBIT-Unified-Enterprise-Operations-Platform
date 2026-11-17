import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ example: ['ticket.create', 'ticket.view', 'ticket.update'] })
  @IsArray()
  @IsNotEmpty()
  permissionCodes: string[];
}
