"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckSquare, Shuffle, X, MousePointerClick, Layers, Check, Filter, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export interface ScopeLeadItem {
  id: string;
  dialerAssigned?: string | null;
  salesRepAssigned?: string | null;
  status?: string | null;
  [key: string]: any;
}

export interface CustomBulkSelectControlProps {
  /** Ordered list of all lead IDs available in the current filtered/searched view */
  allAvailableIds: string[];
  /** Currently selected lead IDs */
  selectedIds: string[];
  /** Callback to set or update selected lead IDs */
  onSelect: (ids: string[]) => void;
  /** Callback to clear selection */
  onClear?: () => void;
  /** Label for total count description (default: "Leads") */
  label?: string;
  /** Compact mode for tight table toolbars */
  compact?: boolean;
  /** Restrict display to Admin / SuperAdmin users only (default: true) */
  requireAdmin?: boolean;
  className?: string;

  /** Optional leads array to enable Dialer / Unassigned / Status scoped selection */
  scopeLeads?: ScopeLeadItem[];
  /** Whether the bucket is inbound (for checking salesRepAssigned vs dialerAssigned) */
  isInbound?: boolean;
  /** Initial dialer scope: 'all' | 'unassigned' | string (dialer name) */
  initialDialerScope?: string;
  /** Initial status scope: 'all' | string (status name) */
  initialStatusScope?: string;
}

const PRESET_CANDIDATES = [10, 25, 50, 100, 250, 500, 1000];

