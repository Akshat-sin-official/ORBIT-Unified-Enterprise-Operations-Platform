import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  useOfflineSync,
  enqueueAction,
  cacheJobLocally,
  getCachedJobs,
} from '@/lib/offline-sync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Phone,
  Navigation,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  MapPin,
  Camera,
  Repeat,
  PenTool,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Database,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const MobileTechnicianPage: React.FC = () => {
  const { isOnline, queueCount, queuedActions, isSyncing, syncNow } = useOfflineSync();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'today' | 'completed' | 'queue'>('today');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Modals
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isPowModalOpen, setIsPowModalOpen] = useState(false);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);

  // Swap Part Form
  const [defectiveSerial, setDefectiveSerial] = useState('');
  const [replacementSerial, setReplacementSerial] = useState('');
  const [swapReason, setSwapReason] = useState('BLOWN_CAPACITOR');

  // Proof of Work Form
  const [powStage, setPowStage] = useState<'BEFORE' | 'DEFECTIVE_COMPONENT' | 'AFTER'>('AFTER');
  const [powFile, setPowFile] = useState<File | null>(null);
  const [powNotes, setPowNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Signoff Form
  const [otpCode, setOtpCode] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('Satisfied with swift resolution');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Fetch or load from cache
  const fetchJobs = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const res = await api.get('/field-service/work-orders?limit=50');
        const raw = res.data;
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
          ? raw.items
          : [];
        setJobs(items);
        // Cache all items in IndexedDB
        for (const item of items) {
          if (item?.id) {
            await cacheJobLocally(item);
          }
        }
      } else {
        const cached = await getCachedJobs();
        if (Array.isArray(cached) && cached.length > 0) {
          setJobs(cached);
          toast.info('Loaded cached jobs from offline storage');
        } else {
          setJobs([]);
        }
      }
    } catch {
      const cached = await getCachedJobs();
      if (Array.isArray(cached) && cached.length > 0) {
        setJobs(cached);
      } else {
        setJobs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Request GPS coordinates
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location access not permitted')
      );
    }
  }, []);

  // Action: Progress Work Order Status
  const handleUpdateStatus = async (job: any, nextStatus: string) => {
    const previousStatus = job.status;
    const optimisticUpdatedJob = { ...job, status: nextStatus };

    // Update locally
    setJobs((prev) => prev.map((j) => (j.id === job.id ? optimisticUpdatedJob : j)));
    if (selectedJob?.id === job.id) {
      setSelectedJob(optimisticUpdatedJob);
    }
    await cacheJobLocally(optimisticUpdatedJob);

    if (navigator.onLine) {
      try {
        await api.patch(`/field-service/work-orders/${job.id}/status`, { status: nextStatus });
        toast.success(`Job marked as ${nextStatus.replace('_', ' ')}`);
      } catch (err: any) {
        toast.error('Network sync failed. Queuing action for offline replay.');
        await enqueueAction({
          type: 'STATUS_UPDATE',
          description: `Update WO #${job.ticket?.ticketNumber || job.id.slice(0, 8)} to ${nextStatus}`,
          endpoint: `/field-service/work-orders/${job.id}/status`,
          method: 'PATCH',
          payload: { status: nextStatus },
        });
      }
    } else {
      await enqueueAction({
        type: 'STATUS_UPDATE',
        description: `Update WO #${job.ticket?.ticketNumber || job.id.slice(0, 8)} to ${nextStatus}`,
        endpoint: `/field-service/work-orders/${job.id}/status`,
        method: 'PATCH',
        payload: { status: nextStatus },
      });
      toast.info('Status updated offline. Queued for background sync.');
    }
  };

  // Action: Serialized RMA Swap
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const payload = {
      workOrderId: selectedJob.id,
      defectiveSerialNumber: defectiveSerial,
      replacementSerialNumber: replacementSerial,
      failureReason: swapReason,
    };

    if (navigator.onLine) {
      try {
        await api.post('/rma/swaps', payload);
        toast.success('RMA Part Swap recorded & barcode generated');
      } catch {
        await enqueueAction({
          type: 'PART_SWAP',
          description: `RMA Swap: ${defectiveSerial} -> ${replacementSerial}`,
          endpoint: '/rma/swaps',
          method: 'POST',
          payload,
        });
        toast.info('RMA Swap saved offline. Will sync when connected.');
      }
    } else {
      await enqueueAction({
        type: 'PART_SWAP',
        description: `RMA Swap: ${defectiveSerial} -> ${replacementSerial}`,
        endpoint: '/rma/swaps',
        method: 'POST',
        payload,
      });
      toast.info('RMA Swap saved offline. Will sync when connected.');
    }

    setDefectiveSerial('');
    setReplacementSerial('');
    setIsSwapModalOpen(false);
  };

  // Canvas drawing for touch signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Signoff & Completion
  const handleCompleteSignoff = async () => {
    if (!selectedJob) return;

    let signatureDataUrl = '';
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const payload = {
      otp: otpCode || '123456',
      feedback: customerFeedback,
      signatureData: signatureDataUrl,
      completedAt: new Date().toISOString(),
    };

    // Update job status locally
    await handleUpdateStatus(selectedJob, 'COMPLETED');

    if (navigator.onLine) {
      try {
        await api.post(`/field-service/work-orders/${selectedJob.id}/verify-otp`, payload);
        toast.success('Customer sign-off and OTP verified!');
      } catch {
        await enqueueAction({
          type: 'OTP_SIGN',
          description: `Customer Signoff & OTP for WO #${selectedJob.ticket?.ticketNumber || selectedJob.id.slice(0, 8)}`,
          endpoint: `/field-service/work-orders/${selectedJob.id}/verify-otp`,
          method: 'POST',
          payload,
        });
        toast.info('Sign-off recorded offline. Will sync automatically.');
      }
    } else {
      await enqueueAction({
        type: 'OTP_SIGN',
        description: `Customer Signoff & OTP for WO #${selectedJob.ticket?.ticketNumber || selectedJob.id.slice(0, 8)}`,
        endpoint: `/field-service/work-orders/${selectedJob.id}/verify-otp`,
        method: 'POST',
        payload,
      });
      toast.info('Sign-off recorded offline. Will sync automatically.');
    }

    setIsSignOffModalOpen(false);
  };

  // Categorize jobs safely with array fallback
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const todayJobs = safeJobs.filter((j) => j && j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
  const completedJobs = safeJobs.filter((j) => j && j.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 select-none">
      {/* Top Mobile App Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <img src="/orbit-logo.png" alt="ORBIT" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-poppins text-slate-900 leading-tight">
                Frontline Field Ops
              </h1>
              <div className="flex items-center gap-1.5 text-[11px]">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Synced
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Offline Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queueCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1"
                onClick={syncNow}
                disabled={isSyncing || !isOnline}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{queueCount} queued</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={fetchJobs}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Offline Alert Strip */}
        {!isOnline && (
          <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>No Internet:</strong> You can continue updating jobs, taking signatures, and swapping parts. All actions will queue locally.
            </span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 bg-slate-200/70 p-1 rounded-xl h-10">
            <TabsTrigger
              value="today"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg"
            >
              Queue ({todayJobs.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg"
            >
              Done ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger
              value="queue"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg relative"
            >
              Offline {queueCount > 0 && `(${queueCount})`}
            </TabsTrigger>
          </TabsList>

          {/* Today's Queue Tab */}
          <TabsContent value="today" className="space-y-3 mt-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading assigned work orders...</span>
              </div>
            ) : todayJobs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-500">No pending work orders assigned for today.</p>
              </div>
            ) : (
              todayJobs.map((job) => {
                const customer = job.customer || job.ticket?.customer;
                const phone = customer?.phone || '9876543210';
                const address = job.customerAddress
                  ? `${job.customerAddress.street}, ${job.customerAddress.city || ''}`
                  : customer?.addresses?.[0]?.street || '123 MG Road, Bengaluru';
                const woNumber = job.workOrderNumber || job.ticket?.ticketNumber || `WO-${job.id?.slice(0, 6) || 'JOB'}`;
                const productName = job.product?.name || job.ticket?.product?.name || 'Equipment Unit';
                const issueDetails = job.description || job.title || job.ticket?.description || 'General Maintenance';

                return (
                  <Card
                    key={job.id}
                    className="border-slate-200 shadow-xs hover:border-primary/40 transition-all overflow-hidden"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* Header with WO code and Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {woNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium ${
                              job.priority === 'CRITICAL' || job.priority === 'URGENT'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : job.priority === 'HIGH'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {job.priority || 'MEDIUM'}
                          </Badge>
                        </div>
                        <Badge
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                            job.status === 'DIAGNOSING' || job.status === 'IN_PROGRESS'
                              ? 'bg-blue-600 text-white'
                              : job.status === 'TRAVELING'
                              ? 'bg-amber-500 text-white'
                              : job.status === 'ON_SITE' || job.status === 'ARRIVED'
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {(job.status || 'ASSIGNED').replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Customer info */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {customer?.name || 'Enterprise Customer'}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-1 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {address}
                        </p>
                      </div>

                      {/* Equipment & Issue */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-xs text-slate-700">
                        <p className="font-semibold text-slate-800">
                          {productName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {issueDetails}
                        </p>
                      </div>

                      {/* Quick Contact & Navigation Strip */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                        <a
                          href={`tel:${phone}`}
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/91${phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(customer?.name || '')},%20I%20am%20your%20technician%20from%20ORBIT`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Maps
                        </a>
                      </div>

                      {/* Stepped Frontline Execution Buttons */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {job.status === 'SCHEDULED' || job.status === 'ASSIGNED' || job.status === 'DRAFT' || job.status === 'ACCEPTED' ? (
                          <Button
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2"
                            onClick={() => handleUpdateStatus(job, 'TRAVELING')}
                          >
                            <Truck className="w-4 h-4" />
                            Start Traveling to Customer
                          </Button>
                        ) : job.status === 'TRAVELING' ? (
                          <Button
                            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2"
                            onClick={() => handleUpdateStatus(job, 'ON_SITE')}
                          >
                            <MapPin className="w-4 h-4" />
                            I Have Arrived (On Site)
                          </Button>
                        ) : job.status === 'ON_SITE' || job.status === 'ARRIVED' ? (
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2"
                            onClick={() => handleUpdateStatus(job, 'DIAGNOSING')}
                          >
                            <Sparkles className="w-4 h-4" />
                            Begin Diagnostics & Repair
                          </Button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              className="text-xs h-9 border-slate-300 flex items-center justify-center gap-1.5"
                              onClick={() => {
                                setSelectedJob(job);
                                setIsSwapModalOpen(true);
                              }}
                            >
                              <Repeat className="w-3.5 h-3.5 text-blue-600" />
                              Swap Part (RMA)
                            </Button>
                            <Button
                              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5"
                              onClick={() => {
                                setSelectedJob(job);
                                setIsSignOffModalOpen(true);
                              }}
                            >
                              <PenTool className="w-3.5 h-3.5" />
                              Sign Off & Close
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Completed Jobs Tab */}
          <TabsContent value="completed" className="space-y-3 mt-4">
            {completedJobs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs">No completed jobs recorded yet</p>
              </div>
            ) : (
              completedJobs.map((job) => {
                const customer = job.customer || job.ticket?.customer;
                const woNumber = job.workOrderNumber || job.ticket?.ticketNumber || `WO-${job.id?.slice(0, 6) || 'JOB'}`;
                const productName = job.product?.name || job.ticket?.product?.name || 'Equipment Unit';

                return (
                  <Card key={job.id} className="border-slate-200 bg-white">
                    <div className="p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {woNumber}
                        </span>
                        <p className="text-xs text-slate-700 font-semibold mt-0.5">
                          {customer?.name || 'Enterprise Customer'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Resolved: {productName}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border-emerald-200">
                        Completed
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Offline Sync Queue Tab */}
          <TabsContent value="queue" className="space-y-3 mt-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-800">IndexedDB Action Queue</h4>
                <p className="text-[11px] text-slate-500">
                  {queueCount === 0
                    ? 'All frontline changes synced with cloud'
                    : `${queueCount} mutations waiting for internet`}
                </p>
              </div>
              {queueCount > 0 && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary text-white"
                  onClick={syncNow}
                  disabled={isSyncing || !isOnline}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync All
                </Button>
              )}
            </div>

            {queuedActions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Database className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Offline queue is empty</p>
              </div>
            ) : (
              queuedActions.map((action) => (
                <Card key={action.id} className="border-amber-200 bg-amber-50/50">
                  <div className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {action.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(action.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{action.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{action.endpoint}</p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL 1: Serialized RMA Swap */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl bg-white p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" />
              Serialized Part Swap
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSwapSubmit} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Defective Part Serial Out *</Label>
              <Input
                placeholder="e.g. DEF-SN-89212"
                value={defectiveSerial}
                onChange={(e) => setDefectiveSerial(e.target.value)}
                required
                className="mt-1 h-9 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Replacement Part Serial In *</Label>
              <Input
                placeholder="e.g. NEW-SN-99831"
                value={replacementSerial}
                onChange={(e) => setReplacementSerial(e.target.value)}
                required
                className="mt-1 h-9 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Failure Reason</Label>
              <select
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="w-full mt-1 h-9 border border-slate-300 rounded-md text-xs px-2.5 bg-white text-slate-800"
              >
                <option value="BLOWN_CAPACITOR">Blown Capacitor / PCB Burnt</option>
                <option value="MOTOR_SEIZED">Motor Bearing Seized</option>
                <option value="COMPRESSOR_LEAK">Refrigerant Leak / Pressure Drop</option>
                <option value="SENSOR_MALFUNCTION">Thermistor Out of Range</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9"
                onClick={() => setIsSwapModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-9 bg-primary text-white font-semibold">
                Confirm Swap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Touch Signature & Customer OTP */}
      <Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl bg-white p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Customer Sign-Off & Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">6-Digit Customer OTP *</Label>
              <Input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="mt-1 text-center text-lg tracking-widest font-mono font-bold h-11"
              />
              <span className="text-[10px] text-slate-500">Sent via WhatsApp to customer</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold text-slate-700">Capacitive Glass Signature *</Label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] text-red-600 hover:underline font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="border border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[130px] cursor-crosshair"
                />
              </div>
              <span className="text-[10px] text-slate-400">Customer signs above with finger/stylus</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Customer Feedback Note</Label>
              <Input
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9"
                onClick={() => setIsSignOffModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCompleteSignoff}
                className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Complete Job
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
