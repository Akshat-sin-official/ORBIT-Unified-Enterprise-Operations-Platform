import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Quality Assurance Lead' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Responsible for audit and service quality verification', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['service-desk.view', 'field-service.view'], required: false })
  @IsArray()
  @IsOptional()
  permissionCodes?: string[];
}
