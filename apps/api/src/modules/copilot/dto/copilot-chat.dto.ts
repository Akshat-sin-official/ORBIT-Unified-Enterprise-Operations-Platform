import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'user', enum: ['user', 'assistant', 'model'] })
  @IsString()
  role: string;

  @ApiProperty({ example: 'What are the open critical tickets?' })
  @IsString()
  content: string;
}

export class CopilotChatDto {
  @ApiProperty({ example: 'Summarize today\'s operational status and recommend actions for open P1 incidents.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [ChatMessageDto] })
  @IsArray()
  @IsOptional()
  history?: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'Specific Ticket UUID for focused diagnosis or reply generation' })
  @IsString()
  @IsOptional()
  ticketId?: string;

  @ApiPropertyOptional({ description: 'Specific Work Order UUID for focused field service assistance' })
  @IsString()
  @IsOptional()
  workOrderId?: string;
}
