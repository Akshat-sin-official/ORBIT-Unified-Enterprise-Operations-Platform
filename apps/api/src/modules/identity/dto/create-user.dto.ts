import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'tech@orbit.local' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'TechUserPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ravi' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+919876543211', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: ['Technician'], required: false })
  @IsArray()
  @IsOptional()
  roleNames?: string[];

  @ApiProperty({ example: 'EMP-001', required: false })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty({ example: 'Senior Field Engineer', required: false })
  @IsString()
  @IsOptional()
  designation?: string;
}
