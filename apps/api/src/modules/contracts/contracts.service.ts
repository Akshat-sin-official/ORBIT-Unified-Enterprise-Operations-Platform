import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateContractDto, QueryContractDto } from './dto/contract.dto';
import {
  ContractStatus,
  ScheduleVisitStatus,
  WorkOrderStatus,
  WorkOrderPriority,
} from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create an Annual Maintenance Contract and auto-schedule all preventive visits
   */
  async createContract(organizationId: string, dto: CreateContractDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer record not found');

    const count = await this.prisma.maintenanceContract.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const contractNumber = `AMC-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const visitsCount = dto.visitsIncluded || 4;
    const intervalDays = dto.visitIntervalDays || 90;
    const start = new Date(dto.startDate);

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.maintenanceContract.create({
        data: {
          organizationId,
          customerId: customer.id,
          productId: dto.productId || null,
          serialNumber: dto.serialNumber?.trim() || null,
          contractNumber,
          contractType: dto.contractType,
          startDate: start,
          endDate: new Date(dto.endDate),
          visitsIncluded: visitsCount,
          visitsCompleted: 0,
          visitIntervalDays: intervalDays,
          amountPaid: dto.amountPaid || 0,
          status: ContractStatus.ACTIVE,
          notes: dto.notes,
        },
        include: {
          customer: true,
          product: true,
        },
      });

      // Automatically generate all scheduled visit milestones
      for (let i = 1; i <= visitsCount; i++) {
        const dueDate = new Date(start.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
        await tx.maintenanceSchedule.create({
          data: {
            contractId: contract.id,
            visitSequence: i,
            dueDate,
            status: ScheduleVisitStatus.SCHEDULED,
          },
        });
      }

      const fullContract = await tx.maintenanceContract.findUnique({
        where: { id: contract.id },
        include: {
          customer: true,
          product: true,
          schedules: { orderBy: { visitSequence: 'asc' } },
        },
      });

      return fullContract;
    });
  }

  /**
   * List contracts with pagination and aggregate statistics
   */
  async getContracts(organizationId: string, query: QueryContractDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search
        ? {
            OR: [
              { contractNumber: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items, statusCounts] = await Promise.all([
      this.prisma.maintenanceContract.count({ where }),
      this.prisma.maintenanceContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          product: true,
          schedules: { orderBy: { visitSequence: 'asc' } },
        },
      }),
      this.prisma.maintenanceContract.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const statsMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statsMap[s.status] = s._count;
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
        active: statsMap[ContractStatus.ACTIVE] || 0,
        expired: statsMap[ContractStatus.EXPIRED] || 0,
        pendingRenewal: statsMap[ContractStatus.PENDING_RENEWAL] || 0,
        cancelled: statsMap[ContractStatus.CANCELLED] || 0,
      },
    };
  }

  /**
   * Get single contract with full schedules
   */
  async getContract(organizationId: string, id: string) {
    const contract = await this.prisma.maintenanceContract.findFirst({
      where: { id, organizationId },
      include: {
        customer: { include: { addresses: true } },
        product: true,
        schedules: {
          include: {
            workOrder: {
              include: {
                technician: { include: { user: true } },
              },
            },
          },
          orderBy: { visitSequence: 'asc' },
        },
      },
    });

    if (!contract) throw new NotFoundException('Maintenance contract not found');
    return contract;
  }

  /**
   * Get upcoming preventive schedules due within N days
   */
  async getUpcomingSchedules(organizationId: string, daysAhead: number = 14) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where: {
        contract: { organizationId, status: ContractStatus.ACTIVE },
        status: ScheduleVisitStatus.SCHEDULED,
        dueDate: { lte: targetDate },
      },
      include: {
        contract: {
          include: {
            customer: { include: { addresses: true } },
            product: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return schedules;
  }

  /**
   * Generate an automated Preventive Maintenance Work Order for a scheduled visit
   */
  async generatePreventiveWorkOrder(
    organizationId: string,
    scheduleId: string,
    actorId?: string,
  ) {
    const schedule = await this.prisma.maintenanceSchedule.findFirst({
      where: {
        id: scheduleId,
        contract: { organizationId },
      },
      include: {
        contract: {
          include: {
            customer: { include: { addresses: true } },
            product: true,
          },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Schedule milestone not found');
    if (schedule.status === ScheduleVisitStatus.GENERATED && schedule.workOrderId) {
      return { message: 'Work order already generated for this schedule milestone', schedule };
    }

    const { contract } = schedule;
    const count = await this.prisma.workOrder.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const workOrderNumber = `WO-${year}-${(count + 1001).toString().padStart(4, '0')}`;
    const customerOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const customerAddress =
      contract.customer.addresses.find((a) => a.isDefault) || contract.customer.addresses[0];

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          organizationId,
          workOrderNumber,
          customerId: contract.customerId,
          customerAddressId: customerAddress?.id || null,
          productId: contract.productId || null,
          title: `Preventive Maintenance Visit #${schedule.visitSequence} (${contract.contractType.replace(/_/g, ' ')})`,
          description: `Scheduled periodic maintenance inspection under Contract #${contract.contractNumber}. Complete multi-point equipment diagnostic checklist, clean filters, calibrate voltage, and verify operating safety.`,
          priority: WorkOrderPriority.MEDIUM,
          status: WorkOrderStatus.DRAFT,
          scheduledDate: schedule.dueDate,
          timeSlot: '10:00 AM - 01:00 PM',
          customerOtp,
        },
      });

      const updatedSchedule = await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          status: ScheduleVisitStatus.GENERATED,
          workOrderId: workOrder.id,
        },
        include: { workOrder: true },
      });

      return {
        message: `Preventive Work Order #${workOrderNumber} successfully generated`,
        workOrder,
        schedule: updatedSchedule,
      };
    });
  }

  /**
   * Mark a scheduled visit as completed
   */
  async markScheduleCompleted(organizationId: string, scheduleId: string) {
    const schedule = await this.prisma.maintenanceSchedule.findFirst({
      where: { id: scheduleId, contract: { organizationId } },
      include: { contract: true },
    });
    if (!schedule) throw new NotFoundException('Schedule milestone not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          status: ScheduleVisitStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.maintenanceContract.update({
        where: { id: schedule.contractId },
        data: {
          visitsCompleted: { increment: 1 },
        },
      });

      return updated;
    });
  }
}
