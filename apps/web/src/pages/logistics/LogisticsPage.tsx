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
  Truck,
  Plus,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Loader2,
  RefreshCw,
  Building2,
  Phone,
  ShieldCheck,
  Send,
  Boxes,
  ArrowRight,
} from 'lucide-react';

interface Shipment {
  id: string;
  shipmentNumber: string;
  trackingNumber: string;
  type: string;
  carrier: string;
  status: string;
  destinationAddress: string;
  destinationCity: string;
  destinationState: string;
  destinationPostalCode: string;
  recipientName: string;
  recipientPhone: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  proofOfDeliverySignee?: string;
  proofOfDeliveryNotes?: string;
  notes?: string;
  createdAt: string;
  originWarehouse?: { code: string; name: string };
  workOrder?: { id: string; workOrderNumber: string; title: string };
  vehicle?: { registrationNumber: string; model: string; currentDriverName?: string };
  items?: { id: string; quantity: number; serialNumbers: string[]; part: { partNumber: string; name: string } }[];
  trackingEvents?: { id: string; status: string; location: string; description: string; timestamp: string }[];
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  model: string;
  type: string;
  status: string;
  capacityKg: number;
  currentDriverName?: string;
  currentDriverPhone?: string;
  _count?: { shipments: number };
}

interface LogisticsSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  outForDelivery: number;
  activeFleetVehicles: number;
}

