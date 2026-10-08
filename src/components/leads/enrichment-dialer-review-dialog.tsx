'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  Users,
  Shuffle,
  CheckCircle2,
  Building2,
  Loader2,
  UserCheck,
  Check,
  Layers,
} from 'lucide-react';
import type { Lead, UserProfile } from '@/lib/types';

interface EnrichmentDialerReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enrichedLeads: Lead[];
  allDialers: UserProfile[];
  onConfirmReassignment: (
    assignments: Array<{ leadId: string; targetDialer: string }>
  ) => Promise<void>;
  onSkip: () => void;
}

export function EnrichmentDialerReviewDialog({
  isOpen,
  onOpenChange,
  enrichedLeads,
  allDialers,
  onConfirmReassignment,
  onSkip,
}: EnrichmentDialerReviewDialogProps) {
  const [selectedDialerNames, setSelectedDialerNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeadsList, setShowLeadsList] = useState(false);

  // Filter to active dialers only
  const activeDialers = useMemo(() => {
    return allDialers.filter(u => {
      if (u.disabled) return false;
      const roles = (u.assignedRoles || []).map(r => String(r).toLowerCase());
      const role = String(u.role || u.activeRole || '').toLowerCase();
      const dialerRoles = ['user', 'dialer', 'dialers', 'lead gen', 'lead_gen', 'leadgen', 'outbound rep'];
      return dialerRoles.includes(role) || roles.some(r => dialerRoles.includes(r));
    });
  }, [allDialers]);

  // Pre-select all active dialers by default when dialog opens
  useEffect(() => {
    if (isOpen && activeDialers.length > 0) {
      const names = activeDialers
        .map(u => u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || '')
        .filter(Boolean);
      setSelectedDialerNames(names);
    }
  }, [isOpen, activeDialers]);

  const toggleDialer = (name: string) => {
    setSelectedDialerNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    const allNames = activeDialers
      .map(u => u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || '')
      .filter(Boolean);
    setSelectedDialerNames(allNames);
  };

  const handleClearAll = () => {
    setSelectedDialerNames([]);
  };

  // Compute equal distribution preview counts
  const distributionPreview = useMemo(() => {
    if (selectedDialerNames.length === 0 || enrichedLeads.length === 0) return [];

    const totalLeads = enrichedLeads.length;
    const dialerCount = selectedDialerNames.length;
    const baseCount = Math.floor(totalLeads / dialerCount);
    const remainder = totalLeads % dialerCount;

    return selectedDialerNames.map((name, idx) => ({
      name,
      count: baseCount + (idx < remainder ? 1 : 0),
    }));
  }, [selectedDialerNames, enrichedLeads]);

  const handleAssign = async () => {
    if (selectedDialerNames.length === 0 || enrichedLeads.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Randomly shuffle enriched leads
      const shuffledLeads = [...enrichedLeads].sort(() => Math.random() - 0.5);

      // 2. Randomly shuffle selected dialers
      const shuffledDialers = [...selectedDialerNames].sort(() => Math.random() - 0.5);

      // 3. Round-robin assign leads equally across selected dialers
      const assignments: Array<{ leadId: string; targetDialer: string }> = shuffledLeads.map(
        (lead, index) => ({
          leadId: lead.id,
          targetDialer: shuffledDialers[index % shuffledDialers.length],
        })
      );

      await onConfirmReassignment(assignments);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-[#095c7b] via-[#0b6d91] to-[#04435b] text-white p-6 pb-5">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                  <Sparkles className="h-5 w-5 text-teal-300" />
                </div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Enrichment Complete — Random & Equal Dialer Assignment
                </DialogTitle>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                {enrichedLeads.length} Lead{enrichedLeads.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <DialogDescription className="text-white/80 text-sm leading-relaxed">
              AI enrichment has completed. Select one or more active Inside Dialers below to randomly and equally distribute the enriched leads across them.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Header & Quick Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#095c7b] dark:text-teal-400" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Select Active Dialers ({selectedDialerNames.length} of {activeDialers.length} selected)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-7 text-[#095c7b] hover:bg-[#095c7b]/10 dark:text-teal-300 font-medium"
              >
                Select All
              </Button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-7 text-slate-500 hover:bg-slate-100 dark:text-slate-400 font-medium"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Dialers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeDialers.map(dialer => {
              const name =
                dialer.displayName ||
                `${dialer.firstName || ''} ${dialer.lastName || ''}`.trim() ||
                dialer.name ||
                dialer.email;
              const isSelected = selectedDialerNames.includes(name);

              return (
                <div
                  key={dialer.uid}
                  onClick={() => toggleDialer(name)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#095c7b] ring-1 ring-[#095c7b] dark:bg-blue-950/30 dark:border-teal-500 dark:ring-teal-500/50'
                      : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-[#095c7b] text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {dialer.email}
                      </p>
                    </div>
                  </div>

                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleDialer(name)}
                    className="ml-2 data-[state=checked]:bg-[#095c7b] data-[state=checked]:border-[#095c7b]"
                  />
                </div>
              );
            })}
          </div>

          {/* Allocation Breakdown Card */}
          {selectedDialerNames.length > 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-[#095c7b] dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Equal Allocation Breakdown
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-white dark:bg-slate-800">
                  ~{Math.round(enrichedLeads.length / selectedDialerNames.length)} leads / dialer
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {distributionPreview.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs"
                  >
                    <span className="truncate max-w-[140px] font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    <Badge className="bg-[#095c7b]/10 text-[#095c7b] dark:bg-teal-950 dark:text-teal-300 border-none font-bold text-[11px] px-1.5 py-0">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 text-center text-xs text-amber-800 dark:text-amber-300">
              Please select at least one dialer to distribute the enriched leads.
            </div>
          )}

          {/* Collapsible Enriched Leads Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLeadsList(!showLeadsList)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                <span>View Enriched Leads ({enrichedLeads.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {showLeadsList ? 'Hide details ▲' : 'Show details ▼'}
              </span>
            </button>

            {showLeadsList && (
              <div className="p-3 max-h-40 overflow-y-auto space-y-1.5 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {enrichedLeads.map(l => (
                  <div key={l.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[300px]">
                      {l.companyName}
                    </span>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>{l.address?.city || l.address?.state || 'Unknown Territory'}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {l.industryCategory || 'Enriched'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedDialerNames.length} dialer{selectedDialerNames.length === 1 ? '' : 's'} selected
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSkip}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Skip Assignment
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={isSubmitting || selectedDialerNames.length === 0}
              className="bg-[#095c7b] hover:bg-[#07475f] text-white text-xs h-9 font-semibold px-4 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning Leads...
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Randomly & Equally Assign ({enrichedLeads.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
