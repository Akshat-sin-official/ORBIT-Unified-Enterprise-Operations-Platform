import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  RecordPartSwapDto,
  ScanReceiveDto,
  TechnicalAuditDto,
  QueryRmaDto,
} from './dto/rma.dto';
import { RmaStatus } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class RmaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Record a dual-serial part swap (defective out vs fresh in) during field repair
   */
  async recordPartSwap(
    organizationId: string,
    workOrderId: string,
    dto: RecordPartSwapDto,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
      include: { technician: { include: { user: true } } },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    // Generate unique sequential RMA Barcode (e.g., RMA-2026-0042)
    const count = await this.prisma.serializedPartSwap.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const rmaBarcode = `RMA-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const swap = await this.prisma.serializedPartSwap.create({
      data: {
        organizationId,
        workOrderId: wo.id,
        partId: dto.partId || null,
        defectiveSerialNumber: dto.defectiveSerialNumber.trim().toUpperCase(),
        replacementSerialNumber: dto.replacementSerialNumber.trim().toUpperCase(),
        rmaBarcode,
        rmaStatus: RmaStatus.WITH_TECH,
      },
      include: {
        part: true,
        workOrder: {
          include: {
            technician: { include: { user: true } },
            customer: true,
          },
        },
      },
    });

    return swap;
  }

  /**
   * List pending and historical RMA exchanges
   */
  async getRmaList(organizationId: string, query: QueryRmaDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(query.status ? { rmaStatus: query.status } : {}),
    };

    if (query.technicianId) {
      where.workOrder = { technicianId: query.technicianId };
    }

    const [total, items] = await Promise.all([
      this.prisma.serializedPartSwap.count({ where }),
      this.prisma.serializedPartSwap.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          part: true,
          workOrder: {
            include: {
              technician: { include: { user: true } },
              customer: true,
            },
          },
        },
      }),
    ]);

    // Aggregate status counts
    const statusCounts = await this.prisma.serializedPartSwap.groupBy({
      by: ['rmaStatus'],
      where: { organizationId },
      _count: true,
    });

    const countsMap: Record<string, number> = {};
    statusCounts.forEach((sc) => {
      countsMap[sc.rmaStatus] = sc._count;
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        withTech: countsMap[RmaStatus.WITH_TECH] || 0,
        inTransit: countsMap[RmaStatus.IN_TRANSIT] || 0,
        receivedAtDepot: countsMap[RmaStatus.RECEIVED_AT_DEPOT] || 0,
        auditPassed: countsMap[RmaStatus.AUDIT_PASSED] || 0,
        auditFailed: countsMap[RmaStatus.AUDIT_FAILED] || 0,
      },
    };
  }

  /**
   * Barcode scanner endpoint at Central Depot
   */
  async scanReceive(organizationId: string, dto: ScanReceiveDto) {
    const cleanBarcode = dto.rmaBarcode.trim().toUpperCase();
    const swap = await this.prisma.serializedPartSwap.findFirst({
      where: { organizationId, rmaBarcode: cleanBarcode },
      include: {
        workOrder: { include: { technician: { include: { user: true } } } },
        part: true,
      },
    });

    if (!swap) {
      throw new NotFoundException(`RMA Barcode "${cleanBarcode}" not recognized in database.`);
    }

    if (swap.rmaStatus === RmaStatus.RECEIVED_AT_DEPOT || swap.rmaStatus === RmaStatus.AUDIT_PASSED) {
      return {
        message: `Part swap #${cleanBarcode} is already received and checked in at depot.`,
        swap,
      };
    }

    const updated = await this.prisma.serializedPartSwap.update({
      where: { id: swap.id },
      data: {
        rmaStatus: RmaStatus.RECEIVED_AT_DEPOT,
        receivedAt: new Date(),
      },
      include: {
        part: true,
        workOrder: { include: { technician: { include: { user: true } } } },
      },
    });

    return {
      message: `Defective part #${updated.defectiveSerialNumber} successfully scanned and checked into Central Depot.`,
      swap: updated,
    };
  }

  /**
   * Bench Technical Inspection & Warranty Audit
   */
  async performAudit(organizationId: string, dto: TechnicalAuditDto) {
    const cleanBarcode = dto.rmaBarcode.trim().toUpperCase();
    const swap = await this.prisma.serializedPartSwap.findFirst({
      where: { organizationId, rmaBarcode: cleanBarcode },
      include: {
        workOrder: { include: { technician: { include: { user: true } } } },
        part: true,
      },
    });

    if (!swap) {
      throw new NotFoundException(`RMA Barcode "${cleanBarcode}" not found.`);
    }

    const newStatus = dto.passed ? RmaStatus.AUDIT_PASSED : RmaStatus.AUDIT_FAILED;

    const updated = await this.prisma.serializedPartSwap.update({
      where: { id: swap.id },
      data: {
        rmaStatus: newStatus,
        auditedAt: new Date(),
        auditNotes: dto.auditNotes || (dto.passed ? 'Bench test verified manufacturer defect' : 'Serial mismatch or customer induced physical damage'),
      },
      include: {
        part: true,
        workOrder: { include: { technician: { include: { user: true } } } },
      },
    });

    if (!dto.passed && swap.workOrder.technician?.user) {
      // Alert manager/tech about warranty rejection
      this.notificationService
        .dispatch(organizationId, {
          category: 'WARRANTY_CLAIM_UPDATED',
          title: `RMA Audit Failed: #${swap.rmaBarcode}`,
          message: `Defective part ${swap.defectiveSerialNumber} failed warranty audit: ${dto.auditNotes || 'Rejection confirmed'}. Chargeback evaluation pending.`,
          staffName: `${swap.workOrder.technician.user.firstName} ${swap.workOrder.technician.user.lastName}`,
          staffEmail: swap.workOrder.technician.user.email,
        })
        .catch(() => {});
    }

    return updated;
  }
}