export const LogisticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'reverse' | 'fleet'>('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LogisticsSummary | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [parts, setParts] = useState<{ id: string; partNumber: string; name: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    originWarehouseId: '',
    type: 'FORWARD_PART_DISPATCH',
    carrier: 'INTERNAL_FLEET',
    destinationAddress: '',
    destinationCity: 'Bengaluru',
    destinationState: 'Karnataka',
    destinationPostalCode: '560100',
    recipientName: '',
    recipientPhone: '',
    vehicleId: '',
    notes: '',
    partId: '',
    quantity: 1,
    serialNumber: '',
  });

  const [updateForm, setUpdateForm] = useState({
    status: 'IN_TRANSIT',
    location: '',
    description: '',
    proofOfDeliverySignee: '',
    proofOfDeliveryNotes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, shpRes, vehRes, whRes, partsRes] = await Promise.all([
        api.get('/logistics/summary').catch(() => ({ data: null })),
        api.get('/logistics/shipments').catch(() => ({ data: { items: [] } })),
        api.get('/logistics/vehicles').catch(() => ({ data: [] })),
        api.get('/inventory/warehouses').catch(() => ({ data: [] })),
        api.get('/inventory/parts').catch(() => ({ data: { items: [] } })),
      ]);

      setSummary(sumRes.data);
      setShipments(shpRes.data?.items || []);
      setVehicles(vehRes.data || []);
      setWarehouses(whRes.data || []);
      setParts(partsRes.data?.items || []);

      if (whRes.data?.length > 0) {
        setCreateForm((p) => ({ ...p, originWarehouseId: whRes.data[0].id }));
      }
      if (partsRes.data?.items?.length > 0) {
        setCreateForm((p) => ({ ...p, partId: partsRes.data.items[0].id }));
      }
      if (vehRes.data?.length > 0) {
        setCreateForm((p) => ({ ...p, vehicleId: vehRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load logistics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/logistics/shipments', {
        originWarehouseId: createForm.originWarehouseId || undefined,
        type: createForm.type,
        carrier: createForm.carrier,
        destinationAddress: createForm.destinationAddress,
        destinationCity: createForm.destinationCity,
        destinationState: createForm.destinationState,
        destinationPostalCode: createForm.destinationPostalCode,
        recipientName: createForm.recipientName,
        recipientPhone: createForm.recipientPhone,
        vehicleId: createForm.carrier === 'INTERNAL_FLEET' ? createForm.vehicleId || undefined : undefined,
        notes: createForm.notes || undefined,
        items: createForm.partId
          ? [
              {
                partId: createForm.partId,
                quantity: Number(createForm.quantity),
                serialNumbers: createForm.serialNumber ? [createForm.serialNumber] : [],
              },
            ]
          : undefined,
      });

      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      setSubmitting(true);
      await api.patch(`/logistics/shipments/${selectedShipment.id}/status`, {
        status: updateForm.status,
        location: updateForm.location || undefined,
        description: updateForm.description || undefined,
        proofOfDeliverySignee: updateForm.proofOfDeliverySignee || undefined,
        proofOfDeliveryNotes: updateForm.proofOfDeliveryNotes || undefined,
      });

      setIsUpdateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update shipment checkpoint');
    } finally {
      setSubmitting(false);
    }
  };

  const openTimeline = async (shp: Shipment) => {
    try {
      const res = await api.get(`/logistics/shipments/${shp.id}`);
      setSelectedShipment(res.data);
      setIsTimelineModalOpen(true);
    } catch {
      setSelectedShipment(shp);
      setIsTimelineModalOpen(true);
    }
  };

  const openUpdateModal = (shp: Shipment) => {
    setSelectedShipment(shp);
    setUpdateForm({
      status: shp.status,
      location: shp.destinationCity,
      description: '',
      proofOfDeliverySignee: '',
      proofOfDeliveryNotes: '',
    });
    setIsUpdateModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            DELIVERED
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3 h-3 text-blue-600" />
            IN TRANSIT
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Navigation className="w-3 h-3 text-purple-600" />
            OUT FOR DELIVERY
          </span>
        );
      case 'READY_FOR_PICKUP':
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            {status.replace(/_/g, ' ')}
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

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    if (activeTab === 'reverse' && s.type !== 'REVERSE_DEFECTIVE_RETURN') {
      return false;
    }
    if (statusFilter !== 'ALL' && s.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchShp = s.shipmentNumber.toLowerCase().includes(q);
      const matchTrk = s.trackingNumber.toLowerCase().includes(q);
      const matchRec = s.recipientName.toLowerCase().includes(q);
      const matchCity = s.destinationCity.toLowerCase().includes(q);
      return matchShp || matchTrk || matchRec || matchCity;
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
              SUPPLY & LOGISTICS
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-white text-ink border-border">
              MILESTONE 6 ACTIVE
            </Badge>
          </div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-primary stroke-[2.2]" />
            Shipments & Fleet Management
          </h1>
          <p className="text-xs text-ink-soft font-normal mt-0.5">
            Real-time courier dispatch, live checkpoint routing, fleet service vans & reverse defective returns.
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
            <Send className="w-3.5 h-3.5 mr-1.5" />
            New Part Dispatch
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">In-Transit Consignments</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-blue-700">
                {summary?.inTransit ?? 0}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">active on road</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary?.totalShipments ?? 0} total shipments recorded
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Delivered with Proof (POD)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-emerald-700">
                {summary?.delivered ?? 0}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">successfully signed</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Zero delivery failure SLA compliance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Active Fleet Vehicles</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-ink">
                {summary?.activeFleetVehicles ?? 0}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">service vans</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Assigned to rapid on-site technician dispatches
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Reverse RMA Logistics</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-poppins text-purple-700">
                {shipments.filter((s) => s.type === 'REVERSE_DEFECTIVE_RETURN').length}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">defective returns</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              OEM warranty refurbishment & scrap
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'all' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Forward Part Dispatches
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {shipments.filter((s) => s.type !== 'REVERSE_DEFECTIVE_RETURN').length}
              </span>
            </div>
            {activeTab === 'all' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('reverse')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'reverse' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Reverse Defective Returns
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {shipments.filter((s) => s.type === 'REVERSE_DEFECTIVE_RETURN').length}
              </span>
            </div>
            {activeTab === 'reverse' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
              activeTab === 'fleet' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Fleet Service Vans & Drivers
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-ink">
                {vehicles.length}
              </span>
            </div>
            {activeTab === 'fleet' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>
      </div>

      {/* Tabs Content: Shipments Table */}
      {(activeTab === 'all' || activeTab === 'reverse') && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border/70 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shipment #, tracking #, or recipient..."
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
                <option value="READY_FOR_PICKUP">Ready For Pickup</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-border/70 text-ink-soft font-medium">
                  <tr>
                    <th className="py-3 px-4 font-poppins">Shipment # & Carrier</th>
                    <th className="py-3 px-4 font-poppins">Tracking Number</th>
                    <th className="py-3 px-4 font-poppins">Destination & Recipient</th>
                    <th className="py-3 px-4 font-poppins">Parts Carried</th>
                    <th className="py-3 px-4 font-poppins">Status</th>
                    <th className="py-3 px-4 font-poppins">Linked WO</th>
                    <th className="py-3 px-4 font-poppins text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading logistics consignments...
                      </td>
                    </tr>
                  ) : filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No shipments matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-ink text-[12px]">{s.shipmentNumber}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Carrier: <strong className="text-zinc-700">{s.carrier.replace('_', ' ')}</strong>
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-ink border border-border/70">
                            {s.trackingNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">{s.recipientName}</span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                              {s.destinationAddress}, {s.destinationCity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {s.items && s.items.length > 0 ? (
                            <span className="font-mono text-[11px] text-ink font-medium">
                              {s.items[0].part.partNumber} ({s.items[0].quantity}x)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Direct Consignment</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(s.status)}</td>
                        <td className="py-3 px-4">
                          {s.workOrder ? (
                            <span className="font-mono text-primary text-[11px] font-semibold">
                              {s.workOrder.workOrderNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTimeline(s)}
                              className="h-7 text-[11px] text-ink-soft hover:text-ink"
                            >
                              Timeline
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateModal(s)}
                              className="h-7 text-[11px] text-primary border-primary/30 hover:bg-primary/10"
                            >
                              Update Status
                            </Button>
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
      )}

      {/* Tabs Content: Fleet Vehicles */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id} className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-primary">{v.registrationNumber}</span>
                    <h3 className="font-poppins font-semibold text-ink text-sm mt-0.5">{v.model}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      v.status === 'ON_ROUTE'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {v.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-ink-soft">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Payload Capacity: <strong className="font-mono text-ink">{v.capacityKg} kg</strong></span>
                  </div>
                  {v.currentDriverName && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>Driver: <strong className="text-ink">{v.currentDriverName}</strong> ({v.currentDriverPhone})</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-muted-foreground">Dispatches Completed</span>
                  <span className="font-mono font-bold text-ink text-sm">
                    {v._count?.shipments ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal 1: Create Dispatch ────────────────────────────────────────── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Dispatch Spare Part Consignment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Schedule forward spare part dispatch to customer location or technician van.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateShipment} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Origin Warehouse</Label>
                <select
                  value={createForm.originWarehouseId}
                  onChange={(e) => setCreateForm({ ...createForm, originWarehouseId: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium">Logistics Carrier</Label>
                <select
                  value={createForm.carrier}
                  onChange={(e) => setCreateForm({ ...createForm, carrier: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  <option value="INTERNAL_FLEET">Internal Fleet Service Van</option>
                  <option value="BLUE_DART">Blue Dart Express</option>
                  <option value="DELHIVERY">Delhivery Surface</option>
                  <option value="DTDC">DTDC Air Priority</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Spare Part SKU</Label>
                <select
                  value={createForm.partId}
                  onChange={(e) => setCreateForm({ ...createForm, partId: e.target.value })}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.partNumber} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium">Quantity Dispatched</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Recipient Name</Label>
                <Input
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={createForm.recipientName}
                  onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Recipient Phone</Label>
                <Input
                  required
                  placeholder="+919876543210"
                  value={createForm.recipientPhone}
                  onChange={(e) => setCreateForm({ ...createForm, recipientPhone: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Delivery Address</Label>
              <Input
                required
                placeholder="Street address / Office tower / Tech park"
                value={createForm.destinationAddress}
                onChange={(e) => setCreateForm({ ...createForm, destinationAddress: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium">City</Label>
                <Input
                  required
                  value={createForm.destinationCity}
                  onChange={(e) => setCreateForm({ ...createForm, destinationCity: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">State</Label>
                <Input
                  required
                  value={createForm.destinationState}
                  onChange={(e) => setCreateForm({ ...createForm, destinationState: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Postal Code</Label>
                <Input
                  required
                  value={createForm.destinationPostalCode}
                  onChange={(e) => setCreateForm({ ...createForm, destinationPostalCode: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono"
                />
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
                Confirm Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Update Checkpoint Status ────────────────────────────────── */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Update Shipment Checkpoint
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Progress delivery lifecycle status for tracking #{selectedShipment?.trackingNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStatus} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-medium">New Status</Label>
              <select
                value={updateForm.status}
                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                className="w-full mt-1 h-9 px-3 rounded-md border border-border/80 text-xs bg-white text-ink focus:outline-none"
              >
                <option value="DISPATCHED">DISPATCHED (Departed Warehouse)</option>
                <option value="IN_TRANSIT">IN TRANSIT (Mid-mile sorting hub)</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (Last mile rider)</option>
                <option value="DELIVERED">DELIVERED (Signed with POD)</option>
                <option value="FAILED_ATTEMPT">FAILED ATTEMPT (Customer unavailable)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium">Checkpoint Location</Label>
              <Input
                placeholder="e.g. Electronic City Delivery Center / Customer Doorstep"
                value={updateForm.location}
                onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Checkpoint Description</Label>
              <Input
                placeholder="e.g. Consignment loaded into van for delivery"
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            {updateForm.status === 'DELIVERED' && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2.5">
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Proof of Delivery (POD) Details
                </span>
                <div>
                  <Label className="text-[11px] text-emerald-900 font-medium">Signee / Received By</Label>
                  <Input
                    required
                    placeholder="e.g. Vikram Malhotra (Self) / Security Gate 2"
                    value={updateForm.proofOfDeliverySignee}
                    onChange={(e) => setUpdateForm({ ...updateForm, proofOfDeliverySignee: e.target.value })}
                    className="mt-0.5 h-8 text-xs bg-white border-emerald-300"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-emerald-900 font-medium">Delivery Notes</Label>
                  <Input
                    placeholder="e.g. OTP verified #992144, package unsealed in presence"
                    value={updateForm.proofOfDeliveryNotes}
                    onChange={(e) => setUpdateForm({ ...updateForm, proofOfDeliveryNotes: e.target.value })}
                    className="mt-0.5 h-8 text-xs bg-white border-emerald-300"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateModalOpen(false)}
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
                Save Checkpoint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Tracking Timeline ──────────────────────────────────────── */}
      <Dialog open={isTimelineModalOpen} onOpenChange={setIsTimelineModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-poppins font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Consignment Tracking Timeline
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-muted-foreground">
              {selectedShipment?.shipmentNumber} • {selectedShipment?.trackingNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="p-3 bg-zinc-50 rounded-lg border border-border/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Carrier</span>
                <span className="font-mono font-bold text-ink">{selectedShipment?.carrier}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Current Status</span>
                {selectedShipment && getStatusBadge(selectedShipment.status)}
              </div>
            </div>

            {/* Checkpoint Stepper */}
            <div className="space-y-4 pl-2">
              {selectedShipment?.trackingEvents?.map((evt, idx) => (
                <div key={evt.id} className="relative flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-poppins font-semibold text-xs text-ink">{evt.location}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{evt.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedShipment?.proofOfDeliverySignee && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                <span className="font-semibold text-emerald-800 block">Signed for by:</span>
                <span className="font-medium text-emerald-950 mt-0.5 block">{selectedShipment.proofOfDeliverySignee}</span>
                {selectedShipment.proofOfDeliveryNotes && (
                  <span className="text-[11px] text-emerald-700 italic mt-0.5 block">{selectedShipment.proofOfDeliveryNotes}</span>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
