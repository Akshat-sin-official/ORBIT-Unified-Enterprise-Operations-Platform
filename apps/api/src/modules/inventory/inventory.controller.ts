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
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreatePartDto } from './dto/create-part.dto';
import {
  StockReceiptDto,
  StockReservationDto,
  StockIssueDto,
  StockTransferDto,
} from './dto/stock-movement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { StockMovementType } from '@prisma/client';

@ApiTags('Inventory & Warehouse Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── Summary ───────────────────────────────────────────────────────────────

  @Get('summary')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Get inventory summary metrics (valuation, low stock alerts, counts)' })
  async getSummary(@CurrentUser('organizationId') organizationId: string) {
    return this.inventoryService.getInventorySummary(organizationId);
  }

  // ─── Warehouses ────────────────────────────────────────────────────────────

  @Get('warehouses')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List all warehouses and regional hubs' })
  async getWarehouses(@CurrentUser('organizationId') organizationId: string) {
    return this.inventoryService.getWarehouses(organizationId);
  }

  @Post('warehouses')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'Create a new warehouse or service depot' })
  async createWarehouse(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.inventoryService.createWarehouse(organizationId, dto);
  }

  @Get('warehouses/:id')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Get warehouse details with bin locations and stock balances' })
  async getWarehouse(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getWarehouse(organizationId, id);
  }

  // ─── Categories & Parts ────────────────────────────────────────────────────

  @Get('categories')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List all part categories' })
  async getCategories(@CurrentUser('organizationId') organizationId: string) {
    return this.inventoryService.getPartCategories(organizationId);
  }

  @Get('parts')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List parts catalog with aggregated stock and safety threshold alerts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async getParts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.inventoryService.getParts(organizationId, {
      page,
      limit,
      search,
      categoryId,
    });
  }

  @Post('parts')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'Create a new spare part SKU in catalog' })
  async createPart(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreatePartDto,
  ) {
    return this.inventoryService.createPart(organizationId, dto);
  }

  @Post('parts/bulk')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'Bulk update parts (safety thresholds, reorder points)' })
  async bulkUpdateParts(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { partIds: string[]; action: 'minSafetyStock' | 'reorderPoint'; value: number },
  ) {
    return this.inventoryService.bulkUpdateParts(organizationId, dto);
  }

  @Get('parts/:id')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Get part details with warehouse breakdown and movement history' })
  async getPart(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getPart(organizationId, id);
  }

  // ─── Stock Balances ────────────────────────────────────────────────────────

  @Get('balances')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List warehouse stock balances with on-hand, reserved, and available' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'partId', required: false, type: String })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBalances(
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('partId') partId?: string,
    @Query('lowStockOnly') lowStockOnly?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockBalances(organizationId, {
      warehouseId,
      partId,
      lowStockOnly: lowStockOnly === true || String(lowStockOnly) === 'true',
      page,
      limit,
    });
  }

  // ─── Stock Movements Ledger ────────────────────────────────────────────────

  @Get('movements')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Get append-only stock movement transaction ledger' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'partId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMovements(
    @CurrentUser('organizationId') organizationId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('partId') partId?: string,
    @Query('type') type?: StockMovementType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockMovements(organizationId, {
      warehouseId,
      partId,
      type,
      page,
      limit,
    });
  }

  // ─── Transactions: Inward Receipt, Reservation, Issue, Transfer ───────────

  @Post('movements/receipt')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'Receive stock (Goods Receipt Note / Inwarding) into warehouse' })
  async receiveStock(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: StockReceiptDto,
  ) {
    return this.inventoryService.receiveStock(organizationId, dto, userId);
  }

  @Post('movements/reserve')
  @Permissions('inventory.reserve')
  @ApiOperation({ summary: 'Reserve stock for a work order' })
  async reserveStock(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: StockReservationDto,
  ) {
    return this.inventoryService.reserveStock(organizationId, dto, userId);
  }

  @Post('movements/issue')
  @Permissions('inventory.issue')
  @ApiOperation({ summary: 'Issue stock to a field technician or work order' })
  async issueStock(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: StockIssueDto,
  ) {
    return this.inventoryService.issueStock(organizationId, dto, userId);
  }

  @Post('movements/transfer')
  @Permissions('inventory.stock.transfer')
  @ApiOperation({ summary: 'Transfer stock between regional warehouses' })
  async transferStock(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: StockTransferDto,
  ) {
    return this.inventoryService.transferStock(organizationId, dto, userId);
  }
}
