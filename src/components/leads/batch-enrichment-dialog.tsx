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
  error?: string;
}

interface BatchEnrichmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  allLeads?: Lead[];
  requestorUid?: string;
  onComplete: (enrichedLeadIds: string[]) => void;
  autoStart?: boolean;
}

const CONCURRENCY = 3; // 3 parallel workers for instant real-time streaming updates and fast throughput

export function BatchEnrichmentDialog({
  isOpen,
  onOpenChange,
  leadIds,
  allLeads = [],
  requestorUid,
  onComplete,
  autoStart = true,
}: BatchEnrichmentDialogProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'stopped'>('idle');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [resultsLog, setResultsLog] = useState<EnrichedLeadResult[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentLeadName, setCurrentLeadName] = useState<string>('');

  const queueIndexRef = useRef(0);
  const activeWorkersRef = useRef(0);
  const inFlightMapRef = useRef<Map<string, string>>(new Map());
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalLeads = leadIds.length;
  const processedCount = successCount + failureCount;
  const progressPct = totalLeads > 0 ? Math.min(100, Math.round((processedCount / totalLeads) * 100)) : 0;
  const leadMap = useMemo(() => new Map(allLeads.map((l) => [l.id, l])), [allLeads]);

  // Update in-flight display label
  const updateInFlightPreview = () => {
    const names = Array.from(inFlightMapRef.current.values());
    if (names.length === 0) {
      setCurrentLeadName('');
    } else if (names.length === 1) {
      setCurrentLeadName(names[0]);
    } else {
      setCurrentLeadName(`${names[0]} (+${names.length - 1} more)`);
    }
  };

  // Auto-scroll the live feed as new results stream in
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [resultsLog, currentLeadName]);

  // Elapsed time counter
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Prevent accidental tab closing while actively running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'running') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  // Individual worker loop: processes 1 lead at a time and updates UI instantly upon completion
  const runWorker = useCallback(async () => {
    while (!isStoppedRef.current && !isPausedRef.current) {
      if (queueIndexRef.current >= leadIds.length) {
        break; // All leads have been assigned
      }

      const currentIdx = queueIndexRef.current;
      queueIndexRef.current += 1;

      const leadId = leadIds[currentIdx];
      const leadObj = leadMap.get(leadId);
      const displayName = leadObj?.companyName || `Lead #${leadId}`;

      inFlightMapRef.current.set(leadId, displayName);
      updateInFlightPreview();

      try {
        const response = await fetch('/api/admin/leads/batch-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadIds: [leadId],
            requestorUid,
          }),
        });

        const data = await response.json();
        const resultItem = data?.results?.[0];

        if (response.ok && data.success && resultItem) {
          const item: EnrichedLeadResult = {
            leadId,
            success: Boolean(resultItem.success),
            companyName: resultItem.companyName || displayName,
            ecommercePlatform: resultItem.ecommercePlatform,
            hasMultipleBranches: resultItem.hasMultipleBranches,
            totalBranchCount: resultItem.totalBranchCount,
            hasPoBox: resultItem.hasPoBox,
            industryCategory: resultItem.industryCategory || leadObj?.industryCategory,
            error: resultItem.error,
          };

          if (item.success) {
            setSuccessCount((prev) => prev + 1);
          } else {
            setFailureCount((prev) => prev + 1);
          }
          setResultsLog((prev) => [...prev, item]);
        } else {
          setFailureCount((prev) => prev + 1);
          setResultsLog((prev) => [
            ...prev,
            {
              leadId,
              success: false,
              companyName: displayName,
              error: data?.error || 'Enrichment failed',
            },
          ]);
        }
      } catch (err: any) {
        setFailureCount((prev) => prev + 1);
        setResultsLog((prev) => [
          ...prev,
          {
            leadId,
            success: false,
            companyName: displayName,
            error: err.message || 'Request failed',
          },
        ]);
      } finally {
        inFlightMapRef.current.delete(leadId);
        updateInFlightPreview();
      }
    }

    activeWorkersRef.current -= 1;

    // Check if all active workers have finished
    if (activeWorkersRef.current <= 0) {
      activeWorkersRef.current = 0;
      if (isStoppedRef.current) {
        setStatus('stopped');
        setCurrentLeadName('');
      } else if (isPausedRef.current) {
        setStatus('paused');
      } else if (queueIndexRef.current >= leadIds.length) {
        setStatus('completed');
        setCurrentLeadName('');
      }
    }
  }, [leadIds, leadMap, requestorUid]);

  // Launch workers
  const startProcessing = useCallback(() => {
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setStatus('running');

    const remaining = leadIds.length - queueIndexRef.current;
    if (remaining <= 0) {
      setStatus('completed');
      return;
    }

    const workersToSpawn = Math.min(CONCURRENCY, remaining);
    activeWorkersRef.current = workersToSpawn;

    for (let i = 0; i < workersToSpawn; i++) {
      runWorker();
    }
  }, [leadIds.length, runWorker]);

  // Reset & start when dialog opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      queueIndexRef.current = 0;
      activeWorkersRef.current = 0;
      inFlightMapRef.current.clear();
      setSuccessCount(0);
      setFailureCount(0);
      setResultsLog([]);
      setElapsedSeconds(0);
      setCurrentLeadName('');
      isPausedRef.current = false;
      isStoppedRef.current = false;

      if (autoStart && leadIds.length > 0) {
        setStatus('running');
        const startTimer = setTimeout(() => {
          startProcessing();
        }, 150);
        return () => clearTimeout(startTimer);
      } else {
        setStatus('idle');
      }
    } else if (!isOpen) {
      wasOpenRef.current = false;
      isStoppedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, autoStart, leadIds.length, startProcessing]);

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

  // Estimate Remaining Time (ETA) - accurate countdown starting from the very 1st completed lead
  const calculateEta = () => {
    if (processedCount === 0 || elapsedSeconds < 2) return 'Calculating...';
    const wallClockSecsPerLead = elapsedSeconds / processedCount;
    const remainingLeads = totalLeads - processedCount;
    const estRemainingSeconds = Math.max(0, Math.round(wallClockSecsPerLead * remainingLeads));
    return formatTime(estRemainingSeconds);
  };

  const handleStart = () => {
    startProcessing();
  };

  const handlePause = () => {
    isPausedRef.current = true;
    if (activeWorkersRef.current <= 0) {
      setStatus('paused');
    }
  };

  const handleResume = () => {
    startProcessing();
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setStatus('stopped');
    setCurrentLeadName('');
  };

  const handleFinish = () => {
    const successfulIds = resultsLog.filter((r) => r.success).map((r) => r.leadId);
    onComplete(successfulIds);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (status === 'running') {
      if (confirm('Batch enrichment is currently running. Are you sure you want to stop?')) {
        handleStop();
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        onInteractOutside={(e) => {
          if (status === 'running') e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (status === 'running') e.preventDefault();
        }}
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
                    {status === 'running' && 'Analyzing in Progress'}
                    {status === 'paused' && 'Paused'}
                    {status === 'completed' && 'Completed'}
                    {status === 'stopped' && 'Stopped'}
                    {status === 'idle' && 'Ready'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Automated eCommerce platform detection, Australian multi-branch extraction, PO Box isolation, and cold-call intelligence.
                </DialogDescription>
              </div>
            </div>
            {status === 'running' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] hidden sm:flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-amber-600" />
                Keep tab open
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* Progress Bar & Percentage Header */}
          <div className="space-y-1.5 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#095c7b]" />}
                <span>Progress: {processedCount.toLocaleString()} / {totalLeads.toLocaleString()} Leads</span>
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
                {processedCount} <span className="text-xs font-normal text-slate-400">/ {totalLeads}</span>
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
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Analyzing first batch of leads...</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Probing websites, eCommerce platforms, and Australian multi-branches.
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mb-1.5 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">Ready to enrich {totalLeads} selected leads.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click &quot;Start Batch Enrichment&quot; below to begin.
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.companyName}
                        </p>
                        {item.error ? (
                          <p className="text-[10px] text-rose-500 truncate">{item.error}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.industryCategory || 'Enriched'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {item.ecommercePlatform && item.ecommercePlatform !== 'No' && item.ecommercePlatform !== 'Not Detected' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5 py-0">
                          <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                          {item.ecommercePlatform}
                        </Badge>
                      )}

                      {item.hasMultipleBranches && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] px-1.5 py-0">
                          <Building2 className="w-2.5 h-2.5 mr-1" />
                          {item.totalBranchCount || 2}+ Sites
                        </Badge>
                      )}

                      {item.hasPoBox && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
                          <Mail className="w-2.5 h-2.5 mr-1" />
                          PO Box
                        </Badge>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        #{item.leadId}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {status === 'idle' && (
              <Button
                type="button"
                onClick={handleStart}
                className="bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Batch Enrichment ({totalLeads})
              </Button>
            )}

            {status === 'running' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePause}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  className="font-semibold flex items-center gap-1.5"
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
                  onClick={handleResume}
                  className="bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Resume Enrichment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStop}
                  className="text-slate-600 font-semibold flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" />
                  Finish Processed ({successCount})
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {(status === 'completed' || status === 'stopped') && (
              <Button
                type="button"
                onClick={handleFinish}
                className="bg-[#095c7b] hover:bg-[#074b64] text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Users className="w-4 h-4" />
                Proceed to Distribute Leads ({successCount})
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-slate-500 hover:text-slate-800 text-xs"
            >
              {status === 'completed' || status === 'stopped' ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
