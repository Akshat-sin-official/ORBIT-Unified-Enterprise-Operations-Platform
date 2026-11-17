import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Ravi', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Sharma', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+919876543211', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], required: false })
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
