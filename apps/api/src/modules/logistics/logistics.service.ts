import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ShipmentStatus, ShipmentType, CarrierType, Prisma } from '@prisma/client';

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Shipments ─────────────────────────────────────────────────────────────

  async getShipments(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ShipmentStatus;
      type?: ShipmentType;
      search?: string;
      workOrderId?: string;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = { organizationId };

    if (params.status) {
      where.status = params.status;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.workOrderId) {
      where.workOrderId = params.workOrderId;
    }

    if (params.search) {
      where.OR = [
        { shipmentNumber: { contains: params.search, mode: 'insensitive' } },
        { trackingNumber: { contains: params.search, mode: 'insensitive' } },
        { recipientName: { contains: params.search, mode: 'insensitive' } },
        { destinationCity: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: {
          originWarehouse: true,
          workOrder: {
            select: { id: true, workOrderNumber: true, title: true },
          },
          vehicle: true,
          items: {
            include: { part: true },
          },
          trackingEvents: {
            take: 1,
            orderBy: { timestamp: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getShipment(organizationId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, organizationId },
      include: {
        originWarehouse: true,
        workOrder: {
          include: {
            customer: true,
            technician: true,
          },
        },
        vehicle: true,
        items: {
          include: { part: true },
        },
        trackingEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async getShipmentByTrackingNumber(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        originWarehouse: true,
        items: {
          include: { part: true },
        },
        trackingEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with tracking number ${trackingNumber} not found`);
    }

    return shipment;
  }

  async createShipment(organizationId: string, dto: CreateShipmentDto) {
    const count = await this.prisma.shipment.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(4, '0');
    const shipmentNumber = `SHP-2026-${seq}`;
    const carrier = dto.carrier || CarrierType.INTERNAL_FLEET;
    const trackingNumber = `TRK-${carrier}-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const shipment = await tx.shipment.create({
        data: {
          organizationId,
          shipmentNumber,
          trackingNumber,
          type: dto.type || ShipmentType.FORWARD_PART_DISPATCH,
          carrier,
          status: ShipmentStatus.READY_FOR_PICKUP,
          originWarehouseId: dto.originWarehouseId,
          workOrderId: dto.workOrderId,
          vehicleId: dto.vehicleId,
          destinationAddress: dto.destinationAddress,
          destinationCity: dto.destinationCity,
          destinationState: dto.destinationState,
          destinationPostalCode: dto.destinationPostalCode,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
          notes: dto.notes,
          items: dto.items?.length
            ? {
                create: dto.items.map((i) => ({
                  partId: i.partId,
                  quantity: i.quantity || 1,
                  serialNumbers: i.serialNumbers || [],
                })),
              }
            : undefined,
          trackingEvents: {
            create: {
              status: ShipmentStatus.READY_FOR_PICKUP,
              location: dto.destinationCity || 'Origin Sorting Hub',
              description: 'Shipment created and scheduled for dispatch',
              timestamp: new Date(),
            },
          },
        },
        include: {
          originWarehouse: true,
          items: { include: { part: true } },
          trackingEvents: true,
        },
      });

      return shipment;
    });
  }

  async updateShipmentStatus(organizationId: string, id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, organizationId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const isDelivered = dto.status === ShipmentStatus.DELIVERED;

      const updated = await tx.shipment.update({
        where: { id },
        data: {
          status: dto.status,
          ...(isDelivered
            ? {
                actualDelivery: new Date(),
                proofOfDeliverySignee: dto.proofOfDeliverySignee,
                proofOfDeliveryNotes: dto.proofOfDeliveryNotes,
              }
            : {}),
        },
      });

      await tx.shipmentTrackingEvent.create({
        data: {
          shipmentId: id,
          status: dto.status,
          location: dto.location || 'In Transit',
          description: dto.description || `Status transitioned to ${dto.status}`,
          latitude: dto.latitude,
          longitude: dto.longitude,
          timestamp: new Date(),
        },
      });

      return updated;
    });
  }

  // ─── Fleet Vehicles ────────────────────────────────────────────────────────

  async getVehicles(organizationId: string) {
    return this.prisma.vehicle.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { shipments: true },
        },
      },
      orderBy: { registrationNumber: 'asc' },
    });
  }

  async createVehicle(organizationId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        organizationId_registrationNumber: {
          organizationId,
          registrationNumber: dto.registrationNumber.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Vehicle registration ${dto.registrationNumber} already exists`);
    }

    return this.prisma.vehicle.create({
      data: {
        organizationId,
        registrationNumber: dto.registrationNumber.toUpperCase(),
        model: dto.model,
        type: dto.type,
        status: dto.status,
        capacityKg: dto.capacityKg ?? 500,
        currentDriverName: dto.currentDriverName,
        currentDriverPhone: dto.currentDriverPhone,
      },
    });
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  async getLogisticsSummary(organizationId: string) {
    const [total, inTransit, delivered, outForDelivery, vehiclesCount] = await Promise.all([
      this.prisma.shipment.count({ where: { organizationId } }),
      this.prisma.shipment.count({ where: { organizationId, status: ShipmentStatus.IN_TRANSIT } }),
      this.prisma.shipment.count({ where: { organizationId, status: ShipmentStatus.DELIVERED } }),
      this.prisma.shipment.count({ where: { organizationId, status: ShipmentStatus.OUT_FOR_DELIVERY } }),
      this.prisma.vehicle.count({ where: { organizationId } }),
    ]);

    return {
      totalShipments: total,
      inTransit,
      delivered,
      outForDelivery,
      activeFleetVehicles: vehiclesCount,
    };
  }

  async bulkUpdateShipments(
    organizationId: string,
    dto: { shipmentIds: string[]; action: 'status' | 'carrier'; status?: ShipmentStatus; carrier?: string },
  ) {
    const { shipmentIds, action } = dto;
    if (!shipmentIds || shipmentIds.length === 0) {
      throw new BadRequestException('shipmentIds array cannot be empty');
    }

    if (action === 'status' && dto.status) {
      const now = new Date();
      return this.prisma.$transaction(async (tx) => {
        let count = 0;
        for (const id of shipmentIds) {
          const shp = await tx.shipment.findFirst({ where: { id, organizationId } });
          if (!shp || shp.status === dto.status) continue;

          const data: Prisma.ShipmentUpdateInput = { status: dto.status };
          if (dto.status === ShipmentStatus.DELIVERED && !shp.actualDelivery) {
            data.actualDelivery = now;
          }
          await tx.shipment.update({ where: { id: shp.id }, data });
          await tx.shipmentTrackingEvent.create({
            data: {
              shipmentId: shp.id,
              status: dto.status!,
              location: 'Operations Dispatch Hub',
              description: `Bulk status update to ${dto.status}`,
              timestamp: now,
            },
          });
          count++;
        }
        return { count, message: `Successfully updated ${count} shipment(s) to ${dto.status}` };
      });
    }

    if (action === 'carrier' && dto.carrier) {
      const res = await this.prisma.shipment.updateMany({
        where: { id: { in: shipmentIds }, organizationId },
        data: { carrier: dto.carrier as CarrierType },
      });
      return { count: res.count, message: `Successfully updated carrier for ${res.count} shipment(s)` };
    }

    throw new BadRequestException('Invalid bulk action or parameters');
  }
}
