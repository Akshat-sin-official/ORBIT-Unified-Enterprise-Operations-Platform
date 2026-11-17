import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Laptops & Workstations' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Portable computing and workstations' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'ORBIT-THINK-X1' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'ORBIT ThinkPro X1 Gen 4' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'TX1-4K-2026' })
  @IsString()
  @IsOptional()
  modelNumber?: string;

  @ApiPropertyOptional({ example: '14" 4K OLED Ultrabook with Intel Core Ultra 9' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 24, default: 12 })
  @IsInt()
  @Min(0)
  @IsOptional()
  defaultWarrantyMonths?: number;

  @ApiPropertyOptional({ example: 'UUID of category' })
  @IsString()
  @IsOptional()
  categoryId?: string;
}
