"use client"

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CallAttemptBadgeProps {
  attempts: number;
  variant?: 'compact' | 'default' | 'banner' | 'table';
  className?: string;
  showTooltip?: boolean;
}

export function CallAttemptBadge({
  attempts = 0,
  variant = 'default',
  className,
  showTooltip = true,
}: CallAttemptBadgeProps) {
  const count = Math.max(0, attempts);

  // Styling based on attempt progression (Theme matched to MailPlus palette)
  let badgeStyle = '';
  let dotString = '';
  let statusLabel = '';

  if (count === 0) {
    badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    dotString = '○ ○ ○';
    statusLabel = 'Attempt 0 of 3';
  } else if (count === 1) {
    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
    dotString = '● ○ ○';
    statusLabel = 'Attempt 1 of 3';
  } else if (count === 2) {
    badgeStyle = 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    dotString = '● ● ○';
    statusLabel = 'Attempt 2 of 3';
  } else {
    // 3 or more attempts - Goal reached / eligible
    badgeStyle = 'bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/30 dark:bg-[#095c7b]/30 dark:text-cyan-300 dark:border-[#095c7b]/60 font-bold';
    dotString = '● ● ●';
    statusLabel = count === 3 ? 'Attempt 3 of 3' : `Attempt ${count} of 3`;
  }

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-2.5 px-3.5 rounded-lg border text-xs shadow-xs transition-all",
          count >= 3
            ? "bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20 dark:bg-[#095c7b]/20 dark:text-cyan-200"
            : count === 2
            ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200"
            : count === 1
            ? "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/30 dark:text-sky-200"
            : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300",
          className
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          <PhoneCall className="w-4 h-4 shrink-0 text-[#095c7b]" />
          <span>
            Outbound Call Progress: <strong className="font-semibold">{statusLabel}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="tracking-widest font-bold">{dotString}</span>
          {count >= 3 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 ml-1">
              <CheckCircle className="w-3.5 h-3.5" /> 3+ Attempts Logged
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'table' || variant === 'compact') {
    const badgeContent = (
      <Badge
        variant="outline"
        className={cn(
          "h-5 text-[11px] font-semibold px-2 rounded-full border inline-flex items-center gap-1 shrink-0 shadow-2xs whitespace-nowrap",
          badgeStyle,
          className
        )}
      >
        <Phone className="w-2.5 h-2.5 shrink-0 opacity-80" />
        <span>{count}/3</span>
        <span className="text-[9px] tracking-tighter ml-0.5 opacity-90">{dotString}</span>
      </Badge>
    );

    if (!showTooltip) return badgeContent;

    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-none shadow-md">
            <p className="font-semibold">{statusLabel}</p>
            <p className="text-[11px] opacity-90">Total outbound call attempts logged: {count}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default Badge Variant
  const content = (
    <Badge
      variant="outline"
      className={cn(
        "h-6 text-xs font-semibold px-2.5 rounded-full border inline-flex items-center gap-1.5 shrink-0 shadow-2xs whitespace-nowrap transition-all",
        badgeStyle,
        className
      )}
    >
      <PhoneCall className="w-3 h-3 shrink-0" />
      <span>{statusLabel}</span>
      <span className="text-[10px] tracking-wider font-mono opacity-80">{dotString}</span>
    </Badge>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="text-xs max-w-xs space-y-1 p-2.5 shadow-lg">
          <p className="font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#095c7b]" /> Outbound Call Attempts
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {count === 0
              ? 'No outbound call attempts logged yet.'
              : count < 3
              ? `${count} call attempt(s) recorded. Target is 3 attempts before marking as Lost.`
              : `${count} call attempts recorded. Target connection attempts completed.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
