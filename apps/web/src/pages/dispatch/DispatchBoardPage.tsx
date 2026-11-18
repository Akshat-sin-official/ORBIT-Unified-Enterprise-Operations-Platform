import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowRight,
  Phone,
  Star,
  RefreshCw,
  Search,
  Wrench,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';

interface BookedSlot {
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  priority: string;
  status: string;
  timeSlot: string;
  customerName: string;
  customerAddress: string;
  latitude: number | null;
  longitude: number | null;
}

interface TechnicianRow {
  id: string;
  technicianCode: string;
  name: string;
  phone: string;
  currentStatus: string;
  skills: string[];
  serviceZone: string;
  maxDailyJobs: number;
  rating: number;
  totalJobsToday: number;
  isCapacityFull: boolean;
  bookedSlots: BookedSlot[];
}

interface UnassignedJob {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  timeSlot?: string;
  ticketCategory: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
  };
  product?: {
    name: string;
    sku: string;
  };
}

const TIME_SLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
];

export const DispatchBoardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<UnassignedJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<UnassignedJob | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Assignment Modal
  const [assigningTech, setAssigningTech] = useState<TechnicianRow | null>(null);
  const [chosenSlot, setChosenSlot] = useState<string>('10:00 AM - 01:00 PM');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedZone) params.append('zone', selectedZone);

      const res = await api.get(`/dispatch/board?${params.toString()}`);
      setTechnicians(res.data.technicians || []);
      setUnassignedOrders(res.data.unassignedOrders || []);
    } catch (err: any) {
      toast.error('Failed to load dispatch board data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [selectedDate, selectedZone]);

  const handleRecommendTechs = async (job: UnassignedJob) => {
    setSelectedJob(job);
    setRecommending(true);
    try {
      const lat = job.customer.latitude || 12.9716;
      const lng = job.customer.longitude || 77.5946;
      const res = await api.get(
        `/dispatch/nearest-technicians?latitude=${lat}&longitude=${lng}&limit=5`,
      );
      setRecommendations(res.data || []);
    } catch {
      toast.error('Unable to compute nearest technician ranking');
    } finally {
      setRecommending(false);
    }
  };

  const handleSelectTechForAssignment = async (tech: TechnicianRow) => {
    if (!selectedJob) return;
    setAssigningTech(tech);
    setValidating(true);
    try {
      const res = await api.post('/dispatch/validate-assignment', {
        workOrderId: selectedJob.id,
        technicianId: tech.id,
        scheduledDate: selectedDate,
        timeSlot: chosenSlot,
      });
      setValidationResult(res.data);
    } catch (err: any) {
      toast.error('Failed to validate technician availability');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedJob || !assigningTech) return;
    try {
      await api.post('/dispatch/schedule-job', {
        workOrderId: selectedJob.id,
        technicianId: assigningTech.id,
        scheduledDate: selectedDate,
        timeSlot: chosenSlot,
      });

      toast.success(
        `Job #${selectedJob.workOrderNumber} successfully scheduled with ${assigningTech.name} (${chosenSlot})`,
      );
      setSelectedJob(null);
      setAssigningTech(null);
      setValidationResult(null);
      fetchBoard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule job');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
        <div>
          <h1 className="text-xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Visual Dispatch Board & Gantt Scheduler
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time technician route matrix, shift slot allocation, and Haversine proximity matching
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-border px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-muted-foreground font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 border border-border px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value="">All Territory Zones</option>
              <option value="Central">Central Metro</option>
              <option value="North">North Zone</option>
              <option value="South">South Zone</option>
              <option value="East">East Zone</option>
              <option value="West">West Zone</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchBoard}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid: Unassigned Queue (Left) + Timeline Board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Unassigned Work Orders */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-poppins flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    Unassigned Service Queue
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {unassignedOrders.length} work orders waiting for engineer allocation
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {unassignedOrders.length} Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 max-h-[650px] overflow-y-auto space-y-3">
              {unassignedOrders.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                  All active work orders have been assigned to technicians!
                </div>
              ) : (
                unassignedOrders.map((wo) => {
                  const isSelected = selectedJob?.id === wo.id;
                  return (
                    <div
                      key={wo.id}
                      onClick={() => handleRecommendTechs(wo)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                          : 'border-border/80 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono font-bold text-ink">
                          #{wo.workOrderNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            wo.priority === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : wo.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {wo.priority}
                        </Badge>
                      </div>

                      <div className="font-semibold text-ink text-[13px] line-clamp-1 mb-1">
                        {wo.title}
                      </div>

                      <div className="text-muted-foreground text-[11px] line-clamp-1 mb-2">
                        {wo.customer.name} • {wo.customer.city} ({wo.customer.pincode || 'Metro'})
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-[10px] font-mono text-slate-500">
                          {wo.ticketCategory?.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecommendTechs(wo);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Sparkles className="w-3 h-3" />
                          Match Tech →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* AI / Proximity Match Drawer if Job is Selected */}
          {selectedJob && (
            <Card className="border-primary/40 bg-gradient-to-b from-blue-50/30 to-white shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold font-poppins text-ink">
                      Algorithmic Tech Match: #{selectedJob.workOrderNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-xs text-muted-foreground hover:text-ink font-mono"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Ranked by drive distance from customer site ({selectedJob.customer.city}) & current workload:
                </p>

                {recommending ? (
                  <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
                    Calculating Haversine drive distances...
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No active technicians available in proximity.
                  </div>
                ) : (
                  recommendations.map((rec, idx) => (
                    <div
                      key={rec.technicianId}
                      className="p-2.5 rounded-lg border border-border bg-white flex items-center justify-between text-xs hover:border-primary/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-ink truncate">{rec.name}</span>
                          <span className="text-[10px] text-muted-foreground">({rec.technicianCode})</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                            <Navigation className="w-2.5 h-2.5" />
                            {rec.distanceKm} km away
                          </span>
                          <span>•</span>
                          <span>{rec.activeJobsCount} jobs today</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            {rec.rating}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          const fullTech = technicians.find((t) => t.id === rec.technicianId);
                          if (fullTech) handleSelectTechForAssignment(fullTech);
                        }}
                        className="h-7 text-xs px-2.5 gap-1 shrink-0"
                      >
                        Assign
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Visual Timeline / Gantt Board */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-poppins flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Technician Schedule Timeline ({selectedDate})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Shift blocks and slot occupancy matrix across {technicians.length} field engineers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Booked Slot
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Shift Full
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-zinc-100/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3 w-52 sticky left-0 bg-zinc-100/90 backdrop-blur-sm z-10 border-r border-border">
                      Technician
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th key={slot} className="p-2.5 text-center min-w-[150px] border-r border-border last:border-r-0">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {technicians.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                        No field technicians found for this territory zone.
                      </td>
                    </tr>
                  ) : (
                    technicians.map((tech) => {
                      return (
                        <tr key={tech.id} className="hover:bg-zinc-50/50 transition-colors">
                          {/* Technician Profile Cell */}
                          <td className="p-3 sticky left-0 bg-white z-10 border-r border-border">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-ink text-[12px]">{tech.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {tech.technicianCode} • {tech.serviceZone}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  tech.isCapacityFull
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {tech.totalJobsToday}/{tech.maxDailyJobs}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {tech.skills.slice(0, 2).map((sk) => (
                                <span
                                  key={sk}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Time Slot Columns */}
                          {TIME_SLOTS.map((slot) => {
                            const matchingBookings = tech.bookedSlots.filter(
                              (b) => b.timeSlot === slot,
                            );
                            const isBooked = matchingBookings.length > 0;

                            return (
                              <td
                                key={slot}
                                className={`p-2 border-r border-border last:border-r-0 align-top transition-all ${
                                  isBooked ? 'bg-blue-50/30' : 'hover:bg-slate-50 cursor-pointer'
                                }`}
                                onClick={() => {
                                  if (!isBooked && selectedJob) {
                                    setChosenSlot(slot);
                                    handleSelectTechForAssignment(tech);
                                  }
                                }}
                              >
                                {isBooked ? (
                                  matchingBookings.map((bk) => (
                                    <div
                                      key={bk.workOrderId}
                                      className="p-2 rounded-lg bg-white border border-blue-200 shadow-2xs text-[11px] space-y-1 mb-1"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold font-mono text-blue-900">
                                          #{bk.workOrderNumber}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700"
                                        >
                                          {bk.status}
                                        </Badge>
                                      </div>
                                      <div className="font-medium text-slate-800 line-clamp-1">
                                        {bk.customerName}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                        {bk.customerAddress}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="h-16 rounded border border-dashed border-slate-200 hover:border-primary/50 flex flex-col items-center justify-center text-[10px] text-slate-400 transition-colors">
                                    {selectedJob ? (
                                      <span className="text-primary font-medium">+ Click to book</span>
                                    ) : (
                                      <span>Available</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assignment Confirmation Modal with Constraint Check Results */}
      {assigningTech && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold font-poppins text-ink">
                  Confirm Dispatch Assignment
                </h2>
              </div>
              <button
                onClick={() => {
                  setAssigningTech(null);
                  setValidationResult(null);
                }}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Work Order:</span>
                  <span className="font-bold font-mono text-ink">
                    #{selectedJob.workOrderNumber} — {selectedJob.title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-ink">
                    {selectedJob.customer.name} ({selectedJob.customer.city})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-mono text-slate-700">
                    {selectedJob.ticketCategory?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Technician:</span>
                  <span className="font-bold text-ink">
                    {assigningTech.name} ({assigningTech.technicianCode})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service Zone:</span>
                  <span className="font-semibold text-ink">{assigningTech.serviceZone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span className="font-bold text-ink">{selectedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Selected Slot:</span>
                  <span className="font-bold text-primary font-mono">{chosenSlot}</span>
                </div>
              </div>

              {/* Validation Feedback & Warnings */}
              {validating ? (
                <div className="py-2 text-center text-xs text-muted-foreground animate-pulse">
                  Checking skill matrix and shift collisions...
                </div>
              ) : validationResult ? (
                <div className="space-y-2">
                  {validationResult.warnings.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Skill match confirmed and no shift slot collisions detected.</span>
                    </div>
                  ) : (
                    validationResult.warnings.map((warn: string, i: number) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 text-[11px] ${
                          warn.includes('already has a confirmed booking')
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssigningTech(null);
                  setValidationResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAssignment}
                disabled={validationResult?.valid === false}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
