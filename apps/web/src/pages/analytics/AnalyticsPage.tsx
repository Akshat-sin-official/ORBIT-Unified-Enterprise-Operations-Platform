import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Wrench,
  Boxes,
  Truck,
  Receipt,
  Flame,
  Activity,
  Users,
} from 'lucide-react';

interface ExecutiveData {
  serviceDesk: {
    totalTickets: number;
    resolvedTickets: number;
    slaComplianceRate: number;
    mttrHours: number;
    ticketsByPriority: {
      P1_CRITICAL: number;
      P2_HIGH: number;
      P3_MEDIUM: number;
      P4_LOW: number;
    };
    ticketsByStatus: {
      OPEN: number;
      TRIAGED: number;
      IN_PROGRESS: number;
      WAITING: number;
      RESOLVED: number;
      CLOSED: number;
    };
  };
  fieldOps: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    firstTimeFixRate: number;
    avgCsat: number;
    activeTechnicians: number;
    workOrdersByStatus: {
      DRAFT: number;
      ASSIGNED: number;
      IN_PROGRESS: number;
      PARTS_PENDING: number;
      COMPLETED: number;
    };
  };
  inventoryLogistics: {
    totalValuation: number;
    lowStockAlerts: number;
    activeShipments: number;
    inTransitShipments: number;
  };
  finance: {
    totalRevenue: number;
    totalCollected: number;
    outstandingReceivables: number;
    warrantyAbsorbed: number;
  };
}

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExecutiveData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/executive');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              EXECUTIVE INTELLIGENCE
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-white text-ink border-border">
              MILESTONE 8 ACTIVE
            </Badge>
          </div>
          <h1 className="text-2xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-primary stroke-[2.2]" />
            Operational KPIs & Executive Cockpit
          </h1>
          <p className="text-xs text-ink-soft font-normal mt-0.5">
            Cross-functional health metrics: MTTR, First-Time Fix Rate, SLA adherence, and warranty claim absorption.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs font-medium border-border/80 bg-white hover:bg-zinc-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-xs font-medium text-muted-foreground font-poppins">
            Aggregating enterprise resource telemetry...
          </p>
        </div>
      ) : data ? (
        <>
          {/* Executive Big Numbers (4 Pillars) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: SLA Compliance */}
            <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">SLA Compliance Rate</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-poppins text-emerald-700">
                    {data.serviceDesk.slaComplianceRate}%
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">target: &gt;95%</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data.serviceDesk.resolvedTickets} of {data.serviceDesk.totalTickets} resolved within SLA
                </p>
              </CardContent>
            </Card>

            {/* KPI 2: MTTR */}
            <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">Mean Time to Resolution (MTTR)</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-poppins text-ink">
                    {data.serviceDesk.mttrHours}h
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">average duration</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ticket open ➔ customer signoff
                </p>
              </CardContent>
            </Card>

            {/* KPI 3: FTFR */}
            <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">First-Time Fix Rate (FTFR)</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-poppins text-purple-700">
                    {data.fieldOps.firstTimeFixRate}%
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">single visit</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Resolved without second truck roll
                </p>
              </CardContent>
            </Card>

            {/* KPI 4: CSAT */}
            <Card className="bg-white border-border/70 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">Customer CSAT Score</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-poppins text-amber-600">
                    {data.fieldOps.avgCsat}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">/ 5.0</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Based on OTP verified customer ratings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Telemetry Grids (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Incident Priority & Service Funnel */}
            <Card className="bg-white border-border/70 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-poppins font-semibold text-sm text-ink">
                      Service Desk & Incident Triage
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {data.serviceDesk.totalTickets} Complaints Logged
                  </Badge>
                </div>

                {/* Priority Breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-ink-soft block">Incidents by Priority SLA:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                      <span className="text-[10px] text-red-700 font-mono font-bold block">P1 CRITICAL</span>
                      <span className="text-lg font-bold text-red-900 font-poppins block">
                        {data.serviceDesk.ticketsByPriority.P1_CRITICAL}
                      </span>
                      <span className="text-[9px] text-red-600">4h Resolution</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                      <span className="text-[10px] text-orange-700 font-mono font-bold block">P2 HIGH</span>
                      <span className="text-lg font-bold text-orange-900 font-poppins block">
                        {data.serviceDesk.ticketsByPriority.P2_HIGH}
                      </span>
                      <span className="text-[9px] text-orange-600">8h Resolution</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-mono font-bold block">P3 MEDIUM</span>
                      <span className="text-lg font-bold text-blue-900 font-poppins block">
                        {data.serviceDesk.ticketsByPriority.P3_MEDIUM}
                      </span>
                      <span className="text-[9px] text-blue-600">24h Resolution</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-50 border border-border/80">
                      <span className="text-[10px] text-zinc-600 font-mono font-bold block">P4 LOW</span>
                      <span className="text-lg font-bold text-ink font-poppins block">
                        {data.serviceDesk.ticketsByPriority.P4_LOW}
                      </span>
                      <span className="text-[9px] text-muted-foreground">48h Resolution</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Status Pipeline */}
                <div className="pt-2 space-y-2 border-t border-border/60">
                  <span className="text-xs font-medium text-ink-soft block">Lifecycle Stage Distribution:</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-zinc-50 rounded border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">Triaged / In Progress</span>
                      <span className="font-mono font-bold text-ink">
                        {data.serviceDesk.ticketsByStatus.TRIAGED + data.serviceDesk.ticketsByStatus.IN_PROGRESS}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">Resolved</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {data.serviceDesk.ticketsByStatus.RESOLVED}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">Closed / Audited</span>
                      <span className="font-mono font-bold text-ink">
                        {data.serviceDesk.ticketsByStatus.CLOSED}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Field Operations & Dispatch Telemetry */}
            <Card className="bg-white border-border/70 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-poppins font-semibold text-sm text-ink">
                      Field Service & Dispatch Telemetry
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {data.fieldOps.activeTechnicians} Certified Engineers
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-ink-soft block">Field Work Order Funnel:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-50 border border-border/70">
                      <span className="text-[10px] text-muted-foreground font-mono block">ASSIGNED</span>
                      <span className="text-lg font-bold text-ink font-poppins block">
                        {data.fieldOps.workOrdersByStatus.ASSIGNED}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-mono block">ON ROUTE</span>
                      <span className="text-lg font-bold text-blue-900 font-poppins block">
                        {data.fieldOps.workOrdersByStatus.IN_PROGRESS}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-mono block">PARTS PENDING</span>
                      <span className="text-lg font-bold text-amber-900 font-poppins block">
                        {data.fieldOps.workOrdersByStatus.PARTS_PENDING}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-mono block">COMPLETED</span>
                      <span className="text-lg font-bold text-emerald-900 font-poppins block">
                        {data.fieldOps.workOrdersByStatus.COMPLETED}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supply & Reverse Logistics overview */}
                <div className="pt-2 space-y-2 border-t border-border/60 text-xs">
                  <span className="text-xs font-medium text-ink-soft block">Supply & Reverse Logistics Pipeline:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Active Warehousing Valuation</span>
                      <span className="font-mono font-bold text-ink text-sm">
                        ₹{data.inventoryLogistics.totalValuation.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Live Shipments in Transit</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {data.inventoryLogistics.inTransitShipments} active vans/couriers
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Card: Financial & Warranty Reconciliation Banner */}
          <Card className="bg-white border-border/70 shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <h3 className="font-poppins font-semibold text-sm text-ink">
                    Financial Settlement & OEM Warranty Absorption
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                  REVENUE RECONCILED
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="p-3 bg-zinc-50 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">Total Billed Invoices</span>
                  <span className="text-xl font-bold font-poppins text-ink mt-1 block">
                    ₹{data.finance.totalRevenue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-mono block">Cash & UPI Collected</span>
                  <span className="text-xl font-bold font-poppins text-emerald-700 mt-1 block">
                    ₹{data.finance.totalCollected.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-mono block">Outstanding Receivables</span>
                  <span className="text-xl font-bold font-poppins text-amber-700 mt-1 block">
                    ₹{data.finance.outstandingReceivables.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200">
                  <span className="text-[10px] text-purple-800 uppercase font-mono block">OEM Warranty Claim Absorbed</span>
                  <span className="text-xl font-bold font-poppins text-purple-700 mt-1 block">
                    ₹{data.finance.warrantyAbsorbed.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};
