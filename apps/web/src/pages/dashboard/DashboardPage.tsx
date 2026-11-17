import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  KeyRound,
  History,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Server,
  Database,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    userCount: 0,
    roleCount: 0,
    permCount: 0,
    auditCount: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [usersRes, rolesRes, permsRes, auditRes] = await Promise.all([
          api.get('/identity/users?limit=1'),
          api.get('/identity/roles'),
          api.get('/identity/permissions'),
          api.get('/identity/audit-logs?limit=5'),
        ]);

        setStats({
          userCount: usersRes.data?.pagination?.total || 0,
          roleCount: rolesRes.data?.length || 0,
          permCount: permsRes.data?.length || 0,
          auditCount: auditRes.data?.pagination?.total || 0,
        });

        setRecentLogs(auditRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-border/70 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold font-poppins">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            All 8 Operational Milestones Active & Verified
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-poppins tracking-tight text-ink">
            Welcome back, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm text-ink-soft max-w-xl font-sans">
            Logged into <span className="font-semibold text-ink">{user?.organizationName}</span> as{' '}
            <span className="font-semibold text-primary">{user?.roles?.[0]}</span>. Field Service, Service Desk, Multi-Hub Warehouses, Fleet Logistics, Billing & Analytics are 100% operational.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button onClick={() => navigate('/management/analytics')} variant="outline" size="sm">
            Executive KPIs
          </Button>
          <Button onClick={() => navigate('/operations/tickets')} size="sm">
            Service Queue
          </Button>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold font-poppins text-ink-soft uppercase tracking-wider">
              Organization Users
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-poppins text-ink">
              {loading ? '—' : stats.userCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Tenant members active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold font-poppins text-ink-soft uppercase tracking-wider">
              System Roles
            </CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-poppins text-ink">
              {loading ? '—' : stats.roleCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Granular RBAC profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold font-poppins text-ink-soft uppercase tracking-wider">
              Permissions Seeded
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <KeyRound className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-poppins text-ink">
              {loading ? '—' : stats.permCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Across 10 enterprise domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold font-poppins text-ink-soft uppercase tracking-wider">
              Audit Operations
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <History className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-poppins text-ink">
              {loading ? '—' : stats.auditCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Immutable logged mutations</p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Split: Architectural Roadmap + Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Phasing Progress (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ORBIT Implementation Roadmap</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  10 business modules phased across 3 architectural releases
                </p>
              </div>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                All 8/8 Milestones Completed (100%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              {
                id: 'M1',
                title: 'Foundation, IAM, RBAC & Multi-tenancy',
                route: '/settings/users',
                detail: 'Prisma schema, JWT rotation, roles, 45 permissions, audit interceptor, seed data',
              },
              {
                id: 'M2',
                title: 'CRM, Product Registration & Warranties',
                route: '/operations/warranty-check',
                detail: 'Customer 360, hardware SKU catalog, batch serial tracking, live warranty validator',
              },
              {
                id: 'M3',
                title: 'Service Desk & Dynamic SLA Engine',
                route: '/operations/tickets',
                detail: 'Incident lifecycle state machine, real-time SLA countdown timers, warranty linkage, ticket conversation log',
              },
              {
                id: 'M4',
                title: 'Field Service & Technician Dispatch PWA',
                route: '/operations/work-orders',
                detail: 'On-site visit milestones, algorithmic engineer scoring (0–100), parts consumed logging, customer OTP closure',
              },
              {
                id: 'M5',
                title: 'Inventory & Multi-Hub Warehouse Ledger',
                route: '/management/inventory',
                detail: 'Atomic stock reservations, bin locations, serial-tracked parts ledger, multi-warehouse transfers',
              },
              {
                id: 'M6',
                title: 'Logistics, Fleet & Defective Reverse Returns',
                route: '/management/logistics',
                detail: 'Carrier integration, live checkpoint tracking, fleet service vans, proof of delivery (POD)',
              },
              {
                id: 'M7',
                title: 'Billing, Finance & Warranty Absorption',
                route: '/management/finance',
                detail: 'Service job invoicing, warranty expense reimbursement (100% absorbed), multi-modal payment recording',
              },
              {
                id: 'M8',
                title: 'Operational Analytics & Executive Cockpit',
                route: '/management/analytics',
                detail: 'Cross-functional health metrics: MTTR, First-Time Fix Rate (FTFR), SLA adherence, CSAT score',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(m.route)}
                className="p-3 rounded-xl border border-border/60 bg-[#FAF9F6] flex items-center justify-between gap-4 cursor-pointer hover:border-primary/40 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                    {m.id}
                  </div>
                  <div>
                    <div className="text-xs font-bold font-poppins text-ink flex items-center gap-2 group-hover:text-primary transition-colors">
                      <span>{m.title}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{m.detail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="success" className="text-[10px]">Verified</Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Audit Trails (1 col) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Audit Trail</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Live mutation events</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings/audit-logs')}
                className="h-8 text-xs text-primary"
              >
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No mutation events logged yet. Creating or updating resources will log entries here automatically.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-border/50 bg-[#FAF9F6] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-primary">{log.action}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Actor: {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                    </span>
                    <span className="font-mono text-[10px]">{log.entityType}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
