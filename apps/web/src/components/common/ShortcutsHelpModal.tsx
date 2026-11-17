import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command, Sparkles, Navigation, CheckSquare } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const sections = [
    {
      title: 'Global Controls',
      icon: Command,
      items: [
        { keys: ['Ctrl', 'K'], desc: 'Open Quick Command Palette' },
        { keys: ['⌘', 'J'], desc: 'Toggle Operations Copilot AI' },
        { keys: ['?'], desc: 'Open this Keyboard Shortcuts cheat sheet' },
        { keys: ['Esc'], desc: 'Close dialogs, drawers, and clear bulk selections' },
      ],
    },
    {
      title: 'Two-Key Navigation (G then...)',
      icon: Navigation,
      items: [
        { keys: ['G', 'D'], desc: 'Go to Overview Dashboard' },
        { keys: ['G', 'T'], desc: 'Go to Service Desk Tickets' },
        { keys: ['G', 'W'], desc: 'Go to Field Service Work Orders' },
        { keys: ['G', 'I'], desc: 'Go to Inventory & Warehouses' },
        { keys: ['G', 'L'], desc: 'Go to Logistics & Fleet' },
        { keys: ['G', 'F'], desc: 'Go to Finance & Invoices' },
        { keys: ['G', 'A'], desc: 'Go to Operational Analytics KPIs' },
        { keys: ['G', 'C'], desc: 'Go to Customers CRM' },
        { keys: ['G', 'S'], desc: 'Go to Organization Profile & Settings' },
      ],
    },
    {
      title: 'Bulk Operations & Workflows',
      icon: CheckSquare,
      items: [
        { keys: ['Click Checkbox'], desc: 'Select individual item for bulk operations' },
        { keys: ['Header Checkbox'], desc: 'Select / Deselect all visible items on page' },
        { keys: ['Bulk Bar'], desc: 'Status transition, priority update, technician assign, CSV export' },
        { keys: ['Esc'], desc: 'Deselect all selected items' },
      ],
    },
    {
      title: 'Quick Creation (N then...)',
      icon: Sparkles,
      items: [
        { keys: ['N', 'T'], desc: 'Create New Support Ticket' },
        { keys: ['N', 'W'], desc: 'Create New Field Work Order' },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-poppins font-bold text-base text-ink">
                Keyboard Shortcuts & Power Operations
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Accelerate high-volume enterprise workflows with instant keyboard hotkeys.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-3 max-h-[60vh] overflow-y-auto">
          {sections.map((sec, sIdx) => {
            const Icon = sec.icon;
            return (
              <div key={sIdx} className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-poppins font-bold text-ink uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span>{sec.title}</span>
                </div>

                <div className="rounded-xl border border-border/70 bg-[#FAF9F6] p-2 space-y-1.5">
                  {sec.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-white border border-border/50 shadow-2xs"
                    >
                      <span className="text-ink-soft text-[11.5px] leading-tight">{item.desc}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-300 shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
          <span>Press <kbd className="px-1 py-0.5 rounded font-mono text-[10px] bg-zinc-100 border border-zinc-300">Esc</kbd> anytime to close</span>
          <span className="font-mono text-[10.5px]">Hotkeys</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
