import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { UpdateWhatsAppConfigDto } from './dto/update-whatsapp-config.dto';
import { SendTestWhatsAppDto } from './dto/send-test-whatsapp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('WhatsApp Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('config')
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Get WhatsApp gateway configuration and operational status' })
  async getConfig(@CurrentUser('organizationId') organizationId: string) {
    return this.whatsAppService.getConfig(organizationId);
  }

  @Patch('config')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update WhatsApp gateway endpoint, API keys, and notification toggles' })
  async updateConfig(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateWhatsAppConfigDto,
  ) {
    return this.whatsAppService.updateConfig(organizationId, dto);
  }

  @Post('send-test')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Send a live test WhatsApp alert via deployed wa.nakshtraventures.in gateway' })
  async sendTestMessage(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SendTestWhatsAppDto,
  ) {
    return this.whatsAppService.sendTestMessage(organizationId, dto);
  }
}
