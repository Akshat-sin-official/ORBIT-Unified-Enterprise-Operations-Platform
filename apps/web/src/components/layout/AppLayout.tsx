import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { CopilotDrawer } from '@/components/copilot/CopilotDrawer';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ShortcutsHelpModal } from '@/components/common/ShortcutsHelpModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface NavItem {
  label: string;
  to: string;
  icon: any;
  enabled: boolean;
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
        { label: 'Customers', to: '/operations/customers', icon: Users, enabled: true },
        { label: 'Products & Serials', to: '/operations/products', icon: Package, enabled: true },
        { label: 'Warranty Check', to: '/operations/warranty-check', icon: ShieldCheck, enabled: true },
        { label: 'Service Desk (Tickets)', to: '/operations/tickets', icon: Ticket, enabled: true },
        { label: 'Work Orders', to: '/operations/work-orders', icon: Wrench, enabled: true },
      ],
    },
    {
      title: 'Supply & Logistics',
      items: [
        { label: 'Inventory & Warehouses', to: '/management/inventory', icon: Boxes, enabled: true },
        { label: 'Shipments & Fleet', to: '/management/logistics', icon: Truck, enabled: true },
        { label: 'Invoices & Billing', to: '/management/finance', icon: Receipt, enabled: true },
        { label: 'Operational KPIs', to: '/management/analytics', icon: BarChart3, enabled: true },
      ],
    },
    {
      title: 'Platform Settings',
      items: [
        { label: 'Users & Team', to: '/settings/users', icon: UserCog, enabled: true },
        { label: 'Roles & Matrix', to: '/settings/roles', icon: Shield, enabled: true },
        { label: 'Organization Profile', to: '/settings/organization', icon: Building2, enabled: true },
        { label: 'Audit Trails', to: '/settings/audit-logs', icon: History, enabled: true },
      ],
    },
  ];

  const userInitials =
    user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'OR';

  return (
    <div className="flex h-screen bg-[#FAF9F6] text-foreground font-sans overflow-hidden">
      {/* Sidebar - Clean Notion-Style Palette */}
      <aside className="w-64 border-r border-border/70 bg-[#FBFBFA] flex flex-col justify-between shrink-0">
        {/* Top Org Branding */}
        <div>
          <div className="p-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Orbit className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold font-poppins text-sm tracking-tight text-ink truncate">
                  {user?.organizationName || 'ORBIT Platform'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {user?.organizationSlug || 'tenant-active'}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navGroups.map((group) => (
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
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="font-poppins font-bold text-ink">ORBIT Ops</span>
              <span>/</span>
              <span className="capitalize">{window.location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}</span>
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

            <div className="h-4 w-px bg-border/60" />

            <Badge variant="success">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </Badge>

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
