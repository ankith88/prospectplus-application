'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  StopCircle,
  Play,
  User,
  Users,
  ExternalLink,
  Loader2,
  Layers,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface EnrichmentBatchRecord {
  id: string;
  status: 'running' | 'paused' | 'completed' | 'stopped' | string;
  totalLeads: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  requestorUid: string | null;
  requestorName: string;
  requestorEmail: string;
  assignedDialers: string[];
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

interface AdminEnrichmentBatchesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLiveBatch: (jobId: string) => void;
}

export function AdminEnrichmentBatchesDialog({
  isOpen,
  onOpenChange,
  onOpenLiveBatch,
}: AdminEnrichmentBatchesDialogProps) {
  const [batches, setBatches] = useState<EnrichmentBatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBatches = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/admin/leads/batch-enrich/job?list=true');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setBatches(data.jobs);
      }
    } catch (err) {
      console.error('Failed to load enrichment batches:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen, fetchBatches]);

  // Auto-refresh when any batch is running
  useEffect(() => {
    if (!isOpen) return;
    const hasRunning = batches.some((b) => b.status === 'running');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchBatches(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, batches, fetchBatches]);

  const activeCount = batches.filter((b) => b.status === 'running' || b.status === 'paused').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#095c7b] via-[#0b6d91] to-[#04435b] text-white p-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                <Layers className="h-5 w-5 text-teal-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  AI Lead Enrichment Batch Monitor
                  {activeCount > 0 && (
                    <Badge className="bg-emerald-500/25 text-emerald-200 border-emerald-400/40 text-[11px] animate-pulse">
                      {activeCount} Active
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs mt-1">
                  Real-time monitoring of all autonomous AI enrichment batches running in the cloud.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBatches(true)}
              disabled={loading || isRefreshing}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Batches List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#095c7b]" />
              <p className="text-xs">Loading enrichment batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed rounded-xl p-8">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No enrichment batches found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Select leads on the Outbound Leads page and click &quot;AI Enrich Leads&quot; to start a batch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const total = batch.totalLeads || 0;
                const processed = batch.processedCount || 0;
                const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
                const isLive = batch.status === 'running';
                const isPaused = batch.status === 'paused';
                const isCompleted = batch.status === 'completed';
                const isStopped = batch.status === 'stopped';

                const timeAgo = batch.createdAt
                  ? formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })
                  : 'recently';
                const formattedDate = batch.createdAt
                  ? format(new Date(batch.createdAt), 'PPpp')
                  : 'N/A';

                return (
                  <div
                    key={batch.id}
                    className={cn(
                      'border rounded-xl p-4 transition-all duration-200 bg-white dark:bg-slate-800/80 shadow-xs',
                      isLive && 'border-[#095c7b]/40 ring-1 ring-[#095c7b]/30 bg-blue-50/30 dark:bg-blue-950/20',
                      isPaused && 'border-amber-300 bg-amber-50/20',
                      isCompleted && 'border-slate-200 dark:border-slate-700/80'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {/* Left: Requestor & Metadata */}
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                            isLive && 'bg-[#095c7b] text-white animate-pulse',
                            isPaused && 'bg-amber-500 text-white',
                            isCompleted && 'bg-emerald-600 text-white',
                            isStopped && 'bg-slate-400 text-white'
                          )}
                        >
                          {batch.requestorName ? batch.requestorName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              Started by {batch.requestorName}
                            </span>
                            {batch.requestorEmail && (
                              <span className="text-xs text-slate-400 font-normal">
                                ({batch.requestorEmail})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span title={formattedDate}>{timeAgo}</span>
                            <span>&bull;</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              Batch #{batch.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Action Button */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-semibold px-2.5 py-0.5 capitalize',
                            isLive && 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 animate-pulse',
                            isPaused && 'bg-amber-50 text-amber-700 border-amber-300',
                            isCompleted && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                            isStopped && 'bg-slate-100 text-slate-600 border-slate-300'
                          )}
                        >
                          {isLive && 'Active (Running)'}
                          {isPaused && 'Paused'}
                          {isCompleted && 'Completed'}
                          {isStopped && 'Stopped'}
                        </Badge>

                        <Button
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            onOpenLiveBatch(batch.id);
                          }}
                          className="bg-[#095c7b] hover:bg-[#07475f] text-white text-xs h-8 font-semibold shadow-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View Live View
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar & Metric Counters */}
                    <div className="pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Progress: <strong>{processed}</strong> of <strong>{total}</strong> leads ({percent}%)
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600 font-semibold">
                            ✓ {batch.successCount} Enriched
                          </span>
                          {batch.failureCount > 0 && (
                            <span className="text-amber-600 font-semibold">
                              ⚠️ {batch.failureCount} Skipped
                            </span>
                          )}
                        </div>
                      </div>

                      <Progress value={percent} className="h-2 bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
