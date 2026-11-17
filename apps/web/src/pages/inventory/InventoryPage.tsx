import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Boxes,
  Plus,
  Search,
  ArrowRightLeft,
  PackagePlus,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  DollarSign,
  Tag,
  MapPin,
  Barcode,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { ExcelImportModal, ColumnDefinition } from '@/components/common/ExcelImportModal';
import { TablePagination, usePagination } from '@/components/common/TablePagination';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  isActive: boolean;
  _count?: {
    stockBalances: number;
    binLocations: number;
  };
}

interface PartCategory {
  id: string;
  name: string;
  description?: string;
  _count?: { parts: number };
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  costPrice: number | string;
  retailPrice: number | string;
  minSafetyStock: number;
  isSerialTracked: boolean;
  compatibleModels: string[];
  totalOnHand?: number;
  totalReserved?: number;
  totalAvailable?: number;
  isLowStock?: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface StockBalance {
  id: string;
  warehouseId: string;
  partId: string;
  binLocationId?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  isLowStock: boolean;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  binLocation?: {
    id: string;
    code: string;
  };
  part: {
    id: string;
    partNumber: string;
    name: string;
    costPrice: number | string;
    retailPrice: number | string;
    minSafetyStock: number;
    category?: { name: string };
  };
}

interface StockMovement {
  id: string;
  movementNumber: string;
  type: string;
  quantity: number;
  unitCost: number | string;
  referenceNotes?: string;
  createdAt: string;
  part: {
    partNumber: string;
    name: string;
  };
  sourceWarehouse?: { code: string; name: string };
  destinationWarehouse?: { code: string; name: string };
  workOrder?: { workOrderNumber: string; title: string };
  technician?: { technicianCode: string; user?: { firstName: string; lastName: string } };
  actor?: { firstName: string; lastName: string };
}

interface InventorySummary {
  warehouseCount: number;
  totalParts: number;
  totalValuation: number;
  totalOnHandUnits: number;
  totalReservedUnits: number;
  lowStockAlerts: number;
}

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balances' | 'parts' | 'movements' | 'warehouses'>('balances');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Filters
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [receiptForm, setReceiptForm] = useState({
    warehouseId: '',
    partId: '',
    quantity: 10,
    unitCost: 0,
    referenceNumber: '',
    notes: '',
  });

  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    partId: '',
    quantity: 1,
    referenceNumber: '',
    notes: '',
  });

  const [partForm, setPartForm] = useState({
    partNumber: '',
    name: '',
    categoryId: '',
    costPrice: 0,
    retailPrice: 0,
    minSafetyStock: 5,
    isSerialTracked: false,
    compatibleModels: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, whRes, catRes, partsRes, balRes, movRes] = await Promise.all([
        api.get('/inventory/summary').catch(() => ({ data: null })),
        api.get('/inventory/warehouses').catch(() => ({ data: [] })),
        api.get('/inventory/categories').catch(() => ({ data: [] })),
        api.get('/inventory/parts').catch(() => ({ data: { items: [] } })),
        api.get('/inventory/balances').catch(() => ({ data: { items: [] } })),
        api.get('/inventory/movements').catch(() => ({ data: { items: [] } })),
      ]);

      setSummary(sumRes.data);
      setWarehouses(whRes.data || []);
      setCategories(catRes.data || []);
      setParts(partsRes.data?.items || []);
      setBalances(balRes.data?.items || []);
      setMovements(movRes.data?.items || []);

      if (whRes.data?.length > 0) {
        setReceiptForm((prev) => ({ ...prev, warehouseId: whRes.data[0].id }));
        if (whRes.data.length > 1) {
          setTransferForm((prev) => ({
            ...prev,
            sourceWarehouseId: whRes.data[0].id,
            destinationWarehouseId: whRes.data[1].id,
          }));
        }
      }
      if (partsRes.data?.items?.length > 0) {
        setReceiptForm((prev) => ({
          ...prev,
          partId: partsRes.data.items[0].id,
          unitCost: Number(partsRes.data.items[0].costPrice),
        }));
        setTransferForm((prev) => ({ ...prev, partId: partsRes.data.items[0].id }));
      }
      if (catRes.data?.length > 0) {
        setPartForm((prev) => ({ ...prev, categoryId: catRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered stock balances
  const filteredBalances = balances.filter((b) => {
    if (selectedWarehouseFilter !== 'all' && b.warehouseId !== selectedWarehouseFilter) {
      return false;
    }
    if (lowStockFilter && !b.isLowStock) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSku = b.part.partNumber.toLowerCase().includes(q);
      const matchName = b.part.name.toLowerCase().includes(q);
      const matchWh = b.warehouse.name.toLowerCase().includes(q) || b.warehouse.code.toLowerCase().includes(q);
      return matchSku || matchName || matchWh;
    }
    return true;
  });

  // Filtered parts catalog
  const filteredParts = parts.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.partNumber.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    }
    return true;
  });

  const balancePagination = usePagination(filteredBalances, 10);
  const partPagination = usePagination(filteredParts, 10);
  const movementPagination = usePagination(movements, 10);

  // Handle Goods Receipt (GRN)
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  const partImportColumns: ColumnDefinition[] = [
    { key: 'partNumber', label: 'Part SKU Code', required: true, example: 'PANEL-4K-16' },
    { key: 'name', label: 'Part Name', required: true, example: '16-inch 4K IPS Display Panel' },
    { key: 'costPrice', label: 'Unit Cost (₹)', required: true, example: 3500 },
    { key: 'retailPrice', label: 'Selling Price (₹)', required: true, example: 5200 },
    { key: 'minSafetyStock', label: 'Min Safety Buffer', example: 10 },
    { key: 'compatibleModels', label: 'Compatible Models', example: 'OPT-16-PRO, OPT-16-ULTRA' },
  ];

  const handleBulkImportParts = async (rows: Record<string, any>[]) => {
    for (const row of rows) {
      if (!row.partNumber || !row.name) continue;
      const models = row.compatibleModels
        ? String(row.compatibleModels).split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await api.post('/inventory/parts', {
        partNumber: String(row.partNumber).toUpperCase().trim(),
        name: String(row.name).trim(),
        costPrice: Number(row.costPrice) || 0,
        retailPrice: Number(row.retailPrice) || 0,
        minSafetyStock: Number(row.minSafetyStock) || 5,
        isSerialTracked: false,
        compatibleModels: models,
      });
    }
    await fetchData();
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/inventory/movements/receipt', {
        warehouseId: receiptForm.warehouseId,
        partId: receiptForm.partId,
        quantity: Number(receiptForm.quantity),
        unitCost: Number(receiptForm.unitCost),
        referenceNumber: receiptForm.referenceNumber || undefined,
        notes: receiptForm.notes || undefined,
      });
      setIsReceiptModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Inter-warehouse Transfer
  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) {
      alert('Source and destination warehouses must be different');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/inventory/movements/transfer', {
        sourceWarehouseId: transferForm.sourceWarehouseId,
        destinationWarehouseId: transferForm.destinationWarehouseId,
        partId: transferForm.partId,
        quantity: Number(transferForm.quantity),
        referenceNumber: transferForm.referenceNumber || undefined,
        notes: transferForm.notes || undefined,
      });
      setIsTransferModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to transfer stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Part
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const models = partForm.compatibleModels
        ? partForm.compatibleModels.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await api.post('/inventory/parts', {
        partNumber: partForm.partNumber.toUpperCase(),
        name: partForm.name,
        categoryId: partForm.categoryId || undefined,
        costPrice: Number(partForm.costPrice),
        retailPrice: Number(partForm.retailPrice),
        minSafetyStock: Number(partForm.minSafetyStock),
        isSerialTracked: partForm.isSerialTracked,
        compatibleModels: models,
        description: partForm.description || undefined,
      });
      setIsAddPartModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create part SKU');
    } finally {
      setSubmitting(false);
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'GOODS_RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
            RECEIPT
          </span>
        );
      case 'RESERVATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Tag className="w-3 h-3 text-purple-600" />
            RESERVED
          </span>
        );
      case 'ISSUE_TO_TECHNICIAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight className="w-3 h-3 text-blue-600" />
            ISSUED
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <ArrowRightLeft className="w-3 h-3 text-amber-600" />
            TRANSFER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-primary stroke-[2.2]" />
            Inventory & Regional Warehouses
          </h1>
          <p className="text-xs text-ink-soft font-normal mt-0.5">
            Multi-echelon warehouse balances, spare parts catalog & append-only stock movement ledger.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs font-medium border-border/80 bg-white hover:bg-zinc-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="text-xs font-medium border-border/80 bg-white hover:bg-zinc-50 text-ink"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Inter-Hub Transfer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcelImportOpen(true)}
            className="text-xs font-medium border-border/80 bg-white hover:bg-zinc-50 text-ink shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Import Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddPartModalOpen(true)}
            className="text-xs font-medium border-border/80 bg-white hover:bg-zinc-50 text-ink"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Add Part SKU
          </Button>

          <Button
            size="sm"
            onClick={() => setIsReceiptModalOpen(true)}
            className="text-xs font-semibold bg-primary hover:bg-primary/95 text-white shadow-sm"
          >
            <PackagePlus className="w-3.5 h-3.5 mr-1.5" />
            Inward Stock (GRN)
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valuation */}
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Total Stock Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-ink">
                ₹{summary ? summary.totalValuation.toLocaleString('en-IN') : '0'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">INR</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {summary?.warehouseCount || 0} active regional hubs
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Units On Hand */}
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">On-Hand Stock</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-ink">
                {summary?.totalOnHandUnits ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">physical units</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary?.totalParts || 0} unique spare part SKUs cataloged
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Reserved Units */}
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Reserved for Work Orders</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-purple-700">
                {summary?.totalReservedUnits ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">allocated</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Locked for field jobs & pending dispatches
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Low Stock Alerts */}
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Safety Stock Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-xl font-bold font-poppins ${summary && summary.lowStockAlerts > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {summary?.lowStockAlerts ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">SKUs critical</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              At or below minimum threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'balances'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              Stock Balances Ledger
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {balances.length}
              </span>
            </div>
            {activeTab === 'balances' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('parts')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'parts'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5" />
              Parts Master Catalog
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {parts.length}
              </span>
            </div>
            {activeTab === 'parts' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'movements'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Movement Audit Trail
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {movements.length}
              </span>
            </div>
            {activeTab === 'movements' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'warehouses'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Regional Warehouses
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {warehouses.length}
              </span>
            </div>
            {activeTab === 'warehouses' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Stock Balances Table */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border/70 shadow-2xs">
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search part SKU, name or hub..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8.5 text-xs bg-zinc-50/50 border-border/70 focus:bg-white"
                />
              </div>

              {/* Warehouse selector */}
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="h-8.5 px-3 text-xs rounded-lg border border-border/70 bg-zinc-50/50 text-ink font-medium focus:bg-white focus:outline-none"
              >
                <option value="all">All Warehouses ({warehouses.length})</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-soft select-none">
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span className="font-medium">Show Low Stock Alerts Only</span>
              </label>
            </div>
          </div>

          {/* Balances Data Table */}
          <div className="bg-white rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-border/70 text-ink-soft font-medium">
                  <tr>
                    <th className="py-3 px-4 font-poppins">Part SKU & Name</th>
                    <th className="py-3 px-4 font-poppins">Warehouse Hub</th>
                    <th className="py-3 px-4 font-poppins">Category</th>
                    <th className="py-3 px-4 font-poppins text-right">On-Hand</th>
                    <th className="py-3 px-4 font-poppins text-right">Reserved</th>
                    <th className="py-3 px-4 font-poppins text-right">Available</th>
                    <th className="py-3 px-4 font-poppins text-center">Safety Min</th>
                    <th className="py-3 px-4 font-poppins text-center">Status</th>
                    <th className="py-3 px-4 font-poppins text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading stock balances...
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        No stock records matching criteria.
                      </td>
                    </tr>
                  ) : (
                    balancePagination.paginatedItems.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-ink text-[12px]">
                              {b.part.partNumber}
                            </span>
                            <span className="text-muted-foreground text-[11px] truncate max-w-xs">
                              {b.part.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {b.warehouse.code}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {b.warehouse.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] bg-zinc-50 text-zinc-700 border-border/80">
                            {b.part.category?.name || 'General'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                          {b.quantityOnHand}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-purple-700">
                          {b.quantityReserved > 0 ? b.quantityReserved : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[12px] ${
                              b.isLowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {b.quantityAvailable}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                          {b.part.minSafetyStock}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {b.isLowStock ? (
                            <Badge className="bg-amber-100/80 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px] gap-1 font-mono">
                              <AlertTriangle className="w-2.5 h-2.5" /> LOW STOCK
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[10px] gap-1 font-mono">
                              <CheckCircle2 className="w-2.5 h-2.5" /> IN STOCK
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTransferForm((prev) => ({
                                ...prev,
                                sourceWarehouseId: b.warehouseId,
                                partId: b.partId,
                              }));
                              setIsTransferModalOpen(true);
                            }}
                            className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            Transfer
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination {...balancePagination} />
          </div>
        </div>
      )}

      {/* Tab 2: Spare Parts Catalog */}
      {activeTab === 'parts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border/70 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search part SKU or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8.5 text-xs bg-zinc-50/50 border-border/70 focus:bg-white"
              >
              </Input>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddPartModalOpen(true)}
              className="text-xs font-semibold bg-primary hover:bg-primary/95 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Part Master
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partPagination.paginatedItems.map((p) => (
              <Card key={p.id} className="bg-white border-border/70 shadow-xs hover:border-border transition-all flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-ink">{p.partNumber}</span>
                      <h3 className="text-xs font-medium text-ink-soft mt-0.5 line-clamp-1">{p.name}</h3>
                    </div>
                    {p.isSerialTracked && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 text-purple-700 border-purple-200">
                        SERIALIZED
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] bg-zinc-100 text-zinc-700">
                      {p.category?.name || 'Spare Part'}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Min Safety: {p.minSafetyStock} units
                    </span>
                  </div>

                  {p.compatibleModels?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.compatibleModels.map((m) => (
                        <span key={m} className="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 rounded text-[10px] font-mono border border-border/60">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Cost / Retail</span>
                      <span className="font-mono font-semibold text-ink">
                        ₹{Number(p.costPrice).toLocaleString('en-IN')} / ₹{Number(p.retailPrice).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Total Available</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {p.totalAvailable ?? 0} units
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white border-border/70 shadow-sm overflow-hidden">
            <TablePagination {...partPagination} />
          </Card>
        </div>
      )}

      {/* Tab 3: Movement Ledger (Audit Trail) */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-border/70 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold font-poppins text-ink">Append-Only Stock Ledger</h2>
              <p className="text-xs text-muted-foreground">Full immutable audit trail of goods receipts, reservations, issues, and transfers</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {movements.length} Transactions Recorded
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-border/70 text-ink-soft font-medium">
                <tr>
                  <th className="py-3 px-4 font-poppins">Movement #</th>
                  <th className="py-3 px-4 font-poppins">Type</th>
                  <th className="py-3 px-4 font-poppins">Part SKU</th>
                  <th className="py-3 px-4 font-poppins text-right">Qty</th>
                  <th className="py-3 px-4 font-poppins">From / To Warehouses</th>
                  <th className="py-3 px-4 font-poppins">Linked Reference</th>
                  <th className="py-3 px-4 font-poppins">Actor / Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {movementPagination.paginatedItems.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-ink text-[11px]">
                      {m.movementNumber}
                    </td>
                    <td className="py-3 px-4">{getMovementTypeBadge(m.type)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-ink">{m.part.partNumber}</span>
                        <span className="text-muted-foreground text-[10px] truncate max-w-[200px]">{m.part.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                      {m.quantity}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px]">
                        {m.sourceWarehouse && (
                          <span className="text-muted-foreground">From: <strong className="text-ink font-mono">{m.sourceWarehouse.code}</strong> </span>
                        )}
                        {m.destinationWarehouse && (
                          <span className="text-emerald-700">To: <strong className="font-mono">{m.destinationWarehouse.code}</strong></span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {m.workOrder ? (
                        <span className="font-mono text-primary text-[11px] block">
                          WO: {m.workOrder.workOrderNumber}
                        </span>
                      ) : m.technician ? (
                        <span className="font-mono text-zinc-700 text-[11px] block">
                          Tech: {m.technician.technicianCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic truncate max-w-[180px] block">
                          {m.referenceNotes || 'Direct Transaction'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-ink font-medium text-[11px]">
                          {m.actor ? `${m.actor.firstName} ${m.actor.lastName}` : 'System Engine'}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination {...movementPagination} />
        </div>
      )}

      {/* Tab 4: Regional Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <Card key={w.id} className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-primary">{w.code}</span>
                    <h3 className="font-poppins font-semibold text-ink text-sm mt-0.5">{w.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-zinc-50 border-border">
                    {w.type.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-start gap-2 text-xs text-ink-soft">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    {w.address}, {w.city}, {w.state} - {w.postalCode}
                  </span>
                </div>

                <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-50 p-2 rounded-lg border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Stock Balance Rows</span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {w._count?.stockBalances ?? 0}
                    </span>
                  </div>
                  <div className="bg-zinc-50 p-2 rounded-lg border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Bin Locations</span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {w._count?.binLocations ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal 1: Inward Stock (Goods Receipt Note) ───────────────────────── */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Inward Stock (Goods Receipt Note)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Receive newly arrived parts inventory into warehouse stock balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiveStock} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Destination Warehouse Hub</Label>
              <select
                required
                value={receiptForm.warehouseId}
                onChange={(e) => setReceiptForm({ ...receiptForm, warehouseId: e.target.value })}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name} ({w.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium">Spare Part SKU</Label>
              <select
                required
                value={receiptForm.partId}
                onChange={(e) => {
                  const p = parts.find((x) => x.id === e.target.value);
                  setReceiptForm({
                    ...receiptForm,
                    partId: e.target.value,
                    unitCost: p ? Number(p.costPrice) : receiptForm.unitCost,
                  });
                }}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} - {p.name} (₹{Number(p.costPrice).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selectedPart = parts.find((p) => p.id === receiptForm.partId);
              if (!selectedPart) return null;
              return (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{selectedPart.name}</span>
                    <span className="font-mono text-[10px] ml-1.5 text-emerald-700/80">({selectedPart.partNumber})</span>
                  </div>
                  <div className="font-mono text-emerald-800 text-xs font-semibold">
                    Standard Cost: ₹{Number(selectedPart.costPrice).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Quantity Inwarded</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={receiptForm.quantity}
                  onChange={(e) => setReceiptForm({ ...receiptForm, quantity: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Unit Cost (₹ INR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={receiptForm.unitCost}
                  onChange={(e) => setReceiptForm({ ...receiptForm, unitCost: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">PO / Inward Ref Number</Label>
              <Input
                placeholder="e.g. PO-2026-0042 / INV-9921"
                value={receiptForm.referenceNumber}
                onChange={(e) => setReceiptForm({ ...receiptForm, referenceNumber: e.target.value })}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Receipt Notes / Courier details</Label>
              <Input
                placeholder="e.g. Delivered by Blue Dart tracking #90821"
                value={receiptForm.notes}
                onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs font-semibold bg-primary text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Confirm GRN Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Inter-Warehouse Transfer ──────────────────────────────── */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Inter-Warehouse Stock Transfer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfer parts from one regional hub to another with atomic stock rebalancing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferStock} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Source Warehouse</Label>
                <select
                  required
                  value={transferForm.sourceWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, sourceWarehouseId: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} ({w.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium">Destination Warehouse</Label>
                <select
                  required
                  value={transferForm.destinationWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, destinationWarehouseId: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} ({w.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Spare Part SKU</Label>
              <select
                required
                value={transferForm.partId}
                onChange={(e) => setTransferForm({ ...transferForm, partId: e.target.value })}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} - {p.name} (₹{Number(p.costPrice).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selectedPart = parts.find((p) => p.id === receiptForm.partId);
              if (!selectedPart) return null;
              return (
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{selectedPart.name}</span>
                    <span className="font-mono text-[10px] ml-1.5 text-emerald-700/80">({selectedPart.partNumber})</span>
                  </div>
                  <div className="font-mono text-emerald-800 text-xs font-semibold">
                    Standard Cost: ₹{Number(selectedPart.costPrice).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })()}

            <div>
              <Label className="text-xs font-medium">Quantity to Transfer</Label>
              <Input
                type="number"
                min="1"
                required
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Transfer Order Reference</Label>
              <Input
                placeholder="e.g. TR-2026-001"
                value={transferForm.referenceNumber}
                onChange={(e) => setTransferForm({ ...transferForm, referenceNumber: e.target.value })}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Transfer Notes</Label>
              <Input
                placeholder="e.g. Urgent rebalancing for field dispatch orders"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs font-semibold bg-primary text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Execute Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Add Part SKU ─────────────────────────────────────────── */}
      <Dialog open={isAddPartModalOpen} onOpenChange={setIsAddPartModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Add Spare Part Master Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new spare part SKU, pricing, and safety stock thresholds.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePart} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Part Number (SKU)</Label>
                <Input
                  required
                  placeholder="e.g. PANEL-4K-16"
                  value={partForm.partNumber}
                  onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Category</Label>
                <select
                  value={partForm.categoryId}
                  onChange={(e) => setPartForm({ ...partForm, categoryId: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Part Name</Label>
              <Input
                required
                placeholder="e.g. 16-inch 4K Mini-LED Display Matrix"
                value={partForm.name}
                onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium">Cost Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={partForm.costPrice}
                  onChange={(e) => setPartForm({ ...partForm, costPrice: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Retail Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={partForm.retailPrice}
                  onChange={(e) => setPartForm({ ...partForm, retailPrice: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Min Safety Stock</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={partForm.minSafetyStock}
                  onChange={(e) => setPartForm({ ...partForm, minSafetyStock: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Compatible Device Models (comma-separated)</Label>
              <Input
                placeholder="e.g. THINKPAD-P16, LEGION-PRO-7"
                value={partForm.compatibleModels}
                onChange={(e) => setPartForm({ ...partForm, compatibleModels: e.target.value })}
                className="mt-1 h-9 text-xs font-mono uppercase"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isSerialTracked"
                checked={partForm.isSerialTracked}
                onChange={(e) => setPartForm({ ...partForm, isSerialTracked: e.target.checked })}
                className="rounded text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="isSerialTracked" className="text-xs font-medium cursor-pointer">
                Requires Unique Serial Tracking (High-value parts)
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddPartModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs font-semibold bg-primary text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Part Master
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Excel Importer */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        title="Upload & Populate Spare Parts Master"
        entityName="Spare Parts"
        columns={partImportColumns}
        onImport={handleBulkImportParts}
      />
    </div>
  );
};
