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
  Ticket,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  Flame,
  Download,
  Tag,
  CheckSquare,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/common/BulkActionBar';
import { TablePagination, usePagination } from '@/components/common/TablePagination';
import { toast } from 'sonner';

interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
  status: 'OPEN' | 'TRIAGED' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  product?: {
    name: string;
    sku: string;
  };
  registration?: {
    serialNumber: string;
    warranty?: {
      status: string;
      endDate: string;
    };
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  resolutionDeadline: string;
  isResolutionBreached: boolean;
  minutesRemaining: number;
  _count?: { comments: number };
  createdAt: string;
}

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [slaBreachedOnly, setSlaBreachedOnly] = useState(false);

  // New Ticket Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerAssets, setCustomerAssets] = useState<any[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'HARDWARE_FAILURE',
    priority: 'P3_MEDIUM',
    source: 'PORTAL',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const pagination = usePagination(tickets, 10);

  const toggleSelectAll = () => {
    if (selectedIds.length === pagination.paginatedItems.length && pagination.paginatedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagination.paginatedItems.map((t) => t.id));
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
      const res = await api.post('/service-desk/tickets/bulk', {
        ticketIds: selectedIds,
        action: 'status',
        status,
      });
      toast.success(res.data.message || `Updated ${selectedIds.length} tickets to ${status}`);
      setSelectedIds([]);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update tickets in bulk');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPriorityChange = async (priority: string) => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const res = await api.post('/service-desk/tickets/bulk', {
        ticketIds: selectedIds,
        action: 'priority',
        priority,
      });
      toast.success(res.data.message || `Updated priority for ${selectedIds.length} tickets`);
      setSelectedIds([]);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update priorities in bulk');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExportCsv = () => {
    const selectedTickets = tickets.filter((t) => selectedIds.includes(t.id));
    if (selectedTickets.length === 0) return;

    const headers = ['Ticket Number', 'Title', 'Priority', 'Status', 'Customer', 'Phone', 'Asset', 'SLA Breached', 'Created At'];
    const rows = selectedTickets.map((t) => [
      t.ticketNumber,
      `"${t.title.replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      `"${t.customer?.name || ''}"`,
      t.customer?.phone || '',
      `"${t.product?.name || ''} (${t.registration?.serialNumber || 'N/A'})"`,
      t.isResolutionBreached ? 'YES' : 'NO',
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orbit-tickets-bulk-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedTickets.length} tickets to CSV`);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (slaBreachedOnly) params.slaBreached = true;

      const res = await api.get('/service-desk/tickets', { params });
      setTickets(res.data.data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, slaBreachedOnly]);

  // Load customer directory for dialog
  useEffect(() => {
    if (createDialogOpen) {
      api.get('/crm/customers', { params: { limit: 100 } }).then((res) => {
        setCustomers(res.data.data);
      });
    }
  }, [createDialogOpen]);

  // Load assets when customer selected
  useEffect(() => {
    if (selectedCustomerId) {
      api.get(`/crm/customers/${selectedCustomerId}`).then((res) => {
        setCustomerAssets(res.data.registrations || []);
      });
    } else {
      setCustomerAssets([]);
      setSelectedRegistrationId('');
    }
  }, [selectedCustomerId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !ticketForm.title || !ticketForm.description) return;

    try {
      setCreateSubmitting(true);
      await api.post('/service-desk/tickets', {
        customerId: selectedCustomerId,
        registrationId: selectedRegistrationId || undefined,
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        source: ticketForm.source,
      });

      setCreateDialogOpen(false);
      setSelectedCustomerId('');
      setSelectedRegistrationId('');
      setTicketForm({
        title: '',
        description: '',
        category: 'HARDWARE_FAILURE',
        priority: 'P3_MEDIUM',
        source: 'PORTAL',
      });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const formatCountdown = (minutes: number, isBreached: boolean) => {
    if (isBreached) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          SLA Breached
        </span>
      );
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const isAtRisk = minutes < 120; // less than 2 hours

    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium px-2 py-0.5 rounded text-[11px] ${
          isAtRisk
            ? 'bg-amber-50 text-amber-800 border border-amber-300'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}
      >
        <Clock className={`w-3 h-3 ${isAtRisk ? 'text-amber-600' : 'text-emerald-600'}`} />
        {hrs}h {mins}m left
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1_CRITICAL':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-mono flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" />
            P1 Critical
          </Badge>
        );
      case 'P2_HIGH':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-mono">
            P2 High
          </Badge>
        );
      case 'P3_MEDIUM':
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-mono">
            P3 Medium
          </Badge>
        );
      case 'P4_LOW':
      default:
        return (
          <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 text-[10px] font-mono">
            P4 Low
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">Open</Badge>;
      case 'TRIAGED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Triaged</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600 text-white text-[10px]">In Progress</Badge>;
      case 'WAITING_FOR_CUSTOMER':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending Client</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Resolved</Badge>;
      case 'CLOSED':
      default:
        return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px]">Closed</Badge>;
    }
  };

  const selectedAsset = customerAssets.find((a) => a.id === selectedRegistrationId);
  const isSelectedAssetWarrantyActive =
    selectedAsset?.warranty && new Date(selectedAsset.warranty.endDate) > new Date();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-primary" />
            Service Desk & Dynamic SLA Engine
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Orchestrate support incidents, automated response & resolution SLA timers, and hardware repair workflows.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Raise Support Ticket
        </Button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Active Tickets</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Ticket className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Critical P1 Incidents</p>
              <p className="text-2xl font-bold font-poppins text-rose-700 mt-0.5">
                {tickets.filter((t) => t.priority === 'P1_CRITICAL' && t.status !== 'CLOSED').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">SLA Breached</p>
              <p className="text-2xl font-bold font-poppins text-amber-700 mt-0.5">
                {tickets.filter((t) => t.isResolutionBreached).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Resolved & Closed</p>
              <p className="text-2xl font-bold font-poppins text-emerald-700 mt-0.5">
                {tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
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
              placeholder="Search by ticket number, title, customer name, or phone..."
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
              <option value="OPEN">Open</option>
              <option value="TRIAGED">Triaged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Pending Client</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="P1_CRITICAL">P1 Critical</option>
              <option value="P2_HIGH">P2 High</option>
              <option value="P3_MEDIUM">P3 Medium</option>
              <option value="P4_LOW">P4 Low</option>
            </select>

            <Button
              variant={slaBreachedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSlaBreachedOnly(!slaBreachedOnly)}
              className={`text-xs h-9 ${slaBreachedOnly ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              SLA Breached
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List Table */}
      <Card className="bg-white border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-[#FBFBFA] text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all tickets"
                    checked={pagination.paginatedItems.length > 0 && selectedIds.length === pagination.paginatedItems.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Issue / Customer</th>
                <th className="py-3 px-4">Hardware Asset & Warranty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Resolution SLA Clock</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading support tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted">
                    No tickets found matching current filters.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/operations/tickets/${t.id}`)}
                    className={`hover:bg-[#FAF9F6]/80 cursor-pointer transition-colors ${
                      selectedIds.includes(t.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ticket ${t.ticketNumber}`}
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelectRow(t.id)}
                        className="rounded border-zinc-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {t.ticketNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-ink font-poppins truncate">{t.title}</div>
                      <div className="text-[11px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-ink-muted" />
                        <span>{t.customer.name}</span>
                        <span>•</span>
                        <span className="font-mono">{t.customer.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.product ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-ink font-poppins text-xs block">
                            {t.product.name}
                          </span>
                          {t.registration && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-mono text-ink-muted">
                                {t.registration.serialNumber}
                              </span>
                              {t.registration.warranty?.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1 rounded">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 px-1 rounded">
                                  <ShieldAlert className="w-2.5 h-2.5" /> Expired
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">Non-asset ticket</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4">
                      {t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Met SLA
                        </span>
                      ) : (
                        formatCountdown(t.minutesRemaining, t.isResolutionBreached)
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.assignedTo ? (
                        <span className="font-medium text-ink">
                          {t.assignedTo.firstName} {t.assignedTo.lastName}
                        </span>
                      ) : (
                        <span className="text-ink-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/operations/tickets/${t.id}`);
                        }}
                      >
                        Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination {...pagination} />
      </Card>

      {/* Raise Support Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">Raise Support Incident</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Submit customer defect or maintenance complaint with automatic SLA deadline allocation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3 py-2 text-xs">
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
              <div className="space-y-1">
                <Label className="text-xs">Linked Hardware Asset (Optional)</Label>
                <select
                  value={selectedRegistrationId}
                  onChange={(e) => setSelectedRegistrationId(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="">-- No specific hardware unit --</option>
                  {customerAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.product.name} [SN: {a.serialNumber}]
                    </option>
                  ))}
                </select>

                {selectedAsset && (
                  <div
                    className={`mt-1.5 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                      isSelectedAssetWarrantyActive
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelectedAssetWarrantyActive ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      )}
                      <div>
                        <span className="font-semibold block">
                          {isSelectedAssetWarrantyActive ? 'Active OEM Warranty' : 'Expired Warranty'}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          {isSelectedAssetWarrantyActive
                            ? 'Zero-cost parts & priority technician dispatch SLA applies.'
                            : 'Billable parts quotation required for repairs.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="HARDWARE_FAILURE">Hardware Failure</option>
                  <option value="SOFTWARE_OS">Software / OS</option>
                  <option value="PHYSICAL_DAMAGE">Physical Damage</option>
                  <option value="NETWORK_CONNECTIVITY">Network / Connectivity</option>
                  <option value="MAINTENANCE_AMC">Maintenance / AMC</option>
                  <option value="GENERAL_INQUIRY">General Inquiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Incident Priority *</Label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  className="w-full h-8 px-2 text-xs font-semibold rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="P1_CRITICAL">P1 Critical (0.5h response, 4h fix)</option>
                  <option value="P2_HIGH">P2 High (2h response, 8h fix)</option>
                  <option value="P3_MEDIUM">P3 Medium (8h response, 24h fix)</option>
                  <option value="P4_LOW">P4 Low (24h response, 72h fix)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Incident Summary / Title *</Label>
              <Input
                required
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="e.g. Blue screen crash when connecting Thunderbolt dock"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Detailed Description *</Label>
              <textarea
                required
                rows={3}
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Provide observed symptoms, error codes, and customer reproduction steps..."
                className="w-full p-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] focus:outline-none"
              />
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
                disabled={createSubmitting}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {createSubmitting ? 'Submitting...' : 'Dispatch Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Bulk Operations Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={tickets.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={toggleSelectAll}
        loading={bulkLoading}
        itemTypeLabel="tickets"
        actions={[
          {
            label: 'Set In Progress',
            action: () => handleBulkStatusChange('IN_PROGRESS'),
          },
          {
            label: 'Resolve',
            action: () => handleBulkStatusChange('RESOLVED'),
          },
          {
            label: 'Close',
            action: () => handleBulkStatusChange('CLOSED'),
          },
          {
            label: 'Set P1 Critical',
            icon: Flame,
            action: () => handleBulkPriorityChange('P1_CRITICAL'),
          },
          {
            label: 'Set P2 High',
            action: () => handleBulkPriorityChange('P2_HIGH'),
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
