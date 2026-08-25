"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { AccessDenied } from '@/components/access-denied';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { CancellationRequest, ServiceSelection, normalizeRetentionStrategy, RETENTION_STRATEGIES } from '@/lib/types';
import { 
  getCancellationTypeInfo, 
  CANCELLATION_TYPE_CONFIG, 
  CancellationType 
} from '@/lib/cancellation-reasons-mapper';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { 
  TrendingDown, 
  TrendingUp, 
  Smile, 
  ShieldAlert, 
  DollarSign, 
  HelpCircle, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  Layers, 
  BarChart2, 
  PieChart as PieChartIcon, 
  CheckCircle2, 
  Building,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Tag,
  Award,
  CalendarDays,
  Bot
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { fetch3MonthAvgInvoiceMRR } from '@/lib/cancellation-invoice-helper';
import { useToast } from '@/hooks/use-toast';

export const safeFormatDate = (dateStr?: string | null, formatPattern: string = 'dd MMM yyyy', fallback: string = 'N/A'): string => {
  if (!dateStr || typeof dateStr !== 'string') return fallback;
  try {
    let dt = parseISO(dateStr);
    if (isNaN(dt.getTime())) {
      dt = new Date(dateStr);
    }
    if (isNaN(dt.getTime())) {
      return fallback;
    }
    return format(dt, formatPattern);
  } catch {
    return fallback;
  }
};

export const calculateMRR = (services: ServiceSelection[]) => {
  if (!services || !Array.isArray(services) || services.length === 0) return 0;
  let mrr = 0;
  for (const service of services) {
    if (!service || !service.rate) continue;
    const rate = Number(service.rate) || 0;
    if (service.frequency === 'Adhoc') {
      mrr += rate * 1;
    } else if (Array.isArray(service.frequency)) {
      const weeklyDays = service.frequency.length;
      if (weeklyDays > 0) {
        mrr += rate * weeklyDays * 4.33;
      }
    } else if (typeof service.frequency === 'number') {
      mrr += rate * service.frequency * 4.33;
    }
  }
  return mrr;
};

export const getLostMRR = (r: CancellationRequest): number => {
  if (r.avg3MonthInvoiceMRR !== undefined && r.avg3MonthInvoiceMRR !== null && r.avg3MonthInvoiceMRR > 0) {
    return r.avg3MonthInvoiceMRR;
  }
  if (r.originalMRR !== undefined && r.originalMRR !== null && r.originalMRR > 0) {
    return r.originalMRR;
  }
  if (r.isSignedCustomer) {
    return r.avg3MonthInvoiceMRR ?? 0;
  }
  return calculateMRR(r.originalServices);
};

export const getSavedMRR = (r: CancellationRequest): number => {
  if (r.savedMRR !== undefined && r.savedMRR !== null && r.savedMRR > 0) {
    return r.savedMRR;
  }
  if (r.newInvoiceMRR !== undefined && r.newInvoiceMRR !== null && r.newInvoiceMRR > 0) {
    return r.newInvoiceMRR;
  }
  return calculateMRR(r.updatedServices && r.updatedServices.length > 0 ? r.updatedServices : r.originalServices);
};

export default function CancellationReportingClient() {
  const { userProfile } = useAuth();
  const { canView } = usePermissions();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<CancellationRequest[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancellationTypeFilter, setCancellationTypeFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [whyFilter, setWhyFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [franchiseeFilter, setFranchiseeFilter] = useState<string>('all');
  const [commissionOnlyFilter, setCommissionOnlyFilter] = useState<boolean>(false);
  const [quickDateRange, setQuickDateRange] = useState<string>('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // AI Summary States
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);

  // Access check
  const activeRoleLower = userProfile?.activeRole?.toLowerCase() || '';
  const isAuthorized = 
    canView('cancellationReporting') ||
    userProfile?.activeRole === 'admin' ||
    activeRoleLower === 'admin' ||
    activeRoleLower === 'superadmin' ||
    ['customer success', 'customer service', 'marketing manager'].includes(activeRoleLower);

  useEffect(() => {
    if (isAuthorized) {
      fetchRequests();
    }
  }, [isAuthorized]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 1. Fetch from 'cancellations' collection
      const cancelSnap = await getDocs(collection(firestore, 'cancellations'));
      const cancelList: CancellationRequest[] = cancelSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          franchisee: data.franchisee || data.franchiseeName || 'Unassigned'
        } as CancellationRequest;
      });

      // 2. Fetch from 'cs_requests' collection
      const csSnap = await getDocs(collection(firestore, 'cs_requests'));
      const csList: CancellationRequest[] = csSnap.docs
        .map(d => {
          const data = d.data();
          if (data.requestType !== 'cancellation' && !data.cancellationReason && !data.cancellationTheme) {
            return null;
          }
          return {
            id: d.id,
            leadId: data.leadId || d.id,
            companyName: data.companyName || 'Unknown Company',
            contactName: data.contactName || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            requestedDate: data.requestedDate || data.createdAt || new Date().toISOString(),
            cancellationDate: data.cancellationDate || '',
            trueServiceCancellationDate: data.trueServiceCancellationDate || data.cancellationDate || '',
            cancellationReason: data.cancellationReason || 'Other',
            cancellationTheme: data.cancellationTheme || '',
            cancellationCategory: data.cancellationCategory || data.cancellationWhy || '',
            status: data.status || 'Pending',
            saveStrategy: data.saveStrategy,
            originalServices: data.originalServices || [],
            updatedServices: data.updatedServices || [],
            notes: data.notes || data.cancellationNotes || '',
            processedBy: data.processedBy || '',
            processedAt: data.processedAt || '',
            originalMRR: data.originalMRR,
            savedMRR: data.savedMRR,
            isSignedCustomer: data.isSignedCustomer,
            avg3MonthInvoiceMRR: data.avg3MonthInvoiceMRR,
            newInvoiceMRR: data.newInvoiceMRR,
            serviceRateChanged: data.serviceRateChanged,
            serviceFrequencyChanged: data.serviceFrequencyChanged,
            serviceDeleted: data.serviceDeleted,
            cancelledByFranchisee: data.cancelledByFranchisee || data.isFranchiseeCancelled,
            isFranchiseeCancelled: data.cancelledByFranchisee || data.isFranchiseeCancelled,
            isReductionTurnedCancellation: data.isReductionTurnedCancellation,
            reductionTurnedCancellationNotes: data.reductionTurnedCancellationNotes,
            franchisee: data.franchisee || data.franchiseeName || 'Unassigned'
          } as CancellationRequest;
        })
        .filter(Boolean) as CancellationRequest[];

      // Combine & Deduplicate
      const combinedMap = new Map<string, CancellationRequest>();
      [...cancelList, ...csList].forEach(item => {
        const key = item.id || `${item.leadId}_${item.requestedDate?.substring(0, 10)}`;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, item);
        } else {
          const existing = combinedMap.get(key)!;
          combinedMap.set(key, { ...existing, ...item });
        }
      });

      const mergedList = Array.from(combinedMap.values()).sort((a, b) => {
        const dateA = new Date(a.processedAt || a.requestedDate || 0).getTime();
        const dateB = new Date(b.processedAt || b.requestedDate || 0).getTime();
        return dateB - dateA;
      });

      setRequests(mergedList);
      enrichRequestsWithInvoicesAndFranchisee(mergedList);
    } catch (e) {
      console.error("Error fetching cancellation requests for reporting:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const enrichRequestsWithInvoicesAndFranchisee = async (list: CancellationRequest[]) => {
    const uncalculated = list.filter(r => 
      r.avg3MonthInvoiceMRR === undefined || 
      (r.status === 'Cancelled' && (!r.originalMRR || r.originalMRR === 0)) ||
      !r.franchisee || r.franchisee === 'Unassigned'
    );

    if (uncalculated.length === 0) return;

    const BATCH_SIZE = 8;
    const enrichedMap = new Map<string, Partial<CancellationRequest>>();

    for (let i = 0; i < uncalculated.length; i += BATCH_SIZE) {
      const batch = uncalculated.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async req => {
          try {
            const updates: Partial<CancellationRequest> = {};
            const res = await fetch3MonthAvgInvoiceMRR(
              req.leadId,
              req.leadId,
              req.netsuiteId,
              req.prospectPlusId
            );

            if (res.isSignedCustomer || res.invoicesCount > 0) {
              updates.isSignedCustomer = true;
              updates.avg3MonthInvoiceMRR = res.avgMonthlyInvoice;
              if (req.status === 'Cancelled' && (!req.originalMRR || req.originalMRR === 0)) {
                updates.originalMRR = res.avgMonthlyInvoice;
              }
            }

            // Fetch lead/company for franchisee if missing
            if (!req.franchisee || req.franchisee === 'Unassigned') {
              const compSnap = await getDoc(doc(firestore, 'companies', req.leadId));
              const leadSnap = compSnap.exists() ? compSnap : await getDoc(doc(firestore, 'leads', req.leadId));
              if (leadSnap.exists()) {
                const leadData = leadSnap.data();
                if (leadData?.franchisee) {
                  updates.franchisee = leadData.franchisee;
                }
              }
            }

            if (Object.keys(updates).length > 0) {
              enrichedMap.set(req.id, updates);
            }
          } catch (e) {
            console.error("Error enriching request:", req.id, e);
          }
        })
      );
    }

    if (enrichedMap.size > 0) {
      setRequests(prev => prev.map(r => {
        const updates = enrichedMap.get(r.id);
        return updates ? { ...r, ...updates } : r;
      }));
    }
  };

  const handleQuickDateChange = (val: string) => {
    setQuickDateRange(val);
    const now = new Date();
    if (val === '7days') {
      setDateRange({ from: subDays(now, 7), to: now });
    } else if (val === '30days') {
      setDateRange({ from: subDays(now, 30), to: now });
    } else if (val === '90days') {
      setDateRange({ from: subDays(now, 90), to: now });
    } else if (val === 'thisMonth') {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (val === 'allTime') {
      setDateRange(undefined);
    }
  };

  // Toggle Cancelled by Franchisee (EOM Yellow Tag) inline
  const handleToggleFranchiseeCancelled = async (reqId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === reqId ? {
      ...r,
      cancelledByFranchisee: newVal,
      isFranchiseeCancelled: newVal,
      cancellationType: newVal ? 'YELLOW' : undefined
    } : r));

    try {
      await updateDoc(doc(firestore, 'cancellations', reqId), {
        cancelledByFranchisee: newVal,
        isFranchiseeCancelled: newVal
      });
      toast({
        title: newVal ? "Tagged as Franchisee EOM" : "Removed Franchisee EOM Tag",
        description: `Cancellation request updated successfully.`
      });
    } catch (e) {
      console.error("Failed to update Franchisee Cancelled tag:", e);
      fetchRequests(); // rollback
    }
  };

  // Toggle Reduction Turned Cancellation (Commission Save Tag) inline
  const handleToggleReductionSave = async (reqId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === reqId ? {
      ...r,
      isReductionTurnedCancellation: newVal
    } : r));

    try {
      await updateDoc(doc(firestore, 'cancellations', reqId), {
        isReductionTurnedCancellation: newVal
      });
      toast({
        title: newVal ? "Tagged for Commission Save" : "Removed Commission Save Tag",
        description: `Reduction-turned-cancellation save tag updated.`
      });
    } catch (e) {
      console.error("Failed to update Commission Save tag:", e);
      fetchRequests(); // rollback
    }
  };

  // Dynamic filter options
  const availableOptions = useMemo(() => {
    const themes = new Set<string>();
    const whys = new Set<string>();
    const reasons = new Set<string>();
    const strategies = new Set<string>();
    const franchisees = new Set<string>();

    requests.forEach(r => {
      if (r.cancellationTheme) themes.add(r.cancellationTheme.trim());
      // @ts-ignore
      const why = r.cancellationCategory || r.cancellationWhy;
      if (why && typeof why === 'string') whys.add(why.trim());
      if (r.cancellationReason && typeof r.cancellationReason === 'string') reasons.add(r.cancellationReason.trim());
      const strat = normalizeRetentionStrategy(r.saveStrategy);
      if (strat && strat !== 'Unspecified') strategies.add(strat);
      if (r.franchisee) franchisees.add(r.franchisee.trim());
    });

    RETENTION_STRATEGIES.forEach(s => strategies.add(s));

    return {
      themes: Array.from(themes).filter(Boolean).sort(),
      whys: Array.from(whys).filter(Boolean).sort(),
      reasons: Array.from(reasons).filter(Boolean).sort(),
      strategies: Array.from(strategies).filter(Boolean).sort(),
      franchisees: Array.from(franchisees).filter(Boolean).sort()
    };
  }, [requests]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCancellationTypeFilter('all');
    setThemeFilter('all');
    setWhyFilter('all');
    setReasonFilter('all');
    setStrategyFilter('all');
    setFranchiseeFilter('all');
    setCommissionOnlyFilter(false);
    setQuickDateRange('allTime');
    setDateRange(undefined);
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.companyName?.toLowerCase().includes(q);
        const matchContact = req.contactName?.toLowerCase().includes(q);
        const matchReason = req.cancellationReason?.toLowerCase().includes(q);
        const matchTheme = req.cancellationTheme?.toLowerCase().includes(q);
        // @ts-ignore
        const matchWhy = (req.cancellationCategory || req.cancellationWhy)?.toLowerCase().includes(q);
        const matchNotes = req.notes?.toLowerCase().includes(q);
        const matchBy = req.processedBy?.toLowerCase().includes(q);
        const matchFran = req.franchisee?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchReason && !matchTheme && !matchWhy && !matchNotes && !matchBy && !matchFran) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      // Cancellation Type Classification Filter (RED, YELLOW, GREEN, GREY)
      if (cancellationTypeFilter !== 'all') {
        const typeInfo = getCancellationTypeInfo(req);
        if (typeInfo.type !== cancellationTypeFilter) {
          return false;
        }
      }

      // Theme
      if (themeFilter !== 'all' && req.cancellationTheme !== themeFilter) {
        return false;
      }

      // Category / Why
      if (whyFilter !== 'all') {
        // @ts-ignore
        const reqWhy = req.cancellationCategory || req.cancellationWhy;
        if (reqWhy !== whyFilter) return false;
      }

      // Reason
      if (reasonFilter !== 'all' && req.cancellationReason !== reasonFilter) {
        return false;
      }

      // Retention Strategy
      if (strategyFilter !== 'all' && normalizeRetentionStrategy(req.saveStrategy) !== strategyFilter) {
        return false;
      }

      // Franchisee Filter
      if (franchiseeFilter !== 'all' && req.franchisee !== franchiseeFilter) {
        return false;
      }

      // Commission Saved Reductions Only
      if (commissionOnlyFilter && !req.isReductionTurnedCancellation) {
        return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const targetDateStr = req.processedAt || req.requestedDate || req.cancellationDate;
        if (!targetDateStr) return false;
        try {
          let targetDate = parseISO(targetDateStr);
          if (isNaN(targetDate.getTime())) {
            targetDate = new Date(targetDateStr);
          }
          if (isNaN(targetDate.getTime())) return false;
          const from = dateRange.from;
          const to = dateRange.to || dateRange.from;
          if (!isWithinInterval(targetDate, { start: from, end: to })) {
            return false;
          }
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, cancellationTypeFilter, themeFilter, whyFilter, reasonFilter, strategyFilter, franchiseeFilter, commissionOnlyFilter, dateRange]);

  // Comprehensive Metrics & Tallies
  const metrics = useMemo(() => {
    const totalRequests = filteredRequests.length;
    const pendingRequests = filteredRequests.filter(r => r.status === 'Pending');
    const savedRequests = filteredRequests.filter(r => r.status === 'Saved');
    const cancelledRequests = filteredRequests.filter(r => r.status === 'Cancelled');

    // Classification Type Tallies
    let redTrueCount = 0;
    let yellowEomCount = 0;
    let greyDataWashCount = 0;
    let greenStillCustomerCount = 0;

    let redTrueMRRLost = 0;
    let yellowEomMRRLost = 0;
    let greyDataWashMRR = 0;

    filteredRequests.forEach(r => {
      const typeInfo = getCancellationTypeInfo(r);
      const mrr = getLostMRR(r);
      if (typeInfo.type === 'RED') {
        redTrueCount++;
        if (r.status === 'Cancelled') redTrueMRRLost += mrr;
      } else if (typeInfo.type === 'YELLOW') {
        yellowEomCount++;
        if (r.status === 'Cancelled') yellowEomMRRLost += mrr;
      } else if (typeInfo.type === 'GREY') {
        greyDataWashCount++;
        if (r.status === 'Cancelled') greyDataWashMRR += mrr;
      } else if (typeInfo.type === 'GREEN') {
        greenStillCustomerCount++;
      }
    });

    const totalProcessed = savedRequests.length + cancelledRequests.length;
    const saveRate = totalProcessed > 0 ? Math.round((savedRequests.length / totalProcessed) * 100) : 0;

    // Money Calculations
    let totalMRRSaved = 0;
    let totalMRRLost = 0;
    let reductionSavesCount = 0;
    let reductionMRRSaved = 0;

    savedRequests.forEach(r => {
      const savedAmount = getSavedMRR(r);
      totalMRRSaved += savedAmount;
      if (r.isReductionTurnedCancellation) {
        reductionSavesCount++;
        reductionMRRSaved += savedAmount;
      }
    });

    cancelledRequests.forEach(r => {
      totalMRRLost += getLostMRR(r);
    });

    // Franchisee Tally Aggregation
    const franchiseeMap: Record<string, {
      total: number;
      savedCount: number;
      cancelledCount: number;
      redCount: number;
      yellowCount: number;
      greyCount: number;
      greenCount: number;
      mrrSaved: number;
      mrrLost: number;
    }> = {};

    filteredRequests.forEach(r => {
      const fran = r.franchisee || 'Unassigned';
      if (!franchiseeMap[fran]) {
        franchiseeMap[fran] = {
          total: 0,
          savedCount: 0,
          cancelledCount: 0,
          redCount: 0,
          yellowCount: 0,
          greyCount: 0,
          greenCount: 0,
          mrrSaved: 0,
          mrrLost: 0
        };
      }

      franchiseeMap[fran].total += 1;
      const typeInfo = getCancellationTypeInfo(r);
      if (typeInfo.type === 'RED') franchiseeMap[fran].redCount += 1;
      else if (typeInfo.type === 'YELLOW') franchiseeMap[fran].yellowCount += 1;
      else if (typeInfo.type === 'GREY') franchiseeMap[fran].greyCount += 1;
      else if (typeInfo.type === 'GREEN') franchiseeMap[fran].greenCount += 1;

      if (r.status === 'Saved') {
        franchiseeMap[fran].savedCount += 1;
        franchiseeMap[fran].mrrSaved += getSavedMRR(r);
      } else if (r.status === 'Cancelled') {
        franchiseeMap[fran].cancelledCount += 1;
        franchiseeMap[fran].mrrLost += getLostMRR(r);
      }
    });

    const franchiseeData = Object.entries(franchiseeMap)
      .map(([name, data]) => ({
        name,
        ...data,
        mrrSaved: Math.round(data.mrrSaved),
        mrrLost: Math.round(data.mrrLost)
      }))
      .sort((a, b) => b.total - a.total);

    // Weekly Split Aggregation across filtered period
    const weekMap: Record<string, {
      weekLabel: string;
      total: number;
      savedCount: number;
      cancelledCount: number;
      redCount: number;
      yellowCount: number;
      greyCount: number;
      greenCount: number;
      mrrSaved: number;
      mrrLost: number;
    }> = {};

    filteredRequests.forEach(r => {
      const dStr = r.processedAt || r.requestedDate || r.cancellationDate;
      let weekKey = 'Unknown';
      let weekLabel = 'Unknown';
      if (dStr) {
        try {
          let dt = parseISO(dStr);
          if (isNaN(dt.getTime())) {
            dt = new Date(dStr);
          }
          if (!isNaN(dt.getTime())) {
            const wStart = startOfWeek(dt, { weekStartsOn: 1 });
            const wEnd = endOfWeek(dt, { weekStartsOn: 1 });
            weekKey = format(wStart, 'yyyy-MM-dd');
            weekLabel = `${format(wStart, 'MMM dd')} - ${format(wEnd, 'MMM dd, yyyy')}`;
          }
        } catch {
          // fallback
        }
      }

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekLabel,
          total: 0,
          savedCount: 0,
          cancelledCount: 0,
          redCount: 0,
          yellowCount: 0,
          greyCount: 0,
          greenCount: 0,
          mrrSaved: 0,
          mrrLost: 0
        };
      }

      weekMap[weekKey].total += 1;
      const typeInfo = getCancellationTypeInfo(r);
      if (typeInfo.type === 'RED') weekMap[weekKey].redCount += 1;
      else if (typeInfo.type === 'YELLOW') weekMap[weekKey].yellowCount += 1;
      else if (typeInfo.type === 'GREY') weekMap[weekKey].greyCount += 1;
      else if (typeInfo.type === 'GREEN') weekMap[weekKey].greenCount += 1;

      if (r.status === 'Saved') {
        weekMap[weekKey].savedCount += 1;
        weekMap[weekKey].mrrSaved += getSavedMRR(r);
      } else if (r.status === 'Cancelled') {
        weekMap[weekKey].cancelledCount += 1;
        weekMap[weekKey].mrrLost += getLostMRR(r);
      }
    });

    const weeklySplitData = Object.entries(weekMap)
      .map(([key, data]) => ({
        weekKey: key,
        ...data,
        saveRate: (data.savedCount + data.cancelledCount) > 0 
          ? Math.round((data.savedCount / (data.savedCount + data.cancelledCount)) * 100)
          : 0,
        mrrSaved: Math.round(data.mrrSaved),
        mrrLost: Math.round(data.mrrLost)
      }))
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    // Classification Type Pie Data
    const classificationPieData = [
      { name: 'Red - True Cancellation', value: redTrueCount, color: '#ef4444' },
      { name: 'Yellow - End of Month (Franchisee)', value: yellowEomCount, color: '#eab308' },
      { name: 'Grey - Data Wash', value: greyDataWashCount, color: '#64748b' },
      { name: 'Green - Still a Customer', value: greenStillCustomerCount, color: '#10b981' }
    ].filter(d => d.value > 0);

    return {
      totalRequests,
      pendingCount: pendingRequests.length,
      savedCount: savedRequests.length,
      cancelledCount: cancelledRequests.length,
      redTrueCount,
      yellowEomCount,
      greyDataWashCount,
      greenStillCustomerCount,
      redTrueMRRLost: Math.round(redTrueMRRLost),
      yellowEomMRRLost: Math.round(yellowEomMRRLost),
      greyDataWashMRR: Math.round(greyDataWashMRR),
      saveRate,
      totalMRRSaved: Math.round(totalMRRSaved),
      totalMRRLost: Math.round(totalMRRLost),
      reductionSavesCount,
      reductionMRRSaved: Math.round(reductionMRRSaved),
      franchiseeData,
      weeklySplitData,
      classificationPieData,
      savedRequests,
      cancelledRequests
    };
  }, [filteredRequests]);

  // Handle Generating AI Summary
  const handleGenerateAISummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await fetch('/api/cancellations/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: filteredRequests,
          periodName: quickDateRange === 'thisMonth' ? 'this month' : quickDateRange === '7days' ? 'the past 7 days' : 'the filtered period'
        })
      });

      const data = await res.json();
      if (data.success) {
        setAiSummaryText(data.summary);
        toast({
          title: "AI Weekly Executive Summary Ready",
          description: "Genkit AI successfully analyzed current cancellation records."
        });
      } else {
        throw new Error(data.error || "AI generation failed");
      }
    } catch (e: any) {
      console.error("AI Summary error:", e);
      toast({
        title: "AI Summary Generation Failed",
        description: e?.message || "Could not generate AI summary.",
        variant: "destructive"
      });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (filteredRequests.length === 0) return;

    const headers = [
      'Franchisee',
      'Company Name',
      'Contact Name',
      'Contact Email',
      'Status',
      'Cancellation Type Classification',
      'Cancelled by Franchisee (EOM)',
      'Reduction Saved (Commission Tracked)',
      'Save Strategy',
      'Cancellation Theme',
      'Cancellation Category / Why',
      'Cancellation Reason',
      'Requested Date',
      'True Cancellation Date',
      'Original MRR ($)',
      'Saved MRR ($)',
      'MRR Lost ($)',
      'Processed By',
      'Processed At',
      'Notes'
    ];

    const rows = filteredRequests.map(r => {
      const typeInfo = getCancellationTypeInfo(r);
      const isSigned = Boolean(r.isSignedCustomer);
      const avg3Month = r.avg3MonthInvoiceMRR ?? (isSigned ? (r.originalMRR ?? 0) : 0);
      const origMRR = r.originalMRR ?? (isSigned ? avg3Month : calculateMRR(r.originalServices));
      const savedMRR = r.status === 'Saved' ? (r.savedMRR ?? calculateMRR(r.updatedServices || r.originalServices)) : 0;
      const mrrLost = r.status === 'Cancelled' ? origMRR : 0;

      return [
        `"${(r.franchisee || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(r.companyName || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${(r.contactEmail || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${typeInfo.label} (${typeInfo.type})"`,
        `"${r.cancelledByFranchisee || r.isFranchiseeCancelled ? 'Yes' : 'No'}"`,
        `"${r.isReductionTurnedCancellation ? 'Yes' : 'No'}"`,
        `"${normalizeRetentionStrategy(r.saveStrategy) || ''}"`,
        `"${(r.cancellationTheme || '').replace(/"/g, '""')}"`,
        // @ts-ignore
        `"${(r.cancellationCategory || r.cancellationWhy || '').replace(/"/g, '""')}"`,
        `"${(r.cancellationReason || '').replace(/"/g, '""')}"`,
        `"${r.requestedDate || ''}"`,
        `"${r.trueServiceCancellationDate || r.cancellationDate || ''}"`,
        origMRR.toFixed(2),
        savedMRR.toFixed(2),
        mrrLost.toFixed(2),
        `"${(r.processedBy || '').replace(/"/g, '""')}"`,
        `"${r.processedAt || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cancellation_Reporting_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#d0dfcd]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen sidebar-nav-theme space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 p-5 rounded-2xl border border-white/60 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#095c7b] text-white rounded-xl shadow-xs">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#095c7b] tracking-tight">
                Cancellation & Retention Reporting
              </h1>
              <p className="text-slate-600 text-xs lg:text-sm mt-0.5">
                Classification breakdown (Red True, Yellow EOM, Grey Data Wash, Green Still Customer), Franchisee tallies, weekly splits, and commission saves tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Quick Date Range */}
          <Select value={quickDateRange} onValueChange={handleQuickDateChange}>
            <SelectTrigger className="w-[140px] bg-white border-slate-300">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allTime">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-white border-slate-300 gap-2 text-xs">
                <CalendarIcon className="h-4 w-4 text-[#095c7b]" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, yyyy')}</>
                  ) : (
                    format(dateRange.from, 'LLL dd, yyyy')
                  )
                ) : (
                  <span>Select Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setQuickDateRange('custom');
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            onClick={fetchRequests} 
            disabled={refreshing}
            className="bg-white border-slate-300 hover:bg-slate-50 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#095c7b] ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            onClick={exportToCSV}
            className="bg-[#095c7b] text-white hover:bg-[#074760] gap-1.5 text-xs shadow-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* 4 Classification Color Badge KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RED - TRUE CANCELLATION */}
        <Card className="bg-white border-rose-300 border-l-8 border-l-rose-600 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                  🔴 RED - True Cancellation
                </Badge>
              </div>
              <h3 className="text-2xl font-extrabold text-rose-700">{metrics.redTrueCount}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Lost MRR: <span className="font-bold text-rose-600">${metrics.redTrueMRRLost.toLocaleString()}</span>
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* YELLOW - END OF MONTH */}
        <Card className="bg-white border-amber-300 border-l-8 border-l-amber-500 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                  🟡 YELLOW - End of Month (EOM)
                </Badge>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-800">{metrics.yellowEomCount}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Franchisee Cancelled: <span className="font-bold text-amber-800">${metrics.yellowEomMRRLost.toLocaleString()}</span>
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Tag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* GREY - DATA WASH */}
        <Card className="bg-white border-slate-300 border-l-8 border-l-slate-500 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-slate-200 text-slate-800 border-slate-300 font-bold text-[10px]">
                  ⚪ GREY - Data Wash
                </Badge>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-700">{metrics.greyDataWashCount}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Data Cleanup / Non-Starts
              </p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* GREEN - STILL A CUSTOMER */}
        <Card className="bg-white border-emerald-300 border-l-8 border-l-emerald-500 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                  🟢 GREEN - Still a Customer
                </Badge>
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-700">{metrics.greenStillCustomerCount}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                New SCF / Location Move
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Key Performance Indicators Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white/90 border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Saved Revenue</p>
              <h3 className="text-2xl font-extrabold text-emerald-600">${metrics.totalMRRSaved.toLocaleString()}/mo</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Annualized: <span className="font-bold text-emerald-700">${(metrics.totalMRRSaved * 12).toLocaleString()}/yr</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Smile className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission Saved Reductions</p>
              <h3 className="text-2xl font-extrabold text-[#095c7b]">{metrics.reductionSavesCount} Customers</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved Revenue: <span className="font-bold text-[#095c7b]">${metrics.reductionMRRSaved.toLocaleString()}/mo</span>
              </p>
            </div>
            <div className="p-3 bg-sky-50 text-[#095c7b] rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Save Rate</p>
              <h3 className="text-2xl font-extrabold text-[#095c7b]">{metrics.saveRate}%</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.savedCount} Saved out of {metrics.savedCount + metrics.cancelledCount} Processed
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col space-y-4">
        <TabsList className="bg-white/90 p-1.5 rounded-xl border border-white/60 w-fit flex flex-wrap gap-1 shadow-xs">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white text-xs font-bold px-4 py-2">
            Detailed Cancellation List ({metrics.totalRequests})
          </TabsTrigger>
          <TabsTrigger value="ai-summary" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> AI Executive Summary
          </TabsTrigger>
          <TabsTrigger value="saves" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5">
            <Smile className="h-3.5 w-3.5" /> Saves of the Week ({metrics.savedCount})
          </TabsTrigger>
          <TabsTrigger value="franchisees" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5" /> Franchisee Tally ({metrics.franchiseeData.length})
          </TabsTrigger>
          <TabsTrigger value="weekly-split" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Weekly Split Breakdown
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DETAILED CANCELLATION LIST */}
        <TabsContent value="overview" className="m-0 space-y-4">
          
          {/* Filters Bar */}
          <Card className="bg-white/95 border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search company, contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs bg-white border-slate-300"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs bg-white border-slate-300">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Saved">Saved</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {/* Cancellation Type Classification Filter */}
                <Select value={cancellationTypeFilter} onValueChange={setCancellationTypeFilter}>
                  <SelectTrigger className="text-xs bg-white border-slate-300 font-semibold">
                    <SelectValue placeholder="Type: All Classifications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Type: All Classifications</SelectItem>
                    <SelectItem value="RED">🔴 RED - True Cancellation</SelectItem>
                    <SelectItem value="YELLOW">🟡 YELLOW - End of Month (EOM)</SelectItem>
                    <SelectItem value="GREY">⚪ GREY - Data Wash</SelectItem>
                    <SelectItem value="GREEN">🟢 GREEN - Still a Customer</SelectItem>
                  </SelectContent>
                </Select>

                {/* Theme Filter */}
                <Select value={themeFilter} onValueChange={setThemeFilter}>
                  <SelectTrigger className="text-xs bg-white border-slate-300">
                    <SelectValue placeholder="Theme: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Theme: All</SelectItem>
                    {availableOptions.themes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Franchisee Filter */}
                <Select value={franchiseeFilter} onValueChange={setFranchiseeFilter}>
                  <SelectTrigger className="text-xs bg-white border-slate-300">
                    <SelectValue placeholder="Franchisee: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Franchisee: All</SelectItem>
                    {availableOptions.franchisees.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reset Button */}
                <Button 
                  variant="outline" 
                  onClick={resetFilters} 
                  className="text-xs border-slate-300 hover:bg-slate-100 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                </Button>
              </div>

              {/* Checkbox Filter for Commission Saved Reductions */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-700">
                <Checkbox 
                  id="commissionFilter" 
                  checked={commissionOnlyFilter} 
                  onCheckedChange={(checked) => setCommissionOnlyFilter(Boolean(checked))}
                />
                <Label htmlFor="commissionFilter" className="cursor-pointer flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#095c7b]" />
                  Show Only Commission-Tracked Saved Reductions
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Detailed Table */}
          <Card className="bg-white/95 border-slate-200 shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Franchisee</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Company & Contact</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Cancellation Classification</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Franchisee EOM?</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Commission Save?</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Theme & Category</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Reason Code</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Dates</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">MRR Lost / Saved</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-slate-400 italic text-sm">
                        No cancellation records match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map(req => {
                      const typeInfo = getCancellationTypeInfo(req);
                      const mrrLost = getLostMRR(req);
                      const mrrSaved = getSavedMRR(req);

                      return (
                        <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Franchisee */}
                          <TableCell className="text-xs font-semibold text-slate-700">
                            {req.franchisee || <span className="text-slate-400 italic">Unassigned</span>}
                          </TableCell>

                          {/* Company & Contact */}
                          <TableCell className="text-xs">
                            <a 
                              href={`/companies/${req.leadId}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-bold text-[#095c7b] hover:underline"
                            >
                              {req.companyName}
                            </a>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {req.contactName} {req.contactEmail ? `(${req.contactEmail})` : ''}
                            </div>
                          </TableCell>

                          {/* Classification Type Badge */}
                          <TableCell className="text-xs">
                            <Badge className={`${typeInfo.badgeClass} text-[11px] px-2 py-0.5`}>
                              {typeInfo.shortLabel}
                            </Badge>
                          </TableCell>

                          {/* Franchisee EOM Checkbox */}
                          <TableCell className="text-xs text-center">
                            <Checkbox 
                              checked={Boolean(req.cancelledByFranchisee || req.isFranchiseeCancelled)}
                              onCheckedChange={() => handleToggleFranchiseeCancelled(req.id, Boolean(req.cancelledByFranchisee || req.isFranchiseeCancelled))}
                              title="Toggle Franchisee EOM Tag"
                            />
                          </TableCell>

                          {/* Commission Save Checkbox */}
                          <TableCell className="text-xs text-center">
                            <Checkbox 
                              checked={Boolean(req.isReductionTurnedCancellation)}
                              onCheckedChange={() => handleToggleReductionSave(req.id, Boolean(req.isReductionTurnedCancellation))}
                              title="Toggle Commission Save Tag"
                            />
                          </TableCell>

                          {/* Theme & Category */}
                          <TableCell className="text-xs text-slate-600">
                            <div className="font-semibold text-slate-800">{req.cancellationTheme || 'N/A'}</div>
                            {/* @ts-ignore */}
                            <div className="text-[11px] text-slate-500">{req.cancellationCategory || req.cancellationWhy || 'N/A'}</div>
                          </TableCell>

                          {/* Reason Code */}
                          <TableCell className="text-xs font-medium text-slate-700">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[11px]">
                              {req.cancellationReason || 'Other'}
                            </Badge>
                          </TableCell>

                          {/* Dates */}
                          <TableCell className="text-[11px] text-slate-600">
                            <div><span className="text-slate-400">Req:</span> {safeFormatDate(req.requestedDate, 'dd MMM yyyy')}</div>
                            <div><span className="text-slate-400">Stop:</span> {safeFormatDate(req.trueServiceCancellationDate || req.cancellationDate, 'dd MMM yyyy')}</div>
                          </TableCell>

                          {/* Revenue Impact */}
                          <TableCell className="text-xs text-right font-bold">
                            {req.status === 'Saved' ? (
                              <div className="text-emerald-700">
                                +${mrrSaved.toFixed(2)}/mo
                              </div>
                            ) : req.status === 'Cancelled' ? (
                              <div className="text-rose-600">
                                -${mrrLost.toFixed(2)}/mo
                              </div>
                            ) : (
                              <div className="text-slate-500">
                                ${mrrLost.toFixed(2)}/mo
                              </div>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Badge className={
                              req.status === 'Pending' ? 'bg-amber-500 text-white' :
                              req.status === 'Saved' ? 'bg-emerald-600 text-white' :
                              'bg-rose-600 text-white'
                            }>
                              {req.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AI EXECUTIVE SUMMARY */}
        <TabsContent value="ai-summary" className="m-0 space-y-4">
          <Card className="bg-white/95 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#095c7b] text-lg font-extrabold flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#095c7b]" /> Genkit AI Weekly Executive Summary
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Generate an AI synthesis of cancellations, retention performance, classification splits, franchisee drivers, and actionable advice.
                </CardDescription>
              </div>
              <Button 
                onClick={handleGenerateAISummary}
                disabled={aiSummaryLoading}
                className="bg-[#095c7b] text-white hover:bg-[#074760] text-xs gap-2 shadow-xs"
              >
                {aiSummaryLoading ? <Loader /> : <Sparkles className="h-4 w-4 text-amber-300" />}
                {aiSummaryLoading ? 'Analyzing Records...' : 'Generate Weekly AI Summary'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiSummaryText && !aiSummaryLoading ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 space-y-3">
                  <Sparkles className="h-10 w-10 text-[#095c7b]/40 mx-auto" />
                  <h4 className="font-bold text-slate-700">Click "Generate Weekly AI Summary"</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The AI engine will analyze all {filteredRequests.length} currently filtered cancellation items, classify True Churn vs Franchisee EOM vs Data Wash, and provide executive insights.
                  </p>
                </div>
              ) : aiSummaryLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader />
                  <p className="text-xs text-slate-600 font-medium">Running Genkit AI analysis across cancellation dataset...</p>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed prose max-w-none shadow-2xs">
                  <div className="whitespace-pre-wrap font-sans">
                    {aiSummaryText}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SAVES OF THE WEEK */}
        <TabsContent value="saves" className="m-0 space-y-4">
          <Card className="bg-white/95 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-lg font-bold flex items-center gap-2">
                <Smile className="h-5 w-5 text-emerald-600" /> Saves of the Week & Reason Selected
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed view of saved accounts, retained monthly revenue, retention strategies applied, and commission-tracked saved reductions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Franchisee</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Company Name</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Retention Strategy Selected</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Commission Saved Reduction?</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">Retained Monthly Revenue</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Processed By</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.savedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 italic text-sm">
                        No saved customer records found in the selected date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.savedRequests.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-semibold text-slate-700">
                          {r.franchisee || <span className="text-slate-400 italic">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-[#095c7b]">
                          {r.companyName}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold">
                            {normalizeRetentionStrategy(r.saveStrategy) || 'Keep Existing'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {r.isReductionTurnedCancellation ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
                              🏆 Commission Tracked Save
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-extrabold text-emerald-700 text-right">
                          +${getSavedMRR(r).toFixed(2)}/mo
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {r.processedBy || 'CS Team'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                          {r.notes || 'No additional notes'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: FRANCHISEE TALLY */}
        <TabsContent value="franchisees" className="m-0 space-y-4">
          <Card className="bg-white/95 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-lg font-bold flex items-center gap-2">
                <Building className="h-5 w-5 text-[#095c7b]" /> Franchisee Cancellation & Retention Tally
              </CardTitle>
              <CardDescription className="text-xs">
                Tally of cancellations per Franchisee broken down by Red True Churn, Yellow EOM Franchisee Cancelled, Grey Data Wash, and Green Still Customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Franchisee</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Total Requests</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🔴 Red True Churn</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🟡 Yellow EOM (Franchisee)</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">⚪ Grey Data Wash</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🟢 Green Still Customer</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Saves Count</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">Retained Revenue ($)</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">Lost Revenue ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.franchiseeData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-400 italic text-sm">
                        No franchisee data available for selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.franchiseeData.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-bold text-[#095c7b]">
                          {f.name}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-slate-800">
                          {f.total}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-rose-700">
                          {f.redCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-amber-800">
                          {f.yellowCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-slate-600">
                          {f.greyCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-emerald-700">
                          {f.greenCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-emerald-600">
                          {f.savedCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-700 text-right">
                          ${f.mrrSaved.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-rose-600 text-right">
                          ${f.mrrLost.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: WEEKLY SPLIT BREAKDOWN */}
        <TabsContent value="weekly-split" className="m-0 space-y-4">
          <Card className="bg-white/95 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-lg font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#095c7b]" /> Weekly Split Breakdown (Filtered Period Variations)
              </CardTitle>
              <CardDescription className="text-xs">
                Compare weekly variations across the month/date range for true churn, franchisee EOM cancellations, saves, and revenue impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[#095c7b] text-xs">Week Range</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Total Requests</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🔴 Red True</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🟡 Yellow EOM</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">⚪ Grey Wash</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">🟢 Green Customer</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Saves</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-center">Save Rate %</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">Saved MRR ($)</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-xs text-right">Lost MRR ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.weeklySplitData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-slate-400 italic text-sm">
                        No weekly split data found for selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.weeklySplitData.map((w, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-extrabold text-[#095c7b]">
                          {w.weekLabel}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-slate-800">
                          {w.total}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-rose-700">
                          {w.redCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-amber-800">
                          {w.yellowCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-slate-600">
                          {w.greyCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-emerald-700">
                          {w.greenCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-emerald-600">
                          {w.savedCount}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-center text-[#095c7b]">
                          {w.saveRate}%
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-700 text-right">
                          ${w.mrrSaved.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-rose-600 text-right">
                          ${w.mrrLost.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
