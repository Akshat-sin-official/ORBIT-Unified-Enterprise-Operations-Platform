import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Ticket,
  Wrench,
  Boxes,
  Truck,
  Receipt,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  MapPin,
  Laptop,
  Flame,
  Plus,
  KeyRound,
  History,
  Activity,
  Layers,
} from 'lucide-react';

// ─── REUSABLE INTERDEPENDENT DASHBOARD COMPONENTS ────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
}

const DashboardStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  bgClass,
  onClick,
}) => (
  <Card
    onClick={onClick}
    className={`bg-white border-border/70 shadow-2xs hover:shadow-xs transition-all ${
      onClick ? 'cursor-pointer hover:border-primary/40' : ''
    }`}
  >
    <CardContent className="p-4 flex items-center justify-between">
      <div className="space-y-1 min-w-0">
        <p className="text-[10px] font-bold font-poppins text-muted-foreground uppercase tracking-widest truncate">
          {title}
        </p>
        <p className="text-3xl sm:text-[32px] font-black font-poppins text-ink tracking-tight leading-none my-1">
          {value}
        </p>
        {subtitle && <p className="text-[11px] font-medium font-sans text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center shrink-0 shadow-2xs`}>
        <Icon className="w-5 h-5" />
      </div>
    </CardContent>
  </Card>
);

interface ActionCardProps {
  title: string;
  desc: string;
  icon: any;
  to: string;
  badge?: string;
}

const DashboardQuickAction: React.FC<ActionCardProps> = ({ title, desc, icon: Icon, to, badge }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="p-3.5 rounded-xl bg-white hover:bg-zinc-50/80 border border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-xs transition-all text-left flex items-start gap-3 group cursor-pointer w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-poppins font-semibold text-xs text-ink group-hover:text-primary transition-colors truncate">
            {title}
          </span>
          {badge && (
            <Badge variant="outline" className="text-[9.5px] font-mono py-0 px-1.5 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </button>
  );
};

// ─── MAIN ROLE-ADAPTIVE DASHBOARD ────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Persona Data States
  const [techWorkOrders, setTechWorkOrders] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [warehouseSummary, setWarehouseSummary] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>({
    ticketsCount: 0,
    workOrdersCount: 0,
    partsCount: 0,
    shipmentsCount: 0,
  });
  const [recentAudit, setRecentAudit] = useState<any[]>([]);

  // Determine active persona
  const isTech = user?.roles?.some((r) => r.toLowerCase().includes('technician'));
  const isSupport = user?.roles?.some((r) => r.toLowerCase().includes('support'));
  const isDispatcher = user?.roles?.some((r) => r.toLowerCase().includes('dispatcher'));
  const isWarehouse = user?.roles?.some((r) => r.toLowerCase().includes('warehouse'));
  const isAdmin = !isTech && !isSupport && !isDispatcher && !isWarehouse;

  useEffect(() => {
    const loadPersonaData = async () => {
      try {
        setLoading(true);

        if (isTech) {
          // Field Tech: Load assigned work orders
          const res = await api.get('/field-service/work-orders?limit=20');
          setTechWorkOrders(res.data?.data || []);
        } else if (isSupport) {
          // Support Agent: Load open service tickets
          const res = await api.get('/service-desk/tickets?limit=20');
          setSupportTickets(res.data?.data || []);
        } else if (isDispatcher) {
          // Dispatcher: Load pending work orders
          const res = await api.get('/field-service/work-orders?limit=20');
          setTechWorkOrders(res.data?.data || []);
        } else if (isWarehouse) {
          // Warehouse Manager: Load inventory summary
          const res = await api.get('/inventory/summary');
          setWarehouseSummary(res.data);
        } else {
          // Admin / Executive: Load cross-module operational telemetry
          const [tRes, woRes, whRes, auditRes] = await Promise.all([
            api.get('/service-desk/tickets?limit=5'),
            api.get('/field-service/work-orders?limit=5'),
            api.get('/inventory/summary').catch(() => ({ data: { totalParts: 0, lowStockAlerts: 0 } })),
            api.get('/identity/audit-logs?limit=5').catch(() => ({ data: { data: [] } })),
          ]);

          setAdminStats({
            ticketsCount: tRes.data?.pagination?.total || tRes.data?.data?.length || 0,
            workOrdersCount: woRes.data?.pagination?.total || woRes.data?.data?.length || 0,
            partsCount: whRes.data?.totalParts || 0,
            lowStockAlerts: whRes.data?.lowStockAlerts || 0,
          });
          setSupportTickets(tRes.data?.data || []);
          setRecentAudit(auditRes.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPersonaData();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Persona Welcome Header */}
      <div className="bg-white rounded-2xl border border-border/70 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black font-poppins text-ink tracking-[-0.03em] leading-tight">
            {isTech && `Field Technician Console — Welcome, ${user?.firstName}`}
            {isSupport && `Service Desk Command — Welcome, ${user?.firstName}`}
            {isDispatcher && `Smart Dispatch Hub — Welcome, ${user?.firstName}`}
            {isWarehouse && `Warehouse & Hub Ledger — Welcome, ${user?.firstName}`}
            {isAdmin && `Executive Operations Command — Welcome, ${user?.firstName}`}
          </h1>

          <p className="text-xs sm:text-[13px] text-muted-foreground font-sans leading-relaxed max-w-2xl font-normal">
            {isTech && 'View assigned field service calls, navigate customer addresses, and verify completion OTPs.'}
            {isSupport && 'Triage customer incidents, review SLA countdown clocks, and escalate critical issues.'}
            {isDispatcher && 'Coordinate field engineers, optimize travel zones, and monitor fleet transit.'}
            {isWarehouse && 'Audit spare part safety buffers, process stock receipts, and manage inter-warehouse transfers.'}
            {isAdmin && 'Unified oversight of CRM, Service Desk, Field Dispatch, Logistics Fleet, Warehouses & Invoicing.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <Button
            size="sm"
            onClick={() => navigate(isTech ? '/operations/work-orders' : isSupport ? '/operations/tickets' : '/management/analytics')}
            className="text-xs font-poppins font-bold bg-primary hover:bg-primary/95 text-white shadow-2xs px-3.5 h-9 rounded-xl gap-1.5"
          >
            {isTech ? 'My Jobs' : isSupport ? 'Ticket Queue' : 'Analytics Digest'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── 1. TECHNICIAN DASHBOARD ────────────────────────────────────────── */}
      {isTech && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Assigned Jobs"
              value={techWorkOrders.length}
              subtitle="Scheduled for service"
              icon={Wrench}
              colorClass="text-primary"
              bgClass="bg-primary/10"
              onClick={() => navigate('/operations/work-orders')}
            />
            <DashboardStatCard
              title="On-Site Repairs"
              value={techWorkOrders.filter((w) => w.status === 'ON_SITE' || w.status === 'TRAVELING').length}
              subtitle="Active field dispatches"
              icon={MapPin}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
            />
            <DashboardStatCard
              title="Pending OTP Verification"
              value={techWorkOrders.filter((w) => w.status === 'REPAIRED' && !w.isOtpVerified).length}
              subtitle="Awaiting customer sign-off"
              icon={ShieldCheck}
              colorClass="text-purple-600"
              bgClass="bg-purple-50"
            />
            <DashboardStatCard
              title="Completed Fixes"
              value={techWorkOrders.filter((w) => w.status === 'COMPLETED').length}
              subtitle="Resolved successfully"
              icon={CheckCircle2}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h3 className="font-poppins font-bold text-sm text-ink flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <span>My Active Work Orders</span>
                </h3>
                <span className="text-xs text-muted-foreground font-mono">{techWorkOrders.length} Jobs</span>
              </div>

              {techWorkOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No work orders currently assigned to your shift.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {techWorkOrders.slice(0, 5).map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => navigate(`/operations/work-orders/${wo.id}`)}
                      className="py-3 flex items-center justify-between hover:bg-zinc-50/70 p-2 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-ink">{wo.workOrderNumber}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{wo.status}</Badge>
                        </div>
                        <p className="text-xs font-semibold text-ink font-poppins">{wo.title}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{wo.customer?.name} • {wo.customerAddress?.city || 'On-site'}</span>
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-8">Open Console</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Technician Actions
              </h3>
              <DashboardQuickAction
                title="Field Service Orders"
                desc="View schedule and repair evidence"
                icon={Wrench}
                to="/operations/work-orders"
              />
              <DashboardQuickAction
                title="Warranty Serial Check"
                desc="Verify hardware coverage before repair"
                icon={ShieldCheck}
                to="/operations/warranty-check"
              />
              <DashboardQuickAction
                title="Customer Contact Lookup"
                desc="Call ahead before arriving on-site"
                icon={Users}
                to="/operations/customers"
              />
            </div>
          </div>
        </>
      )}

      {/* ─── 2. SUPPORT AGENT DASHBOARD ────────────────────────────────────── */}
      {isSupport && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Open Incident Queue"
              value={supportTickets.length}
              subtitle="Active customer complaints"
              icon={Ticket}
              colorClass="text-primary"
              bgClass="bg-primary/10"
              onClick={() => navigate('/operations/tickets')}
            />
            <DashboardStatCard
              title="SLA Breached"
              value={supportTickets.filter((t) => t.isResolutionBreached).length}
              subtitle="Breached resolution deadline"
              icon={AlertTriangle}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
            />
            <DashboardStatCard
              title="P1 Critical Incidents"
              value={supportTickets.filter((t) => t.priority === 'P1_CRITICAL').length}
              subtitle="Emergency severity"
              icon={Flame}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
            />
            <DashboardStatCard
              title="Resolved Tickets"
              value={supportTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
              subtitle="Closed successfully"
              icon={CheckCircle2}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h3 className="font-poppins font-bold text-sm text-ink flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  <span>Incoming Incident Triage Stream</span>
                </h3>
                <span className="text-xs text-muted-foreground font-mono">{supportTickets.length} Open</span>
              </div>

              {supportTickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No open customer tickets in queue.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {supportTickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/operations/tickets/${t.id}`)}
                      className="py-3 flex items-center justify-between hover:bg-zinc-50/70 p-2 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-ink">{t.ticketNumber}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{t.priority}</Badge>
                        </div>
                        <p className="text-xs font-semibold text-ink font-poppins">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.customer?.name} • {t.isResolutionBreached ? '⚠️ SLA Breached' : 'On Track'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-8">Triage Ticket</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Support Actions
              </h3>
              <DashboardQuickAction
                title="Create Incident Ticket"
                desc="Log new customer issue with SLA timer"
                icon={Plus}
                to="/operations/tickets"
              />
              <DashboardQuickAction
                title="Warranty Coverage Lookup"
                desc="Validate serial numbers against database"
                icon={ShieldCheck}
                to="/operations/warranty-check"
              />
              <DashboardQuickAction
                title="Customer Directory"
                desc="Inspect CRM accounts and past tickets"
                icon={Users}
                to="/operations/customers"
              />
            </div>
          </div>
        </>
      )}

      {/* ─── 3. DISPATCHER DASHBOARD ───────────────────────────────────────── */}
      {isDispatcher && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Pending Dispatch"
              value={techWorkOrders.filter((w) => w.status === 'DRAFT' || !w.technician).length}
              subtitle="Awaiting technician match"
              icon={Wrench}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
              onClick={() => navigate('/operations/work-orders')}
            />
            <DashboardStatCard
              title="Active In Field"
              value={techWorkOrders.filter((w) => w.status === 'TRAVELING' || w.status === 'ON_SITE').length}
              subtitle="Technicians dispatched"
              icon={MapPin}
              colorClass="text-primary"
              bgClass="bg-primary/10"
            />
            <DashboardStatCard
              title="Assigned Orders"
              value={techWorkOrders.filter((w) => w.status === 'ASSIGNED').length}
              subtitle="Ready for technician rollout"
              icon={Clock}
              colorClass="text-purple-600"
              bgClass="bg-purple-50"
            />
            <DashboardStatCard
              title="Completed Fixes"
              value={techWorkOrders.filter((w) => w.status === 'COMPLETED').length}
              subtitle="Verified with customer OTP"
              icon={CheckCircle2}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h3 className="font-poppins font-bold text-sm text-ink flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <span>Orders Needing Technician Assignment</span>
                </h3>
                <span className="text-xs text-muted-foreground font-mono">Real-time queue</span>
              </div>

              <div className="divide-y divide-border/40">
                {techWorkOrders.slice(0, 5).map((wo) => (
                  <div
                    key={wo.id}
                    onClick={() => navigate(`/operations/work-orders/${wo.id}`)}
                    className="py-3 flex items-center justify-between hover:bg-zinc-50/70 p-2 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-ink">{wo.workOrderNumber}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{wo.priority}</Badge>
                      </div>
                      <p className="text-xs font-semibold text-ink font-poppins">{wo.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Site: {wo.customerAddress?.city || 'Regional Zone'} • Tech: {wo.technician ? `${wo.technician.user?.firstName}` : '⚠️ Unassigned'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-8">Smart Dispatch</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Dispatch Tools
              </h3>
              <DashboardQuickAction
                title="All Work Orders"
                desc="Filter by zone, status, and engineer"
                icon={Wrench}
                to="/operations/work-orders"
              />
              <DashboardQuickAction
                title="Fleet & Transit Tracking"
                desc="Inspect active shipment vehicles"
                icon={Truck}
                to="/management/logistics"
              />
              <DashboardQuickAction
                title="Service Desk Queue"
                desc="Review escalated tickets requiring dispatch"
                icon={Ticket}
                to="/operations/tickets"
              />
            </div>
          </div>
        </>
      )}

      {/* ─── 4. WAREHOUSE MANAGER DASHBOARD ────────────────────────────────── */}
      {isWarehouse && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Safety Stock Alerts"
              value={warehouseSummary?.lowStockAlerts || 0}
              subtitle="Parts below safety buffer"
              icon={AlertTriangle}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
              onClick={() => navigate('/management/inventory')}
            />
            <DashboardStatCard
              title="Total Spare Parts"
              value={warehouseSummary?.totalParts || 0}
              subtitle="Catalog items active"
              icon={Boxes}
              colorClass="text-primary"
              bgClass="bg-primary/10"
            />
            <DashboardStatCard
              title="Total Inventory Valuation"
              value={`$${Number(warehouseSummary?.totalValuation || 0).toLocaleString()}`}
              subtitle="Valuation at cost"
              icon={Receipt}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
            <DashboardStatCard
              title="Total On-Hand Units"
              value={warehouseSummary?.totalOnHandUnits || 0}
              subtitle="Stock across all hubs"
              icon={Layers}
              colorClass="text-purple-600"
              bgClass="bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <h3 className="font-poppins font-bold text-sm text-ink pb-2 border-b border-border/60">
                Warehouse & Hub Overview
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Regional hubs operating with real-time atomic inventory ledgering. Safety stock buffers are actively monitored with inter-warehouse stock rebalance automation.
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={() => navigate('/management/inventory')} className="text-xs">
                  Open Inventory Console →
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Inventory Actions
              </h3>
              <DashboardQuickAction
                title="Stock Ledger & Parts"
                desc="View stock balances across hubs"
                icon={Boxes}
                to="/management/inventory"
              />
              <DashboardQuickAction
                title="Logistics Dispatches"
                desc="Manage part transfers and shipments"
                icon={Truck}
                to="/management/logistics"
              />
            </div>
          </div>
        </>
      )}

      {/* ─── 5. EXECUTIVE / ADMIN COMMAND CENTER (DEFAULT) ─────────────────── */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Service Desk Tickets"
              value={adminStats.ticketsCount}
              subtitle="Active incidents"
              icon={Ticket}
              colorClass="text-primary"
              bgClass="bg-primary/10"
              onClick={() => navigate('/operations/tickets')}
            />
            <DashboardStatCard
              title="Field Work Orders"
              value={adminStats.workOrdersCount}
              subtitle="Dispatches and repairs"
              icon={Wrench}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
              onClick={() => navigate('/operations/work-orders')}
            />
            <DashboardStatCard
              title="Low Stock Buffers"
              value={adminStats.lowStockAlerts}
              subtitle="Spare parts requiring rebalance"
              icon={AlertTriangle}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
              onClick={() => navigate('/management/inventory')}
            />
            <DashboardStatCard
              title="Catalog Spare SKUs"
              value={adminStats.partsCount}
              subtitle="Active inventory items"
              icon={Boxes}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              onClick={() => navigate('/management/inventory')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-border/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h3 className="font-poppins font-bold text-sm text-ink flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Unified Operational Stream</span>
                </h3>
              </div>

              <div className="divide-y divide-border/40">
                {supportTickets.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/operations/tickets/${t.id}`)}
                    className="py-2.5 flex items-center justify-between hover:bg-zinc-50/70 p-2 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-ink">{t.ticketNumber}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{t.priority}</Badge>
                      </div>
                      <p className="text-xs font-semibold text-ink font-poppins">{t.title}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Enterprise Hubs
              </h3>
              <DashboardQuickAction
                title="Operational KPIs & FTFR"
                desc="Executive metrics, MTTR, and SLA digest"
                icon={BarChart3}
                to="/management/analytics"
              />
              <DashboardQuickAction
                title="Billing & Invoices"
                desc="Warranty claims vs billable charges"
                icon={Receipt}
                to="/management/finance"
              />
              <DashboardQuickAction
                title="Roles & Matrix"
                desc="Configure granular RBAC capabilities"
                icon={ShieldCheck}
                to="/settings/roles"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
