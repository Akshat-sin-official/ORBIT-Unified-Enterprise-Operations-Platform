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
  Receipt,
  Plus,
  Search,
  DollarSign,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  QrCode,
  FileText,
  User,
  Tag,
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  amount: number | string;
  isWarrantyCovered: boolean;
  part?: { partNumber: string; name: string };
}

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number | string;
  paymentMethod: string;
  transactionRef?: string;
  paidAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  balanceDue: number | string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  customer: { id: string; name: string; phone?: string; email?: string };
  workOrder?: { id: string; workOrderNumber: string; title: string };
  items?: InvoiceItem[];
  payments?: Payment[];
}

interface FinanceSummary {
  totalInvoices: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  warrantyClaimsAbsorbed: number;
}

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'warranty'>('invoices');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [workOrders, setWorkOrders] = useState<{ id: string; workOrderNumber: string; title: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    customerId: '',
    workOrderId: '',
    dueDate: '',
    notes: '',
    itemDescription: '',
    itemQuantity: 1,
    itemUnitPrice: 1850,
    itemTaxRate: 18,
    isWarrantyCovered: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'UPI',
    transactionRef: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, invRes, custRes, woRes] = await Promise.all([
        api.get('/finance/summary').catch(() => ({ data: null })),
        api.get('/finance/invoices').catch(() => ({ data: { items: [] } })),
        api.get('/crm/customers').catch(() => ({ data: { items: [] } })),
        api.get('/field-service/work-orders').catch(() => ({ data: { items: [] } })),
      ]);

      setSummary(sumRes.data);
      setInvoices(invRes.data?.items || []);
      setCustomers(custRes.data?.items || []);
      setWorkOrders(woRes.data?.items || []);

      if (custRes.data?.items?.length > 0) {
        setCreateForm((p) => ({ ...p, customerId: custRes.data.items[0].id }));
      }
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/finance/invoices', {
        customerId: createForm.customerId,
        workOrderId: createForm.workOrderId || undefined,
        dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : undefined,
        notes: createForm.notes || undefined,
        items: [
          {
            description: createForm.itemDescription,
            quantity: Number(createForm.itemQuantity),
            unitPrice: Number(createForm.itemUnitPrice),
            taxRate: Number(createForm.itemTaxRate),
            isWarrantyCovered: createForm.isWarrantyCovered,
          },
        ],
      });

      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      setSubmitting(true);
      await api.post(`/finance/invoices/${selectedInvoice.id}/payments`, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionRef: paymentForm.transactionRef || undefined,
        notes: paymentForm.notes || undefined,
      });

      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = async (inv: Invoice) => {
    try {
      const res = await api.get(`/finance/invoices/${inv.id}`);
      setSelectedInvoice(res.data);
      setIsViewModalOpen(true);
    } catch {
      setSelectedInvoice(inv);
      setIsViewModalOpen(true);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentForm({
      amount: Number(inv.balanceDue),
      paymentMethod: 'UPI',
      transactionRef: '',
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PAID
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            PARTIALLY PAID
          </span>
        );
      case 'WARRANTY_ABSORBED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            WARRANTY 100%
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            ISSUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
            {status}
          </span>
        );
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'warranty' && inv.status !== 'WARRANTY_ABSORBED') {
      const hasWarrantyItem = inv.items?.some((i) => i.isWarrantyCovered);
      if (!hasWarrantyItem) return false;
    }
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCust = inv.customer.name.toLowerCase().includes(q);
      return matchInv || matchCust;
    }
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              FINANCE & BILLING
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-white text-ink border-border">
              MILESTONE 7 ACTIVE
            </Badge>
          </div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-primary stroke-[2.2]" />
            Invoices, Billing & Warranty Accounting
          </h1>
          <p className="text-xs text-ink-soft font-normal mt-0.5">
            Service job invoicing, warranty claim expense absorption, GST calculation & multi-modal payments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
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
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs font-semibold bg-primary hover:bg-primary/95 text-white shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Total Billed Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-ink">
                ₹{summary ? summary.totalBilled.toLocaleString('en-IN') : '0'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">INR</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {summary?.totalInvoices ?? 0} invoices issued
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Collected Payments</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-emerald-700">
                ₹{summary ? summary.totalCollected.toLocaleString('en-IN') : '0'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">collected</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary?.paidInvoicesCount ?? 0} invoices fully settled
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Outstanding Receivables</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-amber-700">
                ₹{summary ? summary.totalOutstanding.toLocaleString('en-IN') : '0'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">pending</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary?.pendingInvoicesCount ?? 0} open customer balances
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Warranty Claims Absorbed</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-purple-700">
                ₹{summary ? summary.warrantyClaimsAbsorbed.toLocaleString('en-IN') : '0'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">OEM absorbed</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Parts covered under valid warranty contracts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'invoices' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              All Service Invoices
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {invoices.length}
              </span>
            </div>
            {activeTab === 'invoices' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('warranty')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'warranty' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Warranty Absorption Ledger
            </div>
            {activeTab === 'warranty' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border/70 shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice # or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8.5 text-xs bg-zinc-50/50 border-border/70 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8.5 px-3 text-xs rounded-lg border border-border/70 bg-zinc-50/50 text-ink font-medium focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="ISSUED">Issued / Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="WARRANTY_ABSORBED">Warranty 100%</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border/70 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-border/70 text-ink-soft font-medium">
                <tr>
                  <th className="py-3 px-4 font-poppins">Invoice #</th>
                  <th className="py-3 px-4 font-poppins">Customer</th>
                  <th className="py-3 px-4 font-poppins">Linked Work Order</th>
                  <th className="py-3 px-4 font-poppins text-right">Subtotal</th>
                  <th className="py-3 px-4 font-poppins text-right">GST (18%)</th>
                  <th className="py-3 px-4 font-poppins text-right">Total Amount</th>
                  <th className="py-3 px-4 font-poppins text-right">Balance Due</th>
                  <th className="py-3 px-4 font-poppins text-center">Status</th>
                  <th className="py-3 px-4 font-poppins text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading billing records...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink text-[12px]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-ink block">{inv.customer.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{inv.customer.phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        {inv.workOrder ? (
                          <span className="font-mono text-primary text-[11px] font-semibold">
                            {inv.workOrder.workOrderNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-ink">
                        ₹{Number(inv.subtotal).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        ₹{Number(inv.taxAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                        ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {Number(inv.balanceDue) > 0 ? `₹${Number(inv.balanceDue).toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(inv)}
                            className="h-7 text-[11px] text-ink-soft hover:text-ink"
                          >
                            View
                          </Button>
                          {Number(inv.balanceDue) > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentModal(inv)}
                              className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Modal 1: Generate Invoice ───────────────────────────────────────── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Generate Service Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create customer invoice with itemized parts & warranty determination.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-medium">Customer</Label>
              <select
                required
                value={createForm.customerId}
                onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium">Linked Field Service Work Order (Optional)</Label>
              <select
                value={createForm.workOrderId}
                onChange={(e) => setCreateForm({ ...createForm, workOrderId: e.target.value })}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                <option value="">None / Standalone Billing</option>
                {workOrders.map((w) => (
                  <option key={w.id} value={w.id}>{w.workOrderNumber} - {w.title}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-border/70 space-y-3">
              <span className="text-xs font-semibold text-ink block">Line Item Details</span>
              <div>
                <Label className="text-xs font-medium">Item Description</Label>
                <Input
                  required
                  placeholder="e.g. On-site engineer diagnostic visit / replacement battery"
                  value={createForm.itemDescription}
                  onChange={(e) => setCreateForm({ ...createForm, itemDescription: e.target.value })}
                  className="mt-1 h-9 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={createForm.itemQuantity}
                    onChange={(e) => setCreateForm({ ...createForm, itemQuantity: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={createForm.itemUnitPrice}
                    onChange={(e) => setCreateForm({ ...createForm, itemUnitPrice: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">GST Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={createForm.itemTaxRate}
                    onChange={(e) => setCreateForm({ ...createForm, itemTaxRate: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="warrantyCoveredCheck"
                  checked={createForm.isWarrantyCovered}
                  onChange={(e) => setCreateForm({ ...createForm, isWarrantyCovered: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <Label htmlFor="warrantyCoveredCheck" className="text-xs font-medium cursor-pointer text-purple-700">
                  100% Absorbed by Active Hardware Warranty (₹0 Customer Charge)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
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
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Record Payment ─────────────────────────────────────────── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[460px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Record Customer Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record receipt for invoice #{selectedInvoice?.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-3.5 pt-2">
            <div className="p-3 bg-zinc-50 rounded-lg border border-border/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Customer</span>
                <span className="font-medium text-ink">{selectedInvoice?.customer.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  ₹{Number(selectedInvoice?.balanceDue).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Payment Amount (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Payment Method</Label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="NET_BANKING">Net Banking / NEFT</option>
                  <option value="CASH">Cash on Service</option>
                  <option value="CORPORATE_CREDIT">Corporate PO / Credit</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Transaction / UTR Reference</Label>
              <Input
                placeholder="e.g. UPI/20261117/HDFC/998124801"
                value={paymentForm.transactionRef}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Confirm Payment Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: View Invoice Bill ──────────────────────────────────────── */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[620px] bg-white">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">TAX INVOICE</span>
                <DialogTitle className="font-poppins font-bold text-xl text-ink">
                  {selectedInvoice?.invoiceNumber}
                </DialogTitle>
              </div>
              <div>{selectedInvoice && getStatusBadge(selectedInvoice.status)}</div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-50 rounded-lg border border-border/70">
              <div>
                <span className="text-[10px] text-muted-foreground block">Billed To</span>
                <span className="font-semibold text-ink text-sm block">{selectedInvoice?.customer.name}</span>
                <span className="text-muted-foreground font-mono block">{selectedInvoice?.customer.phone}</span>
                <span className="text-muted-foreground block">{selectedInvoice?.customer.email}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Invoice Date</span>
                <span className="font-mono text-ink block">
                  {selectedInvoice?.createdAt && new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN')}
                </span>
                {selectedInvoice?.workOrder && (
                  <span className="text-[11px] font-mono text-primary font-semibold block mt-1">
                    Work Order: {selectedInvoice.workOrder.workOrderNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-border/70 text-ink-soft">
                  <tr>
                    <th className="p-2.5 font-poppins">Item Description</th>
                    <th className="p-2.5 font-poppins text-center">Qty</th>
                    <th className="p-2.5 font-poppins text-right">Price</th>
                    <th className="p-2.5 font-poppins text-right">Tax Rate</th>
                    <th className="p-2.5 font-poppins text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {selectedInvoice?.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <span className="font-medium text-ink block">{item.description}</span>
                        {item.isWarrantyCovered && (
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 mt-0.5">
                            WARRANTY COVERED (100% REIMBURSED)
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-mono">{item.isWarrantyCovered ? '0%' : `${item.taxRate}%`}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-56 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(selectedInvoice?.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST Amount:</span>
                  <span className="font-mono">₹{Number(selectedInvoice?.taxAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-ink text-sm pt-1.5 border-t border-border/70">
                  <span>Total Amount:</span>
                  <span className="font-mono">₹{Number(selectedInvoice?.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹{Number(selectedInvoice?.amountPaid).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold border-t border-border/60 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{Number(selectedInvoice?.balanceDue).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
