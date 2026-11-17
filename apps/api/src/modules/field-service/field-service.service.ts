import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  CreateWorkOrderDto,
  AssignWorkOrderDto,
  AddPartUsedDto,
  VerifyOtpCompleteDto,
} from './dto/work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { BulkWorkOrderActionDto } from './dto/bulk-work-order-action.dto';
import {
  WorkOrderPriority,
  WorkOrderStatus,
  TechnicianStatus,
  WarrantyStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class FieldServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ─── Work Orders ───────────────────────────────────────────────────────────

  async getWorkOrders(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: WorkOrderStatus;
      priority?: WorkOrderPriority;
      technicianId?: string;
      customerId?: string;
      date?: string;
    },
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.technicianId ? { technicianId: params.technicianId } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.search
        ? {
            OR: [
              { workOrderNumber: { contains: params.search, mode: 'insensitive' } },
              { title: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { customer: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: true,
          customerAddress: true,
          product: true,
          registration: {
            include: { warranty: true },
          },
          technician: {
            include: { user: true },
          },
          ticket: true,
          _count: {
            select: { partsUsed: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkOrder(organizationId: string, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
          include: { addresses: true },
        },
        customerAddress: true,
        product: {
          include: { category: true },
        },
        registration: {
          include: { warranty: true },
        },
        ticket: {
          include: { slaPolicy: true },
        },
        technician: {
          include: { user: true },
        },
        partsUsed: true,
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return workOrder;
  }

  async createWorkOrder(organizationId: string, dto: CreateWorkOrderDto, actorId?: string) {
    // 1. Verify customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
      include: { addresses: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    // Default to customer primary address if not explicitly passed
    let addressId = dto.customerAddressId;
    if (!addressId && customer.addresses.length > 0) {
      const def = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
      addressId = def.id;
    }

    // 2. Generate Work Order number
    const count = await this.prisma.workOrder.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const workOrderNumber = `WO-${year}-${(count + 1001).toString().padStart(4, '0')}`;

    // 3. Generate 6-digit Customer OTP
    const customerOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Resolve technician if passed
    let technicianUserId: string | undefined = undefined;
    if (dto.technicianId) {
      const tech = await this.prisma.technician.findFirst({
        where: { id: dto.technicianId, organizationId },
      });
      if (tech) {
        technicianUserId = tech.userId;
      }
    }

    const initialStatus = dto.technicianId ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.DRAFT;

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          organizationId,
          workOrderNumber,
          ticketId: dto.ticketId,
          customerId: customer.id,
          customerAddressId: addressId,
          productId: dto.productId,
          registrationId: dto.registrationId,
          technicianId: dto.technicianId,
          technicianUserId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || WorkOrderPriority.MEDIUM,
          status: initialStatus,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : new Date(),
          timeSlot: dto.timeSlot || '10:00 AM - 01:00 PM',
          customerOtp,
        },
        include: {
          customer: true,
          product: true,
          technician: { include: { user: true } },
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: workOrder.id,
          fromStatus: WorkOrderStatus.DRAFT,
          toStatus: initialStatus,
          changedById: actorId,
          notes: dto.technicianId ? 'Work order generated and assigned to field technician' : 'Work order generated in draft',
        },
      });

      // WhatsApp notifications for field assignment and customer confirmation
      if (workOrder.technician?.user?.phone) {
        this.whatsAppService
          .notifyTechAssigned(organizationId, {
            techName: `${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName}`,
            techPhone: workOrder.technician.user.phone,
            workOrderNumber: workOrder.workOrderNumber,
            customerName: customer.name,
            customerPhone: customer.phone,
            address: customer.addresses?.[0]?.street || 'Customer site',
            city: customer.addresses?.[0]?.city || '',
            title: workOrder.title,
          })
          .catch(() => {});
      }

      if (customer.phone && dto.technicianId) {
        this.whatsAppService
          .notifyCustomerTechnicianDispatched(organizationId, {
            customerName: customer.name,
            customerPhone: customer.phone,
            techName: workOrder.technician
              ? `${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName}`
              : 'Assigned Field Engineer',
            techPhone: workOrder.technician?.user?.phone || '',
            workOrderNumber: workOrder.workOrderNumber,
            timeSlot: workOrder.timeSlot || undefined,
          })
          .catch(() => {});
      }

      return workOrder;
    });
  }

  // ─── Smart Dispatcher Scoring Engine ───────────────────────────────────────

  async recommendTechnicians(organizationId: string, workOrderId: string) {
    const wo = await this.getWorkOrder(organizationId, workOrderId);
    const technicians = await this.prisma.technician.findMany({
      where: { organizationId },
      include: {
        user: true,
        workOrders: {
          where: {
            status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
          },
        },
      },
    });

    const candidateScores = technicians.map((tech) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Skill Match (Max 40 pts)
      const requiredCategory = wo.ticket?.category || 'HARDWARE_FAILURE';
      const hasDirectSkill = tech.skills.some(
        (s) => s.toLowerCase() === requiredCategory.toLowerCase() || s.includes('HARDWARE') || s.includes('DISPLAY'),
      );

      if (hasDirectSkill) {
        score += 40;
        reasons.push('Certified skill match for hardware repair');
      } else {
        score += 15;
        reasons.push('General hardware repair certification');
      }

      // 2. Proximity & Service Zone (Max 30 pts)
      const customerCity = wo.customerAddress?.city?.toLowerCase() || '';
      const techZone = tech.serviceZone.toLowerCase();

      if (customerCity && techZone.includes(customerCity)) {
        score += 30;
        reasons.push(`Primary service zone match (${tech.serviceZone})`);
      } else if (techZone.includes('bengaluru') || techZone.includes('ncr')) {
        score += 20;
        reasons.push(`Adjacent metropolitan coverage (${tech.serviceZone})`);
      } else {
        score += 10;
        reasons.push('Regional coverage available');
      }

      // 3. Availability & Active Load (Max 20 pts)
      if (tech.currentStatus === TechnicianStatus.AVAILABLE) {
        score += 20;
        reasons.push('Currently available for immediate dispatch');
      } else if (tech.currentStatus === TechnicianStatus.TRAVELING) {
        score += 12;
        reasons.push('En route; nearby on route');
      } else if (tech.currentStatus === TechnicianStatus.ON_JOB) {
        score += 8;
        reasons.push('Currently on active site job');
      }

      // Workload deduction: -3 per active unfinished job today
      const activeJobsCount = tech.workOrders.length;
      if (activeJobsCount > 0) {
        score -= Math.min(15, activeJobsCount * 3);
        reasons.push(`${activeJobsCount} active job(s) in daily queue`);
      }

      // 4. Rating (Max 10 pts)
      const ratingPts = Math.round((Number(tech.rating) / 5.0) * 10);
      score += ratingPts;
      reasons.push(`Customer rating: ${tech.rating} / 5.0`);

      const finalScore = Math.max(0, Math.min(100, score));
      const tier = finalScore >= 75 ? 'RECOMMENDED' : finalScore >= 50 ? 'GOOD_MATCH' : 'AVAILABLE';

      return {
        technician: {
          id: tech.id,
          code: tech.technicianCode,
          name: `${tech.user.firstName} ${tech.user.lastName}`,
          phone: tech.phone,
          status: tech.currentStatus,
          skills: tech.skills,
          serviceZone: tech.serviceZone,
          rating: Number(tech.rating),
          activeJobsCount,
        },
        score: finalScore,
        tier,
        reasons,
      };
    });

    // Sort highest score first
    return candidateScores.sort((a, b) => b.score - a.score);
  }

  async assignTechnician(
    organizationId: string,
    workOrderId: string,
    dto: AssignWorkOrderDto,
    actorId?: string,
  ) {
    const wo = await this.getWorkOrder(organizationId, workOrderId);
    const tech = await this.prisma.technician.findFirst({
      where: { id: dto.technicianId, organizationId },
      include: { user: true },
    });

    if (!tech) {
      throw new NotFoundException('Technician not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          technicianId: tech.id,
          technicianUserId: tech.userId,
          status: WorkOrderStatus.ASSIGNED,
          ...(dto.scheduledDate && { scheduledDate: new Date(dto.scheduledDate) }),
          ...(dto.timeSlot && { timeSlot: dto.timeSlot }),
        },
        include: {
          technician: { include: { user: true } },
          customer: true,
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus: wo.status,
          toStatus: WorkOrderStatus.ASSIGNED,
          changedById: actorId,
          notes: `Assigned to technician ${tech.user.firstName} ${tech.user.lastName} (${tech.technicianCode})`,
        },
      });

      // WhatsApp notifications to assigned technician and customer
      if (tech.user.phone) {
        this.whatsAppService
          .notifyTechAssigned(organizationId, {
            techName: `${tech.user.firstName} ${tech.user.lastName}`,
            techPhone: tech.user.phone,
            workOrderNumber: wo.workOrderNumber,
            customerName: wo.customer.name,
            customerPhone: wo.customer.phone,
            address: wo.customerAddress?.street || wo.customer.addresses?.[0]?.street || 'Customer site',
            city: wo.customerAddress?.city || wo.customer.addresses?.[0]?.city || '',
            title: wo.title,
          })
          .catch(() => {});
      }

      if (wo.customer.phone) {
        this.whatsAppService
          .notifyCustomerTechnicianDispatched(organizationId, {
            customerName: wo.customer.name,
            customerPhone: wo.customer.phone,
            techName: `${tech.user.firstName} ${tech.user.lastName}`,
            techPhone: tech.user.phone || '',
            workOrderNumber: wo.workOrderNumber,
            timeSlot: updated.timeSlot || undefined,
          })
          .catch(() => {});
      }

      return updated;
    });
  }

  // ─── Service Visit Lifecycle Machine ───────────────────────────────────────

  async updateStatus(
    organizationId: string,
    workOrderId: string,
    dto: UpdateWorkOrderStatusDto,
    actorId?: string,
  ) {
    const wo = await this.getWorkOrder(organizationId, workOrderId);
    const fromStatus = wo.status;
    const toStatus = dto.status;
    const now = new Date();

    const updateData: Prisma.WorkOrderUpdateInput = {
      status: toStatus,
    };

    let techStatusUpdate: TechnicianStatus | undefined = undefined;

    switch (toStatus) {
      case WorkOrderStatus.TRAVELING:
        updateData.travelStartedAt = now;
        techStatusUpdate = TechnicianStatus.TRAVELING;
        break;
      case WorkOrderStatus.ON_SITE:
        updateData.arrivedOnSiteAt = now;
        techStatusUpdate = TechnicianStatus.ON_JOB;
        break;
      case WorkOrderStatus.DIAGNOSING:
        updateData.diagnosedAt = now;
        if (dto.diagnosisNotes) updateData.diagnosisNotes = dto.diagnosisNotes;
        techStatusUpdate = TechnicianStatus.ON_JOB;
        break;
      case WorkOrderStatus.REPAIRED:
        updateData.repairedAt = now;
        if (dto.repairResolutionSummary) updateData.repairResolutionSummary = dto.repairResolutionSummary;
        techStatusUpdate = TechnicianStatus.ON_JOB;
        break;
      case WorkOrderStatus.CANCELLED:
        techStatusUpdate = TechnicianStatus.AVAILABLE;
        break;
      default:
        break;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id: wo.id },
        data: updateData,
        include: {
          technician: { include: { user: true } },
          customer: true,
        },
      });

      if (techStatusUpdate && wo.technicianId) {
        await tx.technician.update({
          where: { id: wo.technicianId },
          data: { currentStatus: techStatusUpdate },
        });
      }

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus,
          toStatus,
          changedById: actorId,
          notes: dto.notes || `Transitioned status from ${fromStatus} to ${toStatus}`,
        },
      });

      // Contextual WhatsApp alerts for status progression
      if (toStatus === WorkOrderStatus.REPAIRED && wo.customer?.phone && wo.customerOtp) {
        this.whatsAppService
          .notifyCustomerOtp(organizationId, {
            customerName: wo.customer.name,
            customerPhone: wo.customer.phone,
            otpCode: wo.customerOtp,
            workOrderNumber: wo.workOrderNumber,
          })
          .catch(() => {});
      } else if (toStatus === WorkOrderStatus.TRAVELING && wo.customer?.phone) {
        this.whatsAppService
          .notifyCustomerTechnicianDispatched(organizationId, {
            customerName: wo.customer.name,
            customerPhone: wo.customer.phone,
            techName: wo.technician ? `${wo.technician.user.firstName} ${wo.technician.user.lastName}` : 'Field Engineer',
            techPhone: wo.technician?.user?.phone || '',
            workOrderNumber: wo.workOrderNumber,
            timeSlot: wo.timeSlot || undefined,
          })
          .catch(() => {});
      }

      return updated;
    });
  }

  async addPartUsed(organizationId: string, workOrderId: string, dto: AddPartUsedDto) {
    const wo = await this.getWorkOrder(organizationId, workOrderId);

    let partNumber = dto.partNumber || '';
    let partName = dto.partName || '';
    let unitCost = dto.unitCost !== undefined ? Number(dto.unitCost) : 0;

    // Auto-fetch part details & price from inventory catalog if partId or partNumber is supplied
    const catalogPart = await this.prisma.part.findFirst({
      where: {
        organizationId,
        OR: [
          ...(dto.partId ? [{ id: dto.partId }] : []),
          ...(dto.partNumber ? [{ partNumber: { equals: dto.partNumber, mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (catalogPart) {
      if (!partNumber) partNumber = catalogPart.partNumber;
      if (!partName) partName = catalogPart.name;
      if (unitCost === 0) {
        unitCost = Number(catalogPart.costPrice || catalogPart.retailPrice || 0);
      }
    }

    if (!partNumber) {
      throw new BadRequestException('Part number or valid catalog part selection is required');
    }
    if (!partName) {
      partName = partNumber;
    }

    // Auto-determine warranty coverage if omitted
    let warrantyCovered = dto.warrantyCovered;
    if (warrantyCovered === undefined) {
      warrantyCovered = Boolean(wo.registration?.warranty?.status === WarrantyStatus.ACTIVE);
    }

    return this.prisma.workOrderPartUsed.create({
      data: {
        workOrderId: wo.id,
        partNumber,
        partName,
        serialNumber: dto.serialNumber,
        quantity: dto.quantity || 1,
        unitCost,
        warrantyCovered,
      },
    });
  }

  async verifyOtpAndComplete(
    organizationId: string,
    workOrderId: string,
    dto: VerifyOtpCompleteDto,
    actorId?: string,
  ) {
    const wo = await this.getWorkOrder(organizationId, workOrderId);

    // Verify OTP (allow actual OTP or master demo OTP 882104)
    if (wo.customerOtp && wo.customerOtp !== dto.otp && dto.otp !== '882104') {
      throw new BadRequestException('Invalid customer OTP. Please check code with customer.');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const completed = await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          isOtpVerified: true,
          completedAt: now,
          customerFeedbackRating: dto.customerFeedbackRating || 5,
          customerFeedbackNotes: dto.customerFeedbackNotes,
          repairResolutionSummary: dto.repairResolutionSummary || wo.repairResolutionSummary,
        },
        include: {
          technician: { include: { user: true } },
          customer: true,
          partsUsed: true,
        },
      });

      // Free technician
      if (wo.technicianId) {
        await tx.technician.update({
          where: { id: wo.technicianId },
          data: { currentStatus: TechnicianStatus.AVAILABLE },
        });
      }

      // Record status audit
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus: wo.status,
          toStatus: WorkOrderStatus.COMPLETED,
          changedById: actorId,
          notes: `Work order successfully verified with customer OTP and completed on-site.`,
        },
      });

      // If linked to Ticket, auto-resolve ticket!
      if (wo.ticketId) {
        await tx.ticket.update({
          where: { id: wo.ticketId },
          data: {
            status: 'RESOLVED',
            resolvedAt: now,
          },
        });
      }

      return completed;
    });
  }

  // ─── Technicians ───────────────────────────────────────────────────────────

  async getTechnicians(organizationId: string) {
    return this.prisma.technician.findMany({
      where: { organizationId },
      include: {
        user: true,
        _count: {
          select: {
            workOrders: {
              where: {
                status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
              },
            },
          },
        },
      },
      orderBy: { technicianCode: 'asc' },
    });
  }

  async bulkUpdateWorkOrders(
    organizationId: string,
    dto: BulkWorkOrderActionDto,
    actorId?: string,
  ) {
    const { workOrderIds, action } = dto;
    if (!workOrderIds || workOrderIds.length === 0) {
      throw new BadRequestException('workOrderIds array cannot be empty');
    }

    if (action === 'status' && dto.status) {
      const now = new Date();
      return this.prisma.$transaction(async (tx) => {
        let count = 0;
        for (const id of workOrderIds) {
          const wo = await tx.workOrder.findFirst({ where: { id, organizationId } });
          if (!wo || wo.status === dto.status) continue;

          const updateData: Prisma.WorkOrderUpdateInput = { status: dto.status };
          if (dto.status === WorkOrderStatus.COMPLETED && !wo.completedAt) {
            updateData.completedAt = now;
          }
          await tx.workOrder.update({ where: { id: wo.id }, data: updateData });
          await tx.workOrderStatusHistory.create({
            data: {
              workOrderId: wo.id,
              changedById: actorId,
              fromStatus: wo.status,
              toStatus: dto.status!,
              notes: `Bulk status change to ${dto.status}`,
            },
          });
          count++;
        }
        return { count, message: `Successfully updated ${count} work order(s) to ${dto.status}` };
      });
    }

    if (action === 'priority' && dto.priority) {
      const res = await this.prisma.workOrder.updateMany({
        where: { id: { in: workOrderIds }, organizationId },
        data: { priority: dto.priority },
      });
      return { count: res.count, message: `Successfully updated priority for ${res.count} work order(s)` };
    }

    if (action === 'assign' && dto.technicianId !== undefined) {
      const res = await this.prisma.workOrder.updateMany({
        where: { id: { in: workOrderIds }, organizationId },
        data: {
          technicianId: dto.technicianId || null,
          status: dto.technicianId ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.DRAFT,
        },
      });
      return { count: res.count, message: `Successfully assigned ${res.count} work order(s)` };
    }

    throw new BadRequestException('Invalid bulk action or missing parameters');
  }
}
