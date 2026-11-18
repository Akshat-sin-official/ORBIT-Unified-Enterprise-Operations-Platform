import { Controller, Get, Put, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { BulkUpdateNotificationSettingsDto, TestNotificationDto } from './dto/notification-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications & Dispatch Matrix')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get multi-channel notification matrix preferences for the organization' })
  async getSettings(@CurrentUser('organizationId') organizationId: string) {
    return this.notificationService.getSettings(organizationId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update multi-channel notification matrix preferences' })
  async updateSettings(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: BulkUpdateNotificationSettingsDto,
  ) {
    return this.notificationService.updateSettings(organizationId, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Dispatch a multi-channel test notification across configured channels' })
  async testNotification(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: TestNotificationDto,
  ) {
    return this.notificationService.testNotification(organizationId, dto);
  }

  @Get('in-app')
  @ApiOperation({ summary: 'Get in-app notifications with unread count' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInAppNotifications(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getInAppNotifications(
      organizationId,
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch('in-app/:id/read')
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  async markAsRead(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.markInAppAsRead(organizationId, id);
  }

  @Patch('in-app/read-all')
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  async markAllAsRead(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationService.markAllInAppAsRead(organizationId, userId);
  }
}
