import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Clock,
  Navigation,
  Phone,
  Star,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Truck,
  Wrench,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export const PublicTrackingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlot, setNewSlot] = useState('10:00 AM - 01:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const fetchTracking = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/v1/tracking/public/${token}`);
      setData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Tracking session expired or link is invalid. Please contact support.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000); // 15s polling for live ETA
    return () => clearInterval(interval);
  }, [token]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmittingReschedule(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/v1/tracking/public/${token}/reschedule`, {
        newDate,
        newTimeSlot: newSlot,
        reason: rescheduleReason,
      });

      toast.success(res.data.message || 'Appointment rescheduled successfully');
      setIsRescheduling(false);
      fetchTracking();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600 font-poppins">
          Connecting to Live Service Operations Telemetry...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-border shadow-md text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-base font-bold font-poppins text-ink">Tracking Session Unavailable</h1>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const isEnRoute = data.status === 'TRAVELING' || data.status === 'ON_SITE';

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-slate-900 font-sans pb-10">
      {/* Top Header */}
      <header className="bg-white border-b border-border px-4 py-3 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
              O
            </div>
            <span className="font-bold font-poppins text-sm tracking-tight text-ink">
              ORBIT Service Tracking
            </span>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-[10px] font-bold bg-zinc-50 border-zinc-200"
          >
            #{data.workOrderNumber}
          </Badge>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Hero Card */}
        <Card className="border-border shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-white mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{data.status?.replace(/_/g, ' ')}</span>
            </div>

            <h2 className="text-2xl font-black font-poppins">
              {isEnRoute ? `Arriving in ~${data.etaMinutes} mins` : data.timeSlot || 'Scheduled Visit'}
            </h2>
            <p className="text-xs text-white/80">
              {isEnRoute
                ? 'Your certified field technician is en route to your service address.'
                : `Service appointment confirmed for ${new Date(data.scheduledDate).toLocaleDateString()}`}
            </p>
          </div>

          {/* Simulated Live Route Map Representation */}
          <div className="relative h-44 bg-slate-200 border-y border-border overflow-hidden flex items-center justify-center">
            {/* Background Map Grid Pattern */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  'radial-gradient(#64748b 1px, transparent 1px), radial-gradient(#64748b 1px, #f1f5f9 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10 10',
              }}
            />

            {/* Connecting Route Line */}
            <svg className="absolute inset-0 w-full h-full">
              <line
                x1="20%"
                y1="50%"
                x2="80%"
                y2="50%"
                stroke="#4F46E5"
                strokeWidth="3"
                strokeDasharray="6 6"
              />
            </svg>

            {/* Technician Vehicle Marker */}
            <div className="absolute left-[20%] top-[35%] flex flex-col items-center animate-bounce">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center border-2 border-white">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-2xs mt-1 border border-border">
                Technician
              </span>
            </div>

            {/* Customer Pin Marker */}
            <div className="absolute right-[20%] top-[35%] flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-rose-600 text-white shadow-lg flex items-center justify-center border-2 border-white">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-2xs mt-1 border border-border">
                Your Home
              </span>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-ink">Service Address:</div>
                <div className="text-muted-foreground">{data.customer.address}</div>
              </div>
            </div>

            {data.appliance && (
              <div className="flex items-start gap-2.5 text-xs pt-2 border-t border-border">
                <Wrench className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink">Equipment Under Service:</div>
                  <div className="text-muted-foreground">
                    {data.appliance.name} {data.appliance.modelNumber ? `(${data.appliance.modelNumber})` : ''}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Field Engineer Profile */}
        {data.technician ? (
          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    {data.technician.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold font-poppins text-sm text-ink flex items-center gap-1.5">
                      {data.technician.name}
                      <Shield className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Badge: {data.technician.code}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{data.technician.rating} / 5.0 (Certified Engineer)</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`tel:${data.technician.phone}`}
                  className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-2xs"
                  title="Call Technician"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border p-4 text-center text-xs text-muted-foreground">
            A certified field engineer is being dispatched for your scheduled slot.
          </Card>
        )}

        {/* Reschedule Button / Trigger */}
        <div className="text-center pt-2">
          {!isRescheduling ? (
            <button
              onClick={() => setIsRescheduling(true)}
              className="text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Need to reschedule your visit slot?
            </button>
          ) : (
            <Card className="border-primary/40 bg-white shadow-md text-left p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold font-poppins text-ink">
                  Select New Appointment Time
                </span>
                <button
                  onClick={() => setIsRescheduling(false)}
                  className="text-xs text-muted-foreground hover:text-ink font-mono"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReschedule} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Preferred Date:</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Preferred Time Window:</label>
                  <select
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-white"
                  >
                    <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM (Morning)</option>
                    <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM (Mid-day)</option>
                    <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM (Afternoon)</option>
                    <option value="03:00 PM - 06:00 PM">03:00 PM - 06:00 PM (Evening)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Reason (Optional):</label>
                  <Input
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Not available at home"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRescheduling(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submittingReschedule}>
                    {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
