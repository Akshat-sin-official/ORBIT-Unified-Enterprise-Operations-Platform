import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreatePartDto } from './dto/create-part.dto';
import {
  StockReceiptDto,
  StockReservationDto,
  StockIssueDto,
  StockTransferDto,
} from './dto/stock-movement.dto';
import { StockMovementType, WarehouseType, Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Warehouses ────────────────────────────────────────────────────────────

  async getWarehouses(organizationId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            stockBalances: true,
            binLocations: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return warehouses;
  }

  async getWarehouse(organizationId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, organizationId },
      include: {
        binLocations: true,
        stockBalances: {
          include: {
            part: {
              include: { category: true },
            },
            binLocation: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async createWarehouse(organizationId: string, dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Warehouse code ${dto.code} already exists`);
    }

    return this.prisma.warehouse.create({
      data: {
        organizationId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        type: dto.type || WarehouseType.REGIONAL_DEPOT,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'India',
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ─── Part Categories & Parts Master ────────────────────────────────────────

  async getPartCategories(organizationId: string) {
    return this.prisma.partCategory.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { parts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getParts(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PartWhereInput = { organizationId };

    if (params.search) {
      where.OR = [
        { partNumber: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    const [items, total] = await Promise.all([
      this.prisma.part.findMany({
        where,
        include: {
          category: true,
          stockBalances: {
            include: {
              warehouse: true,
              binLocation: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { partNumber: 'asc' },
      }),
      this.prisma.part.count({ where }),
    ]);

    // Compute aggregated available and on-hand across all warehouses
    const enriched = items.map((part: any) => {
      const totalOnHand = part.stockBalances.reduce((sum: number, b: any) => sum + b.quantityOnHand, 0);
      const totalReserved = part.stockBalances.reduce((sum: number, b: any) => sum + b.quantityReserved, 0);
      const totalAvailable = part.stockBalances.reduce((sum: number, b: any) => sum + b.quantityAvailable, 0);
      const isLowStock = totalAvailable <= part.minSafetyStock;

      return {
        ...part,
        totalOnHand,
        totalReserved,
        totalAvailable,
        isLowStock,
      };
    });

    return {
      items: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPart(organizationId: string, id: string) {
    const part = await this.prisma.part.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        stockBalances: {
          include: {
            warehouse: true,
            binLocation: true,
          },
        },
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            sourceWarehouse: true,
            destinationWarehouse: true,
            actor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Part with ID ${id} not found`);
    }

    return part;
  }

  async createPart(organizationId: string, dto: CreatePartDto) {
    const existing = await this.prisma.part.findUnique({
      where: {
        organizationId_partNumber: {
          organizationId,
          partNumber: dto.partNumber,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Part number ${dto.partNumber} already exists`);
    }

    return this.prisma.part.create({
      data: {
        organizationId,
        partNumber: dto.partNumber.toUpperCase(),
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        costPrice: dto.costPrice,
        retailPrice: dto.retailPrice,
        minSafetyStock: dto.minSafetyStock ?? 5,
        isSerialTracked: dto.isSerialTracked ?? false,
        compatibleModels: dto.compatibleModels || [],
      },
      include: {
        category: true,
      },
    });
  }

  // ─── Stock Balances ────────────────────────────────────────────────────────

  async getStockBalances(
    organizationId: string,
    params: {
      warehouseId?: string;
      partId?: string;
      lowStockOnly?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockBalanceWhereInput = { organizationId };

    if (params.warehouseId) {
      where.warehouseId = params.warehouseId;
    }

    if (params.partId) {
      where.partId = params.partId;
    }

    const [items, total] = await Promise.all([
      this.prisma.stockBalance.findMany({
        where,
        include: {
          warehouse: true,
          binLocation: true,
          part: {
            include: { category: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ warehouse: { code: 'asc' } }, { part: { partNumber: 'asc' } }],
      }),
      this.prisma.stockBalance.count({ where }),
    ]);

    const enriched = items.map((b: any) => ({
      ...b,
      isLowStock: b.quantityAvailable <= b.part.minSafetyStock,
    }));

    return {
      items: params.lowStockOnly ? enriched.filter((i: any) => i.isLowStock) : enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Stock Movements Ledger ────────────────────────────────────────────────

  async getStockMovements(
    organizationId: string,
    params: {
      warehouseId?: string;
      partId?: string;
      type?: StockMovementType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = { organizationId };

    if (params.partId) {
      where.partId = params.partId;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.warehouseId) {
      where.OR = [
        { sourceWarehouseId: params.warehouseId },
        { destinationWarehouseId: params.warehouseId },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          part: true,
          sourceWarehouse: true,
          destinationWarehouse: true,
          workOrder: {
            select: { id: true, workOrderNumber: true, title: true },
          },
          technician: {
            select: { id: true, technicianCode: true, user: { select: { firstName: true, lastName: true } } },
          },
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
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

  // ─── Atomic Transactions: Receipt, Reservation, Issue, Transfer ───────────

  async receiveStock(organizationId: string, dto: StockReceiptDto, actorId?: string) {
    const part = await this.prisma.part.findFirst({
      where: { id: dto.partId, organizationId },
    });
    if (!part) {
      throw new NotFoundException(`Part with ID ${dto.partId} not found`);
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${dto.warehouseId} not found`);
    }

    const movementNumber = `MOV-REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Upsert stock balance
      const balance = await tx.stockBalance.upsert({
        where: {
          warehouseId_partId: {
            warehouseId: dto.warehouseId,
            partId: dto.partId,
          },
        },
        update: {
          quantityOnHand: { increment: dto.quantity },
          quantityAvailable: { increment: dto.quantity },
          ...(dto.binLocationId ? { binLocationId: dto.binLocationId } : {}),
        },
        create: {
          organizationId,
          warehouseId: dto.warehouseId,
          partId: dto.partId,
          quantityOnHand: dto.quantity,
          quantityReserved: 0,
          quantityAvailable: dto.quantity,
          binLocationId: dto.binLocationId,
        },
      });

      // 2. Record append-only movement
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          movementNumber,
          type: StockMovementType.GOODS_RECEIPT,
          partId: dto.partId,
          destinationWarehouseId: dto.warehouseId,
          quantity: dto.quantity,
          unitCost: dto.unitCost ?? part.costPrice,
          referenceNotes: dto.referenceNumber
            ? `Ref: ${dto.referenceNumber}. ${dto.notes || ''}`.trim()
            : dto.notes,
          actorId,
        },
        include: {
          part: true,
          destinationWarehouse: true,
        },
      });

      return { balance, movement };
    });
  }

  async reserveStock(organizationId: string, dto: StockReservationDto, actorId?: string) {
    const balance = await this.prisma.stockBalance.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: dto.warehouseId,
          partId: dto.partId,
        },
      },
    });

    if (!balance || balance.quantityAvailable < dto.quantity) {
      throw new BadRequestException(
        `Insufficient available stock to reserve. Available: ${balance?.quantityAvailable || 0}, Requested: ${dto.quantity}`,
      );
    }

    const movementNumber = `MOV-RES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update balance: reserve quantity
      const updatedBalance = await tx.stockBalance.update({
        where: {
          warehouseId_partId: {
            warehouseId: dto.warehouseId,
            partId: dto.partId,
          },
        },
        data: {
          quantityReserved: { increment: dto.quantity },
          quantityAvailable: { decrement: dto.quantity },
        },
      });

      // 2. Record reservation movement
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          movementNumber,
          type: StockMovementType.RESERVATION,
          partId: dto.partId,
          sourceWarehouseId: dto.warehouseId,
          workOrderId: dto.workOrderId,
          quantity: dto.quantity,
          referenceNotes: dto.notes,
          actorId,
        },
        include: {
          part: true,
          sourceWarehouse: true,
          workOrder: true,
        },
      });

      return { balance: updatedBalance, movement };
    });
  }

  async issueStock(organizationId: string, dto: StockIssueDto, actorId?: string) {
    const balance = await this.prisma.stockBalance.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: dto.warehouseId,
          partId: dto.partId,
        },
      },
    });

    if (!balance || balance.quantityOnHand < dto.quantity) {
      throw new BadRequestException(
        `Insufficient on-hand stock to issue. On-Hand: ${balance?.quantityOnHand || 0}, Requested: ${dto.quantity}`,
      );
    }

    const movementNumber = `MOV-ISS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // If reserved previously, deduct from reserved first, else available
      const reservedToDeduct = Math.min(balance.quantityReserved, dto.quantity);
      const availableToDeduct = dto.quantity - reservedToDeduct;

      const updatedBalance = await tx.stockBalance.update({
        where: {
          warehouseId_partId: {
            warehouseId: dto.warehouseId,
            partId: dto.partId,
          },
        },
        data: {
          quantityOnHand: { decrement: dto.quantity },
          ...(reservedToDeduct > 0 ? { quantityReserved: { decrement: reservedToDeduct } } : {}),
          ...(availableToDeduct > 0 ? { quantityAvailable: { decrement: availableToDeduct } } : {}),
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          movementNumber,
          type: StockMovementType.ISSUE_TO_TECHNICIAN,
          partId: dto.partId,
          sourceWarehouseId: dto.warehouseId,
          technicianId: dto.technicianId,
          workOrderId: dto.workOrderId,
          quantity: dto.quantity,
          referenceNotes: dto.notes,
          actorId,
        },
        include: {
          part: true,
          sourceWarehouse: true,
          technician: true,
          workOrder: true,
        },
      });

      return { balance: updatedBalance, movement };
    });
  }

  async transferStock(organizationId: string, dto: StockTransferDto, actorId?: string) {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException('Source and destination warehouses cannot be the same');
    }

    const sourceBalance = await this.prisma.stockBalance.findUnique({
      where: {
        warehouseId_partId: {
          warehouseId: dto.sourceWarehouseId,
          partId: dto.partId,
        },
      },
    });

    if (!sourceBalance || sourceBalance.quantityAvailable < dto.quantity) {
      throw new BadRequestException(
        `Insufficient available stock in source warehouse to transfer. Available: ${sourceBalance?.quantityAvailable || 0}, Requested: ${dto.quantity}`,
      );
    }

    const movementNumber = `MOV-TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Decrement source warehouse
      const updatedSource = await tx.stockBalance.update({
        where: {
          warehouseId_partId: {
            warehouseId: dto.sourceWarehouseId,
            partId: dto.partId,
          },
        },
        data: {
          quantityOnHand: { decrement: dto.quantity },
          quantityAvailable: { decrement: dto.quantity },
        },
      });

      // 2. Increment destination warehouse
      const updatedDest = await tx.stockBalance.upsert({
        where: {
          warehouseId_partId: {
            warehouseId: dto.destinationWarehouseId,
            partId: dto.partId,
          },
        },
        update: {
          quantityOnHand: { increment: dto.quantity },
          quantityAvailable: { increment: dto.quantity },
        },
        create: {
          organizationId,
          warehouseId: dto.destinationWarehouseId,
          partId: dto.partId,
          quantityOnHand: dto.quantity,
          quantityReserved: 0,
          quantityAvailable: dto.quantity,
        },
      });

      // 3. Movement ledger entry
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          movementNumber,
          type: StockMovementType.TRANSFER,
          partId: dto.partId,
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          quantity: dto.quantity,
          referenceNotes: dto.referenceNumber
            ? `Transfer Ref: ${dto.referenceNumber}. ${dto.notes || ''}`.trim()
            : dto.notes,
          actorId,
        },
        include: {
          part: true,
          sourceWarehouse: true,
          destinationWarehouse: true,
        },
      });

      return { sourceBalance: updatedSource, destinationBalance: updatedDest, movement };
    });
  }

  // ─── Inventory Summary Dashboard Metrics ───────────────────────────────────

  async getInventorySummary(organizationId: string) {
    const [warehouseCount, totalParts, balances] = await Promise.all([
      this.prisma.warehouse.count({ where: { organizationId, isActive: true } }),
      this.prisma.part.count({ where: { organizationId } }),
      this.prisma.stockBalance.findMany({
        where: { organizationId },
        include: {
          part: {
            select: { costPrice: true, minSafetyStock: true },
          },
        },
      }),
    ]);

    let totalValuation = 0;
    let totalOnHandUnits = 0;
    let totalReservedUnits = 0;
    let lowStockCount = 0;

    for (const b of balances) {
      const cost = Number(b.part.costPrice) || 0;
      totalValuation += b.quantityOnHand * cost;
      totalOnHandUnits += b.quantityOnHand;
      totalReservedUnits += b.quantityReserved;
      if (b.quantityAvailable <= b.part.minSafetyStock) {
        lowStockCount++;
      }
    }

    return {
      warehouseCount,
      totalParts,
      totalValuation,
      totalOnHandUnits,
      totalReservedUnits,
      lowStockAlerts: lowStockCount,
    };
  }

  async bulkUpdateParts(
    organizationId: string,
    dto: { partIds: string[]; action: 'minSafetyStock' | 'reorderPoint'; value: number },
  ) {
    const { partIds, action, value } = dto;
    if (!partIds || partIds.length === 0) {
      throw new BadRequestException('partIds array cannot be empty');
    }
    const data: any = {};
    if (action === 'minSafetyStock') data.minSafetyStock = Number(value);
    if (action === 'reorderPoint') data.reorderPoint = Number(value);

    const res = await this.prisma.part.updateMany({
      where: { id: { in: partIds }, organizationId },
      data,
    });
    return { count: res.count, message: `Successfully updated ${res.count} part(s)` };
  }
}
