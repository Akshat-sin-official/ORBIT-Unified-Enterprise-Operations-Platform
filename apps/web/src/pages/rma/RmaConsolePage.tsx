import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Scan,
  Barcode,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface PartSwap {
  id: string;
  rmaBarcode: string;
  defectiveSerialNumber: string;
  replacementSerialNumber: string;
  rmaStatus: string;
  auditNotes?: string;
  receivedAt?: string;
  auditedAt?: string;
  createdAt: string;
  workOrder: {
    id: string;
    workOrderNumber: string;
    title: string;
    customer: {
      name: string;
    };
    technician?: {
      technicianCode: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  part?: {
    name: string;
    partNumber: string;
  };
}

export const RmaConsolePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [swaps, setSwaps] = useState<PartSwap[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Barcode Scanner Input
  const [scanInput, setScanInput] = useState<string>('');
  const [scanning, setScanning] = useState(false);

  // Technical Audit Dialog
  const [auditTarget, setAuditTarget] = useState<PartSwap | null>(null);
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [submittingAudit, setSubmittingAudit] = useState(false);

  const fetchRmas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/rma/list?${params.toString()}`);
      setSwaps(res.data.data || []);
      setStats(res.data.stats || {});
    } catch {
      toast.error('Failed to load RMA data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRmas();
  }, [selectedStatus]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanning(true);
    try {
      const res = await api.patch('/rma/scan-receive', {
        rmaBarcode: scanInput.trim(),
      });
      toast.success(res.data.message || 'Defective part successfully checked in at Depot');
      setScanInput('');
      fetchRmas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Barcode check-in failed');
    } finally {
      setScanning(false);
    }
  };

  const handleAuditAction = async (passed: boolean) => {
    if (!auditTarget) return;
    setSubmittingAudit(true);
    try {
      await api.post('/rma/audit', {
        rmaBarcode: auditTarget.rmaBarcode,
        passed,
        auditNotes: auditNotes || (passed ? 'Verified factory defect' : 'Warranty rejected'),
      });

      toast.success(
        `Audit successfully recorded: #${auditTarget.rmaBarcode} marked as ${passed ? 'PASSED' : 'REJECTED'}`,
      );
      setAuditTarget(null);
      setAuditNotes('');
      fetchRmas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Audit submission failed');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WITH_TECH':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">With Field Tech</Badge>;
      case 'IN_TRANSIT':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Reverse Transit</Badge>;
      case 'RECEIVED_AT_DEPOT':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Received at Depot</Badge>;
      case 'AUDIT_PASSED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Warranty Approved</Badge>;
      case 'AUDIT_FAILED':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Audit Failed / Chargeback</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSwaps = swaps.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.rmaBarcode.toLowerCase().includes(q) ||
      s.defectiveSerialNumber.toLowerCase().includes(q) ||
      s.replacementSerialNumber.toLowerCase().includes(q) ||
      s.workOrder.workOrderNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
        <div>
          <h1 className="text-xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Serialized Defective RMA Exchange & Reverse Logistics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dual-serial verification (defective out vs replacement in), depot check-in scanning, and warranty bench audits
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchRmas} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">With Field Tech</div>
              <div className="text-lg font-bold font-poppins text-ink">{stats.withTech || 0}</div>
            </div>
            <Clock className="w-5 h-5 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">In Transit</div>
              <div className="text-lg font-bold font-poppins text-ink">{stats.inTransit || 0}</div>
            </div>
            <Truck className="w-5 h-5 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">At Central Hub</div>
              <div className="text-lg font-bold font-poppins text-ink">{stats.receivedAtDepot || 0}</div>
            </div>
            <Building2 className="w-5 h-5 text-purple-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Warranty Approved</div>
              <div className="text-lg font-bold font-poppins text-emerald-600">{stats.auditPassed || 0}</div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Rejected / Fraud</div>
              <div className="text-lg font-bold font-poppins text-rose-600">{stats.auditFailed || 0}</div>
            </div>
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {/* Central Depot Quick Scanner Banner */}
      <Card className="border-primary/40 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white">
        <CardContent className="p-4">
          <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-ink shrink-0">
              <Scan className="w-5 h-5 text-primary" />
              <span>Depot Barcode Receiver:</span>
            </div>
            <div className="relative flex-1 w-full">
              <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or enter RMA barcode (e.g. RMA-2026-0001)..."
                className="pl-9 h-9 text-xs bg-white font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={scanning || !scanInput.trim()}
              size="sm"
              className="h-9 text-xs px-4 gap-1.5 shrink-0"
            >
              <PackageCheck className="w-4 h-4" />
              Check-In to Depot
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters & RMA Table */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search serials, RMA, or work orders..."
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-semibold text-ink bg-white border border-border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="">All RMA Stages</option>
                <option value="WITH_TECH">With Field Technician</option>
                <option value="IN_TRANSIT">In Reverse Transit</option>
                <option value="RECEIVED_AT_DEPOT">Received at Central Hub</option>
                <option value="AUDIT_PASSED">Audit Approved</option>
                <option value="AUDIT_FAILED">Audit Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-zinc-100/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-3">RMA Barcode</th>
                <th className="p-3">Defective Serial (Out)</th>
                <th className="p-3">Replacement Serial (In)</th>
                <th className="p-3">Work Order & Customer</th>
                <th className="p-3">Technician</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSwaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                    No serialized RMA exchanges recorded yet.
                  </td>
                </tr>
              ) : (
                filteredSwaps.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      {item.rmaBarcode}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {item.defectiveSerialNumber}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.replacementSerialNumber}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-ink">#{item.workOrder.workOrderNumber}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {item.workOrder.customer.name}
                      </div>
                    </td>
                    <td className="p-3">
                      {item.workOrder.technician ? (
                        <div>
                          <div className="font-medium text-ink">
                            {item.workOrder.technician.user.firstName}{' '}
                            {item.workOrder.technician.user.lastName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {item.workOrder.technician.technicianCode}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">{getStatusBadge(item.rmaStatus)}</td>
                    <td className="p-3 text-right">
                      {item.rmaStatus === 'RECEIVED_AT_DEPOT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAuditTarget(item)}
                          className="h-7 text-xs px-2.5 gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Bench Audit
                        </Button>
                      )}
                      {item.rmaStatus === 'WITH_TECH' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setScanInput(item.rmaBarcode);
                          }}
                          className="h-7 text-xs px-2.5 gap-1"
                        >
                          <Scan className="w-3 h-3" />
                          Receive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Technical Audit Modal */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold font-poppins text-ink">
                  Technical Bench Audit
                </h2>
              </div>
              <button
                onClick={() => setAuditTarget(null)}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RMA Barcode:</span>
                  <span className="font-bold font-mono text-ink">{auditTarget.rmaBarcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Defective Serial:</span>
                  <span className="font-mono text-rose-700 font-bold">
                    {auditTarget.defectiveSerialNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Order:</span>
                  <span className="font-mono text-ink">
                    #{auditTarget.workOrder.workOrderNumber}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">
                  Bench Inspection Notes / Defect Verification:
                </label>
                <textarea
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="Enter multimeter readings, circuit inspection notes, or counterfeit/tamper reasons..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="destructive"
                size="sm"
                disabled={submittingAudit}
                onClick={() => handleAuditAction(false)}
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject Claim (Chargeback)
              </Button>
              <Button
                size="sm"
                disabled={submittingAudit}
                onClick={() => handleAuditAction(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Warranty Claim
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
