import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProofMediaType } from '@prisma/client';

export class UploadProofMediaDto {
  @ApiProperty({ enum: ProofMediaType })
  @IsEnum(ProofMediaType)
  mediaType: ProofMediaType;

  @ApiPropertyOptional({ description: 'Base64 image or data URL if uploading inline' })
  @IsOptional()
  @IsString()
  fileData?: string;

  @ApiPropertyOptional({ description: 'Latitude where photo was captured' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude where photo was captured' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Timestamp string' })
  @IsOptional()
  @IsString()
  capturedAt?: string;
}

export class UploadSignatureDto {
  @ApiProperty({ description: 'Base64 Canvas drawing data URL' })
  @IsString()
  @IsNotEmpty()
  signatureDataUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  signeeName?: string;
}
