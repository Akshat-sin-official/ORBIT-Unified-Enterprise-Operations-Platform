import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';

export class CreatePartDto {
  @ApiProperty({ example: 'PANEL-OLED-14', description: 'Unique part SKU / number' })
  @IsString()
  @IsNotEmpty()
  partNumber: string;

  @ApiProperty({ example: '14" OLED 2.8K Display Matrix' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Samsung 2.8K 90Hz OLED panel assembly' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 6800.0 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 9800.0 })
  @IsNumber()
  @Min(0)
  retailPrice: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minSafetyStock?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isSerialTracked?: boolean;

  @ApiPropertyOptional({ example: ['THINKPAD-X1-C9', 'YOGA-9I'], type: [String] })
  @IsArray()
  @IsOptional()
  compatibleModels?: string[];
}
