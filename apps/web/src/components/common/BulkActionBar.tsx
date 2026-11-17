import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  CheckSquare,
  Square,
  Loader2,
  Trash2,
  Download,
  UserCheck,
  Tag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface BulkActionOption {
  label: string;
  icon?: any;
  action: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  actions: BulkActionOption[];
  loading?: boolean;
  itemTypeLabel?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  isAllSelected,
  actions,
  loading = false,
  itemTypeLabel = 'items',
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 sm:gap-4 max-w-[95vw] overflow-x-auto no-scrollbar">
        {/* Count Badge & Toggle */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700 shrink-0">
          <Badge className="bg-primary text-white font-mono font-bold text-xs px-2 py-0.5 border-0">
            {selectedCount}
          </Badge>
          <span className="text-xs font-poppins font-medium text-slate-200 hidden sm:inline">
            {selectedCount === 1 ? itemTypeLabel.replace(/s$/, '') : itemTypeLabel} selected
          </span>
          {onSelectAll && totalCount && totalCount > selectedCount && (
            <button
              onClick={onSelectAll}
              className="text-[11px] text-primary-foreground/80 hover:text-white underline ml-1 cursor-pointer"
            >
              Select all {totalCount}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <Button
                key={idx}
                size="sm"
                variant={act.variant === 'destructive' ? 'destructive' : 'secondary'}
                onClick={act.action}
                disabled={loading || act.disabled}
                className={`h-8 text-xs font-semibold px-3 rounded-xl gap-1.5 transition-all ${
                  act.variant === 'destructive'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : Icon ? (
                  <Icon className="w-3.5 h-3.5 text-primary-foreground/90" />
                ) : null}
                <span>{act.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Clear selection */}
        <div className="pl-2 border-l border-slate-700 shrink-0">
          <button
            onClick={onClearSelection}
            disabled={loading}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Deselect all (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
