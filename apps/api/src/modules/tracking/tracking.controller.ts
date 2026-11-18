import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';
import {
  RescheduleJobPublicDto,
  UpdateTechnicianLocationDto,
} from './dto/tracking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customer Live Tracking & Telemetry')
@Controller('v1/tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  // ─── PUBLIC CUSTOMER ENDPOINTS (No Login Required) ──────────────────────────

  @Get('public/:token')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Public endpoint: Get live technician tracking, ETA and job status' })
  async getPublicTrackingInfo(@Param('token') token: string) {
    return this.trackingService.getPublicTrackingInfo(token);
  }

  @Post('public/:token/reschedule')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Public endpoint: Customer self-service appointment rescheduling' })
  async rescheduleFromTracking(
    @Param('token') token: string,
    @Body() dto: RescheduleJobPublicDto,
  ) {
    return this.trackingService.rescheduleFromTracking(token, dto);
  }

  // ─── AUTHENTICATED STAFF ENDPOINTS ──────────────────────────────────────────

  @Get('session/:workOrderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Staff endpoint: Get or generate tracking link for customer SMS/WhatsApp' })
  async getSession(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.trackingService.getOrCreateSession(organizationId, workOrderId);
  }

  @Post('work-orders/:workOrderId/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Technician telemetry: push live GPS coordinates and estimated arrival minutes' })
  async updateTechnicianLocation(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: UpdateTechnicianLocationDto,
  ) {
    return this.trackingService.updateTechnicianLocation(organizationId, workOrderId, dto);
  }
}
