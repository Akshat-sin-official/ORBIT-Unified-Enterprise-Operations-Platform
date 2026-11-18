import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RescheduleJobPublicDto, UpdateTechnicianLocationDto } from './dto/tracking.dto';
import { WorkOrderStatus } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Generates or retrieves an active secure tracking session for a work order
   * Strictly validates tenant ownership to prevent IDOR vulnerabilities
   */
  async getOrCreateSession(organizationId: string, workOrderId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) {
      throw new NotFoundException('Work order record not found in your organization');
    }

    const existing = await this.prisma.customerTrackingSession.findFirst({
      where: {
        workOrderId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return existing;
    }

    const secureToken = uuidv4().replace(/-/g, '').substring(0, 16);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 72 hour validity

    return this.prisma.customerTrackingSession.create({
      data: {
        workOrderId,
        secureToken,
        isActive: true,
        expiresAt,
        etaMinutes: 25,
      },
    });
  }

  /**
   * Helper to mask customer and staff PII for GDPR / DPDP compliance
   */
  private maskName(name?: string): string {
    if (!name) return 'Customer';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].length > 2 ? `${parts[0][0]}***${parts[0].slice(-1)}` : `${parts[0][0]}*`;
    }
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  private maskPhone(phone?: string): string {
    if (!phone) return '+91 ******0000';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 4) return 'Protected';
    return `+91 ******${clean.slice(-4)}`;
  }

  /**
   * PUBLIC endpoint: Retrieve live technician tracking and job status by secure token
   * Enforces session expiration check and PII masking
   */
  async getPublicTrackingInfo(token: string) {
    const session = await this.prisma.customerTrackingSession.findFirst({
      where: {
        secureToken: token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        workOrder: {
          include: {
            technician: {
              include: { user: true },
            },
            customer: true,
            customerAddress: true,
            product: true,
          },
        },
      },
    });

    if (!session || !session.workOrder) {
      throw new NotFoundException('Tracking session not found or link has expired.');
    }

    const { workOrder } = session;
    const tech = workOrder.technician;

    // Mask PII: locality only (no exact flat/door number exposed on public link)
    const locality = workOrder.customerAddress
      ? `${workOrder.customerAddress.city || 'Service Area'}, PIN ${workOrder.customerAddress.postalCode || ''}`
      : 'Service Location';

    return {
      workOrderNumber: workOrder.workOrderNumber,
      title: workOrder.title,
      status: workOrder.status,
      scheduledDate: workOrder.scheduledDate,
      timeSlot: workOrder.timeSlot,
      etaMinutes: session.etaMinutes || 20,
      customer: {
        name: this.maskName(workOrder.customer?.name),
        address: locality,
        latitude: workOrder.customerAddress?.latitude ? Number(workOrder.customerAddress.latitude) : 12.9716,
        longitude: workOrder.customerAddress?.longitude ? Number(workOrder.customerAddress.longitude) : 77.5946,
      },
      technician: tech
        ? {
            name: `${tech.user.firstName} ${tech.user.lastName[0]}.`,
            code: tech.technicianCode,
            phone: this.maskPhone(tech.phone),
            rating: Number(tech.rating),
            status: tech.currentStatus,
            currentLocation: {
              latitude: session.technicianLat ? Number(session.technicianLat) : 12.9611,
              longitude: session.technicianLng ? Number(session.technicianLng) : 77.5855,
            },
          }
        : null,
      appliance: workOrder.product
        ? {
            name: workOrder.product.name,
            modelNumber: workOrder.product.modelNumber,
          }
        : null,
    };
  }

  /**
   * PUBLIC endpoint: Customer one-tap self-rescheduling via tracking link
   */
  async rescheduleFromTracking(token: string, dto: RescheduleJobPublicDto) {
    const session = await this.prisma.customerTrackingSession.findFirst({
      where: {
        secureToken: token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        workOrder: {
          include: {
            technician: { include: { user: true } },
            customer: true,
          },
        },
      },
    });

    if (!session || !session.workOrder) {
      throw new NotFoundException('Tracking link not recognized.');
    }

    const { workOrder } = session;
    const newScheduledDate = new Date(dto.newDate);

    const updated = await this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.update({
        where: { id: workOrder.id },
        data: {
          scheduledDate: newScheduledDate,
          timeSlot: dto.newTimeSlot,
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: workOrder.id,
          fromStatus: workOrder.status,
          toStatus: workOrder.status,
          notes: `Customer self-rescheduled appointment via Live Tracking link to ${dto.newDate} (${dto.newTimeSlot}). Reason: ${dto.reason || 'Customer request'}`,
        },
      });

      return wo;
    });

    // Alert assigned technician & dispatcher
    this.notificationService
      .dispatch(workOrder.organizationId, {
        category: 'TECHNICIAN_ASSIGNED',
        title: `Appointment Rescheduled: #${workOrder.workOrderNumber}`,
        message: `Customer ${workOrder.customer.name} rescheduled visit for #${workOrder.workOrderNumber} to ${dto.newDate} (${dto.newTimeSlot}).`,
        customerName: workOrder.customer.name,
        customerPhone: workOrder.customer.phone || undefined,
        staffName: workOrder.technician?.user ? `${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName}` : undefined,
        staffPhone: workOrder.technician?.user?.phone || undefined,
      })
      .catch(() => {});

    return {
      message: 'Your service visit appointment has been successfully rescheduled.',
      workOrder: updated,
    };
  }

  /**
   * Authenticated endpoint: Technician phone telemetry pushes live lat/lng
   */
  async updateTechnicianLocation(
    organizationId: string,
    workOrderId: string,
    dto: UpdateTechnicianLocationDto,
  ) {
    const session = await this.getOrCreateSession(organizationId, workOrderId);

    return this.prisma.customerTrackingSession.update({
      where: { id: session.id },
      data: {
        technicianLat: dto.latitude,
        technicianLng: dto.longitude,
        ...(dto.etaMinutes !== undefined ? { etaMinutes: dto.etaMinutes } : {}),
      },
    });
  }
}
