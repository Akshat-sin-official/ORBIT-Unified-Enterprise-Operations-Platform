import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import {
  ValidateAssignmentDto,
  ScheduleJobDto,
} from './dto/dispatch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Visual Dispatch & Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('board')
  @Permissions('work_order.view')
  @ApiOperation({ summary: 'Get visual dispatch board timeline matrix and unassigned jobs' })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'zone', required: false, type: String })
  async getDispatchBoard(
    @CurrentUser('organizationId') organizationId: string,
    @Query('date') date?: string,
    @Query('zone') zone?: string,
  ) {
    return this.dispatchService.getDispatchBoard(organizationId, { date, zone });
  }

  @Post('validate-assignment')
  @Permissions('work_order.assign')
  @ApiOperation({ summary: 'Validate technician assignment (skills, shift collision, daily quota)' })
  async validateAssignment(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ValidateAssignmentDto,
  ) {
    return this.dispatchService.validateAssignment(organizationId, dto);
  }

  @Post('schedule-job')
  @Permissions('work_order.assign')
  @ApiOperation({ summary: 'Atomic schedule assignment from visual dispatch board' })
  async scheduleJob(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: ScheduleJobDto,
  ) {
    return this.dispatchService.scheduleJob(organizationId, dto, actorId);
  }

  @Get('nearest-technicians')
  @Permissions('work_order.assign')
  @ApiOperation({ summary: 'Calculate top nearest technicians using Haversine algorithm' })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNearestTechnicians(
    @CurrentUser('organizationId') organizationId: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('limit') limit?: number,
  ) {
    return this.dispatchService.getNearestTechnicians(
      organizationId,
      Number(latitude),
      Number(longitude),
      limit ? Number(limit) : 5,
    );
  }
}
