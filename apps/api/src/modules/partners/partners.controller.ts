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
import { PartnersService } from './partners.service';
import {
  CreatePartnerDto,
  CreateRateCardDto,
  GenerateSettlementDto,
  UpdateSettlementStatusDto,
} from './dto/partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PartnerStatus, PartnerTier } from '@prisma/client';

@ApiTags('Franchisee & ASP Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Register new Franchisee / Authorized Service Partner' })
  async createPartner(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreatePartnerDto,
  ) {
    return this.partnersService.createPartner(organizationId, dto);
  }

  @Get()
  @Permissions('organization.view')
  @ApiOperation({ summary: 'List contractor partners with tier, region, and settlement summaries' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PartnerStatus })
  @ApiQuery({ name: 'tier', required: false, enum: PartnerTier })
  async getPartners(
    @CurrentUser('organizationId') organizationId: string,
    @Query('search') search?: string,
    @Query('status') status?: PartnerStatus,
    @Query('tier') tier?: PartnerTier,
  ) {
    return this.partnersService.getPartners(organizationId, { search, status, tier });
  }

  @Get(':id')
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Get partner details, category rate cards, and settlement history' })
  async getPartner(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.partnersService.getPartner(organizationId, id);
  }

  @Post(':id/rate-card')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Upsert category labour allowance, TAT bonus %, and RCR penalty %' })
  async upsertRateCard(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: CreateRateCardDto,
  ) {
    return this.partnersService.upsertRateCard(organizationId, id, dto);
  }

  @Post('settlements/generate')
  @Permissions('invoice.create')
  @ApiOperation({ summary: 'Calculate and generate monthly billing settlement statement with TAT and RCR metrics' })
  async generateSettlement(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: GenerateSettlementDto,
  ) {
    return this.partnersService.generateSettlement(organizationId, dto);
  }

  @Patch('settlements/:settlementId/status')
  @Permissions('invoice.update')
  @ApiOperation({ summary: 'Approve or mark paid an ASP partner settlement statement' })
  async updateSettlementStatus(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('settlementId') settlementId: string,
    @Body() dto: UpdateSettlementStatusDto,
  ) {
    return this.partnersService.updateSettlementStatus(organizationId, settlementId, dto, actorId);
  }
}
