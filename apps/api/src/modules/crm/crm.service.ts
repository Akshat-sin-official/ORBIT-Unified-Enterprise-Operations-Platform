import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/create-customer.dto';
import {
  CreateProductCategoryDto,
  CreateProductDto,
} from './dto/create-product.dto';
import { RegisterProductDto } from './dto/register-product.dto';
import { CreateCustomerInteractionDto } from './dto/create-interaction.dto';
import { WarrantyCoverageType, WarrantyStatus, Prisma } from '@prisma/client';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Customers ─────────────────────────────────────────────────────────────

  async getCustomers(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: any;
      type?: any;
    },
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search } },
              { customerCode: { contains: params.search, mode: 'insensitive' } },
              { companyName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          addresses: true,
          _count: {
            select: {
              registrations: true,
              interactions: true,
            },
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

  async getCustomer(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        addresses: true,
        registrations: {
          include: {
            product: {
              include: { category: true },
            },
            warranty: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async createCustomer(organizationId: string, dto: CreateCustomerDto) {
    // Generate next customer code: CUST-<number>
    const count = await this.prisma.customer.count({ where: { organizationId } });
    const customerCode = `CUST-${(count + 1001).toString()}`;

    return this.prisma.customer.create({
      data: {
        organizationId,
        customerCode,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        type: dto.type,
        status: dto.status,
        notes: dto.notes,
        ...(dto.address
          ? {
              addresses: {
                create: {
                  addressType: dto.address.addressType,
                  street: dto.address.street,
                  city: dto.address.city,
                  state: dto.address.state,
                  postalCode: dto.address.postalCode,
                  country: dto.address.country || 'India',
                  isDefault: true,
                },
              },
            }
          : {}),
      },
      include: {
        addresses: true,
      },
    });
  }

  async updateCustomer(organizationId: string, id: string, dto: UpdateCustomerDto) {
    await this.getCustomer(organizationId, id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        addresses: true,
      },
    });
  }

  // ─── Categories & Products ──────────────────────────────────────────────────

  async getCategories(organizationId: string) {
    return this.prisma.productCategory.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(organizationId: string, dto: CreateProductCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    return this.prisma.productCategory.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async getProducts(
    organizationId: string,
    params?: { categoryId?: string; search?: string },
  ) {
    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params?.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { modelNumber: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            registrations: true,
            serialNumbers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        serialNumbers: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        registrations: {
          take: 50,
          include: {
            customer: true,
            warranty: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createProduct(organizationId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: {
        organizationId_sku: {
          organizationId,
          sku: dto.sku,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
    }

    return this.prisma.product.create({
      data: {
        organizationId,
        sku: dto.sku,
        name: dto.name,
        modelNumber: dto.modelNumber,
        description: dto.description,
        defaultWarrantyMonths: dto.defaultWarrantyMonths ?? 12,
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  // ─── Product Registration & Warranty ────────────────────────────────────────

  async registerProduct(organizationId: string, dto: RegisterProductDto) {
    // 1. Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this organization');
    }

    // 2. Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Product model not found');
    }

    // 3. Check if serial number already registered
    const trimmedSerial = dto.serialNumber.trim().toUpperCase();
    const alreadyRegistered = await this.prisma.productRegistration.findUnique({
      where: {
        organizationId_serialNumber: {
          organizationId,
          serialNumber: trimmedSerial,
        },
      },
    });

    if (alreadyRegistered) {
      throw new ConflictException(
        `Serial number "${trimmedSerial}" is already registered to a customer.`,
      );
    }

    // 4. Calculate Warranty dates
    const purchaseDate = new Date(dto.purchaseDate);
    if (isNaN(purchaseDate.getTime())) {
      throw new BadRequestException('Invalid purchase date');
    }

    const months = dto.warrantyMonths ?? product.defaultWarrantyMonths ?? 12;
    const endDate = new Date(purchaseDate);
    endDate.setMonth(endDate.getMonth() + months);

    const now = new Date();
    const warrantyStatus =
      endDate > now ? WarrantyStatus.ACTIVE : WarrantyStatus.EXPIRED;
    const warrantyNumber = `WAR-${trimmedSerial}`;

    // 5. Execute registration in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert ProductSerialNumber record to mark isRegistered = true
      await tx.productSerialNumber.upsert({
        where: {
          organizationId_serialNumber: {
            organizationId,
            serialNumber: trimmedSerial,
          },
        },
        create: {
          organizationId,
          productId: product.id,
          serialNumber: trimmedSerial,
          isRegistered: true,
        },
        update: {
          isRegistered: true,
          productId: product.id,
        },
      });

      // Create Registration
      const registration = await tx.productRegistration.create({
        data: {
          organizationId,
          customerId: customer.id,
          productId: product.id,
          serialNumber: trimmedSerial,
          purchaseDate,
          invoiceNumber: dto.invoiceNumber,
          sellerName: dto.sellerName,
          verified: true,
        },
      });

      // Create Warranty
      const warranty = await tx.warranty.create({
        data: {
          organizationId,
          registrationId: registration.id,
          warrantyNumber,
          coverageType: dto.coverageType || WarrantyCoverageType.STANDARD,
          status: warrantyStatus,
          startDate: purchaseDate,
          endDate,
          terms:
            dto.terms ||
            `Standard ${months}-month comprehensive manufacturer parts & labor warranty.`,
        },
      });

      return {
        registration,
        warranty,
        product,
        customer,
      };
    });

    this.notificationService
      .dispatch(organizationId, {
        category: 'WARRANTY_CLAIM_UPDATED',
        title: `Warranty Certificate Issued: ${result.warranty.warrantyNumber}`,
        message: `Your product ${result.product.name} (S/N: ${result.registration.serialNumber}) is registered under ${result.warranty.coverageType} warranty valid through ${new Date(result.warranty.endDate).toLocaleDateString()}.`,
        customerName: result.customer.name,
        customerEmail: result.customer.email,
        customerPhone: result.customer.phone || undefined,
        metadata: {
          warrantyNumber: result.warranty.warrantyNumber,
          serialNumber: result.registration.serialNumber,
          product: result.product.name,
          validUntil: new Date(result.warranty.endDate).toLocaleDateString(),
        },
      })
      .catch(() => {});

    return result;
  }

  async checkWarranty(organizationId: string, serialNumber: string) {
    const trimmedSerial = serialNumber.trim().toUpperCase();

    // 1. Look up existing registration
    const registration = await this.prisma.productRegistration.findUnique({
      where: {
        organizationId_serialNumber: {
          organizationId,
          serialNumber: trimmedSerial,
        },
      },
      include: {
        customer: true,
        product: {
          include: { category: true },
        },
        warranty: true,
      },
    });

    if (registration) {
      const now = new Date();
      const endDate = registration.warranty?.endDate
        ? new Date(registration.warranty.endDate)
        : null;
      const isExpired = endDate ? endDate < now : true;
      const daysRemaining =
        endDate && !isExpired
          ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

      return {
        found: true,
        registered: true,
        status: isExpired ? 'EXPIRED' : (registration.warranty?.status || 'ACTIVE'),
        isCovered: !isExpired && registration.warranty?.status === WarrantyStatus.ACTIVE,
        daysRemaining,
        serialNumber: trimmedSerial,
        customer: {
          id: registration.customer.id,
          code: registration.customer.customerCode,
          name: registration.customer.name,
          phone: registration.customer.phone,
          email: registration.customer.email,
        },
        product: {
          id: registration.product.id,
          name: registration.product.name,
          sku: registration.product.sku,
          modelNumber: registration.product.modelNumber,
          category: registration.product.category?.name,
        },
        purchaseDate: registration.purchaseDate,
        sellerName: registration.sellerName,
        invoiceNumber: registration.invoiceNumber,
        warranty: registration.warranty
          ? {
              warrantyNumber: registration.warranty.warrantyNumber,
              coverageType: registration.warranty.coverageType,
              startDate: registration.warranty.startDate,
              endDate: registration.warranty.endDate,
              terms: registration.warranty.terms,
            }
          : null,
      };
    }

    // 2. Check if serial number is in manufactured inventory
    const serialRecord = await this.prisma.productSerialNumber.findUnique({
      where: {
        organizationId_serialNumber: {
          organizationId,
          serialNumber: trimmedSerial,
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    if (serialRecord) {
      return {
        found: true,
        registered: false,
        status: 'UNREGISTERED',
        isCovered: false,
        daysRemaining: 0,
        serialNumber: trimmedSerial,
        manufacturedBatch: serialRecord.manufacturingBatch,
        manufacturedDate: serialRecord.manufacturedDate,
        product: {
          id: serialRecord.product.id,
          name: serialRecord.product.name,
          sku: serialRecord.product.sku,
          modelNumber: serialRecord.product.modelNumber,
          category: serialRecord.product.category?.name,
          defaultWarrantyMonths: serialRecord.product.defaultWarrantyMonths,
        },
      };
    }

    return {
      found: false,
      registered: false,
      status: 'NOT_FOUND',
      isCovered: false,
      daysRemaining: 0,
      serialNumber: trimmedSerial,
      message: `Serial number ${trimmedSerial} does not exist in ORBIT records.`,
    };
  }

  // ─── Customer Interactions ──────────────────────────────────────────────────

  async addInteraction(
    organizationId: string,
    customerId: string,
    actorId: string | undefined,
    dto: CreateCustomerInteractionDto,
  ) {
    await this.getCustomer(organizationId, customerId);

    return this.prisma.customerInteraction.create({
      data: {
        organizationId,
        customerId,
        actorId,
        channel: dto.channel,
        subject: dto.subject,
        notes: dto.notes,
      },
    });
  }

  async getInteractions(organizationId: string, customerId: string) {
    return this.prisma.customerInteraction.findMany({
      where: { organizationId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
