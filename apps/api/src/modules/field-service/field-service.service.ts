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
  StockMovementType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class FieldServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationService: NotificationService,
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

      if (dto.technicianId && workOrder.technician?.user) {
        this.notificationService
          .dispatch(organizationId, {
            category: 'TECHNICIAN_ASSIGNED',
            title: `Technician Assigned: #${workOrder.workOrderNumber}`,
            message: `Engineer ${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName} has been assigned to Work Order #${workOrder.workOrderNumber}.`,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone || undefined,
            staffName: `${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName}`,
            staffEmail: workOrder.technician.user.email,
            staffPhone: workOrder.technician.user.phone || undefined,
            metadata: {
              workOrderId: workOrder.id,
              workOrderNumber: workOrder.workOrderNumber,
              title: workOrder.title,
            },
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

      this.notificationService
        .dispatch(organizationId, {
          category: 'TECHNICIAN_ASSIGNED',
          title: `Technician Assigned: #${wo.workOrderNumber}`,
          message: `Technician ${tech.user.firstName} ${tech.user.lastName} (${tech.technicianCode}) has been assigned to Work Order #${wo.workOrderNumber}.`,
          customerName: wo.customer.name,
          customerEmail: wo.customer.email,
          customerPhone: wo.customer.phone || undefined,
          staffName: `${tech.user.firstName} ${tech.user.lastName}`,
          staffEmail: tech.user.email,
          staffPhone: tech.user.phone || undefined,
          metadata: {
            workOrderId: wo.id,
            workOrderNumber: wo.workOrderNumber,
            technician: `${tech.user.firstName} ${tech.user.lastName}`,
          },
        })
        .catch(() => {});

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

    const updatedWo = await this.prisma.$transaction(async (tx) => {
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

    if (toStatus === WorkOrderStatus.COMPLETED) {
      const fullCompleted = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          technician: { include: { user: true } },
          customer: true,
          partsUsed: true,
        },
      });
      if (fullCompleted) {
        await this.handleWorkOrderCompletion(organizationId, fullCompleted, actorId);
      }
    }

    return updatedWo;
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

    const updatedWo = await this.prisma.$transaction(async (tx) => {
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

    await this.handleWorkOrderCompletion(organizationId, updatedWo, actorId);

    return updatedWo;
  }

  /**
   * Enterprise Automations triggered upon Work Order Completion:
   * 1. Auto-deduct inventory balances for parts consumed during repair
   * 2. Auto-trigger low stock alert if part quantity reaches or breaches minSafetyStock
   * 3. Auto-draft or issue service invoice with labour and billable parts
   * 4. Multi-channel dispatch (In-App, WhatsApp, Email) per admin notification settings
   */
  private async handleWorkOrderCompletion(
    organizationId: string,
    completed: any,
    actorId?: string,
  ) {
    try {
      // ─── 1. Automated Inventory Deduction for Parts Used ──────────────────
      if (completed.partsUsed && completed.partsUsed.length > 0) {
        for (const p of completed.partsUsed) {
          if (!p.partId) continue;
          const part = await this.prisma.part.findFirst({
            where: { id: p.partId, organizationId },
          });
          if (!part) continue;

          // Find stock balance in warehouse
          const balance = await this.prisma.stockBalance.findFirst({
            where: { partId: part.id, organizationId },
          });

          if (balance) {
            const qtyUsed = Number(p.quantity) || 1;
            const newOnHand = Math.max(0, balance.quantityOnHand - qtyUsed);
            const newAvail = Math.max(0, balance.quantityAvailable - qtyUsed);

            await this.prisma.stockBalance.update({
              where: { id: balance.id },
              data: {
                quantityOnHand: newOnHand,
                quantityAvailable: newAvail,
              },
            });

            await this.prisma.stockMovement.create({
              data: {
                organizationId,
                movementNumber: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                partId: part.id,
                sourceWarehouseId: balance.warehouseId,
                workOrderId: completed.id,
                technicianId: completed.technicianId || null,
                type: StockMovementType.CONSUMPTION,
                quantity: qtyUsed,
                unitCost: part.costPrice,
                referenceNotes: `Auto-deducted for completed Work Order #${completed.workOrderNumber}`,
                actorId,
              },
            });

            // Trigger Low Stock Alert if reached or breached minSafetyStock
            if (newOnHand <= part.minSafetyStock) {
              await this.notificationService.dispatch(organizationId, {
                category: 'LOW_STOCK_ALERT',
                title: `Low Stock Alert: ${part.name} (${part.partNumber})`,
                message: `Current stock of ${part.name} (${part.partNumber}) is down to ${newOnHand} units (minimum safety threshold: ${part.minSafetyStock}). Reorder draft recommended.`,
                metadata: {
                  partId: part.id,
                  partNumber: part.partNumber,
                  partName: part.name,
                  remainingStock: newOnHand,
                  minSafetyStock: part.minSafetyStock,
                },
              });
            }
          }
        }
      }

      // ─── 2. Auto-Generate Service Invoice ─────────────────────────────────
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { workOrderId: completed.id, organizationId },
      });

      if (!existingInvoice && (completed.customerId || completed.customer?.id)) {
        const custId = completed.customerId || completed.customer.id;
        const count = await this.prisma.invoice.count({ where: { organizationId } });
        const seq = String(count + 1).padStart(4, '0');
        const invoiceNumber = `INV-2026-${seq}`;

        let subtotal = 0;
        let taxAmount = 0;
        const itemsToCreate: any[] = [];

        // Labour fee
        if (completed.labourCharge && Number(completed.labourCharge) > 0) {
          const labour = Number(completed.labourCharge);
          const labourTax = labour * 0.18;
          subtotal += labour;
          taxAmount += labourTax;
          itemsToCreate.push({
            description: 'On-site Field Service & Diagnostic Labour',
            quantity: 1,
            unitPrice: labour,
            taxRate: 18.0,
            amount: labour,
            isWarrantyCovered: false,
          });
        }

        // Parts used
        if (completed.partsUsed && completed.partsUsed.length > 0) {
          for (const p of completed.partsUsed) {
            const cost = Number(p.unitCost) || 0;
            const qty = Number(p.quantity) || 1;

            if (p.warrantyCovered) {
              itemsToCreate.push({
                description: `${p.partName || p.partNumber} [Warranty Covered]`,
                partId: p.partId,
                quantity: qty,
                unitPrice: cost,
                taxRate: 0,
                amount: 0,
                isWarrantyCovered: true,
              });
            } else {
              const itemSub = cost * qty;
              const itemTax = itemSub * 0.18;
              subtotal += itemSub;
              taxAmount += itemTax;
              itemsToCreate.push({
                description: p.partName || p.partNumber,
                partId: p.partId,
                quantity: qty,
                unitPrice: cost,
                taxRate: 18.0,
                amount: itemSub,
                isWarrantyCovered: false,
              });
            }
          }
        }

        const totalAmount = subtotal + taxAmount;
        const autoInv = await this.prisma.invoice.create({
          data: {
            organizationId,
            invoiceNumber,
            customerId: custId,
            workOrderId: completed.id,
            status: totalAmount === 0 ? InvoiceStatus.WARRANTY_ABSORBED : InvoiceStatus.ISSUED,
            subtotal,
            taxAmount,
            totalAmount,
            amountPaid: 0,
            balanceDue: totalAmount,
            dueDate: new Date(Date.now() + 15 * 86400000), // 15 days due
            notes: `Auto-generated on completion of Work Order #${completed.workOrderNumber}`,
            items: { create: itemsToCreate },
          },
        });

        // Dispatch Invoice Generated Notification
        await this.notificationService.dispatch(organizationId, {
          category: 'INVOICE_GENERATED',
          title: `Invoice Generated: ${invoiceNumber}`,
          message: `Service invoice ${invoiceNumber} totaling ₹${totalAmount.toFixed(2)} has been issued for Work Order #${completed.workOrderNumber}.`,
          customerName: `${completed.customer?.firstName || ''} ${completed.customer?.lastName || ''}`.trim() || undefined,
          customerEmail: completed.customer?.email,
          customerPhone: completed.customer?.phone || undefined,
          metadata: {
            invoiceId: autoInv.id,
            invoiceNumber,
            totalAmount: `₹${totalAmount.toFixed(2)}`,
            workOrderNumber: completed.workOrderNumber,
          },
        });
      }

      // ─── 3. Dispatch Work Order Completed Notification ────────────────────
      await this.notificationService.dispatch(organizationId, {
        category: 'WORK_ORDER_COMPLETED',
        title: `Work Order #${completed.workOrderNumber} Completed`,
        message: `Field repair service for Work Order #${completed.workOrderNumber} has been verified and successfully completed on-site.`,
        customerName: `${completed.customer?.firstName || ''} ${completed.customer?.lastName || ''}`.trim() || undefined,
        customerEmail: completed.customer?.email,
        customerPhone: completed.customer?.phone || undefined,
        staffName: completed.technician?.user ? `${completed.technician.user.firstName} ${completed.technician.user.lastName}` : undefined,
        staffPhone: completed.technician?.user?.phone || undefined,
        staffEmail: completed.technician?.user?.email,
        metadata: {
          workOrderId: completed.id,
          workOrderNumber: completed.workOrderNumber,
          completedAt: completed.completedAt?.toISOString(),
          otpVerified: true,
        },
      });
    } catch (err: any) {
      console.error(`[FieldService] Error in post-completion automations:`, err);
    }
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
