import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ example: ['role-uuid-1', 'role-uuid-2'] })
  @IsArray()
  @IsNotEmpty()
  roleIds: string[];
}
