import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'ORBIT Electronics India', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Asia/Kolkata', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;
}
