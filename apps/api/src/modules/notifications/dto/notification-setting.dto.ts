import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNotificationSettingDto {
  @ApiProperty({ example: 'TICKET_CREATED' })
  @IsString()
  category!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  inAppEnabled!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  emailEnabled!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  whatsappEnabled!: boolean;
}

export class BulkUpdateNotificationSettingsDto {
  @ApiProperty({ type: [UpdateNotificationSettingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationSettingDto)
  settings!: UpdateNotificationSettingDto[];
}

export class TestNotificationDto {
  @ApiProperty({ example: 'TICKET_CREATED' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ example: 'admin@enterprise.com' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;
}