export function CustomBulkSelectControl({
  allAvailableIds = [],
  selectedIds = [],
  onSelect,
  onClear,
  label = 'Leads',
  compact = false,
  requireAdmin = true,
  className = '',
  scopeLeads,
  isInbound = false,
  initialDialerScope = 'all',
  initialStatusScope = 'all',
}: CustomBulkSelectControlProps) {
  const { userProfile, isSuperAdmin } = useAuth();
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [targetPool, setTargetPool] = useState<'available' | 'preselected'>('available');

  const [dialerScope, setDialerScope] = useState<string>(initialDialerScope || 'all');
  const [statusScope, setStatusScope] = useState<string>(initialStatusScope || 'all');

  useEffect(() => {
    if (initialDialerScope) setDialerScope(initialDialerScope);
  }, [initialDialerScope]);

  useEffect(() => {
    if (initialStatusScope) setStatusScope(initialStatusScope);
  }, [initialStatusScope]);

  // Role verification: check if user is admin or superadmin
  const role = (userProfile?.activeRole || userProfile?.role || '').toLowerCase();
  const isAdminOrSuperAdmin = isSuperAdmin || [
    'admin',
    'superadmin',
    'super admin',
    'super user',
    'outbound admin',
    'sales manager',
    'lead gen admin',
    'marketing manager',
    'field sales admin',
    'operations',
    'data admin'
  ].includes(role);

  if (requireAdmin && !isAdminOrSuperAdmin) {
    return null;
  }

  const helperAssignee = (lead: ScopeLeadItem) => {
    const rawRep = isInbound ? lead.salesRepAssigned : lead.dialerAssigned;
    if (
      !rawRep ||
      typeof rawRep !== 'string' ||
      rawRep.trim() === '' ||
      rawRep.trim().toLowerCase() === 'unassigned' ||
      rawRep.trim().toLowerCase() === 'undefined' ||
      rawRep.trim().toLowerCase() === 'null'
    ) {
      return null;
    }
    return rawRep.trim();
  };

  const hasScopeOptions = Boolean(scopeLeads && scopeLeads.length > 0);

  const { dialerList, unassignedCount, availableStatusesForDialer, scopedPoolIds } = useMemo(() => {
    if (!scopeLeads || scopeLeads.length === 0) {
      return {
        dialerList: [],
        unassignedCount: 0,
        availableStatusesForDialer: [],
        scopedPoolIds: allAvailableIds,
      };
    }

    const dialerCounts = new Map<string, number>();
    let unassigned = 0;

    scopeLeads.forEach((lead) => {
      const rep = helperAssignee(lead);
      if (!rep) {
        unassigned++;
      } else {
        dialerCounts.set(rep, (dialerCounts.get(rep) || 0) + 1);
      }
    });

    const sortedDialers = Array.from(dialerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Filter leads matching dialerScope
    const leadsInDialerScope = scopeLeads.filter((lead) => {
      const rep = helperAssignee(lead);
      if (dialerScope === 'all') return true;
      if (dialerScope === 'unassigned') return rep === null;
      return rep === dialerScope;
    });

    // Compute status counts for leads matching dialerScope
    const statusCounts = new Map<string, number>();
    leadsInDialerScope.forEach((lead) => {
      const st = lead.status ? lead.status.trim() : 'Unknown';
      statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
    });

    const sortedStatuses = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => a.status.localeCompare(b.status));

    // Filter leads matching both dialerScope and statusScope
    const finalFiltered = leadsInDialerScope.filter((lead) => {
      if (statusScope === 'all') return true;
      const st = lead.status ? lead.status.trim() : 'Unknown';
      return st === statusScope;
    });

    return {
      dialerList: sortedDialers,
      unassignedCount: unassigned,
      availableStatusesForDialer: sortedStatuses,
      scopedPoolIds: finalFiltered.map((l) => l.id),
    };
  }, [scopeLeads, allAvailableIds, dialerScope, statusScope, isInbound]);

  const handleDialerScopeChange = (newDialer: string) => {
    setDialerScope(newDialer);
    // If the currently selected status does not exist under the new dialer, reset status to 'all'
    if (statusScope !== 'all' && scopeLeads) {
      const exists = scopeLeads.some((lead) => {
        const rep = helperAssignee(lead);
        const matchesDialer = newDialer === 'all' || (newDialer === 'unassigned' ? rep === null : rep === newDialer);
        const st = lead.status ? lead.status.trim() : 'Unknown';
        return matchesDialer && st === statusScope;
      });
      if (!exists) {
        setStatusScope('all');
      }
    }
  };

  const selectedCount = selectedIds.length;
  const isPreselectedTarget = targetPool === 'preselected' && selectedCount > 0;

  const activePoolIds = useMemo(() => {
    if (isPreselectedTarget) {
      if (hasScopeOptions && (dialerScope !== 'all' || statusScope !== 'all')) {
        const scopedSet = new Set(scopedPoolIds);
        return selectedIds.filter((id) => scopedSet.has(id));
      }
      return selectedIds;
    }
    return scopedPoolIds;
  }, [isPreselectedTarget, hasScopeOptions, dialerScope, statusScope, scopedPoolIds, selectedIds]);

  const totalAvailable = activePoolIds.length;

  const handleSelectCount = (count: number, isRandom = false) => {
    if (totalAvailable === 0) {
      toast({ title: 'No leads available', description: 'There are no leads in the target scope to select.', variant: 'destructive' });
      return;
    }

    const targetCount = Math.min(Math.max(1, count), totalAvailable);
    let targetIds: string[] = [];

    if (isRandom) {
      const shuffled = [...activePoolIds].sort(() => 0.5 - Math.random());
      targetIds = shuffled.slice(0, targetCount);
    } else {
      targetIds = activePoolIds.slice(0, targetCount);
    }

    let finalIds: string[] = [];
    if (mode === 'append' && !isPreselectedTarget) {
      finalIds = Array.from(new Set([...selectedIds, ...targetIds]));
    } else {
      finalIds = targetIds;
    }

    onSelect(finalIds);
    setIsOpen(false);

    let scopeDesc = '';
    if (dialerScope === 'unassigned') {
      scopeDesc = 'from Unassigned';
    } else if (dialerScope !== 'all') {
      scopeDesc = `from ${dialerScope}`;
    }
    if (statusScope !== 'all') {
      scopeDesc = scopeDesc ? `${scopeDesc} under status "${statusScope}"` : `under status "${statusScope}"`;
    }

    toast({
      title: `Selected ${targetIds.length.toLocaleString()} ${label}`,
      description: isRandom
        ? `Randomly selected ${targetIds.length.toLocaleString()} leads ${scopeDesc ? scopeDesc + ' ' : ''}from ${isPreselectedTarget ? 'preselected leads' : 'active pool'}.`
        : `Selected top ${targetIds.length.toLocaleString()} leads ${scopeDesc ? scopeDesc + ' ' : ''}in ${isPreselectedTarget ? 'preselected leads' : 'current list order'}.`,
    });
  };

  const handleSelectAll = () => {
    handleSelectCount(totalAvailable, false);
  };

  const handleCustomSubmit = (e?: React.FormEvent, isRandom = false) => {
    if (e) e.preventDefault();
    const parsed = parseInt(customAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid positive number.', variant: 'destructive' });
      return;
    }
    handleSelectCount(parsed, isRandom);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onSelect([]);
    }
  };

  const visiblePresets = PRESET_CANDIDATES.filter((n) => n < totalAvailable);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {compact ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                    <MousePointerClick className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Select specific quantity from {label}...</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 border-primary/40 hover:border-primary text-xs md:text-sm font-medium bg-background shadow-sm">
              <MousePointerClick className="h-4 w-4 text-primary shrink-0" />
              <span>Select Amount...</span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[360px] sm:w-[410px] p-4 shadow-xl border-border bg-card max-h-[85vh] overflow-y-auto" align="start">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Layers className="h-4 w-4 text-primary" />
                <span>Bulk Select {label}</span>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {totalAvailable.toLocaleString()} {isPreselectedTarget ? 'Selected' : 'Available'}
              </Badge>
            </div>

            {/* Target Pool Selection (All vs Preselected) */}
            {selectedCount > 0 && (
              <div className="flex items-center justify-between text-xs bg-muted/60 p-1.5 rounded-md border border-border/60">
                <span className="font-medium text-muted-foreground">Source Pool:</span>
                <div className="flex items-center gap-1 bg-background p-0.5 rounded border border-border">
                  <button
                    type="button"
                    onClick={() => setTargetPool('available')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      targetPool === 'available' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Available ({hasScopeOptions ? scopeLeads!.length.toLocaleString() : allAvailableIds.length.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPool('preselected')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      targetPool === 'preselected' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Preselected ({selectedCount.toLocaleString()})
                  </button>
                </div>
              </div>
            )}

            {/* Scope Filter Section (Dialer / Unassigned & Status) */}
            {hasScopeOptions && (
              <div className="space-y-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    Target Dialer &amp; Status
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground font-mono">
                    {scopedPoolIds.length.toLocaleString()} matching
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">Dialer / Bucket</Label>
                    <select
                      value={dialerScope}
                      onChange={(e) => handleDialerScopeChange(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="all">All Leads ({scopeLeads!.length.toLocaleString()})</option>
                      <option value="unassigned">Unassigned ({unassignedCount.toLocaleString()})</option>
                      {dialerList.length > 0 && (
                        <optgroup label="Assigned Dialers">
                          {dialerList.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name} ({d.count.toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">Status</Label>
                    <select
                      value={statusScope}
                      onChange={(e) => setStatusScope(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="all">
                        All Statuses ({availableStatusesForDialer.reduce((acc, s) => acc + s.count, 0).toLocaleString()})
                      </option>
                      {availableStatusesForDialer.map((st) => (
                        <option key={st.status} value={st.status}>
                          {st.status} ({st.count.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(dialerScope !== 'all' || statusScope !== 'all') && (
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/70 dark:border-slate-800/70 text-slate-600 dark:text-slate-400">
                    <span className="truncate">
                      Scope: <strong className="text-primary font-semibold">{dialerScope === 'unassigned' ? 'Unassigned' : dialerScope === 'all' ? 'All Leads' : dialerScope}</strong>
                      {statusScope !== 'all' && <> &bull; <strong className="text-foreground">{statusScope}</strong></>}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDialerScope('all');
                        setStatusScope('all');
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 underline shrink-0 ml-1"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {visiblePresets.map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    disabled={totalAvailable === 0}
                    onClick={() => handleSelectCount(preset, false)}
                    className="text-xs px-2.5 h-7 font-mono hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    {preset}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={totalAvailable === 0}
                  onClick={handleSelectAll}
                  className="text-xs px-2.5 h-7 font-semibold bg-primary/5 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-mono"
                >
                  All ({totalAvailable.toLocaleString()})
                </Button>
              </div>
            </div>

            {/* Custom Amount Form */}
            <form onSubmit={(e) => handleCustomSubmit(e, false)} className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Custom Quantity</span>
                <span className="text-[10px] text-muted-foreground font-mono">Max {totalAvailable.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={totalAvailable || 99999}
                  placeholder={`e.g. 2330 (max ${totalAvailable.toLocaleString()})`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={totalAvailable === 0 || !customAmount}
                  className="h-8 px-3 text-xs gap-1 shrink-0"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select Top
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={totalAvailable === 0 || !customAmount}
                  onClick={() => handleCustomSubmit(undefined, true)}
                  className="h-7 text-xs gap-1 w-full"
                >
                  <Shuffle className="h-3.5 w-3.5 text-amber-500" />
                  Select Random {customAmount ? parseInt(customAmount, 10).toLocaleString() : 'N'}
                </Button>
              </div>
            </form>

            {/* Mode selection (Replace vs Add) */}
            {!isPreselectedTarget && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-muted-foreground">
                <span>Selection Mode:</span>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded">
                  <button
                    type="button"
                    onClick={() => setMode('replace')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      mode === 'replace' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('append')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      mode === 'append' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Add to existing
                  </button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Counter & Clear Badge */}
      {!compact && selectedCount > 0 && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
          <Badge variant="default" className="h-8 px-2.5 text-xs font-semibold gap-1 bg-primary text-primary-foreground font-mono">
            <Check className="h-3.5 w-3.5" />
            {selectedCount.toLocaleString()} Selected
          </Badge>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deselect all {selectedCount.toLocaleString()} items</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
