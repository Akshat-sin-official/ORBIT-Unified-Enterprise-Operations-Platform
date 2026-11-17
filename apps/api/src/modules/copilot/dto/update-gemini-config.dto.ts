import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateGeminiConfigDto {
  @ApiProperty({ example: 'AIzaSy...', description: 'Google Gemini API key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
