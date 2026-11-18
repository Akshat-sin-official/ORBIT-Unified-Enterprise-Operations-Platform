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
import { RmaService } from './rma.service';
import {
  RecordPartSwapDto,
  ScanReceiveDto,
  TechnicalAuditDto,
  QueryRmaDto,
} from './dto/rma.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RmaStatus } from '@prisma/client';

@ApiTags('RMA & Reverse Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/rma')
export class RmaController {
  constructor(private readonly rmaService: RmaService) {}

  @Get('list')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List pending and historical serialized defective part exchanges' })
  @ApiQuery({ name: 'status', required: false, enum: RmaStatus })
  @ApiQuery({ name: 'technicianId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRmaList(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: RmaStatus,
    @Query('technicianId') technicianId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.rmaService.getRmaList(organizationId, {
      status,
      technicianId,
      page,
      limit,
    });
  }

  @Post('work-orders/:workOrderId/swap')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Record dual-serial part swap with defective serial out and replacement serial in' })
  async recordPartSwap(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: RecordPartSwapDto,
  ) {
    return this.rmaService.recordPartSwap(organizationId, workOrderId, dto);
  }

  @Patch('scan-receive')
  @Permissions('inventory.update')
  @ApiOperation({ summary: 'Scan incoming defective RMA barcode at central depot/hub' })
  async scanReceive(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ScanReceiveDto,
  ) {
    return this.rmaService.scanReceive(organizationId, dto);
  }

  @Post('audit')
  @Permissions('inventory.update')
  @ApiOperation({ summary: 'Record bench technical inspection (pass/fail) for warranty claim' })
  async performAudit(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: TechnicalAuditDto,
  ) {
    return this.rmaService.performAudit(organizationId, dto);
  }
}
