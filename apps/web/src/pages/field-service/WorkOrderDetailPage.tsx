import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

  // Add Part modal
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partForm, setPartForm] = useState({
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

  const fetchWorkOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/field-service/work-orders/${id}`);
      setWorkOrder(res.data);
    } catch (err) {
      console.error('Failed to load work order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchWorkOrder();
  }, [id]);

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
      setPartForm({
        partNumber: '',
        partName: '',
        serialNumber: '',
        quantity: 1,
        unitCost: 0,
        warrantyCovered: true,
      });
      fetchWorkOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add part');
    } finally {
      setPartSubmitting(false);
    }
  };

  const handleCompleteWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOtpSubmitting(true);
      await api.post(`/field-service/work-orders/${id}/complete`, {
        otp: otpInput,
        customerFeedbackRating: Number(rating),
        customerFeedbackNotes: feedbackNotes || undefined,
        repairResolutionSummary: completionSummary || undefined,
      });
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPartModalOpen(true)}
                    className="text-xs h-8 border-border/80 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Part Used
                  </Button>
                )}
              </div>

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

          <form onSubmit={handleAddPart} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Part Number *</Label>
                <Input
                  required
                  value={partForm.partNumber}
                  onChange={(e) =>
                    setPartForm({ ...partForm, partNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. FAN-LEG-5P"
                  className="h-8 text-xs font-mono uppercase bg-[#FAF9F6]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
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
                <Label className="text-xs">Unit Cost (₹)</Label>
                <Input
                  type="number"
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

            <div className="space-y-1">
              <Label className="text-xs">Customer Feedback & Signature Notes</Label>
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
    </div>
  );
};
