'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailVerificationStatus } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmailVerificationBadgeProps {
  status?: EmailVerificationStatus;
  score?: number;
  verifiedAt?: string;
  onVerify?: () => void;
  loading?: boolean;
  size?: 'sm' | 'default';
  showVerifyButton?: boolean;
}

export function EmailVerificationBadge({
  status,
  score,
  verifiedAt,
  onVerify,
  loading = false,
  size = 'default',
  showVerifyButton = true,
}: EmailVerificationBadgeProps) {
  if (loading) {
    return (
      <Badge
        variant="outline"
        className={`bg-blue-50 text-blue-700 border-blue-200 inline-flex items-center gap-1.5 animate-pulse ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
        }`}
      >
        <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
        <span>Verifying...</span>
      </Badge>
    );
  }

  if (!status || status === 'unknown') {
    if (showVerifyButton && onVerify) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onVerify();
          }}
          className={`h-6 text-[10px] font-medium text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 inline-flex items-center gap-1 ${
            size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'
          }`}
          title="Verify email deliverability using Hunter.io"
        >
          <ShieldCheck className="h-3 w-3 text-slate-500" />
          <span>Verify Email</span>
        </Button>
      );
    }

    return (
      <Badge
        variant="outline"
        className={`bg-slate-100 text-slate-500 border-slate-200 inline-flex items-center gap-1 ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
        }`}
      >
        <HelpCircle className="h-3 w-3 text-slate-400" />
        <span>Unverified</span>
      </Badge>
    );
  }

  let badgeConfig = {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <HelpCircle className="h-3 w-3" />,
    label: 'Unknown',
  };

  if (status === 'deliverable') {
    badgeConfig = {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
      label: 'Deliverable',
    };
  } else if (status === 'risky') {
    badgeConfig = {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      icon: <AlertTriangle className="h-3 w-3 text-amber-600" />,
      label: 'Risky',
    };
  } else if (status === 'undeliverable') {
    badgeConfig = {
      bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      icon: <XCircle className="h-3 w-3 text-red-600" />,
      label: 'Undeliverable',
    };
  }

  const dateFormatted = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            <Badge
              variant="outline"
              className={`font-semibold cursor-help inline-flex items-center gap-1 transition-colors ${badgeConfig.bg} ${
                size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
              }`}
            >
              {badgeConfig.icon}
              <span>{badgeConfig.label}</span>
              {typeof score === 'number' && score > 0 && (
                <span className="opacity-80 font-mono text-[10px]">({score}%)</span>
              )}
            </Badge>
            {onVerify && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVerify();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title="Re-verify email"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs bg-slate-900 text-slate-100 p-2.5 max-w-xs shadow-xl">
          <div className="space-y-1">
            <p className="font-semibold text-white flex items-center justify-between gap-2">
              <span>Status: {badgeConfig.label}</span>
              {typeof score === 'number' && <span className="text-emerald-400 font-mono">{score}% confidence</span>}
            </p>
            {dateFormatted && <p className="text-[11px] text-slate-400">Verified on {dateFormatted}</p>}
            <p className="text-[11px] text-slate-300 border-t border-slate-800 pt-1 mt-1">
              Verified via Hunter.io Email Verifier
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
