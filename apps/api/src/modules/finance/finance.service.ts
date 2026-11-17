import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ─── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(
    organizationId: string,
    params: {
      page?: number;
      limit?: number;
      status?: InvoiceStatus;
      search?: string;
      customerId?: string;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { organizationId };

    if (params.status) {
      where.status = params.status;
    }

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          workOrder: {
            select: { id: true, workOrderNumber: true, title: true },
          },
          items: true,
          payments: {
            take: 1,
            orderBy: { paidAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
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

  async getInvoice(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
          include: { addresses: true },
        },
        workOrder: {
          include: {
            technician: {
              include: { user: true },
            },
            ticket: true,
          },
        },
        items: {
          include: { part: true },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async createInvoice(organizationId: string, dto: CreateInvoiceDto) {
    const count = await this.prisma.invoice.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-2026-${seq}`;

    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = dto.items.map((i) => {
      if (i.isWarrantyCovered) {
        return {
          description: i.description,
          partId: i.partId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: 0,
          amount: 0,
          isWarrantyCovered: true,
        };
      } else {
        const itemSubtotal = i.quantity * i.unitPrice;
        const rate = i.taxRate ?? 18.0;
        const itemTax = itemSubtotal * (rate / 100);
        subtotal += itemSubtotal;
        taxAmount += itemTax;

        return {
          description: i.description,
          partId: i.partId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: rate,
          amount: itemSubtotal,
          isWarrantyCovered: false,
        };
      }
    });

    const totalAmount = subtotal + taxAmount;
    const balanceDue = totalAmount;

    const createdInvoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        customerId: dto.customerId,
        workOrderId: dto.workOrderId,
        status: totalAmount === 0 ? InvoiceStatus.WARRANTY_ABSORBED : InvoiceStatus.ISSUED,
        subtotal,
        taxAmount,
        totalAmount,
        amountPaid: 0,
        balanceDue,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        items: {
          create: processedItems,
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    if (createdInvoice.customer?.phone) {
      this.whatsAppService
        .notifyCustomerInvoice(organizationId, {
          customerName: createdInvoice.customer.name,
          customerPhone: createdInvoice.customer.phone,
          invoiceNumber: createdInvoice.invoiceNumber,
          totalAmount: Number(createdInvoice.totalAmount),
          isWarrantyCovered: createdInvoice.status === InvoiceStatus.WARRANTY_ABSORBED,
        })
        .catch(() => {});
    }

    return createdInvoice;
  }

  // ─── Record Payment ────────────────────────────────────────────────────────

  async recordPayment(organizationId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const count = await this.prisma.payment.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(4, '0');
    const paymentNumber = `PAY-2026-${seq}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: {
          organizationId,
          invoiceId,
          paymentNumber,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          transactionRef: dto.transactionRef,
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          notes: dto.notes,
        },
      });

      const newAmountPaid = Number(invoice.amountPaid) + dto.amount;
      const newBalanceDue = Math.max(0, Number(invoice.totalAmount) - newAmountPaid);
      const isPaid = newBalanceDue <= 0;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          paidAt: isPaid ? new Date() : invoice.paidAt,
        },
        include: {
          payments: true,
          customer: true,
        },
      });

      return { payment, invoice: updatedInvoice };
    });
  }

  // ─── Summary Metrics ───────────────────────────────────────────────────────

  async getFinanceSummary(organizationId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      include: {
        items: true,
      },
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let warrantyClaimsAbsorbed = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;

    for (const inv of invoices) {
      totalBilled += Number(inv.totalAmount);
      totalCollected += Number(inv.amountPaid);
      totalOutstanding += Number(inv.balanceDue);

      if (inv.status === InvoiceStatus.PAID) {
        paidInvoicesCount++;
      } else if (inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.PARTIALLY_PAID) {
        pendingInvoicesCount++;
      }

      for (const item of inv.items) {
        if (item.isWarrantyCovered) {
          warrantyClaimsAbsorbed += Number(item.unitPrice) * item.quantity;
        }
      }
    }

    return {
      totalInvoices: invoices.length,
      paidInvoicesCount,
      pendingInvoicesCount,
      totalBilled,
      totalCollected,
      totalOutstanding,
      warrantyClaimsAbsorbed,
    };
  }
}
