"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckSquare, Shuffle, X, MousePointerClick, Layers, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

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
}

const PRESETS = [10, 25, 50, 100, 250];

export function CustomBulkSelectControl({
  allAvailableIds = [],
  selectedIds = [],
  onSelect,
  onClear,
  label = 'Leads',
  compact = false,
  requireAdmin = true,
  className = '',
}: CustomBulkSelectControlProps) {
  const { userProfile, isSuperAdmin } = useAuth();
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

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

  const totalAvailable = allAvailableIds.length;
  const selectedCount = selectedIds.length;

  const handleSelectCount = (count: number, isRandom = false) => {
    if (totalAvailable === 0) {
      toast({ title: 'No leads available', description: 'There are no leads in the current view to select.', variant: 'destructive' });
      return;
    }

    const targetCount = Math.min(Math.max(1, count), totalAvailable);
    let targetIds: string[] = [];

    if (isRandom) {
      // Shuffle copy of array and take N
      const shuffled = [...allAvailableIds].sort(() => 0.5 - Math.random());
      targetIds = shuffled.slice(0, targetCount);
    } else {
      // Top-down sequential N
      targetIds = allAvailableIds.slice(0, targetCount);
    }

    let finalIds: string[] = [];
    if (mode === 'append') {
      finalIds = Array.from(new Set([...selectedIds, ...targetIds]));
    } else {
      finalIds = targetIds;
    }

    onSelect(finalIds);
    setIsOpen(false);
    toast({
      title: `Selected ${targetIds.length} ${label}`,
      description: isRandom
        ? `Randomly selected ${targetIds.length} ${label.toLowerCase()} from current view.`
        : `Selected top ${targetIds.length} ${label.toLowerCase()} in current list order.`,
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

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 border-primary/40 hover:border-primary text-xs md:text-sm font-medium bg-background shadow-sm">
            <MousePointerClick className="h-4 w-4 text-primary shrink-0" />
            <span>Select Amount...</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 shadow-xl border-border bg-card" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Layers className="h-4 w-4 text-primary" />
                <span>Bulk Select {label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {totalAvailable.toLocaleString()} Available
              </Badge>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
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
                  className="text-xs px-2.5 h-7 font-semibold bg-primary/5 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground"
                >
                  All ({totalAvailable})
                </Button>
              </div>
            </div>

            {/* Custom Amount Form */}
            <form onSubmit={(e) => handleCustomSubmit(e, false)} className="space-y-2 pt-1">
              <span className="text-xs text-muted-foreground font-medium">Custom Quantity</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={totalAvailable || 99999}
                  placeholder={`e.g. 35 (max ${totalAvailable})`}
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
                  Select Random {customAmount || 'N'}
                </Button>
              </div>
            </form>

            {/* Mode selection (Replace vs Add) */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-muted-foreground">
              <span>Mode:</span>
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
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Counter & Clear Badge */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
          <Badge variant="default" className="h-8 px-2.5 text-xs font-semibold gap-1 bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
            {selectedCount} Selected
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
              <TooltipContent>Deselect all {selectedCount} items</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
