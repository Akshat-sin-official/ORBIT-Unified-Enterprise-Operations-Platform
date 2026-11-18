import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { BulkTicketActionDto } from './dto/bulk-ticket-action.dto';
import { TicketPriority, TicketStatus, Prisma } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class ServiceDeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Tickets ───────────────────────────────────────────────────────────────

  async getTickets(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: any;
      customerId?: string;
      assignedToId?: string;
      slaBreached?: boolean;
    },
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.TicketWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      ...(params.slaBreached
        ? {
            OR: [
              { isResponseBreached: true },
              { isResolutionBreached: true },
              {
                status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
                resolutionDeadline: { lt: now },
              },
            ],
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { ticketNumber: { contains: params.search, mode: 'insensitive' } },
              { title: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { customer: { name: { contains: params.search, mode: 'insensitive' } } },
              { customer: { phone: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: true,
          product: true,
          registration: {
            include: { warranty: true },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          slaPolicy: true,
          _count: {
            select: { comments: true },
          },
        },
      }),
    ]);

    // Augment items with live SLA status
    const augmented = data.map((t) => {
      const isResolutionBreached =
        t.isResolutionBreached ||
        (t.status !== TicketStatus.RESOLVED &&
          t.status !== TicketStatus.CLOSED &&
          new Date(t.resolutionDeadline) < now);

      const msRemaining = new Date(t.resolutionDeadline).getTime() - now.getTime();
      const minutesRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60)));

      return {
        ...t,
        isResolutionBreached,
        minutesRemaining,
      };
    });

    return {
      data: augmented,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicket(organizationId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
          include: { addresses: true },
        },
        product: {
          include: { category: true },
        },
        registration: {
          include: { warranty: true },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        slaPolicy: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const now = new Date();
    const isResolutionBreached =
      ticket.isResolutionBreached ||
      (ticket.status !== TicketStatus.RESOLVED &&
        ticket.status !== TicketStatus.CLOSED &&
        new Date(ticket.resolutionDeadline) < now);

    const msRemaining = new Date(ticket.resolutionDeadline).getTime() - now.getTime();
    const minutesRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60)));

    return {
      ...ticket,
      isResolutionBreached,
      minutesRemaining,
    };
  }

  async createTicket(organizationId: string, dto: CreateTicketDto, actorId?: string) {
    // 1. Verify customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    // 2. Resolve Product from Registration if provided
    let resolvedProductId = dto.productId;
    if (dto.registrationId) {
      const reg = await this.prisma.productRegistration.findFirst({
        where: { id: dto.registrationId, organizationId },
      });
      if (reg) {
        resolvedProductId = reg.productId;
      }
    }

    // 3. Generate sequential ticket number
    const count = await this.prisma.ticket.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const ticketNumber = `TICK-${year}-${(count + 1001).toString().padStart(4, '0')}`;

    // 4. Resolve SLA Policy
    const priority = dto.priority || TicketPriority.P3_MEDIUM;
    const slaPolicy = await this.prisma.slaPolicy.findFirst({
      where: { organizationId, priority },
    });

    const responseHours = slaPolicy ? Number(slaPolicy.responseHours) : this.getDefaultResponseHours(priority);
    const resolutionHours = slaPolicy ? Number(slaPolicy.resolutionHours) : this.getDefaultResolutionHours(priority);

    const now = new Date();
    const responseDeadline = new Date(now.getTime() + responseHours * 3600 * 1000);
    const resolutionDeadline = new Date(now.getTime() + resolutionHours * 3600 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          organizationId,
          ticketNumber,
          customerId: customer.id,
          productId: resolvedProductId,
          registrationId: dto.registrationId,
          assignedToId: dto.assignedToId,
          slaPolicyId: slaPolicy?.id,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority,
          status: TicketStatus.OPEN,
          source: dto.source,
          responseDeadline,
          resolutionDeadline,
        },
        include: {
          customer: true,
          product: true,
          assignedTo: true,
          slaPolicy: true,
        },
      });

      // Record status history
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          changedById: actorId,
          fromStatus: TicketStatus.OPEN,
          toStatus: TicketStatus.OPEN,
          reason: `Ticket opened via ${dto.source || 'PORTAL'}`,
        },
      });

      // WhatsApp notification to customer
      if (customer.phone) {
        this.whatsAppService
          .notifyTicketCreated(organizationId, {
            customerName: customer.name,
            customerPhone: customer.phone,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            priority: ticket.priority,
          })
          .catch(() => {});
      }

      // Enterprise Multi-Channel Notification (In-App, WhatsApp, Email)
      this.notificationService
        .dispatch(organizationId, {
          category: 'TICKET_CREATED',
          title: `Service Ticket Logged: ${ticket.ticketNumber}`,
          message: `Dear ${customer.name}, your service ticket #${ticket.ticketNumber} regarding "${ticket.title}" has been registered with priority ${ticket.priority}.`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || undefined,
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            priority: ticket.priority,
            category: ticket.category,
          },
        })
        .catch(() => {});

      if (ticket.assignedTo) {
        this.notificationService
          .dispatch(organizationId, {
            category: 'TECHNICIAN_ASSIGNED',
            title: `Assigned: Ticket #${ticket.ticketNumber}`,
            message: `Specialist ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName} has been assigned to ticket #${ticket.ticketNumber}.`,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone || undefined,
            staffName: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`,
            staffEmail: ticket.assignedTo.email,
            staffPhone: ticket.assignedTo.phone || undefined,
            metadata: {
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
            },
          })
          .catch(() => {});
      }

      return ticket;
    });
  }

  async updateTicket(
    organizationId: string,
    id: string,
    dto: UpdateTicketDto,
    actorId?: string,
  ) {
    const ticket = await this.getTicket(organizationId, id);

    return this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      },
      include: {
        customer: true,
        product: true,
        assignedTo: true,
        slaPolicy: true,
      },
    });
  }

  async changeStatus(
    organizationId: string,
    id: string,
    dto: ChangeTicketStatusDto,
    actorId?: string,
  ) {
    const ticket = await this.getTicket(organizationId, id);
    const fromStatus = ticket.status;
    const toStatus = dto.status;

    if (fromStatus === toStatus) {
      return ticket;
    }

    const now = new Date();
    const updateData: Prisma.TicketUpdateInput = {
      status: toStatus,
    };

    // First Response SLA check
    if (
      !ticket.respondedAt &&
      (toStatus === TicketStatus.TRIAGED ||
        toStatus === TicketStatus.IN_PROGRESS ||
        toStatus === TicketStatus.RESOLVED)
    ) {
      updateData.respondedAt = now;
      updateData.isResponseBreached = now > new Date(ticket.responseDeadline);
    }

    // Resolution SLA check
    if (toStatus === TicketStatus.RESOLVED) {
      updateData.resolvedAt = now;
      updateData.isResolutionBreached = now > new Date(ticket.resolutionDeadline);
    } else if (toStatus === TicketStatus.CLOSED) {
      updateData.closedAt = now;
      if (!ticket.resolvedAt) {
        updateData.resolvedAt = now;
        updateData.isResolutionBreached = now > new Date(ticket.resolutionDeadline);
      }
    } else if (toStatus === TicketStatus.IN_PROGRESS && fromStatus === TicketStatus.RESOLVED) {
      // Reopening ticket
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: updateData,
        include: {
          customer: true,
          product: true,
          assignedTo: true,
          slaPolicy: true,
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          changedById: actorId,
          fromStatus,
          toStatus,
          reason: dto.reason || `Status transitioned from ${fromStatus} to ${toStatus}`,
        },
      });

      return updated;
    });
  }

  async addComment(
    organizationId: string,
    id: string,
    dto: CreateTicketCommentDto,
    actorId?: string,
  ) {
    const ticket = await this.getTicket(organizationId, id);

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: actorId,
          message: dto.message,
          isInternal: dto.isInternal ?? false,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // If this is an agent reply to an open ticket, record first response
      if (!ticket.respondedAt && !dto.isInternal) {
        const now = new Date();
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            respondedAt: now,
            isResponseBreached: now > new Date(ticket.responseDeadline),
            status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : undefined,
          },
        });
      }

      return comment;
    });
  }

  // ─── SLA Policies ──────────────────────────────────────────────────────────

  async getSlaPolicies(organizationId: string) {
    return this.prisma.slaPolicy.findMany({
      where: { organizationId },
      orderBy: { priority: 'asc' },
    });
  }

  async createSlaPolicy(organizationId: string, dto: CreateSlaPolicyDto) {
    return this.prisma.slaPolicy.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        responseHours: dto.responseHours,
        resolutionHours: dto.resolutionHours,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async bulkUpdateTickets(
    organizationId: string,
    dto: BulkTicketActionDto,
    actorId?: string,
  ) {
    const { ticketIds, action } = dto;
    if (!ticketIds || ticketIds.length === 0) {
      throw new BadRequestException('ticketIds array cannot be empty');
    }

    if (action === 'status' && dto.status) {
      const now = new Date();
      return this.prisma.$transaction(async (tx) => {
        let updatedCount = 0;
        for (const id of ticketIds) {
          const ticket = await tx.ticket.findFirst({
            where: { id, organizationId },
          });
          if (!ticket) continue;

          const fromStatus = ticket.status;
          const toStatus = dto.status!;
          if (fromStatus === toStatus) continue;

          const updateData: Prisma.TicketUpdateInput = { status: toStatus };
          if (
            !ticket.respondedAt &&
            (toStatus === TicketStatus.TRIAGED ||
              toStatus === TicketStatus.IN_PROGRESS ||
              toStatus === TicketStatus.RESOLVED)
          ) {
            updateData.respondedAt = now;
            updateData.isResponseBreached = now > new Date(ticket.responseDeadline);
          }
          if (toStatus === TicketStatus.RESOLVED) {
            updateData.resolvedAt = now;
            updateData.isResolutionBreached = now > new Date(ticket.resolutionDeadline);
          } else if (toStatus === TicketStatus.CLOSED) {
            updateData.closedAt = now;
            if (!ticket.resolvedAt) {
              updateData.resolvedAt = now;
              updateData.isResolutionBreached = now > new Date(ticket.resolutionDeadline);
            }
          }

          await tx.ticket.update({
            where: { id: ticket.id },
            data: updateData,
          });

          await tx.ticketStatusHistory.create({
            data: {
              ticketId: ticket.id,
              changedById: actorId,
              fromStatus,
              toStatus,
              reason: dto.reason || `Bulk transitioned to ${toStatus}`,
            },
          });
          updatedCount++;
        }
        return { count: updatedCount, message: `Successfully updated status for ${updatedCount} ticket(s)` };
      });
    }

    if (action === 'priority' && dto.priority) {
      const res = await this.prisma.ticket.updateMany({
        where: { id: { in: ticketIds }, organizationId },
        data: { priority: dto.priority },
      });
      return { count: res.count, message: `Successfully updated priority for ${res.count} ticket(s)` };
    }

    if (action === 'assign' && dto.assignedToId !== undefined) {
      const res = await this.prisma.ticket.updateMany({
        where: { id: { in: ticketIds }, organizationId },
        data: { assignedToId: dto.assignedToId || null },
      });
      return { count: res.count, message: `Successfully assigned ${res.count} ticket(s)` };
    }

    throw new BadRequestException('Invalid bulk action or missing parameters');
  }

  // Helper fallbacks
  private getDefaultResponseHours(priority: TicketPriority): number {
    switch (priority) {
      case TicketPriority.P1_CRITICAL:
        return 0.5;
      case TicketPriority.P2_HIGH:
        return 2.0;
      case TicketPriority.P3_MEDIUM:
        return 8.0;
      case TicketPriority.P4_LOW:
      default:
        return 24.0;
    }
  }

  private getDefaultResolutionHours(priority: TicketPriority): number {
    switch (priority) {
      case TicketPriority.P1_CRITICAL:
        return 4.0;
      case TicketPriority.P2_HIGH:
        return 8.0;
      case TicketPriority.P3_MEDIUM:
        return 24.0;
      case TicketPriority.P4_LOW:
      default:
        return 72.0;
    }
  }
}
