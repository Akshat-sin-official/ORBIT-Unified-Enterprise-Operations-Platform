import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
  Users,
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { ExcelImportModal, ColumnDefinition } from '@/components/common/ExcelImportModal';
import { TablePagination, usePagination } from '@/components/common/TablePagination';

interface CustomerAddress {
  id: string;
  addressType: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface Warranty {
  id: string;
  warrantyNumber: string;
  coverageType: string;
  status: 'ACTIVE' | 'EXPIRED' | 'VOIDED';
  startDate: string;
  endDate: string;
  terms: string;
}

interface ProductRegistration {
  id: string;
  serialNumber: string;
  purchaseDate: string;
  sellerName?: string;
  invoiceNumber?: string;
  product: {
    id: string;
    name: string;
    sku: string;
    modelNumber?: string;
    category?: { name: string };
  };
  warranty?: Warranty;
}

interface CustomerInteraction {
  id: string;
  channel: string;
  subject: string;
  notes: string;
  createdAt: string;
}

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email?: string;
  phone: string;
  companyName?: string;
  type: 'INDIVIDUAL' | 'ENTERPRISE' | 'RETAIL';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  notes?: string;
  addresses?: CustomerAddress[];
  registrations?: ProductRegistration[];
  interactions?: CustomerInteraction[];
  _count?: {
    registrations: number;
    interactions: number;
  };
  createdAt: string;
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected customer for 360° modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Customer Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const pagination = usePagination(customers, 10);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    type: 'INDIVIDUAL',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const customerImportColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Full Name', required: true, example: 'Aarav Patel' },
    { key: 'phone', label: 'Phone Number', required: true, example: '+919876543210' },
    { key: 'email', label: 'Email Address', example: 'aarav.patel@example.com' },
    { key: 'companyName', label: 'Company Name', example: 'Patel Enterprises Ltd' },
    { key: 'type', label: 'Customer Type', example: 'INDIVIDUAL' },
    { key: 'street', label: 'Street Address', example: '123 Residency Road' },
    { key: 'city', label: 'City', example: 'Bengaluru' },
    { key: 'state', label: 'State', example: 'Karnataka' },
    { key: 'postalCode', label: 'Postal Code', example: '560001' },
    { key: 'notes', label: 'Account Notes', example: 'Key Enterprise account' },
  ];

  const handleBulkImportCustomers = async (rows: Record<string, any>[]) => {
    for (const row of rows) {
      if (!row.name || !row.phone) continue;
      const payload: any = {
        name: String(row.name),
        phone: String(row.phone),
        email: row.email ? String(row.email) : undefined,
        companyName: row.companyName ? String(row.companyName) : undefined,
        type: (row.type?.toUpperCase() === 'ENTERPRISE' || row.type?.toUpperCase() === 'RETAIL')
          ? row.type.toUpperCase()
          : 'INDIVIDUAL',
        notes: row.notes ? String(row.notes) : undefined,
      };

      if (row.street && row.city) {
        payload.address = {
          street: String(row.street),
          city: String(row.city),
          state: row.state ? String(row.state) : 'State',
          postalCode: row.postalCode ? String(row.postalCode) : '000000',
          country: 'India',
        };
      }

      await api.post('/crm/customers', payload);
    }
    await fetchCustomers();
  };

  // New Interaction Form inside Drawer
  const [interactionSubject, setInteractionSubject] = useState('');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionChannel, setInteractionChannel] = useState('PORTAL');
  const [interactionSubmitting, setInteractionSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/crm/customers', { params });
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, typeFilter, statusFilter]);

  const openCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    try {
      setDetailLoading(true);
      const res = await api.get(`/crm/customers/${id}`);
      setCustomerDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch customer 360 details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      const payload: any = {
        name: createForm.name,
        email: createForm.email || undefined,
        phone: createForm.phone,
        companyName: createForm.companyName || undefined,
        type: createForm.type,
        notes: createForm.notes || undefined,
      };

      if (createForm.street && createForm.city) {
        payload.address = {
          street: createForm.street,
          city: createForm.city,
          state: createForm.state || 'Karnataka',
          postalCode: createForm.postalCode || '560001',
          addressType: 'SERVICE_SITE',
        };
      }

      await api.post('/crm/customers', payload);
      setCreateDialogOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        type: 'INDIVIDUAL',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        notes: '',
      });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to create customer:', err);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !interactionSubject.trim() || !interactionNotes.trim()) return;

    try {
      setInteractionSubmitting(true);
      await api.post(`/crm/customers/${selectedCustomerId}/interactions`, {
        subject: interactionSubject,
        notes: interactionNotes,
        channel: interactionChannel,
      });
      setInteractionSubject('');
      setInteractionNotes('');
      // Refresh details
      openCustomerDetail(selectedCustomerId);
    } catch (err) {
      console.error('Failed to add interaction:', err);
    } finally {
      setInteractionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Customers & Accounts
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Maintain customer master accounts, service site addresses, and registered hardware assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExcelImportOpen(true)}
            className="border-border text-ink hover:bg-zinc-100 flex items-center gap-2 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import Excel
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Total Accounts</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">{customers.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Enterprise</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {customers.filter((c) => c.type === 'ENTERPRISE').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Active Status</p>
              <p className="text-2xl font-bold font-poppins text-emerald-700 mt-0.5">
                {customers.filter((c) => c.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-muted">Registered Hardware</p>
              <p className="text-2xl font-bold font-poppins text-ink mt-0.5">
                {customers.reduce((acc, c) => acc + (c._count?.registrations || 0), 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Laptop className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="bg-white border-border/70 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, email, or code..."
              className="pl-9 bg-[#FAF9F6] border-border/80 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none"
            >
              <option value="">All Account Types</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="RETAIL">Retail</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-border/80 bg-[#FAF9F6] text-ink focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card className="bg-white border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-[#FBFBFA] text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer / Contact</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Assets</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    No customers found matching criteria.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-ink-soft">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {c.customerCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink font-poppins">{c.name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-ink-muted" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-ink-muted" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-ink-soft font-medium">
                      {c.companyName || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={
                          c.type === 'ENTERPRISE'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]'
                            : c.type === 'RETAIL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 text-[10px]'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200 text-[10px]'
                        }
                      >
                        {c.type}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px]'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                        <Laptop className="w-3 h-3 text-amber-600" />
                        {c._count?.registrations ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCustomerDetail(c.id)}
                        className="text-xs h-8 border-border/80 hover:bg-zinc-50 flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        View 360°
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

      {/* Customer 360° Profile Dialog */}
      <Dialog
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          {detailLoading || !customerDetail ? (
            <div className="py-16 text-center text-ink-muted">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              Loading Customer 360 profile...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header profile banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-border/70 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-ink-soft">
                      {customerDetail.customerCode}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                    >
                      {customerDetail.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {customerDetail.type}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold font-poppins text-ink mt-2">
                    {customerDetail.name}
                  </h2>
                  {customerDetail.companyName && (
                    <p className="text-xs font-medium text-ink-muted flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-ink-muted" />
                      {customerDetail.companyName}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <p className="text-xs font-mono font-medium text-ink flex items-center sm:justify-end gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {customerDetail.phone}
                  </p>
                  {customerDetail.email && (
                    <p className="text-xs text-ink-muted flex items-center sm:justify-end gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-ink-muted" /> {customerDetail.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Service Addresses */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Service Site Locations
                </h3>
                {customerDetail.addresses && customerDetail.addresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerDetail.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3 rounded-lg border border-border/80 bg-[#FAF9F6] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">{addr.street}</span>
                          {addr.isDefault && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">
                              Primary Site
                            </Badge>
                          )}
                        </div>
                        <p className="text-ink-muted">
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted italic">No service addresses registered.</p>
                )}
              </div>

              {/* Registered Hardware Assets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-primary" />
                    Registered Assets & Warranties (
                    {customerDetail.registrations?.length || 0})
                  </h3>
                </div>

                {customerDetail.registrations && customerDetail.registrations.length > 0 ? (
                  <div className="space-y-3">
                    {customerDetail.registrations.map((reg) => {
                      const isExpired =
                        reg.warranty && new Date(reg.warranty.endDate) < new Date();
                      return (
                        <div
                          key={reg.id}
                          className="p-4 rounded-xl border border-border/80 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-ink font-poppins">
                                {reg.product.name}
                              </span>
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                                {reg.product.sku}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mt-1.5">
                              <span className="font-mono text-ink-soft font-medium">
                                SN: {reg.serialNumber}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Purchased:{' '}
                                {new Date(reg.purchaseDate).toLocaleDateString()}
                              </span>
                              {reg.sellerName && (
                                <>
                                  <span>•</span>
                                  <span>Seller: {reg.sellerName}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {reg.warranty ? (
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className={
                                    !isExpired && reg.warranty.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }
                                >
                                  {!isExpired && reg.warranty.status === 'ACTIVE' ? (
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      Active Warranty
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                                      Expired
                                    </span>
                                  )}
                                </Badge>
                                <p className="text-[11px] font-mono text-ink-muted">
                                  Valid till: {new Date(reg.warranty.endDate).toLocaleDateString()}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-zinc-500">
                                No Warranty
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-border/80 rounded-xl bg-[#FAF9F6]">
                    <Laptop className="w-6 h-6 text-ink-muted mx-auto mb-1" />
                    <p className="text-xs text-ink-muted">No assets registered to this customer yet.</p>
                  </div>
                )}
              </div>

              {/* Interaction Timeline & Log Note */}
              <div className="pt-4 border-t border-border/70">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Interaction Touchpoints & Timeline
                </h3>

                {/* Log interaction form */}
                <form
                  onSubmit={handleAddInteraction}
                  className="p-3 rounded-xl border border-border/70 bg-[#FAF9F6] space-y-2 mb-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Subject (e.g. Inquired about AMC renewal)"
                      value={interactionSubject}
                      onChange={(e) => setInteractionSubject(e.target.value)}
                      required
                      className="bg-white text-xs h-8 sm:col-span-2"
                    />
                    <select
                      value={interactionChannel}
                      onChange={(e) => setInteractionChannel(e.target.value)}
                      className="px-2 py-1 text-xs rounded-md border border-border/80 bg-white text-ink"
                    >
                      <option value="PHONE">Phone Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="PORTAL">Customer Portal</option>
                      <option value="IN_PERSON">In Person / On-Site</option>
                      <option value="CHAT">Live Chat</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter interaction notes, resolution, or discussion points..."
                      value={interactionNotes}
                      onChange={(e) => setInteractionNotes(e.target.value)}
                      required
                      className="bg-white text-xs h-8 flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={interactionSubmitting}
                      size="sm"
                      className="h-8 text-xs bg-primary hover:bg-primary-hover text-white flex items-center gap-1"
                    >
                      {interactionSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Log Note
                    </Button>
                  </div>
                </form>

                {/* Timeline items */}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customerDetail.interactions && customerDetail.interactions.length > 0 ? (
                    customerDetail.interactions.map((it) => (
                      <div
                        key={it.id}
                        className="p-3 rounded-lg border border-border/60 bg-white text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink font-poppins">{it.subject}</span>
                          <span className="text-[10px] text-ink-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(it.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-ink-muted text-xs leading-relaxed">{it.notes}</p>
                        <div className="pt-1">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                            via {it.channel}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-ink-muted italic py-2">No interaction notes recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">New Customer Account</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Add an individual or corporate client with primary service site address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Vikram Singhania"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+919876543210"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="vikram@enterprise.com"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Company / Org</Label>
                <Input
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  placeholder="Singhania Labs Ltd"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Account Type</Label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="RETAIL">Retail</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-border/60">
              <Label className="text-xs text-ink-muted">Primary Service Address</Label>
              <Input
                value={createForm.street}
                onChange={(e) => setCreateForm({ ...createForm, street: e.target.value })}
                placeholder="Street address (e.g. 5th Floor, Tower 2, Indiranagar)"
                className="h-8 text-xs bg-[#FAF9F6] mb-1.5"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  placeholder="City (e.g. Bengaluru)"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
                <Input
                  value={createForm.state}
                  onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                  placeholder="State"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
                <Input
                  value={createForm.postalCode}
                  onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                  placeholder="Pincode"
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>
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
                {createSubmitting ? 'Creating...' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Excel Importer */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        title="Upload & Populate Customers"
        entityName="Customers"
        columns={customerImportColumns}
        onImport={handleBulkImportCustomers}
      />
    </div>
  );
};
