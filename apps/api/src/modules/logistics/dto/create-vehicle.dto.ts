import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: 'KA-01-EQ-9082' })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({ example: 'Tata Ace EV Rapid Service Van' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional({ enum: VehicleType, default: VehicleType.VAN })
  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: 850, default: 500 })
  @IsInt()
  @Min(50)
  @IsOptional()
  capacityKg?: number;

  @ApiPropertyOptional({ example: 'Suresh Gowda' })
  @IsString()
  @IsOptional()
  currentDriverName?: string;

  @ApiPropertyOptional({ example: '+919876543110' })
  @IsString()
  @IsOptional()
  currentDriverPhone?: string;
}
