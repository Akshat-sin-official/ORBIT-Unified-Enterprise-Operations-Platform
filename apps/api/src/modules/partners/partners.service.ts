import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreatePartnerDto,
  CreateRateCardDto,
  GenerateSettlementDto,
  UpdateSettlementStatusDto,
} from './dto/partner.dto';
import {
  PartnerTier,
  PartnerStatus,
  SettlementStatus,
  WorkOrderStatus,
} from '@prisma/client';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new Franchisee or Authorized Service Partner (ASP)
   */
  async createPartner(organizationId: string, dto: CreatePartnerDto) {
    const count = await this.prisma.contractorPartner.count({ where: { organizationId } });
    const partnerCode = `ASP-${(count + 101).toString()}`;

    return this.prisma.contractorPartner.create({
      data: {
        organizationId,
        partnerCode,
        companyName: dto.companyName,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        region: dto.region,
        tier: dto.tier || PartnerTier.SILVER,
        status: PartnerStatus.ACTIVE,
        gstNumber: dto.gstNumber,
        bankAccountInfo: dto.bankAccountInfo || null,
      },
    });
  }

  /**
   * List all contractor partners with stats
   */
  async getPartners(
    organizationId: string,
    params: { search?: string; status?: PartnerStatus; tier?: PartnerTier },
  ) {
    const where: any = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tier ? { tier: params.tier } : {}),
      ...(params.search
        ? {
            OR: [
              { companyName: { contains: params.search, mode: 'insensitive' } },
              { partnerCode: { contains: params.search, mode: 'insensitive' } },
              { region: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const partners = await this.prisma.contractorPartner.findMany({
      where,
      include: {
        rateCards: true,
        settlements: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return partners;
  }

  /**
   * Get single partner with full rate card directory and settlement history
   */
  async getPartner(organizationId: string, id: string) {
    const partner = await this.prisma.contractorPartner.findFirst({
      where: { id, organizationId },
      include: {
        rateCards: true,
        settlements: { orderBy: { periodStart: 'desc' } },
      },
    });

    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  /**
   * Configure Category-wise Labour Rate Card & Incentive Matrix
   */
  async upsertRateCard(
    organizationId: string,
    partnerId: string,
    dto: CreateRateCardDto,
  ) {
    const partner = await this.prisma.contractorPartner.findFirst({
      where: { id: partnerId, organizationId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    return this.prisma.aspRateCard.upsert({
      where: {
        partnerId_productCategory: {
          partnerId,
          productCategory: dto.productCategory,
        },
      },
      update: {
        labourAllowance: dto.labourAllowance,
        tatBonusPercent: dto.tatBonusPercent || 5.0,
        rcrPenaltyPercent: dto.rcrPenaltyPercent || 10.0,
      },
      create: {
        partnerId,
        productCategory: dto.productCategory,
        labourAllowance: dto.labourAllowance,
        tatBonusPercent: dto.tatBonusPercent || 5.0,
        rcrPenaltyPercent: dto.rcrPenaltyPercent || 10.0,
      },
    });
  }

  /**
   * Automated Monthly ASP Settlement Statement Generator
   * Calculates:
   * 1. Gross Labour Earned = sum of category labour allowance for all completed jobs
   * 2. Turnaround Time (TAT) bonus = extra % if closed within 24h of creation
   * 3. Repeat Call Rate (RCR) penalty = deduction if same serial number was repaired within 30 days
   * 4. Net Payable = Gross + TAT Bonus - RCR Penalty
   */
  async generateSettlement(organizationId: string, dto: GenerateSettlementDto) {
    const partner = await this.prisma.contractorPartner.findFirst({
      where: { id: dto.partnerId, organizationId },
      include: { rateCards: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    const start = new Date(dto.periodStart);
    const end = new Date(dto.periodEnd);
    end.setHours(23, 59, 59, 999);

    // Fetch completed work orders in date range
    const completedOrders = await this.prisma.workOrder.findMany({
      where: {
        organizationId,
        status: WorkOrderStatus.COMPLETED,
        completedAt: { gte: start, lte: end },
      },
      include: {
        product: { include: { category: true } },
        ticket: true,
      },
    });

    const count = await this.prisma.aspSettlement.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const settlementNumber = `SETTL-${year}-${(count + 1).toString().padStart(4, '0')}`;

    let grossLabour = 0;
    let totalTatBonus = 0;
    let totalRcrPenalty = 0;
    const lineItems: any[] = [];

    // Fallback default rate if category specific rate card is not configured
    const defaultAllowance = 350;

    for (const wo of completedOrders) {
      const catName = wo.product?.category?.name || 'General Appliance';
      const card = partner.rateCards.find(
        (rc) => rc.productCategory.toLowerCase() === catName.toLowerCase(),
      );

      const allowance = card ? Number(card.labourAllowance) : defaultAllowance;
      const tatBonusPct = card ? Number(card.tatBonusPercent) : 5.0;
      const rcrPenaltyPct = card ? Number(card.rcrPenaltyPercent) : 10.0;

      // Check TAT bonus (completed within 24 hours of creation)
      let tatBonus = 0;
      if (wo.completedAt && wo.createdAt) {
        const hoursToComplete =
          (wo.completedAt.getTime() - wo.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursToComplete <= 24) {
          tatBonus = Math.round((allowance * tatBonusPct) / 100);
        }
      }

      // Check RCR Repeat Call Rate (same product/customer within 30 days)
      let rcrPenalty = 0;
      if (wo.productId || wo.customerId) {
        const thirtyDaysPrior = new Date(wo.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000);
        const priorJob = await this.prisma.workOrder.findFirst({
          where: {
            organizationId,
            id: { not: wo.id },
            status: WorkOrderStatus.COMPLETED,
            createdAt: { gte: thirtyDaysPrior, lt: wo.createdAt },
            OR: [
              ...(wo.productId ? [{ productId: wo.productId }] : []),
              { customerId: wo.customerId },
            ],
          },
        });
        if (priorJob) {
          rcrPenalty = Math.round((allowance * rcrPenaltyPct) / 100);
        }
      }

      const netJobPayout = allowance + tatBonus - rcrPenalty;

      grossLabour += allowance;
      totalTatBonus += tatBonus;
      totalRcrPenalty += rcrPenalty;

      lineItems.push({
        workOrderId: wo.id,
        workOrderNumber: wo.workOrderNumber,
        category: catName,
        labourAllowance: allowance,
        tatBonus,
        rcrPenalty,
        netPayout: netJobPayout,
      });
    }

    const netPayable = grossLabour + totalTatBonus - totalRcrPenalty;

    const settlement = await this.prisma.aspSettlement.create({
      data: {
        organizationId,
        partnerId: partner.id,
        settlementNumber,
        periodStart: start,
        periodEnd: end,
        totalJobsCompleted: completedOrders.length,
        grossLabourEarned: grossLabour,
        tatBonusAmount: totalTatBonus,
        rcrPenaltyAmount: totalRcrPenalty,
        netPayable,
        status: SettlementStatus.DRAFT,
        notes: dto.notes,
        lineItems,
      },
      include: { partner: true },
    });

    return settlement;
  }

  /**
   * Update settlement audit state (Approve / Mark Paid)
   */
  async updateSettlementStatus(
    organizationId: string,
    settlementId: string,
    dto: UpdateSettlementStatusDto,
    actorId?: string,
  ) {
    const settlement = await this.prisma.aspSettlement.findFirst({
      where: { id: settlementId, organizationId },
    });
    if (!settlement) throw new NotFoundException('Settlement statement not found');

    return this.prisma.aspSettlement.update({
      where: { id: settlement.id },
      data: {
        status: dto.status,
        ...(dto.status === SettlementStatus.APPROVED ? { approvedById: actorId, approvedAt: new Date() } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
      include: { partner: true },
    });
  }
}
