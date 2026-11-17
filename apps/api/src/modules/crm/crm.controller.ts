import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CrmService } from './crm.service';
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CustomerStatus, CustomerType } from '@prisma/client';

@ApiTags('CRM & Warranties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ─── Customers ─────────────────────────────────────────────────────────────

  @Get('customers')
  @Permissions('customer.view')
  @ApiOperation({ summary: 'List customers with pagination, search and counts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CustomerStatus })
  @ApiQuery({ name: 'type', required: false, enum: CustomerType })
  async getCustomers(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: CustomerStatus,
    @Query('type') type?: CustomerType,
  ) {
    return this.crmService.getCustomers(organizationId, {
      page,
      limit,
      search,
      status,
      type,
    });
  }

  @Post('customers')
  @Permissions('customer.create')
  @ApiOperation({ summary: 'Create a new customer account' })
  async createCustomer(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.crmService.createCustomer(organizationId, dto);
  }

  @Get('customers/:id')
  @Permissions('customer.view')
  @ApiOperation({ summary: 'Get full customer 360 profile with assets & timeline' })
  async getCustomer(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.crmService.getCustomer(organizationId, id);
  }

  @Patch('customers/:id')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'Update customer contact info and notes' })
  async updateCustomer(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.crmService.updateCustomer(organizationId, id, dto);
  }

  @Post('customers/:id/interactions')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'Log a customer interaction note or touchpoint' })
  async logInteraction(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerInteractionDto,
  ) {
    return this.crmService.addInteraction(organizationId, id, actorId, dto);
  }

  // ─── Products & Categories ──────────────────────────────────────────────────

  @Get('categories')
  @Permissions('product.view')
  @ApiOperation({ summary: 'List product categories' })
  async getCategories(@CurrentUser('organizationId') organizationId: string) {
    return this.crmService.getCategories(organizationId);
  }

  @Post('categories')
  @Permissions('product.view')
  @ApiOperation({ summary: 'Create a product category' })
  async createCategory(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.crmService.createCategory(organizationId, dto);
  }

  @Get('products')
  @Permissions('product.view')
  @ApiOperation({ summary: 'List catalog products with category and asset counts' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getProducts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.crmService.getProducts(organizationId, { categoryId, search });
  }

  @Post('products')
  @Permissions('product.view')
  @ApiOperation({ summary: 'Create a new product model in the catalog' })
  async createProduct(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.crmService.createProduct(organizationId, dto);
  }

  @Get('products/:id')
  @Permissions('product.view')
  @ApiOperation({ summary: 'Get product model details with inventory & serial numbers' })
  async getProduct(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.crmService.getProduct(organizationId, id);
  }

  // ─── Product Registration & Warranties ──────────────────────────────────────

  @Post('products/register')
  @Permissions('product.register')
  @ApiOperation({ summary: 'Register product serial number to customer and issue warranty' })
  async registerProduct(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RegisterProductDto,
  ) {
    return this.crmService.registerProduct(organizationId, dto);
  }

  @Get('warranty/check/:serialNumber')
  @Permissions('warranty.view')
  @ApiOperation({ summary: 'Instant live warranty status lookup by serial number' })
  async checkWarranty(
    @CurrentUser('organizationId') organizationId: string,
    @Param('serialNumber') serialNumber: string,
  ) {
    return this.crmService.checkWarranty(organizationId, serialNumber);
  }
}
