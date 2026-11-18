import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Wrench,
  AlertCircle,
  Building2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContractSchedule {
  id: string;
  visitSequence: number;
  dueDate: string;
  status: string;
  workOrderId?: string;
  completedAt?: string;
  workOrder?: {
    workOrderNumber: string;
    status: string;
  };
}

interface MaintenanceContract {
  id: string;
  contractNumber: string;
  contractType: string;
  startDate: string;
  endDate: string;
  visitsIncluded: number;
  visitsCompleted: number;
  visitIntervalDays: number;
  amountPaid: string;
  status: string;
  notes?: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    city?: string;
  };
  product?: {
    name: string;
    sku: string;
  };
  serialNumber?: string;
  schedules: ContractSchedule[];
}

export const ContractsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'contracts' | 'upcoming'>('contracts');
  const [upcomingSchedules, setUpcomingSchedules] = useState<any[]>([]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    serialNumber: '',
    contractType: 'BASIC_AMC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    visitsIncluded: 4,
    visitIntervalDays: 90,
    amountPaid: 4500,
    notes: '',
  });

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const [resC, resU] = await Promise.all([
        api.get(`/contracts?${params.toString()}`),
        api.get('/contracts/schedules/upcoming?daysAhead=30'),
      ]);

      setContracts(resC.data.data || []);
      setStats(resC.data.stats || {});
      setUpcomingSchedules(resU.data || []);
    } catch {
      toast.error('Failed to load contract management data');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [resCust, resProd] = await Promise.all([
        api.get('/crm/customers?limit=100'),
        api.get('/crm/products?limit=100'),
      ]);
      setCustomers(resCust.data.data || []);
      setProducts(resProd.data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchContracts();
    loadDropdowns();
  }, [statusFilter]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    try {
      const res = await api.post('/contracts', formData);
      toast.success(
        `Contract #${res.data.contractNumber} successfully created with ${formData.visitsIncluded} preventive visit schedules!`,
      );
      setIsCreateOpen(false);
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create maintenance contract');
    }
  };

  const handleGenerateWo = async (scheduleId: string) => {
    try {
      const res = await api.post(`/contracts/schedules/${scheduleId}/generate-wo`);
      toast.success(res.data.message || 'Preventive work order generated');
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate work order');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active AMC</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Expired</Badge>;
      case 'PENDING_RENEWAL':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Renewal Due</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
        <div>
          <h1 className="text-xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            AMC / CMC & Preventive Maintenance (PPM) Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Annual maintenance recurring service agreements, automated quarterly inspection schedules, and renewal tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContracts}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Maintenance Contract
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Active Contracts</div>
              <div className="text-xl font-bold font-poppins text-emerald-600">{stats.active || 0}</div>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Upcoming Visits (30 Days)</div>
              <div className="text-xl font-bold font-poppins text-primary">{upcomingSchedules.length}</div>
            </div>
            <Clock className="w-6 h-6 text-primary" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Renewal Due</div>
              <div className="text-xl font-bold font-poppins text-amber-600">{stats.pendingRenewal || 0}</div>
            </div>
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Expired Contracts</div>
              <div className="text-xl font-bold font-poppins text-slate-600">{stats.expired || 0}</div>
            </div>
            <FileText className="w-6 h-6 text-slate-400" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'contracts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-ink'
          }`}
        >
          All Active Agreements ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-ink'
          }`}
        >
          <span>Upcoming Preventive Visits Schedule</span>
          {upcomingSchedules.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
              {upcomingSchedules.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'contracts' ? (
        <Card className="border-border">
          <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contract number or customer..."
                  className="pl-8 h-8 text-xs bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold text-ink bg-white border border-border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_RENEWAL">Renewal Due</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-zinc-100/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Contract #</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Customer & Equipment</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Preventive Visits</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      No maintenance contracts registered. Click "New Maintenance Contract" to sell an AMC agreement.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">
                        {c.contractNumber}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-semibold text-[10px]">
                          {c.contractType.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-ink">{c.customer.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.product?.name || 'Home Appliance'} {c.serialNumber ? `• S/N: ${c.serialNumber}` : ''}
                        </div>
                      </td>
                      <td className="p-3 text-[11px]">
                        <div>{new Date(c.startDate).toLocaleDateString()} to</div>
                        <div className="font-medium text-ink">{new Date(c.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink">
                            {c.visitsCompleted} / {c.visitsIncluded}
                          </span>
                          <span className="text-[10px] text-muted-foreground">completed</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(100, (c.visitsCompleted / c.visitsIncluded) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-ink">
                        ₹{Number(c.amountPaid).toLocaleString()}
                      </td>
                      <td className="p-3">{getStatusBadge(c.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
            <CardTitle className="text-sm font-bold font-poppins flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Automated PPM Schedule Timeline (Next 30 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              System auto-generates work orders for these milestones when due date arrives
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-zinc-100/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Milestone Sequence</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Contract #</th>
                  <th className="p-3">Customer & Location</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                      No preventive maintenance visits due in the upcoming 30 days.
                    </td>
                  </tr>
                ) : (
                  upcomingSchedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 font-semibold text-ink">
                        Quarterly Inspection Visit #{sch.visitSequence}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">
                        {new Date(sch.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-primary">
                        {sch.contract.contractNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-ink">{sch.contract.customer.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {sch.contract.customer.addresses?.[0]?.city || 'Default City'}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {sch.contract.product?.name || 'General Appliance'}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateWo(sch.id)}
                          className="h-7 text-xs px-2.5 gap-1.5"
                        >
                          <Wrench className="w-3 h-3" />
                          Generate Work Order Now
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* New Maintenance Contract Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold font-poppins text-ink">
                  New Maintenance Service Contract
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className="w-full text-xs p-2 rounded-lg border border-border bg-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Product</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-white"
                  >
                    <option value="">Select equipment...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Serial Number</label>
                  <Input
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g. SN-2024-9981"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Contract Tier</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-white"
                  >
                    <option value="BASIC_AMC">Basic AMC (Labour only)</option>
                    <option value="COMPREHENSIVE_CMC">Comprehensive CMC (Parts + Labour)</option>
                    <option value="PREVENTIVE_PPM">Preventive PPM Only</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Contract Fee (₹)</label>
                  <Input
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Preventive Visits Included</label>
                  <Input
                    type="number"
                    value={formData.visitsIncluded}
                    onChange={(e) => setFormData({ ...formData, visitsIncluded: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Interval Days (Quarterly=90)</label>
                  <Input
                    type="number"
                    value={formData.visitIntervalDays}
                    onChange={(e) => setFormData({ ...formData, visitIntervalDays: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Issue Agreement & Generate Schedules
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
