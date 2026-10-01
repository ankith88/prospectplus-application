import React, { useMemo } from 'react';
import { Building2, Building, Phone, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AccountTypeBadge({ type, className }: { type?: string | null; className?: string }) {
  const val = type || 'BAU';
  if (val === 'Corporate / Multisite' || val === 'Corporate' || val === 'Multisite') {
    return (
      <Badge className={cn("bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold flex items-center gap-1", className)}>
        <Building className="w-3 h-3 text-purple-600" /> Corporate / Multisite
      </Badge>
    );
  }
  if (val === 'J2') {
    return (
      <Badge className={cn("bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold flex items-center gap-1", className)}>
        <Phone className="w-3 h-3 text-amber-600" /> J2
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("bg-slate-50 text-slate-700 border-slate-200 text-xs font-semibold flex items-center gap-1", className)}>
      <Store className="w-3 h-3 text-slate-500" /> BAU
    </Badge>
  );
}

interface AccountTypeBreakdownBarProps<T = any> {
  items: T[];
  selectedAccountType: string | null;
  onSelectAccountType: (type: string | null) => void;
  getAccountType?: (item: T) => string;
  className?: string;
  title?: string;
  unitLabel?: string;
}

export function AccountTypeBreakdownBar<T = any>({
  items,
  selectedAccountType,
  onSelectAccountType,
  getAccountType = (item: any) => item.accountType || 'BAU',
  className,
  title = "Account Type Breakdown",
  unitLabel = "lead",
}: AccountTypeBreakdownBarProps<T>) {
  const accountTypeBreakdown = useMemo(() => {
    if (!items || items.length === 0) return [];
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const type = getAccountType(item) || 'BAU';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [items, getAccountType]);

  if (accountTypeBreakdown.length === 0) return null;

  return (
    <div className={cn("bg-slate-50/90 border border-slate-200 rounded-lg p-3 my-2 shrink-0 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-[#095c7b]" />
          {title} ({items.length} Record{items.length === 1 ? '' : 's'})
        </span>
        {selectedAccountType && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectAccountType(null)}
            className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          >
            Clear account type filter
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {accountTypeBreakdown.map(({ type, count }) => {
          const isSelected = selectedAccountType === type;
          const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelectAccountType(isSelected ? null : type)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1 text-xs border transition-all cursor-pointer shadow-2xs",
                isSelected 
                  ? "bg-[#095c7b]/10 border-[#095c7b] ring-1 ring-[#095c7b]" 
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
              )}
              title={`Click to filter list by account type: ${type}`}
            >
              <AccountTypeBadge type={type} />
              <span className="font-bold text-slate-800 text-xs">{count} {unitLabel}{count === 1 ? '' : 's'}</span>
              <span className="text-[10px] text-slate-500 font-medium">({percentage}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
