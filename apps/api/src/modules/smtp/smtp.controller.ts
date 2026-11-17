import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SmtpService } from './smtp.service';
import { UpdateSmtpConfigDto } from './dto/update-smtp-config.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Settings: SMTP & Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/settings/smtp')
export class SmtpController {
  constructor(private readonly smtpService: SmtpService) {}

  @Get()
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Get current organization SMTP configuration (passwords masked)' })
  async getConfig(@CurrentUser('organizationId') organizationId: string) {
    return this.smtpService.getSmtpConfig(organizationId);
  }

  @Put()
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update organization SMTP mail server credentials' })
  async updateConfig(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateSmtpConfigDto,
  ) {
    return this.smtpService.updateSmtpConfig(organizationId, dto);
  }

  @Post('test')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Verify connection & send a test email via configured SMTP gateway' })
  async sendTestEmail(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.smtpService.sendTestEmail(organizationId, dto);
  }
}
