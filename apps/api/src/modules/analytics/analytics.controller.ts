import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Operational Analytics & Management KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('executive')
  @Permissions('analytics.view')
  @ApiOperation({ summary: 'Get unified executive dashboard metrics (SLA compliance, MTTR, FTFR, CSAT, Valuation)' })
  async getExecutiveKPIs(@CurrentUser('organizationId') organizationId: string) {
    return this.analyticsService.getExecutiveKPIs(organizationId);
  }
}
