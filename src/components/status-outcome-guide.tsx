"use client";

import React, { useState, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  Search, 
  Workflow, 
  CheckCircle2, 
  BookOpen,
  Sparkles,
  Layers,
  PhoneCall,
  XCircle,
  Info
} from 'lucide-react';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { 
  STATUS_TO_OUTCOMES_MAP, 
  WORKFLOW_STATUS_EXPLANATIONS,
  getOutcomesForStatus,
  type OutcomeInfo 
} from '@/lib/status-outcome-mapping';
import type { LeadStatus } from '@/lib/types';

interface StatusOutcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StatusGuideItem {
  status: string;
  category: 'Automated Call Outcome' | 'Sales Pipeline Workflow' | 'Disqualified & Lost';
  description: string;
  outcomes: OutcomeInfo[];
}

export function StatusOutcomeGuideModal({ isOpen, onClose }: StatusOutcomeGuideModalProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'automated' | 'workflow' | 'lost'>('all');

  const allGuideItems: StatusGuideItem[] = useMemo(() => {
    // Combine all statuses from STATUS_TO_OUTCOMES_MAP and WORKFLOW_STATUS_EXPLANATIONS
    const statusSet = new Set<string>([
      ...Object.keys(STATUS_TO_OUTCOMES_MAP),
      ...Object.keys(WORKFLOW_STATUS_EXPLANATIONS)
    ]);

    const items: StatusGuideItem[] = [];

    statusSet.forEach((status) => {
      const outcomes = getOutcomesForStatus(status);
      const meta = WORKFLOW_STATUS_EXPLANATIONS[status];

      let category: StatusGuideItem['category'] = 'Sales Pipeline Workflow';
      if (meta?.category) {
        category = meta.category;
      } else if (outcomes.length > 0) {
        category = status === 'Lost' ? 'Disqualified & Lost' : 'Automated Call Outcome';
      }

      items.push({
        status,
        category,
        description: meta?.description || (outcomes.length > 0 
          ? `Lead transitions to '${status}' automatically when specific dialer call outcomes are logged.` 
          : `Status '${status}' is managed manually or by system workflows.`),
        outcomes
      });
    });

    return items;
  }, []);

  const filteredItems = useMemo(() => {
    return allGuideItems.filter((item) => {
      // Tab filter
      if (activeTab === 'automated' && item.category !== 'Automated Call Outcome') return false;
      if (activeTab === 'workflow' && item.category !== 'Sales Pipeline Workflow') return false;
      if (activeTab === 'lost' && item.category !== 'Disqualified & Lost') return false;

      // Search query filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchesStatus = item.status.toLowerCase().includes(q);
      const matchesDesc = item.description.toLowerCase().includes(q);
      const matchesOutcome = item.outcomes.some(
        o => o.outcome.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q)) || (o.reason && o.reason.toLowerCase().includes(q))
      );

      return matchesStatus || matchesDesc || matchesOutcome;
    });
  }, [allGuideItems, search, activeTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-[#095c7b] to-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Workflow className="h-6 w-6 text-sky-400" />
              <span>Lead Status & Outcome Trigger Guide</span>
            </DialogTitle>
            <Badge variant="outline" className="border-sky-300/40 text-sky-200 bg-sky-950/40 text-[10px]">
              Prospect+ Engine Rules
            </Badge>
          </div>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Comprehensive reference of how lead statuses update automatically via dialer call outcomes or sales pipeline workflows.
          </DialogDescription>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search status, outcome, or rule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-xs focus-visible:ring-sky-400"
              />
            </div>
            
            <Tabs 
              value={activeTab} 
              onValueChange={(val) => setActiveTab(val as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-white/10 p-0.5 border border-white/15 text-white h-9 grid grid-cols-4 text-[10px]">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 py-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="automated" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 py-1">
                  Automated
                </TabsTrigger>
                <TabsTrigger value="workflow" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 py-1">
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="lost" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 py-1">
                  Lost
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Card key={item.status} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-all bg-white dark:bg-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={item.status as LeadStatus} />
                      <span className="text-[11px] font-semibold text-slate-400">Target Lead Status</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.category === 'Automated Call Outcome' && (
                        <Badge variant="secondary" className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <PhoneCall className="h-3 w-3 mr-1 text-sky-600" />
                          Automated Outcome
                        </Badge>
                      )}
                      {item.category === 'Sales Pipeline Workflow' && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                          <Layers className="h-3 w-3 mr-1 text-emerald-600" />
                          Workflow & Actions
                        </Badge>
                      )}
                      {item.category === 'Disqualified & Lost' && (
                        <Badge variant="outline" className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                          <XCircle className="h-3 w-3 mr-1 text-rose-600" />
                          Disqualified / Lost
                        </Badge>
                      )}

                      {item.outcomes.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.outcomes.length} Trigger Outcome{item.outcomes.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  {item.outcomes.length > 0 ? (
                    <div className="pt-1 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Triggered By Outcome{item.outcomes.length > 1 ? 's' : ''}:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.outcomes.map((o) => (
                          <div
                            key={o.outcome}
                            className="flex flex-col p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                              <span>{o.outcome}</span>
                            </div>
                            {o.reason && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                                NetSuite Status Reason: {o.reason}
                              </span>
                            )}
                            {o.notes && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                                {o.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                      <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span>This status is updated via sales actions (e.g. scheduling a booking, generating SCF links, or starting trials).</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No lead status or outcome matches &quot;{search}&quot;.
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
      <div className={`p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-sky-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#095c7b] text-white flex items-center justify-center shrink-0 shadow-md">
            <Workflow className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Lead Status & Outcome Trigger Guide</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-sky-100 text-sky-800 border-sky-300">
                Automated Rules
              </Badge>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5">
              Lead statuses transition automatically when dialers log specific call outcomes (e.g. Call Back/Follow-up → High Touch).
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-950 dark:text-sky-200 shrink-0 font-medium shadow-xs"
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

