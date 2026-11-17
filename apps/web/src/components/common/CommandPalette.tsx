import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Ticket,
  Wrench,
  Boxes,
  Truck,
  Receipt,
  BarChart3,
  Users,
  Package,
  ShieldCheck,
  Building2,
  UserCog,
  History,
  Sparkles,
  Plus,
  HelpCircle,
  ArrowRight,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Copilot' | 'System';
  shortcut?: string;
  icon: any;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCopilot?: () => void;
  onOpenShortcuts?: () => void;
  onNewTicket?: () => void;
  onNewWorkOrder?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCopilot,
  onOpenShortcuts,
  onNewTicket,
  onNewWorkOrder,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // Quick Actions
    {
      id: 'copilot',
      title: 'Open Operations Copilot (Gemini RAG)',
      category: 'Copilot',
      shortcut: '⌘J',
      icon: Sparkles,
      action: () => {
        onClose();
        onOpenCopilot?.();
      },
      keywords: ['ai', 'gemini', 'assistant', 'chat', 'diagnose', 'bot'],
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts Cheat Sheet',
      category: 'System',
      shortcut: '?',
      icon: HelpCircle,
      action: () => {
        onClose();
        onOpenShortcuts?.();
      },
      keywords: ['hotkeys', 'keys', 'help', 'commands'],
    },
    {
      id: 'new-ticket',
      title: 'Create New Support Ticket',
      category: 'Actions',
      shortcut: 'N T',
      icon: Plus,
      action: () => {
        onClose();
        if (onNewTicket) onNewTicket();
        else navigate('/operations/tickets?create=true');
      },
      keywords: ['ticket', 'complaint', 'issue', 'incident', 'create'],
    },
    {
      id: 'new-work-order',
      title: 'Create Field Work Order',
      category: 'Actions',
      shortcut: 'N W',
      icon: Plus,
      action: () => {
        onClose();
        if (onNewWorkOrder) onNewWorkOrder();
        else navigate('/operations/work-orders?create=true');
      },
      keywords: ['work order', 'dispatch', 'repair', 'job', 'create'],
    },

    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Operations Dashboard',
      category: 'Navigation',
      shortcut: 'G D',
      icon: LayoutDashboard,
      action: () => {
        onClose();
        navigate('/dashboard');
      },
      keywords: ['dashboard', 'home', 'overview', 'summary'],
    },
    {
      id: 'nav-tickets',
      title: 'Go to Service Desk (Tickets)',
      category: 'Navigation',
      shortcut: 'G T',
      icon: Ticket,
      action: () => {
        onClose();
        navigate('/operations/tickets');
      },
      keywords: ['tickets', 'incidents', 'service desk', 'support', 'sla'],
    },
    {
      id: 'nav-work-orders',
      title: 'Go to Field Service Work Orders',
      category: 'Navigation',
      shortcut: 'G W',
      icon: Wrench,
      action: () => {
        onClose();
        navigate('/operations/work-orders');
      },
      keywords: ['work orders', 'technicians', 'dispatch', 'field jobs'],
    },
    {
      id: 'nav-inventory',
      title: 'Go to Inventory & Warehouses',
      category: 'Navigation',
      shortcut: 'G I',
      icon: Boxes,
      action: () => {
        onClose();
        navigate('/management/inventory');
      },
      keywords: ['inventory', 'stock', 'spares', 'parts', 'warehouse', 'buffers'],
    },
    {
      id: 'nav-logistics',
      title: 'Go to Logistics & Fleet Shipments',
      category: 'Navigation',
      shortcut: 'G L',
      icon: Truck,
      action: () => {
        onClose();
        navigate('/management/logistics');
      },
      keywords: ['logistics', 'shipments', 'fleet', 'tracking', 'transit'],
    },
    {
      id: 'nav-finance',
      title: 'Go to Invoices & Billing',
      category: 'Navigation',
      shortcut: 'G F',
      icon: Receipt,
      action: () => {
        onClose();
        navigate('/management/finance');
      },
      keywords: ['finance', 'billing', 'invoices', 'warranty claims', 'revenue'],
    },
    {
      id: 'nav-analytics',
      title: 'Go to Operational Analytics KPIs',
      category: 'Navigation',
      shortcut: 'G A',
      icon: BarChart3,
      action: () => {
        onClose();
        navigate('/management/analytics');
      },
      keywords: ['analytics', 'metrics', 'kpis', 'ftfr', 'mttr', 'performance'],
    },
    {
      id: 'nav-customers',
      title: 'Go to Customer Accounts & CRM',
      category: 'Navigation',
      shortcut: 'G C',
      icon: Users,
      action: () => {
        onClose();
        navigate('/operations/customers');
      },
      keywords: ['customers', 'accounts', 'crm', 'contacts'],
    },
    {
      id: 'nav-products',
      title: 'Go to Products & Asset Catalog',
      category: 'Navigation',
      shortcut: 'G P',
      icon: Package,
      action: () => {
        onClose();
        navigate('/operations/products');
      },
      keywords: ['products', 'serials', 'skus', 'assets'],
    },
    {
      id: 'nav-warranty',
      title: 'Go to Warranty Status Lookup',
      category: 'Navigation',
      shortcut: '',
      icon: ShieldCheck,
      action: () => {
        onClose();
        navigate('/operations/warranty-check');
      },
      keywords: ['warranty', 'serial', 'coverage', 'lookup'],
    },
    {
      id: 'nav-org-settings',
      title: 'Go to Organization Profile & Mail Gateway',
      category: 'Navigation',
      shortcut: 'G S',
      icon: Building2,
      action: () => {
        onClose();
        navigate('/settings/organization');
      },
      keywords: ['settings', 'organization', 'smtp', 'mail', 'gemini api'],
    },
    {
      id: 'nav-users',
      title: 'Go to Team & Role Permissions',
      category: 'Navigation',
      shortcut: 'G U',
      icon: UserCog,
      action: () => {
        onClose();
        navigate('/settings/users');
      },
      keywords: ['users', 'roles', 'team', 'permissions', 'rbac'],
    },
    {
      id: 'nav-audit',
      title: 'Go to Enterprise Audit Trails',
      category: 'Navigation',
      shortcut: '',
      icon: History,
      action: () => {
        onClose();
        navigate('/settings/audit-logs');
      },
      keywords: ['audit', 'logs', 'compliance', 'security'],
    },
  ];

  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchCategory = item.category.toLowerCase().includes(q);
    const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
    return matchTitle || matchCategory || matchKeywords;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-border/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-border/70 flex items-center gap-3 bg-zinc-50/50">
          <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or action (e.g. 'Tickets', 'Copilot', 'Dispatch')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground focus:outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-ink text-xs px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          ) : (
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5">
              ESC to close
            </Badge>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-xs">No matching commands or destinations found.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/80">
                Try searching for 'Tickets', 'Dispatch', 'Inventory', or 'Copilot'.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-ink hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-white shadow-2xs' : 'bg-zinc-100 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-poppins">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {item.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-zinc-50 border-border/80 text-muted-foreground py-0 px-1.5"
                      >
                        {item.shortcut}
                      </Badge>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-primary opacity-80" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Shortcut Helper Strip */}
        <div className="px-4 py-2.5 bg-zinc-50 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground font-sans">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to dismiss</span>
          </div>
          <span className="font-mono text-[10px]">QuickCommand</span>
        </div>
      </div>
    </div>
  );
};
