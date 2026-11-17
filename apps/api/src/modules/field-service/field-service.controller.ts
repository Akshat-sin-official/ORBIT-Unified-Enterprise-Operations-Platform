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
import { FieldServiceService } from './field-service.service';
import {
  CreateWorkOrderDto,
  AssignWorkOrderDto,
  AddPartUsedDto,
  VerifyOtpCompleteDto,
} from './dto/work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { BulkWorkOrderActionDto } from './dto/bulk-work-order-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

@ApiTags('Field Service & Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/field-service')
export class FieldServiceController {
  constructor(private readonly fieldService: FieldServiceService) {}

  // ─── Work Orders ───────────────────────────────────────────────────────────

  @Get('work-orders')
  @Permissions('work_order.view')
  @ApiOperation({ summary: 'List work orders with status, priority, and technician filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: WorkOrderStatus })
  @ApiQuery({ name: 'priority', required: false, enum: WorkOrderPriority })
  @ApiQuery({ name: 'technicianId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getWorkOrders(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: WorkOrderStatus,
    @Query('priority') priority?: WorkOrderPriority,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.fieldService.getWorkOrders(organizationId, {
      page,
      limit,
      search,
      status,
      priority,
      technicianId,
      customerId,
    });
  }

  @Post('work-orders')
  @Permissions('work_order.create')
  @ApiOperation({ summary: 'Create field service work order with customer OTP' })
  async createWorkOrder(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.fieldService.createWorkOrder(organizationId, dto, actorId);
  }

  @Post('work-orders/bulk')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Execute bulk operations across multiple work orders (status, priority, technician)' })
  async bulkUpdateWorkOrders(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: BulkWorkOrderActionDto,
  ) {
    return this.fieldService.bulkUpdateWorkOrders(organizationId, dto, actorId);
  }

  @Get('work-orders/:id')
  @Permissions('work_order.view')
  @ApiOperation({ summary: 'Get full work order lifecycle details, parts used & audit' })
  async getWorkOrder(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.fieldService.getWorkOrder(organizationId, id);
  }

  @Get('work-orders/:id/recommendations')
  @Permissions('work_order.assign')
  @ApiOperation({ summary: 'Get AI/algorithmic technician assignment rankings and scores' })
  async recommendTechnicians(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.fieldService.recommendTechnicians(organizationId, id);
  }

  @Patch('work-orders/:id/assign')
  @Permissions('work_order.assign')
  @ApiOperation({ summary: 'Assign work order to technician with scheduled date/time' })
  async assignTechnician(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: AssignWorkOrderDto,
  ) {
    return this.fieldService.assignTechnician(organizationId, id, dto, actorId);
  }

  @Patch('work-orders/:id/status')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Progress service visit state (Accept, Travel, On-Site, Repair)' })
  async updateStatus(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.fieldService.updateStatus(organizationId, id, dto, actorId);
  }

  @Post('work-orders/:id/parts')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Record spare parts consumed during repair' })
  async addPartUsed(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: AddPartUsedDto,
  ) {
    return this.fieldService.addPartUsed(organizationId, id, dto);
  }

  @Post('work-orders/:id/complete')
  @Permissions('work_order.complete')
  @ApiOperation({ summary: 'Verify customer OTP, record signoff & complete work order' })
  async completeWorkOrder(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: VerifyOtpCompleteDto,
  ) {
    return this.fieldService.verifyOtpAndComplete(organizationId, id, dto, actorId);
  }

  // ─── Technicians ───────────────────────────────────────────────────────────

  @Get('technicians')
  @Permissions('work_order.view')
  @ApiOperation({ summary: 'List organization field technicians with skills, zone & load' })
  async getTechnicians(@CurrentUser('organizationId') organizationId: string) {
    return this.fieldService.getTechnicians(organizationId);
  }
}
