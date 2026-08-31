import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';

interface StatusBreakdownBarProps<T = any> {
  items: T[];
  selectedStatus: string | null;
  onSelectStatus: (status: string | null) => void;
  getStatus?: (item: T) => string;
  className?: string;
  title?: string;
  unitLabel?: string;
}

export function StatusBreakdownBar<T = any>({
  items,
  selectedStatus,
  onSelectStatus,
  getStatus = (item: any) => item.customerStatus || item.status || item.leadStatus || 'New',
  className,
  title = "Status Breakdown",
  unitLabel = "lead",
}: StatusBreakdownBarProps<T>) {
  const statusBreakdown = useMemo(() => {
    if (!items || items.length === 0) return [];
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const rawStatus = getStatus(item);
      const s = (typeof rawStatus === 'string' && rawStatus.trim()) ? rawStatus.trim() : 'New';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [items, getStatus]);

  if (statusBreakdown.length === 0) return null;

  return (
    <div className={cn("bg-slate-50/90 border border-slate-200 rounded-lg p-3 my-2 shrink-0 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-[#095c7b]" />
          {title} ({items.length} Record{items.length === 1 ? '' : 's'})
        </span>
        {selectedStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectStatus(null)}
            className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          >
            Clear status filter
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {statusBreakdown.map(({ status, count }) => {
          const isSelected = selectedStatus === status;
          const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(isSelected ? null : status)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1 text-xs border transition-all cursor-pointer shadow-2xs",
                isSelected 
                  ? "bg-[#095c7b]/10 border-[#095c7b] ring-1 ring-[#095c7b]" 
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
              )}
              title={`Click to filter list by status: ${status}`}
            >
              <LeadStatusBadge status={status as LeadStatus} />
              <span className="font-bold text-slate-800 text-xs">{count} {unitLabel}{count === 1 ? '' : 's'}</span>
              <span className="text-[10px] text-slate-500 font-medium">({percentage}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
