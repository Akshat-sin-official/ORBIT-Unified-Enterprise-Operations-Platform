import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
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

  @Get('status')
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Get WhatsApp line connection status and linked phone' })
  async getStatus(@CurrentUser('organizationId') organizationId: string) {
    return this.whatsAppService.getStatus(organizationId);
  }

  @Post('pair-qr')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Request pairing session and get live QR code for phone scanning' })
  async getPairingQr(@CurrentUser('organizationId') organizationId: string) {
    return this.whatsAppService.getPairingQr(organizationId);
  }

  @Post('disconnect')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Disconnect or unlink active WhatsApp device' })
  async disconnect(@CurrentUser('organizationId') organizationId: string) {
    return this.whatsAppService.disconnect(organizationId);
  }

  @Patch('preferences')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Toggle customer or internal staff WhatsApp alerts' })
  async updatePreferences(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { notifyCustomer?: boolean; notifyStaff?: boolean },
  ) {
    return this.whatsAppService.updatePreferences(organizationId, dto);
  }

  @Post('send-test')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Dispatch a live test WhatsApp notification' })
  async sendTestMessage(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SendTestWhatsAppDto,
  ) {
    const targetPhone = dto.recipientPhone || dto.phoneNumber || '';
    const text = dto.message || dto.customMessage;
    return this.whatsAppService.sendTestMessage(
      organizationId,
      targetPhone,
      text,
    );
  }
}
