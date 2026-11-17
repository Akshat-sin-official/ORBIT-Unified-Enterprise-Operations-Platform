import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { InvoiceStatus } from '@prisma/client';

@ApiTags('Billing & Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Permissions('invoice.view')
  @ApiOperation({ summary: 'Get finance summary metrics (billed, collected, receivables, warranty claims)' })
  async getSummary(@CurrentUser('organizationId') organizationId: string) {
    return this.financeService.getFinanceSummary(organizationId);
  }

  @Get('invoices')
  @Permissions('invoice.view')
  @ApiOperation({ summary: 'List customer and service invoices with status filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getInvoices(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: InvoiceStatus,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.financeService.getInvoices(organizationId, {
      page,
      limit,
      status,
      search,
      customerId,
    });
  }

  @Post('invoices')
  @Permissions('invoice.create')
  @ApiOperation({ summary: 'Generate a new service or parts invoice' })
  async createInvoice(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.financeService.createInvoice(organizationId, dto);
  }

  @Get('invoices/:id')
  @Permissions('invoice.view')
  @ApiOperation({ summary: 'Get invoice details with itemized bill and payment history' })
  async getInvoice(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.financeService.getInvoice(organizationId, id);
  }

  @Post('invoices/:id/payments')
  @Permissions('payment.record')
  @ApiOperation({ summary: 'Record customer payment transaction against invoice' })
  async recordPayment(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.financeService.recordPayment(organizationId, id, dto);
  }
}
