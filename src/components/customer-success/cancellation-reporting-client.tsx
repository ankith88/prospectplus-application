"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { AccessDenied } from '@/components/access-denied';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { CancellationRequest, ServiceSelection, normalizeRetentionStrategy, RETENTION_STRATEGIES } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { fetch3MonthAvgInvoiceMRR } from '@/lib/cancellation-invoice-helper';

const CHART_COLORS = ['#095c7b', '#38bdf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#e11d48', '#059669', '#d97706', '#6366f1'];

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<CancellationRequest[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [quickDateRange, setQuickDateRange] = useState<string>('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Modal Pop-Up state for KPI Drilldowns
  const [modalData, setModalData] = useState<{
    title: string;
    subtitle: string;
    type: 'enquiries' | 'saved' | 'money_saved' | 'money_lost';
    items: CancellationRequest[];
  } | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('all');

  // Reset modal sub-filters when modal opens/closes
  useEffect(() => {
    setModalSearchQuery('');
    setModalStatusFilter('all');
  }, [modalData]);

  const filteredModalItems = useMemo(() => {
    if (!modalData) return [];
    return modalData.items.filter(req => {
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matchName = req.companyName?.toLowerCase().includes(q);
        const matchContact = req.contactName?.toLowerCase().includes(q);
        const matchReason = req.cancellationReason?.toLowerCase().includes(q);
        const matchTheme = req.cancellationTheme?.toLowerCase().includes(q);
        const matchNotes = req.notes?.toLowerCase().includes(q);
        const matchBy = req.processedBy?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchReason && !matchTheme && !matchNotes && !matchBy) {
          return false;
        }
      }

      if (modalStatusFilter !== 'all' && req.status !== modalStatusFilter) {
        return false;
      }

      return true;
    });
  }, [modalData, modalSearchQuery, modalStatusFilter]);

  const handleExportModalCSV = (title: string, items: CancellationRequest[]) => {
    if (!items || items.length === 0) return;

    const headers = [
      'Company Name',
      'Contact Name',
      'Contact Email',
      'Status',
      'Signed Customer',
      '3-Month Avg Invoice ($)',
      'Save Strategy',
      'Cancellation Theme',
      'Cancellation Reason',
      'Requested Date',
      'True Stop Date',
      'Original MRR ($)',
      'Saved MRR ($)',
      'MRR Lost ($)',
      'Annual Value Saved ($)',
      'Annual Value Lost ($)',
      'Processed By',
      'Notes'
    ];

    const rows = items.map(r => {
      const isSigned = Boolean(r.isSignedCustomer);
      const avg3Month = r.avg3MonthInvoiceMRR ?? (isSigned ? (r.originalMRR ?? 0) : 0);
      const origMRR = r.originalMRR ?? (isSigned ? avg3Month : calculateMRR(r.originalServices));
      const savedMRR = r.status === 'Saved' ? (r.savedMRR ?? calculateMRR(r.updatedServices || r.originalServices)) : 0;
      const mrrLost = r.status === 'Cancelled' ? origMRR : 0;

      return [
        `"${(r.companyName || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${(r.contactEmail || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${isSigned ? 'Yes' : 'No'}"`,
        avg3Month.toFixed(2),
        `"${normalizeRetentionStrategy(r.saveStrategy) || ''}"`,
        `"${(r.cancellationTheme || '').replace(/"/g, '""')}"`,
        `"${(r.cancellationReason || '').replace(/"/g, '""')}"`,
        `"${r.requestedDate || ''}"`,
        `"${r.trueServiceCancellationDate || r.cancellationDate || ''}"`,
        origMRR.toFixed(2),
        savedMRR.toFixed(2),
        mrrLost.toFixed(2),
        (savedMRR * 12).toFixed(2),
        (mrrLost * 12).toFixed(2),
        `"${(r.processedBy || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `${cleanTitle}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      const cancelList: CancellationRequest[] = cancelSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as CancellationRequest));

      // 2. Fetch from 'cs_requests' collection (cancellation requestType)
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
          } as CancellationRequest;
        })
        .filter(Boolean) as CancellationRequest[];

      // Combine & Deduplicate by ID or (leadId + date)
      const combinedMap = new Map<string, CancellationRequest>();
      
      [...cancelList, ...csList].forEach(item => {
        const key = item.id || `${item.leadId}_${item.requestedDate?.substring(0, 10)}`;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, item);
        } else {
          // Merge missing fields
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
      enrichRequestsWithInvoices(mergedList);
    } catch (e) {
      console.error("Error fetching cancellation requests for reporting:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const enrichRequestsWithInvoices = async (list: CancellationRequest[]) => {
    const uncalculated = list.filter(r => 
      r.avg3MonthInvoiceMRR === undefined || 
      (r.status === 'Cancelled' && (!r.originalMRR || r.originalMRR === 0))
    );

    if (uncalculated.length === 0) return;

    const BATCH_SIZE = 8;
    const enrichedMap = new Map<string, Partial<CancellationRequest>>();

    for (let i = 0; i < uncalculated.length; i += BATCH_SIZE) {
      const batch = uncalculated.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async req => {
          try {
            const res = await fetch3MonthAvgInvoiceMRR(
              req.leadId,
              req.leadId,
              req.netsuiteId,
              req.prospectPlusId
            );

            if (res.isSignedCustomer || res.invoicesCount > 0) {
              enrichedMap.set(req.id, {
                isSignedCustomer: true,
                avg3MonthInvoiceMRR: res.avgMonthlyInvoice,
                ...(req.status === 'Cancelled' && (!req.originalMRR || req.originalMRR === 0)
                  ? { originalMRR: res.avgMonthlyInvoice }
                  : {})
              });
            }
          } catch (e) {
            console.error("Error fetching invoice avg for request:", req.id, e);
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

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.companyName?.toLowerCase().includes(q);
        const matchContact = req.contactName?.toLowerCase().includes(q);
        const matchReason = req.cancellationReason?.toLowerCase().includes(q);
        const matchTheme = req.cancellationTheme?.toLowerCase().includes(q);
        const matchNotes = req.notes?.toLowerCase().includes(q);
        const matchBy = req.processedBy?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchReason && !matchTheme && !matchNotes && !matchBy) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      // Theme filter
      if (themeFilter !== 'all' && req.cancellationTheme !== themeFilter) {
        return false;
      }

      // Strategy filter
      if (strategyFilter !== 'all' && normalizeRetentionStrategy(req.saveStrategy) !== strategyFilter) {
        return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const targetDateStr = req.processedAt || req.requestedDate || req.cancellationDate;
        if (!targetDateStr) return false;
        try {
          const targetDate = parseISO(targetDateStr);
          const from = dateRange.from;
          const to = dateRange.to || dateRange.from;
          if (!isWithinInterval(targetDate, { start: from, end: to })) {
            return false;
          }
        } catch {
          // keep if parse error
        }
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, themeFilter, strategyFilter, dateRange]);

  // Comprehensive Metrics Calculations
  const metrics = useMemo(() => {
    const totalRequests = filteredRequests.length;
    const pendingRequests = filteredRequests.filter(r => r.status === 'Pending');
    const savedRequests = filteredRequests.filter(r => r.status === 'Saved');
    const cancelledRequests = filteredRequests.filter(r => r.status === 'Cancelled');

    const totalProcessed = savedRequests.length + cancelledRequests.length;
    const saveRate = totalProcessed > 0 ? Math.round((savedRequests.length / totalProcessed) * 100) : 0;

    // Helper to calculate lost MRR for a cancelled request
    const getLostMRR = (r: CancellationRequest) => {
      if (r.originalMRR !== undefined && r.originalMRR !== null) {
        return r.originalMRR;
      }
      if (r.isSignedCustomer) {
        return r.avg3MonthInvoiceMRR ?? 0;
      }
      return calculateMRR(r.originalServices);
    };

    // Helper to calculate saved MRR (retained revenue) for a saved request
    const getSavedMRR = (r: CancellationRequest) => {
      if (r.savedMRR !== undefined && r.savedMRR !== null) {
        return r.savedMRR;
      }
      return calculateMRR(r.updatedServices && r.updatedServices.length > 0 ? r.updatedServices : r.originalServices);
    };

    // Money Calculations
    let totalMRRSaved = 0;
    let totalMRRLost = 0;

    savedRequests.forEach(r => {
      totalMRRSaved += getSavedMRR(r);
    });

    cancelledRequests.forEach(r => {
      totalMRRLost += getLostMRR(r);
    });

    const netMRR = totalMRRSaved - totalMRRLost;
    const annualizedSaved = totalMRRSaved * 12;
    const annualizedLost = totalMRRLost * 12;
    const netAnnualized = netMRR * 12;

    // Theme Breakdown
    const themeMap: Record<string, { count: number; mrrLost: number }> = {};
    cancelledRequests.forEach(r => {
      const theme = r.cancellationTheme || 'Uncategorized';
      if (!themeMap[theme]) themeMap[theme] = { count: 0, mrrLost: 0 };
      themeMap[theme].count += 1;
      themeMap[theme].mrrLost += getLostMRR(r);
    });
    const themeData = Object.entries(themeMap).map(([name, data]) => ({
      name,
      count: data.count,
      mrrLost: Math.round(data.mrrLost),
      annualLost: Math.round(data.mrrLost * 12)
    })).sort((a, b) => b.count - a.count);

    // Why / Category Breakdown
    const categoryMap: Record<string, { count: number; mrrLost: number }> = {};
    cancelledRequests.forEach(r => {
      // @ts-ignore
      const cat = r.cancellationCategory || r.cancellationWhy || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, mrrLost: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].mrrLost += getLostMRR(r);
    });
    const categoryData = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      count: data.count,
      mrrLost: Math.round(data.mrrLost)
    })).sort((a, b) => b.count - a.count);

    // Cancellation Reason Breakdown
    const reasonMap: Record<string, { count: number; mrrLost: number }> = {};
    cancelledRequests.forEach(r => {
      const reason = r.cancellationReason || 'No Reason Provided';
      if (!reasonMap[reason]) reasonMap[reason] = { count: 0, mrrLost: 0 };
      reasonMap[reason].count += 1;
      reasonMap[reason].mrrLost += getLostMRR(r);
    });
    const reasonData = Object.entries(reasonMap).map(([name, data]) => ({
      name,
      count: data.count,
      mrrLost: Math.round(data.mrrLost)
    })).sort((a, b) => b.count - a.count);

    // Retention Strategy Breakdown
    const strategyMap: Record<string, { count: number; mrrSaved: number }> = {};
    savedRequests.forEach(r => {
      const strategy = normalizeRetentionStrategy(r.saveStrategy);
      if (!strategyMap[strategy]) strategyMap[strategy] = { count: 0, mrrSaved: 0 };
      strategyMap[strategy].count += 1;
      strategyMap[strategy].mrrSaved += getSavedMRR(r);
    });
    const strategyData = Object.entries(strategyMap).map(([name, data]) => ({
      name,
      count: data.count,
      mrrSaved: Math.round(data.mrrSaved),
      annualSaved: Math.round(data.mrrSaved * 12)
    })).sort((a, b) => b.count - a.count);

    // Monthly Trend Data
    const monthlyMap: Record<string, { savedCount: number; cancelledCount: number; mrrSaved: number; mrrLost: number }> = {};
    filteredRequests.forEach(r => {
      const dStr = r.processedAt || r.requestedDate;
      const month = dStr ? dStr.substring(0, 7) : 'Unknown'; // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = { savedCount: 0, cancelledCount: 0, mrrSaved: 0, mrrLost: 0 };
      }
      if (r.status === 'Saved') {
        monthlyMap[month].savedCount += 1;
        monthlyMap[month].mrrSaved += getSavedMRR(r);
      } else if (r.status === 'Cancelled') {
        monthlyMap[month].cancelledCount += 1;
        monthlyMap[month].mrrLost += getLostMRR(r);
      }
    });

    const trendData = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        ...data,
        mrrSaved: Math.round(data.mrrSaved),
        mrrLost: Math.round(data.mrrLost)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // List of unique themes & strategies for filters
    const availableThemes = Array.from(new Set(requests.map(r => r.cancellationTheme).filter(Boolean)));
    const availableStrategies = Array.from(new Set(requests.map(r => r.saveStrategy ? normalizeRetentionStrategy(r.saveStrategy) : null).filter((s): s is string => Boolean(s))));

    return {
      totalRequests,
      pendingCount: pendingRequests.length,
      savedCount: savedRequests.length,
      cancelledCount: cancelledRequests.length,
      saveRate,
      totalMRRSaved: Math.round(totalMRRSaved),
      totalMRRLost: Math.round(totalMRRLost),
      netMRR: Math.round(netMRR),
      annualizedSaved: Math.round(annualizedSaved),
      annualizedLost: Math.round(annualizedLost),
      netAnnualized: Math.round(netAnnualized),
      themeData,
      categoryData,
      reasonData,
      strategyData,
      trendData,
      availableThemes,
      availableStrategies,
      pendingRequests,
      savedRequests,
      cancelledRequests
    };
  }, [filteredRequests, requests]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredRequests.length === 0) return;

    const headers = [
      'Company Name',
      'Contact Name',
      'Contact Email',
      'Status',
      'Signed Customer',
      '3-Month Avg Invoice ($)',
      'Save Strategy',
      'Cancellation Theme',
      'Cancellation Category / Why',
      'Cancellation Reason',
      'Requested Date',
      'True Cancellation Date',
      'Original / Baseline MRR ($)',
      'Saved MRR ($)',
      'MRR Lost ($)',
      'Annual Value Saved ($)',
      'Annual Value Lost ($)',
      'Processed By',
      'Processed At',
      'Notes'
    ];

    const rows = filteredRequests.map(r => {
      const isSigned = Boolean(r.isSignedCustomer);
      const avg3Month = r.avg3MonthInvoiceMRR ?? (isSigned ? (r.originalMRR ?? 0) : 0);
      const origMRR = r.originalMRR ?? (isSigned ? avg3Month : calculateMRR(r.originalServices));
      const savedMRR = r.status === 'Saved' ? (r.savedMRR ?? calculateMRR(r.updatedServices || r.originalServices)) : 0;
      const mrrLost = r.status === 'Cancelled' ? origMRR : 0;

      return [
        `"${(r.companyName || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${(r.contactEmail || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${isSigned ? 'Yes' : 'No'}"`,
        avg3Month.toFixed(2),
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
        (savedMRR * 12).toFixed(2),
        (mrrLost * 12).toFixed(2),
        `"${(r.processedBy || '').replace(/"/g, '""')}"`,
        `"${r.processedAt || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cancellation_Retention_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-white/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#095c7b] text-white rounded-xl shadow-sm">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#095c7b] tracking-tight">
                Cancellation & Retention Reporting
              </h1>
              <p className="text-slate-600 text-sm mt-0.5">
                Comprehensive analytics for saved customers, processed cancellations, financial revenue impact, themes & retention strategies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Quick Date Presets */}
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
              <Button variant="outline" className="bg-white border-slate-300 gap-2">
                <CalendarIcon className="h-4 w-4 text-[#095c7b]" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, yyyy')}
                    </>
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
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Refresh button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-white border-slate-300 text-[#095c7b]"
            onClick={() => { setRefreshing(true); fetchRequests(); }}
            disabled={refreshing}
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export to CSV */}
          <Button 
            onClick={exportToCSV}
            className="bg-[#095c7b] text-white hover:bg-[#074760] gap-2 shadow-sm font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enquiries Card */}
        <Card 
          onClick={() => setModalData({
            title: 'Cancellation Enquiries List',
            subtitle: `Showing all ${metrics.totalRequests} cancellation requests matching selected period`,
            type: 'enquiries',
            items: filteredRequests
          })}
          className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md hover:border-[#095c7b]/50 hover:scale-[1.01] transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-[#095c7b] transition-colors">Cancellation Enquiries</p>
              <h3 className="text-2xl font-bold text-[#095c7b] mt-1">{metrics.totalRequests}</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-amber-600">{metrics.pendingCount}</span> pending processing • <span className="underline font-medium text-[#095c7b]">View List</span>
              </p>
            </div>
            <div className="p-3 bg-[#095c7b]/10 rounded-2xl text-[#095c7b] group-hover:bg-[#095c7b] group-hover:text-white transition-all">
              <HelpCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Saved & Retention Rate */}
        <Card 
          onClick={() => setModalData({
            title: 'Saved Customers List',
            subtitle: `Showing ${metrics.savedCount} customers retained through save strategies`,
            type: 'saved',
            items: metrics.savedRequests
          })}
          className="bg-white/90 border-[#095c7b]/20 shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:scale-[1.01] transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">Customers Saved</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-emerald-600">{metrics.savedCount}</h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                  {metrics.saveRate}% Save Rate
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">Retained accounts • <span className="underline font-medium text-emerald-700">View List</span></p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Smile className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Money Saved */}
        <Card 
          onClick={() => setModalData({
            title: 'Money Saved (MRR) Customer List',
            subtitle: `Showing ${metrics.savedCount} saved accounts generating $${metrics.totalMRRSaved.toLocaleString()}/mo ($${metrics.annualizedSaved.toLocaleString()}/yr)`,
            type: 'money_saved',
            items: metrics.savedRequests
          })}
          className="bg-white/90 border-emerald-500/30 shadow-sm hover:shadow-md hover:border-emerald-500 hover:scale-[1.01] transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">Money Saved (MRR)</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                ${metrics.totalMRRSaved.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span>
              </h3>
              <p className="text-xs font-medium text-emerald-700 mt-1">
                ${metrics.annualizedSaved.toLocaleString()} Annual Saved • <span className="underline font-medium">View List</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-100/80 rounded-2xl text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Money Lost */}
        <Card 
          onClick={() => setModalData({
            title: 'Money Lost (MRR) Customer List',
            subtitle: `Showing ${metrics.cancelledCount} cancelled accounts representing $${metrics.totalMRRLost.toLocaleString()}/mo ($${metrics.annualizedLost.toLocaleString()}/yr) lost`,
            type: 'money_lost',
            items: metrics.cancelledRequests
          })}
          className="bg-white/90 border-rose-500/30 shadow-sm hover:shadow-md hover:border-rose-500 hover:scale-[1.01] transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-rose-700 transition-colors">Money Lost (MRR)</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                ${metrics.totalMRRLost.toLocaleString()}<span className="text-xs font-normal text-slate-500">/mo</span>
              </h3>
              <p className="text-xs font-medium text-rose-700 mt-1">
                ${metrics.annualizedLost.toLocaleString()} Annual Lost • <span className="underline font-medium">View List</span>
              </p>
            </div>
            <div className="p-3 bg-rose-100/80 rounded-2xl text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-all">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col space-y-4">
        
        {/* Controls Bar & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/80 p-3 rounded-xl border border-white/60">
          <TabsList className="bg-slate-100 p-1 rounded-lg w-full lg:w-auto flex flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white font-semibold">
              <BarChart2 className="h-4 w-4 mr-1.5" /> Analytics Overview
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white font-semibold">
              <Smile className="h-4 w-4 mr-1.5 text-emerald-400" /> Saved Accounts ({metrics.savedCount})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white font-semibold">
              <ShieldAlert className="h-4 w-4 mr-1.5 text-rose-400" /> Processed Cancellations ({metrics.cancelledCount})
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white font-semibold">
              <Layers className="h-4 w-4 mr-1.5" /> All Audit Log ({metrics.totalRequests})
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 lg:flex-initial">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search company, reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-300 h-9"
              />
            </div>

            {/* Status Dropdown */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-white border-slate-300 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Saved">Saved Only</SelectItem>
                <SelectItem value="Cancelled">Cancelled Only</SelectItem>
                <SelectItem value="Pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Theme Dropdown */}
            {metrics.availableThemes.length > 0 && (
              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger className="w-[150px] bg-white border-slate-300 h-9">
                  <SelectValue placeholder="Main Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  {metrics.availableThemes.map(t => (
                    <SelectItem key={t} value={t!}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Strategy Dropdown */}
            {metrics.availableStrategies.length > 0 && (
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="w-[160px] bg-white border-slate-300 h-9">
                  <SelectValue placeholder="Save Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Save Strategies</SelectItem>
                  {metrics.availableStrategies.map(s => (
                    <SelectItem key={s} value={s!}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tab 1: Overview Analytics */}
        <TabsContent value="overview" className="space-y-6 m-0">
          
          {/* Net Revenue Impact Card */}
          <Card className="bg-gradient-to-r from-[#095c7b] to-[#0d789e] text-white shadow-md border-none">
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                  Net Financial Performance
                </span>
                <h2 className="text-3xl font-extrabold mt-2">
                  Net MRR Impact: {metrics.netMRR >= 0 ? `+$${metrics.netMRR.toLocaleString()}` : `-$${Math.abs(metrics.netMRR).toLocaleString()}`}/mo
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  Annualized Net Difference: <strong className="text-white">{metrics.netAnnualized >= 0 ? `+$${metrics.netAnnualized.toLocaleString()}` : `-$${Math.abs(metrics.netAnnualized).toLocaleString()}`}</strong>
                </p>
              </div>

              <div className="flex items-center gap-6 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <div>
                  <p className="text-xs text-white/70">MRR Saved</p>
                  <p className="text-xl font-bold text-emerald-300">+${metrics.totalMRRSaved.toLocaleString()}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <p className="text-xs text-white/70">MRR Lost</p>
                  <p className="text-xl font-bold text-rose-300">-${metrics.totalMRRLost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Themes & Retention Strategies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Cancellation Main Theme Breakdown */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold flex items-center justify-between">
                  <span>Main Themes of Cancellation</span>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700">Lost Customers</Badge>
                </CardTitle>
                <CardDescription>Primary reasons why customers process cancellations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  {metrics.themeData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-400 italic">No theme data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.themeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {metrics.themeData.map((entry, index) => (
                            <Cell key={`cell-theme-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, item) => [`${value} cancellations ($${item.payload.mrrLost}/mo lost)`, item.payload.name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Summary Table for Themes */}
                {metrics.themeData.length > 0 && (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-[#095c7b]">Theme</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-center">Count</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">MRR Lost</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">Annual Lost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.themeData.slice(0, 5).map(theme => (
                        <TableRow key={theme.name}>
                          <TableCell className="font-semibold text-slate-700">{theme.name}</TableCell>
                          <TableCell className="text-center font-medium">{theme.count}</TableCell>
                          <TableCell className="text-right text-rose-600 font-bold">${theme.mrrLost.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-slate-600">${theme.annualLost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Retention Save Strategies Performance */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold flex items-center justify-between">
                  <span>Retention & Save Strategies</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Saved Customers</Badge>
                </CardTitle>
                <CardDescription>Breakdown of strategies used to retain accounts and MRR saved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  {metrics.strategyData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-400 italic">No retention strategy data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.strategyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {metrics.strategyData.map((entry, index) => (
                            <Cell key={`cell-strat-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, item) => [`${value} accounts saved ($${item.payload.mrrSaved}/mo saved)`, item.payload.name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Summary Table for Strategies */}
                {metrics.strategyData.length > 0 && (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-[#095c7b]">Strategy Type</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-center">Saved</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">MRR Saved</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">Annual Saved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.strategyData.map(strat => (
                        <TableRow key={strat.name}>
                          <TableCell className="font-semibold text-slate-700">{strat.name}</TableCell>
                          <TableCell className="text-center font-medium">{strat.count}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-bold">${strat.mrrSaved.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-slate-600">${strat.annualSaved.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Section 2: Why/Category & Reason Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Cancellation Whys / Category */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold">Cancellation Categories / Why</CardTitle>
                <CardDescription>Grouping of root causes for cancellations</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {metrics.categoryData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">No category data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value, name, item) => [`${value} cancellations`, item.payload.name]} />
                      <Bar dataKey="count" fill="#38bdf8" name="Count" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Cancellation Reasons */}
            <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
              <CardHeader>
                <CardTitle className="text-[#095c7b] text-base font-bold">Top Specific Cancellation Reasons</CardTitle>
                <CardDescription>Ranked by occurrence count and MRR loss</CardDescription>
              </CardHeader>
              <CardContent className="h-72 overflow-y-auto">
                {metrics.reasonData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">No reason data available</div>
                ) : (
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-[#095c7b]">Reason</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-center">Count</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">MRR Lost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.reasonData.map(reason => (
                        <TableRow key={reason.name}>
                          <TableCell className="font-medium text-slate-800">{reason.name}</TableCell>
                          <TableCell className="text-center font-bold">{reason.count}</TableCell>
                          <TableCell className="text-right text-rose-600 font-bold">${reason.mrrLost.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Section 3: Monthly Financial Trend Chart */}
          <Card className="bg-white/95 shadow-sm border-[#095c7b]/10">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-base font-bold">Monthly Financial Trend (MRR Saved vs Lost)</CardTitle>
              <CardDescription>Comparison of monthly revenue retained vs revenue lost over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {metrics.trendData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 italic">No trend data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="mrrSaved" fill="#10b981" name="MRR Saved ($)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mrrLost" fill="#f43f5e" name="MRR Lost ($)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* Tab 2: Saved Accounts Log */}
        <TabsContent value="saved" className="m-0">
          <Card className="bg-white/90 shadow-sm border-white/60">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-base font-bold flex items-center gap-2">
                <Smile className="h-5 w-5 text-emerald-600" />
                Saved Customers Log ({metrics.savedCount})
              </CardTitle>
              <CardDescription>All customer accounts successfully retained through save strategies</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {metrics.savedRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">No saved customer records found matching filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-[#095c7b]">Company Name</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Save Strategy</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">MRR Saved</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">Annual Value</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Processed By</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Processed Date</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.savedRequests.map(req => {
                      const savedMRR = req.savedMRR ?? calculateMRR(req.updatedServices || req.originalServices);
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-semibold text-slate-800">
                            <a 
                              href={`/companies/${req.leadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#095c7b] hover:underline font-bold"
                            >
                              {req.companyName}
                            </a>
                            <div className="text-xs text-slate-500 font-normal mt-0.5">{req.contactName}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
                              {normalizeRetentionStrategy(req.saveStrategy)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            ${savedMRR.toFixed(2)}/mo
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            ${(savedMRR * 12).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.processedBy || 'System'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-xs truncate" title={req.notes}>
                            {req.notes || 'No notes provided'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Processed Cancellations Log */}
        <TabsContent value="cancelled" className="m-0">
          <Card className="bg-white/90 shadow-sm border-white/60">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-base font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Processed Cancellations Log ({metrics.cancelledCount})
              </CardTitle>
              <CardDescription>All accounts processed as lost customer cancellations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {metrics.cancelledRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">No processed cancellation records found matching filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-[#095c7b]">Company Name</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Main Theme</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Category / Why</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Cancellation Reason</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">MRR Lost</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">Annual Lost</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Stop Date</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.cancelledRequests.map(req => {
                      const mrrLost = getLostMRR(req);
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-semibold text-slate-800">
                            <a 
                              href={`/companies/${req.leadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#095c7b] hover:underline font-bold"
                            >
                              {req.companyName}
                            </a>
                            <div className="text-xs text-slate-500 font-normal mt-0.5">{req.contactName}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium">
                              {req.cancellationTheme || 'Uncategorized'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {/* @ts-ignore */}
                            {req.cancellationCategory || req.cancellationWhy || 'General'}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-800">
                            {req.cancellationReason || 'Other'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600">
                            ${mrrLost.toFixed(2)}/mo
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            ${(mrrLost * 12).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.trueServiceCancellationDate ? new Date(req.trueServiceCancellationDate).toLocaleDateString() : (req.cancellationDate ? new Date(req.cancellationDate).toLocaleDateString() : 'N/A')}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.processedBy || 'System'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Full Requests Audit Log */}
        <TabsContent value="audit" className="m-0">
          <Card className="bg-white/90 shadow-sm border-white/60">
            <CardHeader>
              <CardTitle className="text-[#095c7b] text-base font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#095c7b]" />
                Unified Cancellation & Retention Audit Log ({filteredRequests.length})
              </CardTitle>
              <CardDescription>Complete audit record of all cancellation enquiries, saved accounts, and processed cancellations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">No records found matching filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-[#095c7b]">Company Name</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Status</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Requested Date</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Main Theme</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Reason / Strategy</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">Financial Impact</TableHead>
                      <TableHead className="font-bold text-[#095c7b]">Processed By</TableHead>
                      <TableHead className="font-bold text-[#095c7b] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map(req => {
                      const origMRR = req.originalMRR ?? calculateMRR(req.originalServices);
                      const savedMRR = req.savedMRR ?? calculateMRR(req.updatedServices || req.originalServices);

                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-semibold text-slate-800">
                            <a 
                              href={`/companies/${req.leadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#095c7b] hover:underline font-bold"
                            >
                              {req.companyName}
                            </a>
                            <div className="text-xs text-slate-500 font-normal mt-0.5">{req.contactName || 'No Contact'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              req.status === 'Pending' ? 'bg-amber-500 text-white' :
                              req.status === 'Saved' ? 'bg-emerald-600 text-white' :
                              'bg-rose-600 text-white'
                            }>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.requestedDate ? new Date(req.requestedDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700">
                            {req.cancellationTheme || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.status === 'Saved' ? (
                              <span className="text-emerald-700 font-medium">{normalizeRetentionStrategy(req.saveStrategy)}</span>
                            ) : (
                              <span>{req.cancellationReason || 'Other'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            {req.status === 'Saved' ? (
                              <span className="text-emerald-600">+${savedMRR.toFixed(2)}/mo saved</span>
                            ) : req.status === 'Cancelled' ? (
                              <span className="text-rose-600">-${origMRR.toFixed(2)}/mo lost</span>
                            ) : (
                              <span className="text-slate-500">${origMRR.toFixed(2)}/mo at risk</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {req.processedBy ? (
                              <div>
                                <div>{req.processedBy}</div>
                                <div className="text-[10px] text-slate-400">
                                  {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unprocessed</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-[#095c7b] hover:bg-[#095c7b]/10"
                              onClick={() => window.open(`/companies/${req.leadId}`, '_blank')}
                            >
                              View Profile <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* KPI Customer List Drilldown Modal */}
      <Dialog open={!!modalData} onOpenChange={(open) => { if (!open) setModalData(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b">
            <div>
              <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
                {modalData?.title}
                <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] font-bold">
                  {filteredModalItems.length} Customers
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-xs mt-0.5">
                {modalData?.subtitle}
              </DialogDescription>
            </div>

            <Button
              onClick={() => handleExportModalCSV(modalData?.title || 'Cancellation_Report_List', filteredModalItems)}
              className="bg-[#095c7b] text-white hover:bg-[#074760] gap-2 shrink-0 size-sm font-semibold"
            >
              <Download className="h-4 w-4" /> Export Customer List
            </Button>
          </DialogHeader>

          {/* Controls in Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search customer, contact, reason..."
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-300 h-9 text-sm"
              />
            </div>

            {modalData?.type === 'enquiries' && (
              <Select value={modalStatusFilter} onValueChange={setModalStatusFilter}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Saved">Saved Only</SelectItem>
                  <SelectItem value="Cancelled">Cancelled Only</SelectItem>
                  <SelectItem value="Pending">Pending Only</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Customers Table in Modal */}
          <div className="flex-1 overflow-y-auto border rounded-xl bg-white max-h-[50vh]">
            {filteredModalItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic">No customers found matching search.</div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-xs">
                  <TableRow>
                    <TableHead className="font-bold text-[#095c7b]">Company Name</TableHead>
                    <TableHead className="font-bold text-[#095c7b]">Status</TableHead>
                    <TableHead className="font-bold text-[#095c7b]">Theme / Reason / Strategy</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-right">MRR</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-right">Annual Value</TableHead>
                    <TableHead className="font-bold text-[#095c7b]">Date</TableHead>
                    <TableHead className="font-bold text-[#095c7b]">Processed By</TableHead>
                    <TableHead className="font-bold text-[#095c7b] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalItems.map(req => {
                    const origMRR = getLostMRR(req);
                    const savedMRR = getSavedMRR(req);

                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold text-slate-800">
                          <a
                            href={`/companies/${req.leadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#095c7b] hover:underline font-bold"
                          >
                            {req.companyName}
                          </a>
                          <div className="text-xs text-slate-500 font-normal mt-0.5">{req.contactName || 'No Contact'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            req.status === 'Pending' ? 'bg-amber-500 text-white' :
                            req.status === 'Saved' ? 'bg-emerald-600 text-white' :
                            'bg-rose-600 text-white'
                          }>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {req.status === 'Saved' ? (
                            <div>
                              <span className="font-medium text-emerald-700">{normalizeRetentionStrategy(req.saveStrategy)}</span>
                              {req.cancellationTheme && <div className="text-[10px] text-slate-400">{req.cancellationTheme}</div>}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-rose-700">{req.cancellationReason || 'Other'}</span>
                              {req.cancellationTheme && <div className="text-[10px] text-slate-400">{req.cancellationTheme}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {req.status === 'Saved' ? (
                            <span className="text-emerald-600">${savedMRR.toFixed(2)}/mo</span>
                          ) : req.status === 'Cancelled' ? (
                            <span className="text-rose-600">${origMRR.toFixed(2)}/mo</span>
                          ) : (
                            <span className="text-slate-500">${origMRR.toFixed(2)}/mo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-700">
                          {req.status === 'Saved' ? (
                            <span className="text-emerald-700">${(savedMRR * 12).toFixed(2)}</span>
                          ) : req.status === 'Cancelled' ? (
                            <span className="text-rose-700">${(origMRR * 12).toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-600">${(origMRR * 12).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : (req.requestedDate ? new Date(req.requestedDate).toLocaleDateString() : 'N/A')}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {req.processedBy || 'Unprocessed'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#095c7b] hover:bg-[#095c7b]/10 text-xs"
                            onClick={() => window.open(`/companies/${req.leadId}`, '_blank')}
                          >
                            View Profile <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
