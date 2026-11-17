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
import { ServiceDeskService } from './service-desk.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { BulkTicketActionDto } from './dto/bulk-ticket-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

@ApiTags('Service Desk & SLA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/service-desk')
export class ServiceDeskController {
  constructor(private readonly serviceDeskService: ServiceDeskService) {}

  // ─── Tickets ───────────────────────────────────────────────────────────────

  @Get('tickets')
  @Permissions('ticket.view')
  @ApiOperation({ summary: 'List service tickets with filters and SLA status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'category', required: false, enum: TicketCategory })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'assignedToId', required: false, type: String })
  @ApiQuery({ name: 'slaBreached', required: false, type: Boolean })
  async getTickets(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('customerId') customerId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('slaBreached') slaBreached?: string,
  ) {
    return this.serviceDeskService.getTickets(organizationId, {
      page,
      limit,
      search,
      status,
      priority,
      category,
      customerId,
      assignedToId,
      slaBreached: slaBreached === 'true',
    });
  }

  @Post('tickets')
  @Permissions('ticket.create')
  @ApiOperation({ summary: 'Create support ticket with dynamic SLA deadlines' })
  async createTicket(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.serviceDeskService.createTicket(organizationId, dto, actorId);
  }

  @Post('tickets/bulk')
  @Permissions('ticket.update')
  @ApiOperation({ summary: 'Execute bulk operations across multiple tickets (status, priority, assignment)' })
  async bulkUpdateTickets(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: BulkTicketActionDto,
  ) {
    return this.serviceDeskService.bulkUpdateTickets(organizationId, dto, actorId);
  }

  @Get('tickets/:id')
  @Permissions('ticket.view')
  @ApiOperation({ summary: 'Get full ticket details, conversation thread & status audit' })
  async getTicket(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.serviceDeskService.getTicket(organizationId, id);
  }

  @Patch('tickets/:id')
  @Permissions('ticket.update')
  @ApiOperation({ summary: 'Update ticket details or reassign' })
  async updateTicket(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.serviceDeskService.updateTicket(organizationId, id, dto, actorId);
  }

  @Patch('tickets/:id/status')
  @Permissions('ticket.update')
  @ApiOperation({ summary: 'Transition ticket lifecycle state and validate SLA' })
  async changeStatus(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: ChangeTicketStatusDto,
  ) {
    return this.serviceDeskService.changeStatus(organizationId, id, dto, actorId);
  }

  @Post('tickets/:id/comments')
  @Permissions('ticket.update')
  @ApiOperation({ summary: 'Add public response or internal engineering note' })
  async addComment(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
  ) {
    return this.serviceDeskService.addComment(organizationId, id, dto, actorId);
  }

  // ─── SLA Policies ──────────────────────────────────────────────────────────

  @Get('sla-policies')
  @Permissions('ticket.view')
  @ApiOperation({ summary: 'List organization SLA policy definitions' })
  async getSlaPolicies(@CurrentUser('organizationId') organizationId: string) {
    return this.serviceDeskService.getSlaPolicies(organizationId);
  }

  @Post('sla-policies')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Create custom SLA priority policy' })
  async createSlaPolicy(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateSlaPolicyDto,
  ) {
    return this.serviceDeskService.createSlaPolicy(organizationId, dto);
  }
}
