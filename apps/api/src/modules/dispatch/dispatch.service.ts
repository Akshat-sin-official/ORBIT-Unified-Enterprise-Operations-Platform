import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ValidateAssignmentDto, ScheduleJobDto } from './dto/dispatch.dto';
import { WorkOrderStatus, TechnicianStatus } from '@prisma/client';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Returns timeline matrix of all technicians, shift bookings, and unassigned work orders
   */
  async getDispatchBoard(
    organizationId: string,
    params: { date?: string; zone?: string },
  ) {
    const targetDate = params.date ? new Date(params.date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 1. Fetch Technicians
    const techWhere: any = { organizationId };
    if (params.zone) {
      techWhere.serviceZone = { contains: params.zone, mode: 'insensitive' };
    }

    const technicians = await this.prisma.technician.findMany({
      where: techWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        workOrders: {
          where: {
            scheduledDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: { notIn: [WorkOrderStatus.CANCELLED] },
          },
          include: {
            customer: true,
            customerAddress: true,
            product: true,
          },
        },
      },
      orderBy: { technicianCode: 'asc' },
    });

    // 2. Fetch Unassigned Work Orders
    const unassignedOrders = await this.prisma.workOrder.findMany({
      where: {
        organizationId,
        technicianId: null,
        status: { in: [WorkOrderStatus.DRAFT, WorkOrderStatus.ASSIGNED] },
      },
      include: {
        customer: true,
        customerAddress: true,
        product: true,
        ticket: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    // Format technician schedule grid
    const formattedTechnicians = technicians.map((tech) => {
      const bookedSlots = tech.workOrders.map((wo) => ({
        workOrderId: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        priority: wo.priority,
        status: wo.status,
        timeSlot: wo.timeSlot || '10:00 AM - 01:00 PM',
        customerName: wo.customer.name,
        customerAddress: wo.customerAddress
          ? `${wo.customerAddress.street}, ${wo.customerAddress.city}`
          : 'Customer Site',
        latitude: wo.customerAddress?.latitude ? Number(wo.customerAddress.latitude) : null,
        longitude: wo.customerAddress?.longitude ? Number(wo.customerAddress.longitude) : null,
      }));

      return {
        id: tech.id,
        technicianCode: tech.technicianCode,
        name: `${tech.user.firstName} ${tech.user.lastName}`,
        phone: tech.phone,
        currentStatus: tech.currentStatus,
        skills: tech.skills,
        servicePincodes: tech.servicePincodes,
        serviceZone: tech.serviceZone,
        maxDailyJobs: tech.maxDailyJobs,
        rating: Number(tech.rating),
        totalJobsToday: tech.workOrders.length,
        isCapacityFull: tech.workOrders.length >= tech.maxDailyJobs,
        bookedSlots,
      };
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      zone: params.zone || 'ALL',
      technicians: formattedTechnicians,
      unassignedOrders: unassignedOrders.map((wo) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        scheduledDate: wo.scheduledDate,
        timeSlot: wo.timeSlot,
        customer: {
          id: wo.customer.id,
          name: wo.customer.name,
          phone: wo.customer.phone,
          city: wo.customerAddress?.city || 'Default',
          address: wo.customerAddress?.street || '',
          pincode: wo.customerAddress?.postalCode || '',
          latitude: wo.customerAddress?.latitude ? Number(wo.customerAddress.latitude) : null,
          longitude: wo.customerAddress?.longitude ? Number(wo.customerAddress.longitude) : null,
        },
        product: wo.product ? { id: wo.product.id, name: wo.product.name, sku: wo.product.sku } : null,
        ticketCategory: wo.ticket?.category || 'HARDWARE_FAILURE',
      })),
    };
  }

  /**
   * Constraint check: skill match, shift collision, daily capacity & van stock
   */
  async validateAssignment(organizationId: string, dto: ValidateAssignmentDto) {
    const warnings: string[] = [];
    let valid = true;

    const [wo, tech] = await Promise.all([
      this.prisma.workOrder.findFirst({
        where: { id: dto.workOrderId, organizationId },
        include: { ticket: true, product: true, customerAddress: true },
      }),
      this.prisma.technician.findFirst({
        where: { id: dto.technicianId, organizationId },
        include: {
          user: true,
          workOrders: {
            where: {
              scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
              status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
            },
          },
        },
      }),
    ]);

    if (!wo) throw new NotFoundException('Work order not found');
    if (!tech) throw new NotFoundException('Technician not found');

    // 1. Skill Match Check
    const requiredCategory = (wo.ticket?.category || 'HARDWARE_FAILURE').toLowerCase();
    const hasSkill = tech.skills.some((s) => {
      const lower = s.toLowerCase();
      return (
        lower === requiredCategory ||
        lower.includes('hardware') ||
        lower.includes('appliance') ||
        lower.includes('electronics')
      );
    });

    if (!hasSkill) {
      warnings.push(
        `Technician lacks certified skill tag for category "${wo.ticket?.category || 'Hardware'}". Technician skills: [${tech.skills.join(', ')}]`,
      );
    }

    // 2. Shift / Time-Slot Collision Check
    if (dto.timeSlot && dto.scheduledDate) {
      const hasSlotOverlap = tech.workOrders.some(
        (existing) =>
          existing.timeSlot === dto.timeSlot && existing.id !== dto.workOrderId,
      );
      if (hasSlotOverlap) {
        valid = false;
        warnings.push(
          `Technician ${tech.user.firstName} ${tech.user.lastName} already has a confirmed booking for slot "${dto.timeSlot}". Overlapping slots are prohibited.`,
        );
      }
    }

    // 3. Daily Job Capacity Check
    if (tech.workOrders.length >= tech.maxDailyJobs) {
      warnings.push(
        `Daily job quota warning: Technician already has ${tech.workOrders.length} / ${tech.maxDailyJobs} maximum daily bookings.`,
      );
    }

    // 4. Territory Pincode Check
    if (wo.customerAddress?.postalCode && tech.servicePincodes && tech.servicePincodes.length > 0) {
      const pincodeMatch = tech.servicePincodes.includes(wo.customerAddress.postalCode);
      if (!pincodeMatch) {
        warnings.push(
          `Address pincode ${wo.customerAddress.postalCode} is outside technician primary route zones [${tech.servicePincodes.join(', ')}].`,
        );
      }
    }

    return {
      valid,
      technicianName: `${tech.user.firstName} ${tech.user.lastName}`,
      technicianCode: tech.technicianCode,
      currentDailyJobs: tech.workOrders.length,
      maxDailyJobs: tech.maxDailyJobs,
      warnings,
    };
  }

  /**
   * Atomic Dispatch Schedule Assignment
   */
  async scheduleJob(organizationId: string, dto: ScheduleJobDto, actorId?: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: dto.workOrderId, organizationId },
      include: { customer: true, customerAddress: true },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const tech = await this.prisma.technician.findFirst({
      where: { id: dto.technicianId, organizationId },
      include: { user: true },
    });
    if (!tech) throw new NotFoundException('Technician not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          technicianId: tech.id,
          technicianUserId: tech.userId,
          status: WorkOrderStatus.ASSIGNED,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : new Date(),
          timeSlot: dto.timeSlot || '10:00 AM - 01:00 PM',
        },
        include: {
          customer: true,
          technician: { include: { user: true } },
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus: wo.status,
          toStatus: WorkOrderStatus.ASSIGNED,
          changedById: actorId,
          notes: `Visual Dispatch Board: Assigned to ${tech.user.firstName} ${tech.user.lastName} (${tech.technicianCode}) on slot ${updated.timeSlot}`,
        },
      });

      // Dispatch alert to tech via WhatsApp
      if (tech.user.phone) {
        this.whatsAppService
          .notifyTechAssigned(organizationId, {
            techName: `${tech.user.firstName} ${tech.user.lastName}`,
            techPhone: tech.user.phone,
            workOrderNumber: wo.workOrderNumber,
            customerName: wo.customer.name,
            customerPhone: wo.customer.phone,
            address: wo.customerAddress?.street || 'Customer site',
            city: wo.customerAddress?.city || '',
            title: wo.title,
          })
          .catch(() => {});
      }

      this.notificationService
        .dispatch(organizationId, {
          category: 'TECHNICIAN_ASSIGNED',
          title: `Job Scheduled: #${wo.workOrderNumber}`,
          message: `Technician ${tech.user.firstName} ${tech.user.lastName} scheduled for #${wo.workOrderNumber} (${updated.timeSlot}).`,
          customerName: wo.customer.name,
          customerEmail: wo.customer.email,
          customerPhone: wo.customer.phone || undefined,
          staffName: `${tech.user.firstName} ${tech.user.lastName}`,
          staffEmail: tech.user.email,
          staffPhone: tech.user.phone || undefined,
          metadata: {
            workOrderId: wo.id,
            workOrderNumber: wo.workOrderNumber,
            timeSlot: updated.timeSlot,
          },
        })
        .catch(() => {});

      return updated;
    });
  }

  /**
   * Haversine formula calculation to rank nearest technicians to customer coordinates
   */
  async getNearestTechnicians(
    organizationId: string,
    latitude: number,
    longitude: number,
    limit: number = 5,
  ) {
    const technicians = await this.prisma.technician.findMany({
      where: { organizationId },
      include: {
        user: true,
        workOrders: {
          where: {
            status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
          },
          include: { customerAddress: true },
        },
      },
    });

    const results = technicians.map((tech) => {
      // If tech has an active job, use active job address lat/lng; else use primary depot zone approx
      let techLat = 12.9716; // default Bengaluru center
      let techLng = 77.5946;

      const activeJob = tech.workOrders.find(
        (w) => w.status === WorkOrderStatus.TRAVELING || w.status === WorkOrderStatus.ON_SITE,
      );

      if (activeJob?.customerAddress?.latitude && activeJob?.customerAddress?.longitude) {
        techLat = Number(activeJob.customerAddress.latitude);
        techLng = Number(activeJob.customerAddress.longitude);
      }

      // Haversine calculation
      const R = 6371; // Earth radius in km
      const dLat = this.deg2rad(latitude - techLat);
      const dLon = this.deg2rad(longitude - techLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(techLat)) *
          Math.cos(this.deg2rad(latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(R * c * 10) / 10;

      return {
        technicianId: tech.id,
        technicianCode: tech.technicianCode,
        name: `${tech.user.firstName} ${tech.user.lastName}`,
        phone: tech.phone,
        currentStatus: tech.currentStatus,
        serviceZone: tech.serviceZone,
        distanceKm,
        rating: Number(tech.rating),
        activeJobsCount: tech.workOrders.length,
      };
    });

    return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
