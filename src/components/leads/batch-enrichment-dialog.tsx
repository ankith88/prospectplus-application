'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Building2,
  Mail,
  Loader2,
  ShoppingBag,
  ExternalLink,
  Users,
  Cloud,
  Check,
  Minimize2,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/types';

export interface EnrichedLeadResult {
  leadId: string;
  success: boolean;
  companyName?: string;
  ecommercePlatform?: string;
  hasMultipleBranches?: boolean;
  totalBranchCount?: number;
  hasPoBox?: boolean;
  industryCategory?: string;
  decisionMakersCount?: number;
  carriersDetected?: string[];
  error?: string;
}

interface BatchEnrichmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string | null;
  leadIds?: string[];
  allLeads?: Lead[];
  requestorUid?: string;
  onComplete: (enrichedLeadIds: string[]) => void;
  autoStart?: boolean;
}

const CONCURRENCY = 6;

export function BatchEnrichmentDialog({
  isOpen,
  onOpenChange,
  jobId,
  leadIds = [],
  allLeads = [],
  requestorUid,
  onComplete,
  autoStart = true,
}: BatchEnrichmentDialogProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'stopped'>('idle');
  const [totalLeadsCount, setTotalLeadsCount] = useState(leadIds.length);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [resultsLog, setResultsLog] = useState<EnrichedLeadResult[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentLeadName, setCurrentLeadName] = useState<string>('');
  const [isActionPending, setIsActionPending] = useState(false);

  const logScrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Real clock timestamp anchors to prevent background tab timer drift
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);
  const completionTimestampsRef = useRef<number[]>([]);

  // Local client execution refs (fallback if no server jobId)
  const queueIndexRef = useRef(0);
  const activeWorkersRef = useRef(0);
  const inFlightMapRef = useRef<Map<string, string>>(new Map());
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  const leadMap = useMemo(() => new Map(allLeads.map((l) => [l.id, l])), [allLeads]);
  const effectiveTotal = totalLeadsCount > 0 ? totalLeadsCount : leadIds.length;
  const progressPct = effectiveTotal > 0 ? Math.min(100, Math.round((processedCount / effectiveTotal) * 100)) : 0;

  // Auto-scroll the live feed as new results stream in
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [resultsLog, currentLeadName]);

  // Elapsed time counter anchored to Date.now()
  useEffect(() => {
    const updateRealElapsedTime = () => {
      if (startTimeRef.current && status === 'running') {
        const currentPaused = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
        const netMs = Date.now() - startTimeRef.current - totalPausedMsRef.current - currentPaused;
        setElapsedSeconds(Math.max(0, Math.floor(netMs / 1000)));
      }
    };

    if (status === 'running') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      } else if (pausedAtRef.current) {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }

      timerRef.current = setInterval(updateRealElapsedTime, 500);

      const handleVisibilityChange = () => {
        if (!document.hidden) updateRealElapsedTime();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else if (status === 'paused') {
      if (!pausedAtRef.current) {
        pausedAtRef.current = Date.now();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // ==========================================
  // SERVER BACKGROUND JOB MODE (jobId present)
  // ==========================================
  const pollServerJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await fetch(`/api/admin/leads/batch-enrich/job?jobId=${encodeURIComponent(jobId)}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !data.job) return;

      const job = data.job;
      if (job.totalLeads) setTotalLeadsCount(job.totalLeads);
      if (typeof job.processedCount === 'number') setProcessedCount(job.processedCount);
      if (typeof job.successCount === 'number') setSuccessCount(job.successCount);
      if (typeof job.failureCount === 'number') setFailureCount(job.failureCount);

      if (Array.isArray(job.recentResults)) {
        setResultsLog(job.recentResults);
        if (job.recentResults.length > 0 && job.status === 'running') {
          setCurrentLeadName(job.recentResults[0]?.companyName || '');
        }
      }

      if (job.status) {
        setStatus(job.status);
      }

      // Record completion timestamp for rolling ETA calculation
      if (job.processedCount > 0) {
        completionTimestampsRef.current.push(Date.now());
        if (completionTimestampsRef.current.length > 15) {
          completionTimestampsRef.current.shift();
        }
      }
    } catch (err) {
      console.error('Failed to poll background enrichment job:', err);
    }
  }, [jobId]);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    // Immediately poll once
    pollServerJob();

    // Poll every 1.5 seconds while open
    pollIntervalRef.current = setInterval(pollServerJob, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, jobId, pollServerJob]);

  // Server Job Control Actions
  const handleServerAction = async (action: 'pause' | 'resume' | 'stop') => {
    if (!jobId) return;
    setIsActionPending(true);
    try {
      const res = await fetch('/api/admin/leads/batch-enrich/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobId,
          requestorUid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'pause') setStatus('paused');
        if (action === 'resume') setStatus('running');
        if (action === 'stop') setStatus('stopped');
      }
    } catch (err) {
      console.error(`Failed to ${action} job:`, err);
    } finally {
      setIsActionPending(false);
      pollServerJob();
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Estimate Remaining Time (ETA)
  const calculateEta = () => {
    if (processedCount === 0 || elapsedSeconds < 2) return 'Calculating...';
    const remainingLeads = effectiveTotal - processedCount;
    if (remainingLeads <= 0) return '0s';

    const timestamps = completionTimestampsRef.current;
    if (timestamps.length >= 3) {
      const oldest = timestamps[0];
      const newest = timestamps[timestamps.length - 1];
      const spanMs = newest - oldest;
      const count = timestamps.length - 1;
      if (spanMs > 0 && count > 0) {
        const rollingSecsPerLead = (spanMs / count) / 1000;
        const estSecs = Math.max(0, Math.round(rollingSecsPerLead * remainingLeads));
        return formatTime(estSecs);
      }
    }

    const wallClockSecsPerLead = elapsedSeconds / processedCount;
    const estRemainingSeconds = Math.max(0, Math.round(wallClockSecsPerLead * remainingLeads));
    return formatTime(estRemainingSeconds);
  };

  const handleFinish = () => {
    const successfulIds = resultsLog.filter((r) => r.success).map((r) => r.leadId);
    onComplete(successfulIds);
    onOpenChange(false);
  };

  const handleClose = () => {
    // Closing the modal does not kill the server background job!
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl sm:max-w-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]"
      >
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] dark:text-[#38bdf8] rounded-xl">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  AI Lead Batch Enrichment
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider',
                      status === 'running' && 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 animate-pulse',
                      status === 'paused' && 'bg-amber-50 text-amber-700 border-amber-300',
                      status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                      status === 'stopped' && 'bg-slate-100 text-slate-700 border-slate-300',
                      status === 'idle' && 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {status === 'running' && 'Analyzing in Cloud'}
                    {status === 'paused' && 'Paused'}
                    {status === 'completed' && 'Completed'}
                    {status === 'stopped' && 'Stopped'}
                    {status === 'idle' && 'Starting'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Automated eCommerce platform detection, live Agent Reach carrier &amp; LinkedIn decision makers discovery, PO Box isolation, and cold-call intelligence.
                </DialogDescription>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[11px] hidden sm:flex items-center gap-1 font-medium">
              <Cloud className="w-3 h-3 text-sky-600" />
              Cloud Autonomous &bull; Safe to Walk Away
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* Progress Bar & Percentage Header */}
          <div className="space-y-1.5 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#095c7b]" />}
                <span>Progress: {processedCount.toLocaleString()} / {effectiveTotal.toLocaleString()} Leads</span>
              </span>
              <span className="text-[#095c7b] dark:text-[#38bdf8] font-bold text-sm">
                {progressPct}%
              </span>
            </div>

            <Progress value={progressPct} className="h-3 bg-slate-200 dark:bg-slate-700" />

            {status === 'running' && currentLeadName && (
              <p className="text-[11px] text-slate-500 truncate pt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Currently analyzing:</span> {currentLeadName}
              </p>
            )}
          </div>

          {/* Real-Time Metrics 4-Box Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {processedCount} <span className="text-xs font-normal text-slate-400">/ {effectiveTotal}</span>
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Successful</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {successCount}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Elapsed Time</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatTime(elapsedSeconds)}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-200/70 dark:border-sky-900/50 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Est. Remaining</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-400 mt-0.5">
                {status === 'completed' ? '0s' : calculateEta()}
              </p>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
              <span>Live Analysis Stream ({resultsLog.length})</span>
              {failureCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                  {failureCount} lead(s) skipped/errored
                </span>
              )}
            </div>

            <div
              ref={logScrollRef}
              className="h-56 overflow-y-auto bg-slate-50/70 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-1.5 font-sans"
            >
              {resultsLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                  {status === 'running' ? (
                    <>
                      <Loader2 className="w-6 h-6 mb-2 text-[#095c7b] animate-spin" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Analyzing leads in the background...</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Probing websites, eCommerce platforms, and Australian multi-branches.
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mb-1.5 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">Enriching {effectiveTotal} selected leads.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Processing autonomously in the cloud.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                resultsLog.map((item, idx) => (
                  <div
                    key={`${item.leadId}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-100 dark:border-slate-700/80 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                          {item.companyName || `Lead #${item.leadId.slice(0, 6)}`}
                        </p>
                        {item.success ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                            {item.ecommercePlatform && item.ecommercePlatform !== 'No' && (
                              <span className="inline-flex items-center gap-0.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1 rounded font-medium">
                                <ShoppingBag className="w-2.5 h-2.5" />
                                {item.ecommercePlatform}
                              </span>
                            )}
                            {item.hasMultipleBranches && (
                              <span className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1 rounded font-medium">
                                <Building2 className="w-2.5 h-2.5" />
                                {item.totalBranchCount ? `${item.totalBranchCount} Branches` : 'Multi-Branch'}
                              </span>
                            )}
                            {item.hasPoBox && (
                              <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 rounded font-medium">
                                <Mail className="w-2.5 h-2.5" />
                                PO Box
                              </span>
                            )}
                            {item.decisionMakersCount !== undefined && item.decisionMakersCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-1 rounded font-medium">
                                <Users className="w-2.5 h-2.5" />
                                {item.decisionMakersCount} Contact{item.decisionMakersCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.carriersDetected && item.carriersDetected.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded font-medium">
                                <Truck className="w-2.5 h-2.5" />
                                {item.carriersDetected.join(', ')}
                              </span>
                            )}
                            {item.industryCategory && (
                              <span className="text-slate-400">
                                &bull; {item.industryCategory}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[280px]">
                            {item.error || 'Skipped'}
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0 shrink-0 font-medium',
                        item.success
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {item.success ? 'Enriched' : 'Skipped'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {status === 'running' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => handleServerAction('pause')}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5 text-xs h-9"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => handleServerAction('stop')}
                  className="font-semibold flex items-center gap-1.5 text-xs h-9"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop & Keep ({successCount})
                </Button>
              </>
            )}

            {status === 'paused' && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => handleServerAction('resume')}
                  className="bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs h-9"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Resume Enrichment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => handleServerAction('stop')}
                  className="text-slate-600 font-semibold flex items-center gap-1.5 text-xs h-9"
                >
                  <Square className="w-3.5 h-3.5" />
                  Finish Processed ({successCount})
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {status === 'running' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs h-9 border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300 font-semibold flex items-center gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Run in Background (Safe to Walk Away)
              </Button>
            )}

            {(status === 'completed' || status === 'stopped') && (
              <Button
                type="button"
                size="sm"
                onClick={handleFinish}
                className="bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs h-9"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done & Refresh Leads ({successCount} Enriched)
              </Button>
            )}

            {status !== 'running' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-800 text-xs h-9"
              >
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
