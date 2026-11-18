import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Orbit,
  LayoutDashboard,
  Users,
  Ticket,
  Wrench,
  Truck,
  Boxes,
  Receipt,
  BarChart3,
  UserCog,
  Shield,
  Building2,
  History,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  ExternalLink,
  Package,
  ShieldCheck,
  Calendar,
  FileText,
  Scan,
  Sparkles,
  Keyboard,
  CheckCheck,
  Smartphone,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useOfflineSync } from '@/lib/offline-sync';
import { CopilotDrawer } from '@/components/copilot/CopilotDrawer';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ShortcutsHelpModal } from '@/components/common/ShortcutsHelpModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface NavItem {
  label: string;
  to: string;
  icon: any;
  enabled: boolean;
  permission?: string;
  tag?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const { isOnline, queueCount, syncNow, isSyncing } = useOfflineSync();

  // Live in-app notifications
  const [inAppNotifications, setInAppNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const fetchInAppNotifications = async () => {
    try {
      const res = await api.get('/notifications/in-app?limit=10');
      if (res.data) {
        setInAppNotifications(res.data.items || []);
        setUnreadNotifCount(res.data.unreadCount || 0);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchInAppNotifications();
    const interval = setInterval(fetchInAppNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkNotifRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.patch(`/notifications/in-app/${id}/read`);
      setInAppNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.patch('/notifications/in-app/read-all');
      setInAppNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Global enterprise keyboard shortcuts (Ctrl+K, Ctrl+J, ?, G+D, G+T, etc.)
  useKeyboardShortcuts({
    onToggleCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev),
    onToggleCopilot: () => setIsCopilotOpen((prev) => !prev),
    onToggleShortcuts: () => setIsShortcutsOpen((prev) => !prev),
    onEscape: () => {
      setIsCommandPaletteOpen(false);
      setIsShortcutsOpen(false);
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    if (!user) return false;
    // Super Admin / Org Admin has all permissions
    if (user.roles?.some((r) => r.toLowerCase().includes('admin'))) return true;
    return user.permissions?.includes(perm) || false;
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, enabled: true },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Customers', to: '/operations/customers', icon: Users, enabled: true, permission: 'customer.view' },
        { label: 'Products & Serials', to: '/operations/products', icon: Package, enabled: true, permission: 'product.view' },
        { label: 'Warranty Check', to: '/operations/warranty-check', icon: ShieldCheck, enabled: true, permission: 'warranty.view' },
        { label: 'Service Desk (Tickets)', to: '/operations/tickets', icon: Ticket, enabled: true, permission: 'ticket.view' },
        { label: 'Work Orders', to: '/operations/work-orders', icon: Wrench, enabled: true, permission: 'work_order.view' },
        { label: 'Visual Dispatch Board', to: '/operations/dispatch', icon: Calendar, enabled: true, permission: 'work_order.view' },
        { label: 'AMC Contracts', to: '/operations/contracts', icon: FileText, enabled: true, permission: 'warranty.view' },
        { label: 'Mobile Tech App (PWA)', to: '/m/work-orders', icon: Smartphone, enabled: true, permission: 'work_order.view' },
      ],
    },
    {
      title: 'Supply & Logistics',
      items: [
        { label: 'Inventory & Warehouses', to: '/management/inventory', icon: Boxes, enabled: true, permission: 'inventory.view' },
        { label: 'Defective RMA Depot', to: '/management/rma', icon: Scan, enabled: true, permission: 'inventory.view' },
        { label: 'Franchisee & ASPs', to: '/management/partners', icon: Building2, enabled: true, permission: 'organization.view' },
        { label: 'Shipments & Fleet', to: '/management/logistics', icon: Truck, enabled: true, permission: 'shipment.view' },
        { label: 'Invoices & Billing', to: '/management/finance', icon: Receipt, enabled: true, permission: 'invoice.view' },
        { label: 'Operational KPIs', to: '/management/analytics', icon: BarChart3, enabled: true, permission: 'analytics.view' },
      ],
    },
    {
      title: 'Platform Settings',
      items: [
        { label: 'Users & Team', to: '/settings/users', icon: UserCog, enabled: true, permission: 'user.view' },
        { label: 'Roles & Matrix', to: '/settings/roles', icon: Shield, enabled: true, permission: 'role.view' },
        { label: 'Organization Profile', to: '/settings/organization', icon: Building2, enabled: true, permission: 'organization.view' },
        { label: 'Audit Trails', to: '/settings/audit-logs', icon: History, enabled: true, permission: 'audit.view' },
      ],
    },
  ];

  // RBAC Gated Navigation
  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const userInitials =
    user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'OR';

  return (
    <div className="flex h-screen bg-[#FAF9F6] text-foreground font-sans overflow-hidden">
      {/* Sidebar - Clean Notion-Style Palette */}
      <aside className="w-64 border-r border-border/70 bg-[#FBFBFA] flex flex-col justify-between shrink-0">
        {/* Top Org Branding */}
        <div>
          <div className="p-3.5 border-b border-border/70 bg-white">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-auto bg-[#FAF9F6] border border-border/80 px-2.5 py-1 rounded-xl flex items-center justify-center shrink-0 shadow-2xs hover:border-border transition-colors">
                <img
                  src="/orbit-logo.png"
                  alt="ORBIT"
                  className="h-6 w-auto object-contain mix-blend-multiply"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold font-poppins text-xs tracking-tight text-ink truncate">
                  {user?.organizationName || 'Operations'}
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {filteredNavGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold font-poppins text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (!item.enabled) {
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-muted-foreground/60 cursor-not-allowed opacity-60"
                        title={`Available in ${item.tag}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500 font-semibold">
                          {item.tag}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-ink/80 hover:bg-slate-200/60 hover:text-ink'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-border/60 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-8 h-8 rounded-lg">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold font-poppins text-ink truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user?.roles?.[0] || 'User'}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border/70 bg-white px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <span className="font-poppins font-bold text-ink capitalize text-sm">
                {window.location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>

            {/* Global Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 border border-border/70 text-xs text-muted-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Search or jump to...</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-border text-zinc-700 shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShortcutsOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-ink hidden sm:flex"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setIsCopilotOpen(true)}
              size="sm"
              className="h-8 text-xs font-semibold bg-gradient-to-r from-indigo-500 via-primary to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xs gap-1.5 px-3"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Copilot
            </Button>

            <a
              href="http://localhost:5000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <span>Swagger API Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* In-App Notifications Feed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-xl text-muted-foreground hover:text-ink hover:bg-zinc-100 transition-colors focus:outline-none cursor-pointer"
                  title="In-App Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border border-border">
                <div className="p-3 border-b border-border/70 flex items-center justify-between bg-zinc-50/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-poppins text-ink">Notifications</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllNotifsRead}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                  {inAppNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No notifications yet. Operational lifecycle alerts will arrive here.
                    </div>
                  ) : (
                    inAppNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkNotifRead(n.id)}
                        className={`p-3 text-xs cursor-pointer transition-colors hover:bg-zinc-50 ${
                          !n.isRead ? 'bg-blue-50/40 font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[12px] font-bold ${!n.isRead ? 'text-ink' : 'text-slate-700'}`}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span className="font-mono">{n.category?.replace(/_/g, ' ')}</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-border/70 text-center bg-zinc-50/70">
                  <button
                    onClick={() => navigate('/settings/organization')}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Manage Notification Delivery Matrix →
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-4 w-px bg-border/60" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 cursor-pointer focus:outline-none">
                  <Avatar className="w-7 h-7 rounded-lg">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold font-poppins">{user?.firstName} {user?.lastName}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings/organization')}>
                  <Building2 className="w-3.5 h-3.5 mr-2" />
                  Organization Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings/users')}>
                  <UserCog className="w-3.5 h-3.5 mr-2" />
                  User Management
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Global Offline / Sync Banner */}
        {(!isOnline || queueCount > 0) && (
          <div className="bg-amber-500/15 border-b border-amber-300/60 px-6 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-700" />
              <span>
                {!isOnline ? (
                  <strong>Offline Mode:</strong>
                ) : (
                  <strong>Reconnected:</strong>
                )}{' '}
                {queueCount > 0
                  ? `${queueCount} frontline actions queued in local IndexedDB.`
                  : 'Working offline. Changes are safely cached locally.'}
              </span>
            </div>
            {queueCount > 0 && isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={syncNow}
                disabled={isSyncing}
                className="h-7 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </Button>
            )}
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#FAF9F6]">
          <Outlet />
        </main>
      </div>

      {/* Floating Copilot Button */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-primary to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20"
        title="Open ORBIT Operations Copilot (⌘J)"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
      </button>

      {/* Operations Copilot Drawer */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Keyboard Shortcuts Help Modal (?) */}
      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};
