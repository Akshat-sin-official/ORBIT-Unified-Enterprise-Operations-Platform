import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CopilotService } from './copilot.service';
import { CopilotChatDto } from './dto/copilot-chat.dto';
import { UpdateGeminiConfigDto } from './dto/update-gemini-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('AI Copilot (Gemini API)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send message to ORBIT Operations Copilot powered by Google Gemini API' })
  async chat(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CopilotChatDto,
  ) {
    return this.copilotService.chat(organizationId, userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get recent conversation history with Copilot' })
  async getHistory(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.copilotService.getHistory(organizationId, userId);
  }

  @Delete('history')
  @ApiOperation({ summary: 'Clear Copilot conversation history' })
  async clearHistory(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.copilotService.clearHistory(organizationId, userId);
  }

  @Get('config')
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Check Gemini API configuration status' })
  async getConfig(@CurrentUser('organizationId') organizationId: string) {
    return this.copilotService.getGeminiConfig(organizationId);
  }

  @Put('config')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update organization Google Gemini API key' })
  async updateConfig(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateGeminiConfigDto,
  ) {
    return this.copilotService.updateGeminiConfig(organizationId, dto);
  }
}
