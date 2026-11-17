import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ShipmentStatus, ShipmentType } from '@prisma/client';

@ApiTags('Logistics & Fleet Dispatch')
@Controller('v1/logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  // ─── Summary ───────────────────────────────────────────────────────────────

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.view')
  @ApiOperation({ summary: 'Get logistics metrics (active shipments, in-transit, delivered, fleet)' })
  async getSummary(@CurrentUser('organizationId') organizationId: string) {
    return this.logisticsService.getLogisticsSummary(organizationId);
  }

  // ─── Shipments ─────────────────────────────────────────────────────────────

  @Get('shipments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.view')
  @ApiOperation({ summary: 'List shipments with status, type, and tracking search filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ShipmentStatus })
  @ApiQuery({ name: 'type', required: false, enum: ShipmentType })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'workOrderId', required: false, type: String })
  async getShipments(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ShipmentStatus,
    @Query('type') type?: ShipmentType,
    @Query('search') search?: string,
    @Query('workOrderId') workOrderId?: string,
  ) {
    return this.logisticsService.getShipments(organizationId, {
      page,
      limit,
      status,
      type,
      search,
      workOrderId,
    });
  }

  @Post('shipments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.create')
  @ApiOperation({ summary: 'Create and schedule a new shipment dispatch' })
  async createShipment(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.logisticsService.createShipment(organizationId, dto);
  }

  @Post('shipments/bulk')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.update')
  @ApiOperation({ summary: 'Execute bulk shipment updates (status, carrier)' })
  async bulkUpdateShipments(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { shipmentIds: string[]; action: 'status' | 'carrier'; status?: ShipmentStatus; carrier?: string },
  ) {
    return this.logisticsService.bulkUpdateShipments(organizationId, dto);
  }

  @Get('shipments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.view')
  @ApiOperation({ summary: 'Get shipment details with full checkpoint tracking timeline' })
  async getShipment(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.logisticsService.getShipment(organizationId, id);
  }

  @Patch('shipments/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.track')
  @ApiOperation({ summary: 'Update shipment status and append checkpoint tracking event' })
  async updateStatus(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.logisticsService.updateShipmentStatus(organizationId, id, dto);
  }

  // ─── Fleet Vehicles ────────────────────────────────────────────────────────

  @Get('vehicles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.view')
  @ApiOperation({ summary: 'List all organization fleet vehicles and service vans' })
  async getVehicles(@CurrentUser('organizationId') organizationId: string) {
    return this.logisticsService.getVehicles(organizationId);
  }

  @Post('vehicles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('shipment.create')
  @ApiOperation({ summary: 'Register a new service van or delivery truck' })
  async createVehicle(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.logisticsService.createVehicle(organizationId, dto);
  }

  // ─── Public / Open Tracking Endpoint ───────────────────────────────────────

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track shipment status by public tracking number' })
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.logisticsService.getShipmentByTrackingNumber(trackingNumber);
  }
}
