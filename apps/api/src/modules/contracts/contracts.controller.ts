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
import { ContractsService } from './contracts.service';
import { CreateContractDto, QueryContractDto } from './dto/contract.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ContractStatus } from '@prisma/client';

@ApiTags('Service Contracts & AMC/CMC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Permissions('warranty.create')
  @ApiOperation({ summary: 'Create Annual Maintenance Contract and auto-generate visit schedules' })
  async createContract(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.createContract(organizationId, dto);
  }

  @Get()
  @Permissions('warranty.view')
  @ApiOperation({ summary: 'List contracts with search, status filters and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ContractStatus })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getContracts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: ContractStatus,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contractsService.getContracts(organizationId, {
      status,
      customerId,
      search,
      page,
      limit,
    });
  }

  @Get('schedules/upcoming')
  @Permissions('warranty.view')
  @ApiOperation({ summary: 'List upcoming preventive maintenance schedules due within N days' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  async getUpcomingSchedules(
    @CurrentUser('organizationId') organizationId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.contractsService.getUpcomingSchedules(
      organizationId,
      daysAhead ? Number(daysAhead) : 14,
    );
  }

  @Get(':id')
  @Permissions('warranty.view')
  @ApiOperation({ summary: 'Get single contract with all scheduled visit milestones' })
  async getContract(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.getContract(organizationId, id);
  }

  @Post('schedules/:scheduleId/generate-wo')
  @Permissions('work_order.create')
  @ApiOperation({ summary: 'Instantiate a preventive maintenance Work Order for a scheduled milestone' })
  async generateWorkOrder(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.contractsService.generatePreventiveWorkOrder(organizationId, scheduleId, actorId);
  }

  @Patch('schedules/:scheduleId/complete')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Mark a scheduled preventive visit as completed' })
  async markScheduleCompleted(
    @CurrentUser('organizationId') organizationId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.contractsService.markScheduleCompleted(organizationId, scheduleId);
  }
}
