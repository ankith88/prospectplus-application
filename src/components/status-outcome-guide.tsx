"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  HelpCircle, 
  Search, 
  ArrowRight, 
  Workflow, 
  CheckCircle2, 
  Info, 
  X, 
  BookOpen 
} from 'lucide-react';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { STATUS_TO_OUTCOMES_MAP } from '@/lib/status-outcome-mapping';

interface StatusOutcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatusOutcomeGuideModal({ isOpen, onClose }: StatusOutcomeGuideModalProps) {
  const [search, setSearch] = useState('');

  const filteredStatuses = Object.entries(STATUS_TO_OUTCOMES_MAP).filter(([status, outcomes]) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesStatus = status.toLowerCase().includes(q);
    const matchesOutcome = outcomes.some(o => o.outcome.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q)));
    return matchesStatus || matchesOutcome;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 to-[#095c7b] text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6 text-sky-400" />
            <span>Lead Status & Outcome Trigger Guide</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Understanding how lead statuses transition automatically based on call outcomes logged by dialers.
          </DialogDescription>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search status or call outcome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-xs focus-visible:ring-sky-400"
            />
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredStatuses.length > 0 ? (
            filteredStatuses.map(([status, outcomes]) => (
              <Card key={status} className="border shadow-sm hover:border-slate-300 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={status as any} />
                      <span className="text-xs font-semibold text-slate-500">Target Lead Status</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {outcomes.length} Trigger Outcome{outcomes.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Triggered By Outcome{outcomes.length > 1 ? 's' : ''}:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {outcomes.map((o) => (
                        <div
                          key={o.outcome}
                          className="flex flex-col p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                            <span>{o.outcome}</span>
                          </div>
                          {o.reason && (
                            <span className="text-[10px] text-rose-600 font-medium mt-0.5">
                              Status Reason: {o.reason}
                            </span>
                          )}
                          {o.notes && (
                            <span className="text-[11px] text-muted-foreground mt-1 leading-tight">
                              {o.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground text-xs italic">
              No status or call outcome matches &quot;{search}&quot;.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StatusOutcomeBanner({ className = '' }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className={`p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-sky-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Status Outcome Guide</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-sky-100 text-sky-800 border-sky-300">
                Automated Rules
              </Badge>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5">
              Lead statuses transition automatically when dialers log specific call outcomes (e.g. Appointment Booked → Appointment Booked).
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-900 dark:text-sky-200 shrink-0"
        >
          <BookOpen className="h-3.5 w-3.5 mr-1.5 text-sky-600" />
          View Status-Outcome Map
        </Button>
      </div>

      <StatusOutcomeGuideModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function StatusOutcomeGuideButton({ className = '' }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className={`text-xs border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      >
        <HelpCircle className="h-3.5 w-3.5 mr-1.5 text-sky-600" />
        Status Guide
      </Button>

      <StatusOutcomeGuideModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
