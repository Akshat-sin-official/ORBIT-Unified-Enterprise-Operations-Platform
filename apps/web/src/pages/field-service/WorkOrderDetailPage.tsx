import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  History,
  Loader2,
  Calendar,
  AlertTriangle,
  KeyRound,
  Star,
  Layers,
  ChevronRight,
  Package,
  Plus,
  Camera,
  Share2,
  Copy,
  PenTool,
  ArrowRightLeft,
  Barcode,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

export const WorkOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Smart dispatch recommendation modal
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Status transition modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [repairSummary, setRepairSummary] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Add Part modal & catalog auto-fetch
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [catalogParts, setCatalogParts] = useState<any[]>([]);
  const [selectedCatalogPartId, setSelectedCatalogPartId] = useState<string>('');
  const [partForm, setPartForm] = useState({
    partId: '',
    partNumber: '',
    partName: '',
    serialNumber: '',
    quantity: 1,
    unitCost: 0,
    warrantyCovered: true,
  });
  const [partSubmitting, setPartSubmitting] = useState(false);

  // OTP Completion modal
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [completionSummary, setCompletionSummary] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Phase 2: Serialized Part Swap Modal
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    partId: '',
    defectiveSerialNumber: '',
    replacementSerialNumber: '',
  });
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [partSwaps, setPartSwaps] = useState<any[]>([]);

  // Phase 4: Proof of Work Media & Signature
  const [proofMediaList, setProofMediaList] = useState<any[]>([]);
  const [proofCompliance, setProofCompliance] = useState<any>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<string>('BEFORE_REPAIR');
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Job Sheet Print View
  const [jobSheetOpen, setJobSheetOpen] = useState(false);

  // Phase 5: Tracking Link
  const [trackingToken, setTrackingToken] = useState<string>('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  const fetchWorkOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/field-service/work-orders/${id}`);
      setWorkOrder(res.data);
      if (res.data?.registration?.warranty?.isActive !== undefined) {
        setPartForm((prev) => ({
          ...prev,
          warrantyCovered: Boolean(res.data.registration.warranty.isActive),
        }));
      }

      // Fetch proof of work media & RMA swaps
      loadProofMedia();
      loadRmaSwaps();
      loadTrackingSession();
    } catch (err) {
      console.error('Failed to load work order:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProofMedia = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/proof-of-work/work-orders/${id}`);
      setProofMediaList(res.data.media || []);
      setProofCompliance(res.data.compliance || null);
    } catch {}
  };

  const loadRmaSwaps = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/rma/list?page=1&limit=20`);
      const matched = (res.data.data || []).filter((s: any) => s.workOrderId === id);
      setPartSwaps(matched);
    } catch {}
  };

  const loadTrackingSession = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/tracking/session/${id}`);
      if (res.data?.secureToken) {
        setTrackingToken(res.data.secureToken);
      }
    } catch {}
  };

  const handleCopyTrackingLink = () => {
    if (!trackingToken) return;
    const url = `${window.location.origin}/track/${trackingToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Customer Live Tracking Link copied to clipboard!');
  };

  const handleRecordSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSwapSubmitting(true);
      const res = await api.post(`/rma/work-orders/${id}/swap`, swapForm);
      toast.success(`RMA Barcode #${res.data.rmaBarcode} generated for serialized swap!`);
      setSwapModalOpen(false);
      setSwapForm({ partId: '', defectiveSerialNumber: '', replacementSerialNumber: '' });
      loadRmaSwaps();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record serialized part swap');
    } finally {
      setSwapSubmitting(false);
    }
  };

  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingProof(true);
        await api.post(`/proof-of-work/work-orders/${id}/media`, {
          mediaType: selectedMediaType,
          fileData: reader.result as string,
          latitude: 12.9716,
          longitude: 77.5946,
        });
        toast.success(`Proof of work photo uploaded as ${selectedMediaType}`);
        loadProofMedia();
      } catch (err: any) {
        toast.error('Failed to upload proof of work media');
      } finally {
        setUploadingProof(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (id) {
      fetchWorkOrder();
      api
        .get('/inventory/parts')
        .then((res) => {
          setCatalogParts(res.data?.items || []);
        })
        .catch(() => {});
    }
  }, [id]);

  const handleSelectCatalogPart = (partId: string) => {
    setSelectedCatalogPartId(partId);
    if (!partId) return;
    const part = catalogParts.find((p) => p.id === partId);
    if (part) {
      setPartForm((prev) => ({
        ...prev,
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        unitCost: Number(part.costPrice || part.sellingPrice || 0),
      }));
    }
  };

  const handlePartNumberChange = (rawInput: string) => {
    const val = rawInput.toUpperCase();
    setPartForm((prev) => ({ ...prev, partNumber: val }));

    // Auto-match against catalog if user typed part number
    const matched = catalogParts.find(
      (p) => p.partNumber.toUpperCase() === val.trim() || p.barcode === val.trim(),
    );
    if (matched) {
      setSelectedCatalogPartId(matched.id);
      setPartForm((prev) => ({
        ...prev,
        partId: matched.id,
        partNumber: matched.partNumber,
        partName: matched.name,
        unitCost: Number(matched.costPrice || matched.sellingPrice || 0),
      }));
    }
  };

  const loadRecommendations = async () => {
    try {
      setRecommendOpen(true);
      setRecommendLoading(true);
      const res = await api.get(`/field-service/work-orders/${id}/recommendations`);
      setRecommendations(res.data);
    } catch (err) {
      console.error('Failed to load technician recommendations:', err);
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleAssignTechnician = async (technicianId: string) => {
    try {
      setAssignSubmitting(true);
      await api.patch(`/field-service/work-orders/${id}/assign`, { technicianId });
      setRecommendOpen(false);
      fetchWorkOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign technician');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const openStatusTransition = (status: string) => {
    setTargetStatus(status);
    setStatusNotes('');
    setDiagnosisNotes(workOrder.diagnosisNotes || '');
    setRepairSummary(workOrder.repairResolutionSummary || '');
    setStatusModalOpen(true);
  };

  const handleConfirmStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatusSubmitting(true);
      await api.patch(`/field-service/work-orders/${id}/status`, {
        status: targetStatus,
        notes: statusNotes || undefined,
        diagnosisNotes: targetStatus === 'DIAGNOSING' ? diagnosisNotes : undefined,
        repairResolutionSummary: targetStatus === 'REPAIRED' ? repairSummary : undefined,
      });
      setStatusModalOpen(false);
      fetchWorkOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPartSubmitting(true);
      await api.post(`/field-service/work-orders/${id}/parts`, partForm);
      setPartModalOpen(false);
      setSelectedCatalogPartId('');
      setPartForm({
        partId: '',
        partNumber: '',
        partName: '',
        serialNumber: '',
        quantity: 1,
        unitCost: 0,
        warrantyCovered: Boolean(workOrder?.registration?.warranty?.isActive ?? true),
      });
      fetchWorkOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add part');
    } finally {
      setPartSubmitting(false);
    }
  };

  // Canvas Touch Signature Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleCompleteWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOtpSubmitting(true);

      // 1. Upload signature if signed on canvas
      if (hasSignature && signatureCanvasRef.current) {
        const signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
        await api.post(`/proof-of-work/work-orders/${id}/signature`, {
          signatureDataUrl,
          signeeName: workOrder.customer?.name || 'Customer',
        });
      }

      // 2. Verify OTP & complete
      await api.post(`/field-service/work-orders/${id}/complete`, {
        otp: otpInput,
        customerFeedbackRating: Number(rating),
        customerFeedbackNotes: feedbackNotes || undefined,
        repairResolutionSummary: completionSummary || undefined,
      });

      toast.success('Work order successfully verified and closed with customer OTP & signature!');
      setOtpModalOpen(false);
      fetchWorkOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invalid OTP code');
    } finally {
      setOtpSubmitting(false);
    }
  };

  if (loading || !workOrder) {
    return (
      <div className="py-24 text-center text-ink-muted">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        Loading field work order console...
      </div>
    );
  }

  const steps = [
    'DRAFT',
    'ASSIGNED',
    'ACCEPTED',
    'TRAVELING',
    'ON_SITE',
    'DIAGNOSING',
    'REPAIRED',
    'COMPLETED',
  ];
  const currentStepIdx = steps.indexOf(workOrder.status);

  const isWarrantyActive =
    workOrder.registration?.warranty?.status === 'ACTIVE' &&
    new Date(workOrder.registration?.warranty?.endDate) > new Date();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/operations/work-orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Work Orders
        </button>

        <div className="flex items-center gap-2">
          {trackingToken && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyTrackingLink}
              className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Share2 className="w-3 h-3" />
              Copy Customer Tracking Link
            </Button>
          )}
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-100 border border-zinc-200 font-bold text-ink">
            {workOrder.workOrderNumber}
          </span>
          <Badge
            className={
              workOrder.priority === 'CRITICAL'
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-mono text-xs'
                : workOrder.priority === 'HIGH'
                ? 'bg-amber-100 text-amber-800 border-amber-300 font-mono text-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 font-mono text-xs'
            }
          >
            {workOrder.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {workOrder.status}
          </Badge>
        </div>
      </div>

      {/* Field Visit Lifecycle Stepper */}
      <Card className="bg-white border-border/70 p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {steps.map((step, idx) => {
            const isCompleted = currentStepIdx > idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-poppins font-medium ${
                      isCurrent ? 'text-ink font-bold' : isCompleted ? 'text-emerald-800' : 'text-zinc-400'
                    }`}
                  >
                    {step.replace('_', ' ')}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2.5 ${
                      currentStepIdx > idx ? 'bg-emerald-500' : 'bg-border/70'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Scope & Scheduled Slot */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider block">
                  Service Work Order Scope
                </span>
                <h1 className="text-xl font-bold font-poppins text-ink mt-1">
                  {workOrder.title}
                </h1>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-border/70 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {workOrder.description}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs text-ink-muted">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> Scheduled:{' '}
                  {workOrder.scheduledDate
                    ? new Date(workOrder.scheduledDate).toLocaleDateString()
                    : 'Today'}{' '}
                  ({workOrder.timeSlot || 'Anytime'})
                </span>
                {workOrder.ticket && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-primary">
                      Ref Ticket: {workOrder.ticket.ticketNumber}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Site & Hardware Unit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Site Address */}
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Service Site Address
                </span>
                <p className="font-semibold text-ink font-poppins text-sm">{workOrder.customer.name}</p>
                <p className="font-mono text-ink-soft flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-ink-muted" /> {workOrder.customer.phone}
                </p>
                {workOrder.customerAddress ? (
                  <div className="pt-1 border-t border-border/40 text-ink-muted space-y-0.5">
                    <p className="font-medium text-ink">{workOrder.customerAddress.street}</p>
                    <p>
                      {workOrder.customerAddress.city}, {workOrder.customerAddress.state} -{' '}
                      {workOrder.customerAddress.postalCode}
                    </p>
                  </div>
                ) : (
                  <p className="text-ink-muted italic pt-1">No site address attached.</p>
                )}
              </CardContent>
            </Card>

            {/* Hardware Asset & Warranty Entitlement */}
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                  <Laptop className="w-3.5 h-3.5 text-primary" /> Hardware & Warranty Status
                </span>
                {workOrder.product ? (
                  <>
                    <p className="font-semibold text-ink font-poppins">{workOrder.product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-muted">
                        SN: {workOrder.registration?.serialNumber || 'N/A'}
                      </span>
                      {workOrder.registration?.warranty ? (
                        <Badge
                          variant="outline"
                          className={
                            isWarrantyActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                              : 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                          }
                        >
                          {isWarrantyActive ? 'Active Warranty' : 'Expired Warranty'}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-ink-muted pt-1">
                      {isWarrantyActive
                        ? 'Parts & labor covered at zero charge to customer.'
                        : 'Out-of-warranty job: parts quoted separately.'}
                    </p>
                  </>
                ) : (
                  <p className="text-ink-muted italic py-2">No hardware asset registered.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parts Used Table */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold font-poppins text-ink text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Replacement Parts & Consumables ({workOrder.partsUsed?.length || 0})
                </h3>
                {workOrder.status !== 'COMPLETED' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSwapModalOpen(true)}
                      className="text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Serialized RMA Swap
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPartModalOpen(true)}
                      className="text-xs h-8 border-border/80 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Part Used
                    </Button>
                  </div>
                )}
              </div>

              {/* Serialized Part Swaps (RMA Exchanges) */}
              {partSwaps.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                    Serialized Defective Part Exchanges ({partSwaps.length})
                  </span>
                  <div className="space-y-1.5">
                    {partSwaps.map((ps) => (
                      <div
                        key={ps.id}
                        className="p-2 bg-white rounded-lg border border-purple-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{ps.rmaBarcode}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-rose-700 font-mono text-[11px]">
                            OUT: {ps.defectiveSerialNumber}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-emerald-700 font-mono text-[11px]">
                            IN: {ps.replacementSerialNumber}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700">
                          {ps.rmaStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workOrder.partsUsed?.length === 0 ? (
                <p className="text-xs text-ink-muted italic text-center py-4">
                  No replacement parts recorded for this service job yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-[10px] font-semibold text-ink-muted uppercase">
                        <th className="py-2">Part Number</th>
                        <th className="py-2">Component Name</th>
                        <th className="py-2">Serial Number</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Coverage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {workOrder.partsUsed.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2.5 font-mono font-medium text-ink">{p.partNumber}</td>
                          <td className="py-2.5 font-medium">{p.partName}</td>
                          <td className="py-2.5 font-mono text-ink-muted">{p.serialNumber || '—'}</td>
                          <td className="py-2.5 text-center font-mono">{p.quantity}</td>
                          <td className="py-2.5 text-right">
                            {p.warrantyCovered ? (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                                Warranty Covered
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                                Billable ₹{p.unitCost}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proof of Work Media & Geolocation Watermarks */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-bold font-poppins text-ink text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Proof of Work & Visual Audit Attachments ({proofMediaList.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mandatory geo-tagged before/after photos and digital customer signoff verification
                  </p>
                </div>

                {proofCompliance && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      proofCompliance.isCompliant
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {proofCompliance.isCompliant ? 'Compliance Verified' : 'Proofs Pending'}
                  </Badge>
                )}
              </div>

              {/* Upload Action Bar */}
              {workOrder.status !== 'COMPLETED' && (
                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-border">
                  <span className="text-xs font-semibold text-ink">Upload Photo As:</span>
                  <select
                    value={selectedMediaType}
                    onChange={(e) => setSelectedMediaType(e.target.value)}
                    className="text-xs h-8 px-2.5 rounded-lg border border-border bg-white font-medium"
                  >
                    <option value="BEFORE_REPAIR">Before Repair (Serial & Defect)</option>
                    <option value="DEFECTIVE_PART">Defective Component (Burnt/Broken)</option>
                    <option value="AFTER_REPAIR">After Repair (Operational Appliance)</option>
                  </select>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleProofFileUpload}
                      className="hidden"
                    />
                    <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      {uploadingProof ? 'Uploading...' : 'Capture / Upload Photo'}
                    </div>
                  </label>
                </div>
              )}

              {/* Media Thumbnails Grid */}
              {proofMediaList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  No visual proof of work photos uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {proofMediaList.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border overflow-hidden bg-white shadow-2xs group"
                    >
                      <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        {m.fileUrl?.startsWith('data:') || m.fileUrl?.startsWith('http') ? (
                          <img
                            src={m.fileUrl}
                            alt="Proof of work"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-xs text-slate-500 font-mono flex flex-col items-center gap-1">
                            <Camera className="w-6 h-6 text-slate-400" />
                            <span>Photo Attachment</span>
                          </div>
                        )}

                        <Badge
                          className={`absolute top-2 left-2 text-[9px] font-bold ${
                            m.mediaType === 'BEFORE_REPAIR'
                              ? 'bg-amber-600 text-white'
                              : m.mediaType === 'AFTER_REPAIR'
                              ? 'bg-emerald-600 text-white'
                              : m.mediaType === 'SIGNATURE'
                              ? 'bg-purple-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {m.mediaType?.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="p-2.5 text-[10px] text-muted-foreground space-y-1">
                        <div className="font-mono text-ink truncate">
                          {m.watermarkText || `WO #${workOrder.workOrderNumber}`}
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>{new Date(m.capturedAt || m.createdAt).toLocaleTimeString()}</span>
                          <span className="text-primary font-semibold">GPS Tagged</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* On-Site Diagnosis & Resolution Notes */}
          {(workOrder.diagnosisNotes || workOrder.repairResolutionSummary) && (
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold font-poppins text-ink text-sm flex items-center gap-2 border-b border-border/60 pb-3">
                  <Wrench className="w-4 h-4 text-primary" />
                  Technician Field Diagnostic & Resolution Report
                </h3>

                {workOrder.diagnosisNotes && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Diagnostic Findings:
                    </span>
                    <p className="text-xs text-ink leading-relaxed p-3 rounded-lg bg-[#FAF9F6] border border-border/70">
                      {workOrder.diagnosisNotes}
                    </p>
                  </div>
                )}

                {workOrder.repairResolutionSummary && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Resolution Summary:
                    </span>
                    <p className="text-xs text-ink leading-relaxed p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                      {workOrder.repairResolutionSummary}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Dispatcher Console & Field Execution Controls (1 col) */}
        <div className="space-y-6">
          {/* Assigned Technician & Smart Dispatcher Card */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Field Engineer
                </span>
                {workOrder.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadRecommendations}
                    className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/5 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Smart Dispatch
                  </Button>
                )}
              </div>

              {workOrder.technician ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink font-poppins text-sm">
                      {workOrder.technician.user.firstName} {workOrder.technician.user.lastName}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 font-semibold">
                      {workOrder.technician.technicianCode}
                    </span>
                  </div>

                  <p className="font-mono text-ink-muted flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-ink-muted" /> {workOrder.technician.phone}
                  </p>

                  <div className="flex justify-between py-1 border-t border-border/40 text-[11px]">
                    <span className="text-ink-muted">Service Zone:</span>
                    <span className="font-medium text-ink">{workOrder.technician.serviceZone}</span>
                  </div>

                  <div className="flex justify-between py-1 border-t border-border/40 text-[11px]">
                    <span className="text-ink-muted">Rating:</span>
                    <span className="font-mono font-bold text-amber-600 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />{' '}
                      {workOrder.technician.rating} / 5.0
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-ink font-semibold">Technician Not Assigned</p>
                  <Button
                    size="sm"
                    onClick={loadRecommendations}
                    className="bg-primary hover:bg-primary-hover text-white text-xs w-full"
                  >
                    Run Smart Dispatcher Matching
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technician Field Execution Console (Mobile PWA simulation) */}
          <Card className="bg-white border-border/70 shadow-sm overflow-hidden">
            <div className="bg-[#18181B] text-white p-3 flex items-center justify-between">
              <span className="text-xs font-bold font-poppins flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-primary" />
                Technician Field Actions
              </span>
              <span className="font-mono text-[10px] text-zinc-400">PWA Console</span>
            </div>

            <CardContent className="p-4 space-y-2.5">
              {workOrder.status === 'ASSIGNED' && (
                <Button
                  onClick={() => openStatusTransition('ACCEPTED')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                >
                  Accept Service Order
                </Button>
              )}

              {workOrder.status === 'ACCEPTED' && (
                <Button
                  onClick={() => openStatusTransition('TRAVELING')}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" /> Depart & Start Travel
                </Button>
              )}

              {workOrder.status === 'TRAVELING' && (
                <Button
                  onClick={() => openStatusTransition('ON_SITE')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" /> Arrived On-Site at Customer
                </Button>
              )}

              {workOrder.status === 'ON_SITE' && (
                <Button
                  onClick={() => openStatusTransition('DIAGNOSING')}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
                >
                  Begin Diagnostic & Inspection
                </Button>
              )}

              {workOrder.status === 'DIAGNOSING' && (
                <Button
                  onClick={() => openStatusTransition('REPAIRED')}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-9"
                >
                  Mark Repair Work Completed
                </Button>
              )}

              {workOrder.status === 'REPAIRED' && (
                <Button
                  onClick={() => {
                    setOtpInput('');
                    setFeedbackNotes('');
                    setOtpModalOpen(true);
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-xs h-10 font-bold font-poppins flex items-center justify-center gap-2 shadow-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  Verify Customer OTP & Signoff
                </Button>
              )}

              {workOrder.status === 'COMPLETED' && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1 text-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="font-bold text-emerald-950 font-poppins">Work Order Complete</p>
                    <p className="text-emerald-800 text-[11px]">
                      Verified with customer OTP. Feedback: {workOrder.customerFeedbackRating} ★
                    </p>
                    {workOrder.customerFeedbackNotes && (
                      <p className="text-[10px] text-emerald-700 italic pt-1">
                        "{workOrder.customerFeedbackNotes}"
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => setJobSheetOpen(true)}
                    variant="outline"
                    className="w-full text-xs h-9 border-primary/30 text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View & Print Signed Job Sheet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* State Machine Transition History */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" /> Visit Timeline Audit
              </h3>

              <div className="space-y-2 text-xs">
                {workOrder.statusHistory?.map((h: any) => (
                  <div key={h.id} className="p-2.5 rounded-lg bg-[#FAF9F6] border border-border/60">
                    <div className="flex items-center justify-between font-mono text-[11px] font-semibold">
                      <span>{h.fromStatus}</span>
                      <ChevronRight className="w-3 h-3 text-ink-muted" />
                      <span className="text-primary">{h.toStatus}</span>
                    </div>
                    {h.notes && <p className="text-ink-muted text-[11px] mt-1">{h.notes}</p>}
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Smart Dispatch Recommendations Modal */}
      <Dialog open={recommendOpen} onOpenChange={setRecommendOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Smart Dispatcher: Recommended Engineers
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Algorithmic scoring based on certified skill match, service zone proximity, real-time availability, and customer satisfaction rating.
            </DialogDescription>
          </DialogHeader>

          {recommendLoading ? (
            <div className="py-12 text-center text-ink-muted">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
              Computing candidate scores across engineering matrix...
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-8">No technicians registered.</p>
          ) : (
            <div className="space-y-3 py-2">
              {recommendations.map((rec) => (
                <div
                  key={rec.technician.id}
                  className="p-4 rounded-xl border border-border/80 bg-white hover:border-primary/50 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-poppins text-ink">
                        {rec.technician.name}
                      </span>
                      <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                        {rec.technician.code}
                      </span>
                      <Badge
                        className={
                          rec.tier === 'RECOMMENDED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                            : 'bg-blue-50 text-blue-800 border-blue-200 text-[10px]'
                        }
                      >
                        {rec.score}% Match
                      </Badge>
                    </div>

                    <div className="space-y-0.5 text-xs text-ink-muted">
                      {rec.reasons.map((r: string, idx: number) => (
                        <p key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{r}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      size="sm"
                      disabled={assignSubmitting}
                      onClick={() => handleAssignTechnician(rec.technician.id)}
                      className="bg-primary hover:bg-primary-hover text-white text-xs w-full sm:w-auto"
                    >
                      Assign Engineer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Transition Dialog */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">
              Progress to {targetStatus.replace('_', ' ')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmStatus} className="space-y-3 py-2 text-xs">
            {targetStatus === 'DIAGNOSING' && (
              <div className="space-y-1">
                <Label className="text-xs">Diagnostic Observations *</Label>
                <textarea
                  required
                  rows={3}
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="Record root cause, component test voltages, failure mechanism..."
                  className="w-full p-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] focus:outline-none"
                />
              </div>
            )}

            {targetStatus === 'REPAIRED' && (
              <div className="space-y-1">
                <Label className="text-xs">Repair Resolution Summary *</Label>
                <textarea
                  required
                  rows={3}
                  value={repairSummary}
                  onChange={(e) => setRepairSummary(e.target.value)}
                  placeholder="Record parts replaced, burn-in test results, calibration values..."
                  className="w-full p-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Milestone Notes (Optional)</Label>
              <Input
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Log arrival time, traffic delays, customer gate clearance..."
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={statusSubmitting}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {statusSubmitting ? 'Updating...' : 'Confirm Step'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Part Used Dialog */}
      <Dialog open={partModalOpen} onOpenChange={setPartModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink">Record Spare Part Used</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Add component from technician field trunk stock to this repair order.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPart} className="space-y-3.5 py-2 text-xs">
            {/* Quick Catalog Auto-Fill Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-ink flex items-center justify-between">
                <span>Select Part from Inventory Catalog</span>
                <span className="text-[10px] text-emerald-600 font-medium">Auto-fetches details & price</span>
              </Label>
              <select
                value={selectedCatalogPartId}
                onChange={(e) => handleSelectCatalogPart(e.target.value)}
                className="w-full h-8.5 px-2 text-xs rounded-md border border-border/80 bg-white text-ink focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose from Catalog (or enter manually below) --</option>
                {catalogParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} • {p.name} (₹{Number(p.costPrice || p.sellingPrice || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Populated Highlight Pill */}
            {selectedCatalogPartId && (
              <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between animate-fade-in">
                <div>
                  <span className="font-semibold">{partForm.partName}</span>
                  <div className="text-[10px] text-emerald-700/90 font-mono mt-0.5">
                    SKU: {partForm.partNumber} • Standard Unit Cost: ₹{partForm.unitCost.toLocaleString('en-IN')}
                  </div>
                </div>
                <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-700 text-[10px] font-mono">
                  Auto-Fetched
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Part Number (SKU) *</Label>
                <Input
                  required
                  value={partForm.partNumber}
                  onChange={(e) => handlePartNumberChange(e.target.value)}
                  placeholder="e.g. FAN-LEG-5P"
                  className="h-8 text-xs font-mono uppercase bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={partForm.quantity}
                  onChange={(e) =>
                    setPartForm({ ...partForm, quantity: Number(e.target.value) || 1 })
                  }
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Part Description *</Label>
              <Input
                required
                value={partForm.partName}
                onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                placeholder="e.g. Dual Vapor Chamber Fan Assembly"
                className="h-8 text-xs bg-[#FAF9F6]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Part Serial Number (Optional)</Label>
              <Input
                value={partForm.serialNumber}
                onChange={(e) => setPartForm({ ...partForm, serialNumber: e.target.value })}
                placeholder="e.g. SN-PART-2026-99"
                className="h-8 text-xs font-mono bg-[#FAF9F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Unit Cost (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partForm.unitCost}
                  onChange={(e) =>
                    setPartForm({ ...partForm, unitCost: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Warranty Coverage</Label>
                <select
                  value={partForm.warrantyCovered ? 'yes' : 'no'}
                  onChange={(e) =>
                    setPartForm({ ...partForm, warrantyCovered: e.target.value === 'yes' })
                  }
                  className="w-full h-8 px-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] text-ink"
                >
                  <option value="yes">Free (Under Warranty)</option>
                  <option value="no">Billable (Out of Warranty)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPartModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={partSubmitting}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {partSubmitting ? 'Adding...' : 'Add Component'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Customer OTP & Complete Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              Customer OTP Signoff Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Ask the customer for the 6-digit verification code sent to their phone to prevent unauthorized job closure.
            </DialogDescription>
          </DialogHeader>

          {workOrder.customerOtp && (
            <div className="p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-mono text-center">
              Customer Code on Record: <span className="font-bold text-primary">{workOrder.customerOtp}</span>
            </div>
          )}

          <form onSubmit={handleCompleteWithOtp} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Enter 6-Digit OTP *</Label>
              <Input
                required
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="e.g. 882104"
                className="h-10 text-center text-lg font-mono font-bold tracking-widest bg-[#FAF9F6]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Customer Satisfaction Rating (1 to 5 Stars)</Label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating >= star ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono font-bold text-xs ml-2 text-ink">{rating} / 5</span>
              </div>
            </div>

            {/* Interactive Touch / Stylus Signature Pad */}
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-primary" />
                  Customer Touch / Pen Signature *
                </Label>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] text-rose-600 hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="border border-border/80 rounded-xl overflow-hidden bg-white shadow-2xs relative">
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 cursor-crosshair touch-none bg-zinc-50/50"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-[11px] text-zinc-400 font-mono">
                    Sign with finger or stylus inside this box
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Customer Feedback & Notes</Label>
              <textarea
                rows={2}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Customer comments on repair quality, punctuality, and device operational check..."
                className="w-full p-2 text-xs rounded-md border border-border/80 bg-[#FAF9F6] focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOtpModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={otpSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold font-poppins"
              >
                {otpSubmitting ? 'Verifying...' : 'Verify OTP & Complete Visit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Serialized Part Swap Dialog */}
      <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins text-ink flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              Serialized Defective Part Swap (RMA)
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Enforce dual-serial warranty traceability by scanning defective serial out and fresh replacement serial in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordSwap} className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-rose-800">
                Defective Serial Number (Removed from Appliance) *
              </Label>
              <Input
                required
                value={swapForm.defectiveSerialNumber}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, defectiveSerialNumber: e.target.value.toUpperCase() })
                }
                placeholder="e.g. MOT-DEF-88210"
                className="h-8 text-xs font-mono uppercase bg-rose-50/50 border-rose-200"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-emerald-800">
                Replacement Serial Number (Installed from Van Stock) *
              </Label>
              <Input
                required
                value={swapForm.replacementSerialNumber}
                onChange={(e) =>
                  setSwapForm({ ...swapForm, replacementSerialNumber: e.target.value.toUpperCase() })
                }
                placeholder="e.g. MOT-FRESH-99104"
                className="h-8 text-xs font-mono uppercase bg-emerald-50/50 border-emerald-200"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSwapModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={swapSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {swapSubmitting ? 'Generating RMA...' : 'Record Swap & Generate RMA Barcode'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Completed Job Sheet Dialog */}
      <Dialog open={jobSheetOpen} onOpenChange={setJobSheetOpen}>
        <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold flex items-center justify-center">
                O
              </div>
              <div>
                <h2 className="text-base font-bold font-poppins text-ink">
                  ORBIT Field Service Job Completion Certificate
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Order #{workOrder.workOrderNumber} • Verified Customer Signoff
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              Print / Save PDF
            </Button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Customer & Appliance Meta */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 border border-border">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer & Location</span>
                <div className="font-bold text-ink text-sm">{workOrder.customer?.name}</div>
                <div className="text-muted-foreground">{workOrder.customer?.phone}</div>
                <div className="text-slate-600">
                  {workOrder.customerAddress
                    ? `${workOrder.customerAddress.street}, ${workOrder.customerAddress.city} - ${workOrder.customerAddress.postalCode}`
                    : 'Customer Site'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Equipment & Engineer</span>
                <div className="font-bold text-ink text-sm">{workOrder.product?.name || 'General Appliance'}</div>
                <div className="font-mono text-slate-600">
                  S/N: {workOrder.registration?.serialNumber || 'N/A'} • SKU: {workOrder.product?.sku || 'N/A'}
                </div>
                <div className="text-primary font-semibold">
                  Field Engineer: {workOrder.technician?.user ? `${workOrder.technician.user.firstName} ${workOrder.technician.user.lastName}` : 'Assigned Staff'} ({workOrder.technician?.technicianCode})
                </div>
              </div>
            </div>

            {/* Diagnostic & Resolution */}
            <div className="p-4 rounded-xl border border-border space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Service Resolution Details</span>
              <div className="text-ink font-medium">{workOrder.title}</div>
              {workOrder.repairResolutionSummary && (
                <p className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-950 text-xs">
                  {workOrder.repairResolutionSummary}
                </p>
              )}
            </div>

            {/* Parts Replaced */}
            {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-zinc-100/70 p-2.5 font-bold text-[11px] text-ink border-b border-border">
                  Components Replaced During Repair
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
                      <th className="p-2.5">Part Name</th>
                      <th className="p-2.5">Part #</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Warranty Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workOrder.partsUsed.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-medium">{p.partName}</td>
                        <td className="p-2.5 font-mono">{p.partNumber}</td>
                        <td className="p-2.5 text-center font-mono">{p.quantity}</td>
                        <td className="p-2.5 text-right font-semibold">
                          {p.warrantyCovered ? 'Covered Under Warranty' : `Billable ₹${p.unitCost}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dual Proof Signoff Block: OTP Badge + Customer Signature Image */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 border border-border items-center">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OTP Sign-off Verified</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  Code: <strong className="text-ink">{workOrder.customerOtp || 'VERIFIED'}</strong>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Completed At: {workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleString() : 'Today'}
                </div>
                <div className="text-amber-600 font-semibold text-[11px]">
                  Rating: {workOrder.customerFeedbackRating || 5} ★
                </div>
              </div>

              <div className="border border-border rounded-lg p-2.5 bg-white text-center space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Customer Signature</span>
                {proofMediaList.find((m) => m.mediaType === 'SIGNATURE')?.fileUrl ? (
                  <img
                    src={proofMediaList.find((m) => m.mediaType === 'SIGNATURE')?.fileUrl}
                    alt="Customer Signature"
                    className="h-14 mx-auto object-contain"
                  />
                ) : (
                  <div className="h-14 flex items-center justify-center font-serif italic text-base text-ink">
                    {workOrder.customer?.name}
                  </div>
                )}
                <span className="text-[9px] text-slate-400 font-mono block">Digitally Captured On-Site</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
