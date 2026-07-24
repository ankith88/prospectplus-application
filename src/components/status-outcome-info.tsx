"use client";

import React from 'react';
import { Info, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getOutcomesForStatus, getStatusOutcomeExplanation } from '@/lib/status-outcome-mapping';

interface StatusOutcomeInfoProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
  align?: 'start' | 'center' | 'end';
}

export function StatusOutcomeInfo({ status, className = '', iconOnly = true, align = 'start' }: StatusOutcomeInfoProps) {
  const outcomes = getOutcomesForStatus(status);
  const explanation = getStatusOutcomeExplanation(status);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Status info for ${status}`}
          className={`inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none shrink-0 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground/80 hover:text-sky-600 dark:hover:text-sky-400" />
          {!iconOnly && <span className="text-xs font-medium underline underline-offset-2">Outcome Mapping</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-80 p-3.5 text-xs space-y-2.5 shadow-xl border bg-popover text-popover-foreground z-50 leading-relaxed"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-2">
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>Status:</span>
            <Badge variant="secondary" className="font-bold text-[11px] px-2 py-0.5">
              {status}
            </Badge>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Trigger Info</span>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-[11px]">
          {explanation}
        </p>

        {outcomes.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Triggering Call Outcomes:</div>
            <div className="flex flex-wrap gap-1">
              {outcomes.map((o) => (
                <Badge
                  key={o.outcome}
                  variant="outline"
                  className="text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {o.outcome}
                  {o.reason && <span className="ml-1 text-muted-foreground font-normal">({o.reason})</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface StatusChartTooltipProps {
  active?: boolean;
  payload?: any[];
  unit?: string;
  labelFormatter?: (val: any) => string;
}

export function StatusChartTooltipContent({ active, payload, unit = 'leads', labelFormatter }: StatusChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const rawStatus = data.name || data.payload?.name || '';
  if (!rawStatus) return null;

  const statusName = rawStatus;
  const val = data.value;
  const displayVal = labelFormatter ? labelFormatter(val) : `${val} ${typeof val === 'number' && val === 1 ? unit.replace(/s$/, '') : unit}`;
  const outcomes = getOutcomesForStatus(statusName);
  const explanation = getStatusOutcomeExplanation(statusName);

  return (
    <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-2xl max-w-xs text-xs space-y-2 z-50">
      <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 gap-2">
        <span className="font-bold text-sky-400 text-xs truncate">{statusName}</span>
        <span className="font-bold text-slate-200 text-xs shrink-0">{displayVal}</span>
      </div>

      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
        {explanation}
      </p>

      {outcomes.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger Outcomes:</div>
          <div className="flex flex-wrap gap-1">
            {outcomes.map((o) => (
              <span key={o.outcome} className="bg-sky-950 text-sky-300 border border-sky-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                {o.outcome}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

