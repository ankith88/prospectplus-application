'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Users,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalMileCompanyStatusResponse } from '@/services/localmile-company-service';

interface LocalMileStatusBadgeProps {
  status: LocalMileCompanyStatusResponse | null;
  loading?: boolean;
  onRefresh?: () => void;
  onReactivateClick?: () => void;
  className?: string;
}

export function LocalMileStatusBadge({
  status,
  loading = false,
  onRefresh,
  onReactivateClick,
  className,
}: LocalMileStatusBadgeProps) {
  if (loading || status === null) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-slate-50 text-slate-600 border-slate-200 text-xs px-2.5 py-0.5 shadow-2xs inline-flex items-center gap-1.5',
          className
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
        <span>LocalMile Plus: Checking...</span>
      </Badge>
    );
  }

  if (!status.exists) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-slate-50 text-slate-500 border-slate-200 text-xs px-2.5 py-0.5 shadow-2xs inline-flex items-center gap-1.5',
          className
        )}
        title="Company not found in LocalMile Plus database"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>LocalMile Plus: Not Registered</span>
      </Badge>
    );
  }

  const { isCompanyActive, isCompanyCancelled, hasActiveUser, activeUsersCount, pendingUsersCount, users, canReactivate } = status;

  // Determine Badge visual configuration
  let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-400';
  let label = 'LocalMile Plus: Unknown';

  if (isCompanyActive) {
    if (hasActiveUser) {
      badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
      dotColor = 'bg-emerald-500';
      label = `LocalMile Plus: Active (${activeUsersCount} Active User${activeUsersCount > 1 ? 's' : ''})`;
    } else if (pendingUsersCount > 0) {
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
      dotColor = 'bg-amber-500';
      label = `LocalMile Plus: Active (${pendingUsersCount} User Pending)`;
    } else {
      badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800';
      dotColor = 'bg-sky-500';
      label = 'LocalMile Plus: Active (No Users)';
    }
  } else if (isCompanyCancelled) {
    badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800';
    dotColor = 'bg-rose-500';
    label = hasActiveUser
      ? `LocalMile Plus: Cancelled (${activeUsersCount} Active User)`
      : `LocalMile Plus: Cancelled (No Active User)`;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer shadow-2xs hover:opacity-90',
            badgeStyle,
            className
          )}
        >
          <span className={cn('h-2 w-2 rounded-full shrink-0 animate-pulse', dotColor)} />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-84 p-4 shadow-lg" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
              <ShieldCheck className="h-4 w-4 text-[#095c7b]" />
              LocalMile Plus Status
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                title="Refresh LocalMile Status"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Company State</span>
              <span className={cn('font-bold capitalize inline-flex items-center gap-1 mt-0.5', isCompanyActive ? 'text-emerald-700' : 'text-rose-700')}>
                {isCompanyActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {status.companyStatus}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Active Users</span>
              <span className={cn('font-bold inline-flex items-center gap-1 mt-0.5', hasActiveUser ? 'text-emerald-700' : 'text-slate-700')}>
                <Users className="h-3 w-3" />
                {activeUsersCount} Active / {users.length} Total
              </span>
            </div>
          </div>

          {status.deactivatedAt && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-1 rounded border border-amber-200/50 text-amber-900 dark:text-amber-200">
              <Clock className="h-3 w-3 text-amber-600 shrink-0" />
              <span>
                Deactivated: {new Date(status.deactivatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}

          {/* Associated Users List */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Associated Users ({users.length})</span>
            </div>
            {users.length === 0 ? (
              <div className="text-xs text-muted-foreground italic bg-slate-50 dark:bg-slate-900 p-2 rounded text-center">
                No users linked in LocalMile Plus database.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {u.name || 'User'}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate" title={u.email}>
                        {u.email}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0 shrink-0',
                        (u.status === 'Active' || u.status === 'active')
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : u.status === 'Pending_Activation'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      )}
                    >
                      {u.status === 'Pending_Activation' ? 'Pending' : u.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reactivate Action Button if Cancelled and No Active User */}
          {canReactivate && onReactivateClick && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                onClick={onReactivateClick}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reactivate in LocalMile Plus
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
