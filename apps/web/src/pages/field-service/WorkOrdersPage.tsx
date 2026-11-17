import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Wrench,
  Plus,
  Search,
  Clock,
  User,
  MapPin,
  Laptop,
  CheckCircle2,
  Truck,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Sparkles,
  Calendar,
  AlertTriangle,
  Flame,
  Download,
  Tag,
  CheckSquare,
} from 'lucide-react';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { toast } from 'sonner';

interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DRAFT' | 'ASSIGNED' | 'ACCEPTED' | 'TRAVELING' | 'ON_SITE' | 'DIAGNOSING' | 'PARTS_PENDING' | 'REPAIRED' | 'COMPLETED' | 'CANCELLED';
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  customerAddress?: {
    street: string;
    city: string;
    state: string;
  };
  product?: {
    name: string;
    sku: string;
  };
  registration?: {
    serialNumber: string;
    warranty?: {
      status: string;
    };
  };
  technician?: {
    id: string;
    technicianCode: string;
    phone: string;
    serviceZone: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  scheduledDate?: string;
  timeSlot?: string;
  customerOtp?: string;
  isOtpVerified: boolean;
  createdAt: string;
}

export const WorkOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // New Work Order dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [customerAssets, setCustomerAssets] = useState<any[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    scheduledDate: new Date().toISOString().split('T')[0],
    timeSlot: '10:00 AM - 01:00 PM',
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === workOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workOrders.map((w) => w.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const res = await api.post('/field-service/work-orders/bulk', {
        workOrderIds: selectedIds,
        action: 'status',
        status,
      });
      toast.success(res.data.message || `Updated ${selectedIds.length} work orders to ${status}`);
      setSelectedIds([]);
      fetchWorkOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update work orders in bulk');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPriorityChange = async (priority: string) => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const res = await api.post('/field-service/work-orders/bulk', {
        workOrderIds: selectedIds,
        action: 'priority',
        priority,
      });
      toast.success(res.data.message || `Updated priority for ${selectedIds.length} work orders`);
      setSelectedIds([]);
      fetchWorkOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update priorities in bulk');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExportCsv = () => {
    const selectedList = workOrders.filter((w) => selectedIds.includes(w.id));
    if (selectedList.length === 0) return;

    const headers = ['Work Order #', 'Title', 'Priority', 'Status', 'Customer', 'Phone', 'City', 'Technician', 'Scheduled Date'];
    const rows = selectedList.map((w) => [
      w.workOrderNumber,
      `"${w.title.replace(/"/g, '""')}"`,
      w.priority,
      w.status,
      `"${w.customer?.name || ''}"`,
      w.customer?.phone || '',
      `"${w.customerAddress?.city || ''}"`,
      `"${w.technician ? `${w.technician.user?.firstName} ${w.technician.user?.lastName}` : 'Unassigned'}"`,
      w.scheduledDate || 'Unscheduled',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orbit-work-orders-bulk-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedList.length} work orders to CSV`);
  };

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await api.get('/field-service/work-orders', { params });
      setWorkOrders(res.data.data);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [search, statusFilter, priorityFilter]);

  // Load modal dependencies
  useEffect(() => {
    if (createDialogOpen) {
      Promise.all([
        api.get('/crm/customers', { params: { limit: 100 } }),
        api.get('/field-service/technicians'),
      ]).then(([custRes, techRes]) => {
        setCustomers(custRes.data.data);
        setTechnicians(techRes.data);
      });
    }
  }, [createDialogOpen]);

  // Load addresses & assets when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      api.get(`/crm/customers/${selectedCustomerId}`).then((res) => {
        setCustomerAddresses(res.data.addresses || []);
        if (res.data.addresses?.length > 0) {
          const def = res.data.addresses.find((a: any) => a.isDefault) || res.data.addresses[0];
          setSelectedAddressId(def.id);
        }
        setCustomerAssets(res.data.registrations || []);
      });
    } else {
      setCustomerAddresses([]);
      setSelectedAddressId('');
      setCustomerAssets([]);
      setSelectedRegistrationId('');
    }
  }, [selectedCustomerId]);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !form.title) return;

    try {
      setSubmitting(true);
      const selectedReg = customerAssets.find((a) => a.id === selectedRegistrationId);

      await api.post('/field-service/work-orders', {
        customerId: selectedCustomerId,
        customerAddressId: selectedAddressId || undefined,
        productId: selectedReg?.productId || undefined,
        registrationId: selectedRegistrationId || undefined,
        technicianId: selectedTechnicianId || undefined,
        title: form.title,
        description: form.description,
        priority: form.priority,
        scheduledDate: new Date(form.scheduledDate).toISOString(),
        timeSlot: form.timeSlot,
      });

      setCreateDialogOpen(false);
      setSelectedCustomerId('');
      setSelectedRegistrationId('');
      setSelectedTechnicianId('');
      setForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        scheduledDate: new Date().toISOString().split('T')[0],
        timeSlot: '10:00 AM - 01:00 PM',
      });
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-mono text-[10px] flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" /> Critical
          </Badge>
        );
      case 'HIGH':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono text-[10px]">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono text-[10px]">Medium</Badge>;
      case 'LOW':
      default:
        return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 font-mono text-[10px]">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-zinc-500 text-[10px]">Draft</Badge>;
      case 'ASSIGNED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Assigned</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">Accepted</Badge>;
      case 'TRAVELING':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] flex items-center gap-1">
            <Truck className="w-3 h-3 text-sky-600" /> In Travel
          </Badge>
        );
      case 'ON_SITE':
        return <Badge className="bg-emerald-600 text-white text-[10px]">On Site</Badge>;
      case 'DIAGNOSING':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Diagnosing</Badge>;
      case 'PARTS_PENDING':
        return <Badge className="bg-orange-50 text-orange-800 border-orange-200 text-[10px]">Parts Pending</Badge>;
      case 'REPAIRED':
        return <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px]">Repaired</Badge>;
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </Badge>
        );
      case 'CANCELLED':
      default:
        return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px]">Cancelled</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-primary" />
            Field Service & Technician Dispatch
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Dispatch certified field engineers, track live on-site visit milestones, and verify repairs with customer OTP.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Work Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Active Work Orders</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {workOrders.filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Currently On-Site</p>
              <p className="text-2xl font-bold font-poppins text-emerald-700 mt-0.5">
                {workOrders.filter((w) => w.status === 'ON_SITE' || w.status === 'DIAGNOSING').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">In Transit / Travel</p>
              <p className="text-2xl font-bold font-poppins text-sky-700 mt-0.5">
                {workOrders.filter((w) => w.status === 'TRAVELING').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">OTP Verified Closures</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {workOrders.filter((w) => w.isOtpVerified).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter toolbar */}
      <Card className="bg-white border-border/70 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by WO number, job title, customer name, or address..."
              className="pl-9 bg-[#FAF9F6] border-border/80 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="TRAVELING">In Travel</option>
              <option value="ON_SITE">On Site</option>
              <option value="DIAGNOSING">Diagnosing</option>
              <option value="REPAIRED">Repaired</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card className="bg-white border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-[#FBFBFA] text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all work orders"
                    checked={workOrders.length > 0 && selectedIds.length === workOrders.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">WO Number</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Job Scope / Customer</th>
                <th className="py-3 px-4">Service Site Location</th>
                <th className="py-3 px-4">Hardware Unit</th>
                <th className="py-3 px-4">Assigned Engineer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted">
                    No work orders found matching criteria.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/operations/work-orders/${wo.id}`)}
                    className={`hover:bg-[#FAF9F6]/80 cursor-pointer transition-colors ${
                      selectedIds.includes(wo.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select work order ${wo.workOrderNumber}`}
                        checked={selectedIds.includes(wo.id)}
                        onChange={() => toggleSelectRow(wo.id)}
                        className="rounded border-zinc-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {wo.workOrderNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getPriorityBadge(wo.priority)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-ink font-poppins truncate">{wo.title}</div>
                      <div className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-ink-muted" />
                        <span>{wo.customer.name}</span>
                        <span>•</span>
                        <span className="font-mono">{wo.customer.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {wo.customerAddress ? (
                        <div className="text-xs">
                          <span className="font-semibold text-ink block">{wo.customerAddress.city}</span>
                          <span className="text-[11px] text-ink-muted truncate block max-w-[180px]">
                            {wo.customerAddress.street}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">Site TBD</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {wo.product ? (
                        <div>
                          <span className="font-semibold text-ink block">{wo.product.name}</span>
                          {wo.registration && (
                            <span className="font-mono text-[10px] text-ink-muted">
                              SN: {wo.registration.serialNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">Non-asset</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {wo.technician ? (
                        <div>
                          <span className="font-semibold text-ink block">
                            {wo.technician.user.firstName} {wo.technician.user.lastName}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                            {wo.technician.technicianCode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(wo.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/operations/work-orders/${wo.id}`);
                        }}
                      >
                        Console <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Work Order Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">New Field Work Order</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Schedule an on-site technician visit with customer OTP fraud verification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkOrder} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Customer Account *</Label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerCode}) — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomerId && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Service Site Location</Label>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                  >
                    {customerAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.city} — {a.street}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Hardware Unit to Service</Label>
                  <select
                    value={selectedRegistrationId}
                    onChange={(e) => setSelectedRegistrationId(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                  >
                    <option value="">-- No specific hardware --</option>
                    {customerAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.product.name} (SN: {a.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Job Title / Repair Scope *</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. On-site motherboard diagnosis and capacitor inspection"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Detailed Instructions / Failure Symptoms</Label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Diagnostic steps required, access codes, customer site contact notes..."
                className="w-full p-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-8 px-2 text-xs font-semibold rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Scheduled Date</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Time Window</Label>
                <select
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                  <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                  <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                  <option value="05:00 PM - 08:00 PM">05:00 PM - 08:00 PM</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Initial Technician Assignment (Optional)</Label>
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
              >
                <option value="">-- Leave Unassigned (Use Smart Dispatcher Later) --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.firstName} {t.user.lastName} ({t.technicianCode}) — Zone: {t.serviceZone}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {submitting ? 'Creating...' : 'Dispatch Work Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Operations Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={workOrders.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={toggleSelectAll}
        loading={bulkLoading}
        itemTypeLabel="work orders"
        actions={[
          {
            label: 'Set In Progress',
            action: () => handleBulkStatusChange('IN_PROGRESS'),
          },
          {
            label: 'Mark Completed',
            action: () => handleBulkStatusChange('COMPLETED'),
          },
          {
            label: 'Set Critical',
            icon: Flame,
            action: () => handleBulkPriorityChange('CRITICAL'),
          },
          {
            label: 'Set High',
            action: () => handleBulkPriorityChange('HIGH'),
          },
          {
            label: 'Export CSV',
            icon: Download,
            action: handleBulkExportCsv,
          },
        ]}
      />
    </div>
  );
};
