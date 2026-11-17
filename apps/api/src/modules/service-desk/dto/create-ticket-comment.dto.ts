import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketCommentDto {
  @ApiProperty({ example: 'Customer called confirming they are available tomorrow at 10 AM.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'True for internal agent note; false for customer visible reply' })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
