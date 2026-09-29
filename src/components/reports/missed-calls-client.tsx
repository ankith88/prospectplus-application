"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Phone,
  PhoneMissed,
  PhoneCall,
  PhoneIncoming,
  Calendar as CalendarIcon,
  Download,
  Filter,
  RefreshCw,
  Search,
  Building,
  User,
  Clock,
  ArrowUpRight,
  ExternalLink,
  PieChart as PieChartIcon,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import type { LeadStatus } from '@/lib/types';
import type { InboundCallsReportResponse, EnrichedInboundCall, NumberMetric, AircallNumber } from '@/services/aircall-reporting-server';

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'];

function formatDurationSeconds(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function MissedCallsClient() {
  const { toast } = useToast();

  // Applied Filters (drives data fetching & filtering)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 7));
    return { from: start, to: end };
  });
  const [appliedDatePreset, setAppliedDatePreset] = useState<string>('last_7_days');
  const [appliedNumberId, setAppliedNumberId] = useState<string>('all');
  const [appliedCallStatusFilter, setAppliedCallStatusFilter] = useState<'all' | 'missed' | 'answered'>('all');
  const [appliedMatchFilter, setAppliedMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [appliedHoursFilter, setAppliedHoursFilter] = useState<'all' | 'in_hours' | 'out_of_hours'>('all');

  // Pending Filters (controlled by user inputs before applying)
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(appliedDateRange);
  const [pendingDatePreset, setPendingDatePreset] = useState<string>('last_7_days');
  const [pendingNumberId, setPendingNumberId] = useState<string>('all');
  const [pendingCallStatusFilter, setPendingCallStatusFilter] = useState<'all' | 'missed' | 'answered'>('all');
  const [pendingMatchFilter, setPendingMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [pendingHoursFilter, setPendingHoursFilter] = useState<'all' | 'in_hours' | 'out_of_hours'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Check if there are unapplied filter changes
  const hasUnappliedFilters = useMemo(() => {
    const dateChanged =
      pendingDateRange?.from?.getTime() !== appliedDateRange?.from?.getTime() ||
      pendingDateRange?.to?.getTime() !== appliedDateRange?.to?.getTime();
    const numberChanged = pendingNumberId !== appliedNumberId;
    const statusChanged = pendingCallStatusFilter !== appliedCallStatusFilter;
    const matchChanged = pendingMatchFilter !== appliedMatchFilter;
    const hoursChanged = pendingHoursFilter !== appliedHoursFilter;

    return dateChanged || numberChanged || statusChanged || matchChanged || hoursChanged;
  }, [
    pendingDateRange,
    appliedDateRange,
    pendingNumberId,
    appliedNumberId,
    pendingCallStatusFilter,
    appliedCallStatusFilter,
    pendingMatchFilter,
    appliedMatchFilter,
    pendingHoursFilter,
    appliedHoursFilter,
  ]);

  // Data states
  const [reportData, setReportData] = useState<InboundCallsReportResponse | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AircallNumber[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Tab State for table view
  const [activeTab, setActiveTab] = useState<'calls' | 'lines' | 'analytics'>('calls');

  // Fetch configured Aircall Numbers on mount
  useEffect(() => {
    async function loadNumbers() {
      try {
        const res = await fetch('/api/reports/aircall-missed-calls?action=numbers');
        const json = await res.json();
        if (json.success && Array.isArray(json.numbers)) {
          setAvailableNumbers(json.numbers);
        }
      } catch (err) {
        console.error('Failed to load Aircall numbers list:', err);
      }
    }
    loadNumbers();
  }, []);

  // Fetch Report Data
  const fetchReport = async (range = appliedDateRange, numberId = appliedNumberId, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const fromIso = range?.from ? range.from.toISOString() : '';
      const toIso = range?.to ? range.to.toISOString() : '';

      const params = new URLSearchParams();
      if (fromIso) params.set('from', fromIso);
      if (toIso) params.set('to', toIso);
      if (numberId && numberId !== 'all') params.set('numberId', numberId);

      const response = await fetch(`/api/reports/aircall-missed-calls?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch report data');
      }

      setReportData(data);
    } catch (err: any) {
      console.error('Failed to fetch inbound calls report:', err);
      toast({
        title: 'Error Loading Calls Report',
        description: err.message || 'Could not load data from Aircall.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReport(appliedDateRange, appliedNumberId);
  }, []);

  // Handle Preset Selection (updates pending values)
  const handlePresetChange = (preset: string) => {
    setPendingDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        setPendingDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        setPendingDateRange({ from: startOfDay(y), to: endOfDay(y) });
        break;
      }
      case 'last_7_days':
        setPendingDateRange({ from: startOfDay(subDays(now, 7)), to: endOfDay(now) });
        break;
      case 'last_14_days':
        setPendingDateRange({ from: startOfDay(subDays(now, 14)), to: endOfDay(now) });
        break;
      case 'this_month':
        setPendingDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'last_month': {
        const prevMonth = subMonths(now, 1);
        setPendingDateRange({ from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) });
        break;
      }
      default:
        break;
    }
  };

  // Explicit Apply Filters Action
  const handleApplyFilters = () => {
    setAppliedDateRange(pendingDateRange);
    setAppliedDatePreset(pendingDatePreset);
    setAppliedNumberId(pendingNumberId);
    setAppliedCallStatusFilter(pendingCallStatusFilter);
    setAppliedMatchFilter(pendingMatchFilter);
    setAppliedHoursFilter(pendingHoursFilter);

    fetchReport(pendingDateRange, pendingNumberId);
    toast({
      title: 'Filters Applied',
      description: 'Report updated with the selected criteria.',
    });
  };

  // Reset Filters to Default
  const handleResetFilters = () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 7));
    const defRange = { from: start, to: end };

    setPendingDateRange(defRange);
    setPendingDatePreset('last_7_days');
    setPendingNumberId('all');
    setPendingCallStatusFilter('all');
    setPendingMatchFilter('all');
    setPendingHoursFilter('all');
    setSearchQuery('');

    setAppliedDateRange(defRange);
    setAppliedDatePreset('last_7_days');
    setAppliedNumberId('all');
    setAppliedCallStatusFilter('all');
    setAppliedMatchFilter('all');
    setAppliedHoursFilter('all');

    fetchReport(defRange, 'all');
    toast({
      title: 'Filters Reset',
      description: 'Reset back to default Last 7 Days across all lines.',
    });
  };

  // Filter and Search Calls using APPLIED filters + real-time search query
  const filteredCalls = useMemo(() => {
    if (!reportData?.calls) return [];

    return reportData.calls.filter((call) => {
      // Applied Call status filter
      if (appliedCallStatusFilter === 'missed' && call.callType !== 'missed') return false;
      if (appliedCallStatusFilter === 'answered' && call.callType !== 'answered') return false;

      // Applied Match filter
      if (appliedMatchFilter === 'matched' && !call.matchedLead) return false;
      if (appliedMatchFilter === 'unmatched' && call.matchedLead) return false;

      // Applied Hours filter
      const isOOH = call.missedReason === 'Out of Opening Hours';
      if (appliedHoursFilter === 'in_hours' && isOOH) return false;
      if (appliedHoursFilter === 'out_of_hours' && !isOOH) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPhone = call.callerNumber.toLowerCase().includes(q);
        const matchesLead = call.matchedLead?.companyName.toLowerCase().includes(q);
        const matchesContact = call.matchedLead?.contactName?.toLowerCase().includes(q);
        const matchesRep = call.matchedLead?.assignedRep?.toLowerCase().includes(q);
        const matchesLine = call.aircallNumberName.toLowerCase().includes(q);
        const matchesUser = call.aircallUser?.name.toLowerCase().includes(q);
        const matchesReason = call.missedReason.toLowerCase().includes(q);

        return matchesPhone || matchesLead || matchesContact || matchesRep || matchesLine || matchesUser || matchesReason;
      }

      return true;
    });
  }, [reportData, appliedCallStatusFilter, appliedMatchFilter, appliedHoursFilter, searchQuery]);

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast({
      title: 'Phone Copied',
      description: `${phone} copied to clipboard`,
    });
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredCalls || filteredCalls.length === 0) {
      toast({ title: 'No Data', description: 'No calls to export' });
      return;
    }

    const headers = [
      'Call ID',
      'Date & Time (AEST)',
      'Call Type',
      'Aircall Line Name',
      'Aircall Line Digits',
      'Aircall Line User / Owner',
      'Incoming Phone Number',
      'Matched Prospect/Company',
      'Lead Status',
      'Contact Person',
      'Assigned Lead Rep',
      'Outcome / Reason',
      'Call Duration (seconds)',
    ];

    const rows = filteredCalls.map((c) => [
      c.id,
      format(new Date(c.startedAt), 'dd/MM/yyyy HH:mm:ss'),
      `"${c.callType.toUpperCase()}"`,
      `"${c.aircallNumberName}"`,
      `"${c.aircallNumberDigits}"`,
      `"${c.aircallUser?.name || 'N/A'}"`,
      `"${c.callerNumber}"`,
      `"${c.matchedLead?.companyName || 'Unmatched'}"`,
      `"${c.matchedLead?.status || 'N/A'}"`,
      `"${c.matchedLead?.contactName || 'N/A'}"`,
      `"${c.matchedLead?.assignedRep || 'N/A'}"`,
      `"${c.missedReason}"`,
      c.duration,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aircall-inbound-calls-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: `Exported ${filteredCalls.length} calls to CSV.`,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Aircall Inbound & Missed Calls Reporting
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold px-2.5 py-0.5">
              Live Aircall Sync
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track total inbound and missed calls across all phone lines, identify assigned Aircall users, and view lead attribution.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReport(appliedDateRange, appliedNumberId, true)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={loading || filteredCalls.length === 0}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar with Apply Button */}
      <Card className="border shadow-sm bg-slate-50/50 dark:bg-slate-900/40">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Date Range Preset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Timeframe</label>
              <Select value={pendingDatePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_14_days">Last 14 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Popover */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-white dark:bg-slate-800 text-xs">
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                    {pendingDateRange?.from ? (
                      pendingDateRange.to ? (
                        <>
                          {format(pendingDateRange.from, 'dd MMM')} - {format(pendingDateRange.to, 'dd MMM yyyy')}
                        </>
                      ) : (
                        format(pendingDateRange.from, 'dd MMM yyyy')
                      )
                    ) : (
                      <span>Pick a range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={pendingDateRange?.from}
                    selected={pendingDateRange}
                    onSelect={(range) => {
                      setPendingDateRange(range);
                      setPendingDatePreset('custom');
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Call Status Filter (All / Missed / Answered) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Call Status</label>
              <Select value={pendingCallStatusFilter} onValueChange={(v: any) => setPendingCallStatusFilter(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="All Inbound Calls" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inbound Calls</SelectItem>
                  <SelectItem value="missed">Missed Calls Only</SelectItem>
                  <SelectItem value="answered">Answered Calls Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aircall Phone Number Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Aircall Line / Number</label>
              <Select value={pendingNumberId} onValueChange={setPendingNumberId}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="All Phone Lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phone Lines ({availableNumbers.length})</SelectItem>
                  {availableNumbers.map((num) => (
                    <SelectItem key={num.id} value={String(num.id)}>
                      {num.name} ({num.digits})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Match Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Lead Attribution</label>
              <Select value={pendingMatchFilter} onValueChange={(v: any) => setPendingMatchFilter(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="All Callers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Callers</SelectItem>
                  <SelectItem value="matched">Matched to Leads Only</SelectItem>
                  <SelectItem value="unmatched">Unmatched / New Numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Bar with Apply Filters and Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApplyFilters}
                disabled={loading}
                className={`h-9 px-4 text-xs font-semibold gap-2 transition-all duration-200 shadow-sm ${
                  hasUnappliedFilters
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 dark:ring-amber-800 scale-[1.02]'
                    : 'bg-[#095c7b] hover:bg-[#07475e] text-white'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{hasUnappliedFilters ? 'Apply Filters (Unsaved Changes)' : 'Apply Filters'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleResetFilters}
                disabled={loading}
                className="h-9 px-3 text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Reset
              </Button>
            </div>

            {hasUnappliedFilters && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                Click &quot;Apply Filters&quot; to load data with your new criteria
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inbound Calls */}
        <Card className="border shadow-sm bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Inbound Calls
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
              <PhoneIncoming className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '-' : reportData?.summary.totalInbound ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Received across all {availableNumbers.length} Aircall lines
            </p>
          </CardContent>
        </Card>

        {/* Answered Calls */}
        <Card className="border shadow-sm bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Answered Calls
            </CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '-' : reportData?.summary.totalAnswered ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Answered Rate:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {loading ? '-' : `${reportData?.summary.answeredRate ?? 0}%`}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Total Missed Calls */}
        <Card className="border shadow-sm bg-gradient-to-br from-white to-red-50/40 dark:from-slate-900 dark:to-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Missed Calls
            </CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400">
              <PhoneMissed className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '-' : reportData?.summary.totalMissed ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Missed Rate:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {loading ? '-' : `${reportData?.summary.missedRate ?? 0}%`}
              </span>
              <span className="text-slate-400">({reportData?.summary.inHoursMissed ?? 0} in-hours)</span>
            </p>
          </CardContent>
        </Card>

        {/* Matched Leads */}
        <Card className="border shadow-sm bg-gradient-to-br from-white to-purple-50/40 dark:from-slate-900 dark:to-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Matched Prospect+ Leads
            </CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
              <Building className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '-' : reportData?.summary.matchedLeadsCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {loading ? '-' : `${reportData?.summary.unmatchedCount ?? 0} unregistered callers`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border">
          <Loader />
          <p className="text-sm text-slate-500 mt-3 animate-pulse">Syncing call records from Aircall...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Navigation View Tabs */}
          <div className="flex items-center justify-between border-b">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('calls')}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'calls'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Inbound Calls Log ({filteredCalls.length})
              </button>
              <button
                onClick={() => setActiveTab('lines')}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'lines'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Line & User Breakdown ({reportData?.numbersBreakdown.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Visual Analytics & Peak Times
              </button>
            </div>
          </div>

          {/* TAB 1: CALLS LOG */}
          {activeTab === 'calls' && (
            <Card className="border shadow-sm">
              <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b bg-slate-50/40 dark:bg-slate-900/40">
                <div>
                  <CardTitle className="text-base font-semibold">Inbound & Missed Calls Log</CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filteredCalls.length} inbound calls with Aircall line, line owner user, and Prospect+ lead attribution.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search phone, lead, user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white dark:bg-slate-800"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="w-[150px]">Date & Time</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead className="w-[180px]">Aircall Line Called</TableHead>
                        <TableHead className="w-[140px]">Aircall User</TableHead>
                        <TableHead className="w-[160px]">Incoming Caller Phone</TableHead>
                        <TableHead>Matched Prospect+ Lead</TableHead>
                        <TableHead className="w-[140px]">Lead Assigned Rep</TableHead>
                        <TableHead className="w-[140px]">Outcome / Reason</TableHead>
                        <TableHead className="text-right w-[130px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-40 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                              <p className="font-semibold text-slate-800 dark:text-slate-200">No Calls Found</p>
                              <p className="text-xs text-slate-400">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'No calls match the selected filters.'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCalls.map((call) => {
                          const callDate = new Date(call.startedAt);
                          const isMissed = call.callType === 'missed';
                          const isOOH = call.missedReason === 'Out of Opening Hours';

                          return (
                            <TableRow key={call.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              {/* Date & Time */}
                              <TableCell className="text-xs">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {format(callDate, 'dd MMM yyyy')}
                                </div>
                                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {format(callDate, 'hh:mm a')}
                                </div>
                              </TableCell>

                              {/* Status Badge */}
                              <TableCell className="text-xs">
                                {isMissed ? (
                                  <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200 text-[11px] font-semibold">
                                    Missed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                                    Answered ({formatDurationSeconds(call.duration)})
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Aircall Line */}
                              <TableCell className="text-xs">
                                <div className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[170px]" title={call.aircallNumberName}>
                                  {call.aircallNumberName}
                                </div>
                                <div className="text-slate-400 text-[11px] font-mono">
                                  {call.aircallNumberDigits}
                                </div>
                              </TableCell>

                              {/* Aircall User / Line Owner */}
                              <TableCell className="text-xs">
                                {call.aircallUser?.name ? (
                                  <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    <User className="h-3 w-3 text-slate-400" />
                                    <span>{call.aircallUser.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Team Line</span>
                                )}
                              </TableCell>

                              {/* Incoming Caller Phone */}
                              <TableCell className="text-xs font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{call.callerNumber}</span>
                                  <button
                                    onClick={() => copyPhoneNumber(call.callerNumber)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                                    title="Copy Phone Number"
                                  >
                                    {copiedPhone === call.callerNumber ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </TableCell>

                              {/* Matched Lead */}
                              <TableCell className="text-xs">
                                {call.matchedLead ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={call.matchedLead.leadUrl}
                                        className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        {call.matchedLead.companyName}
                                        <ArrowUpRight className="h-3 w-3 inline" />
                                      </Link>
                                      <LeadStatusBadge status={call.matchedLead.status as LeadStatus} />
                                    </div>
                                    {call.matchedLead.contactName && (
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <User className="h-3 w-3 text-slate-400" />
                                        <span>{call.matchedLead.contactName}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-normal">
                                    Unregistered Caller
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Lead Assigned Rep */}
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                                {call.matchedLead?.assignedRep ? (
                                  <span className="font-medium">{call.matchedLead.assignedRep}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Unassigned</span>
                                )}
                              </TableCell>

                              {/* Outcome / Reason */}
                              <TableCell className="text-xs">
                                <Badge
                                  variant="secondary"
                                  className={`text-[11px] font-medium border ${
                                    isMissed
                                      ? isOOH
                                        ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {call.missedReason}
                                </Badge>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-right text-xs">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Call Back Link */}
                                  <a
                                    href={`tel:${call.callerNumber.replace(/\s+/g, '')}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 rounded-md transition shadow-sm"
                                    title="Call back via phone dialer"
                                  >
                                    <PhoneCall className="h-3 w-3" />
                                    <span>Call</span>
                                  </a>

                                  {call.matchedLead ? (
                                    <Link
                                      href={call.matchedLead.leadUrl}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md border"
                                    >
                                      <span>View</span>
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/leads?create=true&phone=${encodeURIComponent(call.callerNumber)}`}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200"
                                      title="Create new lead from this phone number"
                                    >
                                      <span>+ Lead</span>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: LINE & USER BREAKDOWN */}
          {activeTab === 'lines' && (
            <Card className="border shadow-sm">
              <CardHeader className="p-4 sm:p-5 border-b bg-slate-50/40 dark:bg-slate-900/40">
                <CardTitle className="text-base font-semibold">Phone Line & User Performance</CardTitle>
                <CardDescription className="text-xs">
                  Breakdown of total inbound calls, answered calls, and missed rates per Aircall line and assigned user.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead>Line Name</TableHead>
                        <TableHead>Assigned User / Owner</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead className="text-center">Total Inbound</TableHead>
                        <TableHead className="text-center">Answered</TableHead>
                        <TableHead className="text-center">Missed</TableHead>
                        <TableHead className="text-center">Missed Rate (%)</TableHead>
                        <TableHead className="text-center">In-Hours Missed</TableHead>
                        <TableHead className="text-center">After Hours</TableHead>
                        <TableHead>Primary Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData?.numbersBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                            No data available for lines in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData?.numbersBreakdown.map((line) => (
                          <TableRow key={line.numberId} className="hover:bg-slate-50/80">
                            <TableCell className="font-semibold text-slate-900 dark:text-white text-xs">
                              {line.name}
                            </TableCell>
                            <TableCell className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span>{line.assignedUser}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              {line.digits}
                            </TableCell>
                            <TableCell className="text-center text-xs font-bold text-blue-600 dark:text-blue-400">
                              {line.totalInbound}
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {line.totalAnswered}
                            </TableCell>
                            <TableCell className="text-center text-xs font-bold text-red-600 dark:text-red-400">
                              {line.totalMissed}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              <Badge
                                variant="outline"
                                className={`font-semibold ${
                                  line.missedRate > 30
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : line.missedRate > 15
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {line.missedRate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-xs text-amber-700 dark:text-amber-400 font-medium">
                              {line.inHoursMissed}
                            </TableCell>
                            <TableCell className="text-center text-xs text-slate-500">
                              {line.outOfHoursMissed}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                              <Badge variant="secondary" className="font-normal text-[11px]">
                                {line.topReason}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: VISUAL ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Inbound & Missed Volume Chart */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Hourly Inbound & Missed Call Volume (AEST)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Hourly comparison of answered vs missed inbound calls throughout the day.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData?.hourlyDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="answeredCount" fill="#10b981" radius={[4, 4, 0, 0]} name="Answered Calls" />
                        <Bar dataKey="missedCount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Missed Calls" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Missed Reason Breakdown */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-purple-600" />
                    Missed Call Reasons Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Root cause categorization of missed calls across all lines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData?.reasonsBreakdown || []}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={45}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {(reportData?.reasonsBreakdown || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Day of Week Distribution */}
              <Card className="border shadow-sm lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-emerald-600" />
                    Day of Week Inbound Volume & Missed Calls
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Total inbound and missed calls comparison across each day of the week.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData?.dayOfWeekDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="inboundCount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Inbound" />
                        <Bar dataKey="missedCount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Missed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
