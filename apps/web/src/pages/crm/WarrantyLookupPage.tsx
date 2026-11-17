import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Barcode,
  Calendar,
  Building,
  User,
  Phone,
  Laptop,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Ticket,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const WarrantyLookupPage: React.FC = () => {
  const [serialInput, setSerialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleLookup = async (serialToSearch?: string) => {
    const sn = (serialToSearch || serialInput).trim().toUpperCase();
    if (!sn) return;

    try {
      setLoading(true);
      setSearched(true);
      setSerialInput(sn);
      const res = await api.get(`/crm/warranty/check/${encodeURIComponent(sn)}`);
      setResult(res.data);
    } catch (err: any) {
      console.error('Warranty lookup failed:', err);
      setResult({
        found: false,
        status: 'ERROR',
        message: err.response?.data?.message || 'Error executing lookup',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          ORBIT Service Entitlement Engine
        </div>
        <h1 className="text-3xl font-bold font-poppins text-ink tracking-tight">
          Instant Warranty & Asset Verification
        </h1>
        <p className="text-sm text-ink-muted max-w-xl mx-auto">
          Verify manufacturer coverage, active SLA entitlements, customer ownership, and serial number validity.
        </p>
      </div>

      {/* Big Scanner / Input Bar */}
      <Card className="bg-white border-border/70 shadow-sm p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
              placeholder="Enter Hardware Serial Number (e.g. SN-LEN-882101)..."
              className="pl-11 h-12 text-sm font-mono tracking-wide uppercase bg-[#FAF9F6] border-border/80"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-6 bg-primary hover:bg-primary-hover text-white font-semibold font-poppins flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Check Entitlement
          </Button>
        </form>

        {/* Quick Demo Serials Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/60 text-xs">
          <span className="text-ink-muted font-medium text-[11px]">Quick Demo Checks:</span>
          <button
            type="button"
            onClick={() => handleLookup('SN-LEN-882101')}
            className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] hover:bg-emerald-100 transition-colors flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            SN-LEN-882101 (Active)
          </button>
          <button
            type="button"
            onClick={() => handleLookup('SN-LEN-882102')}
            className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[11px] hover:bg-rose-100 transition-colors flex items-center gap-1"
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            SN-LEN-882102 (Expired)
          </button>
          <button
            type="button"
            onClick={() => handleLookup('SN-LEN-882103')}
            className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Laptop className="w-3 h-3 text-blue-600" />
            SN-LEN-882103 (Unregistered)
          </button>
        </div>
      </Card>

      {/* Results View */}
      {searched && result && (
        <div className="space-y-4">
          {/* Active Warranty Banner */}
          {result.status === 'ACTIVE' && (
            <Card className="bg-emerald-50/70 border-emerald-200 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg font-poppins text-emerald-950">
                          Warranty Fully Active & Entitled
                        </span>
                        <Badge className="bg-emerald-600 text-white font-mono text-xs">
                          {result.daysRemaining} Days Left
                        </Badge>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1">
                        Eligible for zero-cost OEM replacement parts and priority onsite technician dispatch.
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                      Certificate No.
                    </span>
                    <span className="font-mono font-bold text-emerald-950 text-sm">
                      {result.warranty?.warrantyNumber}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expired Warranty Banner */}
          {result.status === 'EXPIRED' && (
            <Card className="bg-amber-50/80 border-amber-200 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg font-poppins text-amber-950">
                          OEM Warranty Expired
                        </span>
                        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-xs">
                          Lapsed
                        </Badge>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        Service tickets for this asset require billable parts quotation or out-of-warranty labor charges.
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                      Expired On
                    </span>
                    <span className="font-mono font-bold text-amber-950 text-sm">
                      {result.warranty?.endDate
                        ? new Date(result.warranty.endDate).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unregistered Factory Serial */}
          {result.status === 'UNREGISTERED' && (
            <Card className="bg-blue-50/80 border-blue-200 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Laptop className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg font-poppins text-blue-950">
                          Valid OEM Serial — Not Yet Registered
                        </span>
                        <Badge className="bg-blue-600 text-white font-mono text-xs">
                          Inventory Batch
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-800 mt-1">
                        Manufactured under batch{' '}
                        <span className="font-mono font-semibold">{result.manufacturedBatch}</span>. Ready for customer binding.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Not Found */}
          {result.status === 'NOT_FOUND' && (
            <Card className="bg-zinc-50 border-zinc-200 p-8 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-bold font-poppins text-ink">Serial Number Not Found</p>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                No manufacturing record or registration matches{' '}
                <span className="font-mono font-semibold text-ink">{result.serialNumber}</span>. Please verify the serial barcode label.
              </p>
            </Card>
          )}

          {/* Detailed Asset & Customer Breakdown (for registered or inventory assets) */}
          {result.found && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Specifications */}
              <Card className="bg-white border-border/70 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <Laptop className="w-3.5 h-3.5 text-primary" />
                    Hardware Asset Details
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-ink-muted">Product Model:</span>
                      <span className="font-semibold text-ink font-poppins">{result.product?.name}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-ink-muted">SKU:</span>
                      <span className="font-mono font-medium text-ink-soft">{result.product?.sku}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-ink-muted">Model Number:</span>
                      <span className="font-mono text-ink-soft">{result.product?.modelNumber || '—'}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-ink-muted">Category:</span>
                      <span className="text-ink-soft">{result.product?.category || 'Hardware'}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-ink-muted">Serial Number:</span>
                      <span className="font-mono font-bold text-ink bg-zinc-100 px-1.5 py-0.5 rounded">
                        {result.serialNumber}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Ownership or Registration Link */}
              <Card className="bg-white border-border/70 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Customer Ownership & Sale
                  </h3>

                  {result.registered && result.customer ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-ink-muted">Account Name:</span>
                        <span className="font-semibold text-ink font-poppins">{result.customer.name}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-ink-muted">Customer Code:</span>
                        <span className="font-mono text-ink-soft">{result.customer.code}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-ink-muted">Contact Phone:</span>
                        <span className="font-mono text-ink-soft">{result.customer.phone}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-ink-muted">Purchase Date:</span>
                        <span className="text-ink-soft">
                          {result.purchaseDate ? new Date(result.purchaseDate).toLocaleDateString() : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-ink-muted">Authorized Seller:</span>
                        <span className="text-ink-soft">{result.sellerName || 'Direct'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-ink-muted">This unit is currently in inventory unassigned.</p>
                      <Button
                        size="sm"
                        onClick={() => (window.location.href = '/operations/products')}
                        className="bg-primary hover:bg-primary-hover text-white text-xs"
                      >
                        Go to Product Registration
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Warranty Terms & SLA Details */}
          {result.registered && result.warranty && (
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Coverage Specifications & SLA Terms
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-border/60">
                    <span className="text-[11px] text-ink-muted block">Coverage Classification</span>
                    <span className="font-bold text-ink mt-0.5 block">{result.warranty.coverageType}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-border/60">
                    <span className="text-[11px] text-ink-muted block">Entitlement Start</span>
                    <span className="font-mono font-medium text-ink mt-0.5 block">
                      {new Date(result.warranty.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-border/60">
                    <span className="text-[11px] text-ink-muted block">Entitlement Expiration</span>
                    <span className="font-mono font-medium text-ink mt-0.5 block">
                      {new Date(result.warranty.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs">
                  <span className="font-semibold text-ink-soft block mb-1">Contract Terms:</span>
                  <p className="text-ink-muted leading-relaxed">
                    {result.warranty.terms || 'Standard manufacturer warranty policy applies.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
