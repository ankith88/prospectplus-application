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
  Radio,
  SlidersHorizontal,
  Info,
  UserCheck,
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
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import type { LeadStatus } from '@/lib/types';
import type { InboundCallsReportResponse, EnrichedInboundCall, AircallNumber } from '@/services/aircall-reporting-server';

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'];

function formatDurationSeconds(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function normalizeDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export default function MyInboundCallsClient() {
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Applied Filters (drives data fetching & filtering)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 7));
    return { from: start, to: end };
  });
  const [appliedDatePreset, setAppliedDatePreset] = useState<string>('last_7_days');
  const [appliedNumberId, setAppliedNumberId] = useState<string>('all_my_lines');
  const [appliedCallStatusFilter, setAppliedCallStatusFilter] = useState<'all' | 'missed' | 'answered'>('all');
  const [appliedMatchFilter, setAppliedMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [appliedHoursFilter, setAppliedHoursFilter] = useState<'all' | 'in_hours' | 'out_of_hours'>('all');

  // Pending Filters (controlled by user inputs before applying)
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(appliedDateRange);
  const [pendingDatePreset, setPendingDatePreset] = useState<string>('last_7_days');
  const [pendingNumberId, setPendingNumberId] = useState<string>('all_my_lines');
  const [pendingCallStatusFilter, setPendingCallStatusFilter] = useState<'all' | 'missed' | 'answered'>('all');
  const [pendingMatchFilter, setPendingMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [pendingHoursFilter, setPendingHoursFilter] = useState<'all' | 'in_hours' | 'out_of_hours'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Aircall Numbers & Selection
  const [allAircallNumbers, setAllAircallNumbers] = useState<AircallNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState<boolean>(true);

  // Data states
  const [reportData, setReportData] = useState<InboundCallsReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'calls' | 'analytics'>('calls');

  // 1. Fetch configured Aircall Numbers on mount
  useEffect(() => {
    async function loadNumbers() {
      try {
        setLoadingNumbers(true);
        const res = await fetch('/api/reports/aircall-missed-calls?action=numbers');
        const json = await res.json();
        if (json.success && Array.isArray(json.numbers)) {
          setAllAircallNumbers(json.numbers);
        }
      } catch (err) {
        console.error('Failed to load Aircall numbers list:', err);
      } finally {
        setLoadingNumbers(false);
      }
    }
    loadNumbers();
  }, []);

  // 2. Identify all Aircall Numbers linked to the logged-in user
  const userLinkedNumbers = useMemo(() => {
    if (!user && !userProfile) return [];
    if (allAircallNumbers.length === 0) return [];

    const userProfileAircall = normalizeDigits(userProfile?.aircallPhoneNumber);
    const userPhone = normalizeDigits(userProfile?.phoneNumber || userProfile?.mobileNumber);
    const userEmail = (userProfile?.email || user?.email || '').trim().toLowerCase();
    const userName = (userProfile?.displayName || userProfile?.name || '').trim().toLowerCase();
    const userAircallId = userProfile?.aircallUserId ? String(userProfile.aircallUserId).trim() : null;

    return allAircallNumbers.filter((num) => {
      const numDigits = normalizeDigits(num.digits);

      // Match A: Explicit Aircall Phone Number match in Profile
      if (userProfileAircall && (numDigits.endsWith(userProfileAircall.slice(-9)) || userProfileAircall.endsWith(numDigits.slice(-9)))) {
        return true;
      }

      // Match B: User Mobile/Phone match
      if (userPhone && userPhone.length >= 8 && (numDigits.endsWith(userPhone.slice(-9)) || userPhone.endsWith(numDigits.slice(-9)))) {
        return true;
      }

      // Match C: Assigned user in Aircall number matches user email
      if (num.assignedUsers && num.assignedUsers.length > 0) {
        const hasEmailMatch = num.assignedUsers.some((u) => u.email && u.email.trim().toLowerCase() === userEmail);
        if (hasEmailMatch) return true;

        // Match D: Aircall User ID match
        if (userAircallId && num.assignedUsers.some((u) => String(u.id) === userAircallId)) {
          return true;
        }

        // Match E: Assigned user name matches user display name
        if (userName && userName.length >= 3 && num.assignedUsers.some((u) => u.name && u.name.trim().toLowerCase() === userName)) {
          return true;
        }
      }

      // Match F: Line name contains user's full name
      if (userName && userName.length >= 4 && num.name.toLowerCase().includes(userName)) {
        return true;
      }

      return false;
    });
  }, [allAircallNumbers, user, userProfile]);

  // Compute effective number IDs for APPLIED selection
  const getEffectiveNumberParam = (selectedId: string) => {
    if (userLinkedNumbers.length === 0) return null;
    if (selectedId === 'all_my_lines') {
      return userLinkedNumbers.map((n) => n.id).join(',');
    }
    return selectedId;
  };

  // Check if unapplied changes exist
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

  // 3. Fetch Inbound Calls for the logged in user's number(s)
  const fetchReport = async (range = appliedDateRange, numberSelection = appliedNumberId, showRefresh = false) => {
    const numberParam = getEffectiveNumberParam(numberSelection);
    if (!numberParam) {
      setReportData(null);
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const fromIso = range?.from ? range.from.toISOString() : '';
      const toIso = range?.to ? range.to.toISOString() : '';

      const params = new URLSearchParams();
      if (fromIso) params.set('from', fromIso);
      if (toIso) params.set('to', toIso);
      params.set('numberId', numberParam);

      const response = await fetch(`/api/reports/aircall-missed-calls?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch inbound call data');
      }

      setReportData(data);
    } catch (err: any) {
      console.error('Failed to fetch personal inbound calls:', err);
      toast({
        title: 'Error Loading Inbound Calls',
        description: err.message || 'Could not load calls for your Aircall line.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load once numbers are discovered
  useEffect(() => {
    if (!loadingNumbers) {
      fetchReport(appliedDateRange, appliedNumberId);
    }
  }, [loadingNumbers, userLinkedNumbers.length]);

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
      description: 'Your inbound calls have been updated.',
    });
  };

  // Reset Filters to Default
  const handleResetFilters = () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), 7));
    const defRange = { from: start, to: end };

    setPendingDateRange(defRange);
    setPendingDatePreset('last_7_days');
    setPendingNumberId('all_my_lines');
    setPendingCallStatusFilter('all');
    setPendingMatchFilter('all');
    setPendingHoursFilter('all');
    setSearchQuery('');

    setAppliedDateRange(defRange);
    setAppliedDatePreset('last_7_days');
    setAppliedNumberId('all_my_lines');
    setAppliedCallStatusFilter('all');
    setAppliedMatchFilter('all');
    setAppliedHoursFilter('all');

    fetchReport(defRange, 'all_my_lines');
    toast({
      title: 'Filters Reset',
      description: 'Reset back to default Last 7 Days for all your lines.',
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
        const matchesLead = call.matchedLead?.companyName?.toLowerCase().includes(q);
        const matchesContact = call.matchedLead?.contactName?.toLowerCase().includes(q);
        const matchesRep = call.matchedLead?.assignedRep?.toLowerCase().includes(q);
        const matchesLine = call.aircallNumberName.toLowerCase().includes(q);
        const matchesReason = call.missedReason.toLowerCase().includes(q);

        return matchesPhone || matchesLead || matchesContact || matchesRep || matchesLine || matchesReason;
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
      'My Aircall Line',
      'Line Digits',
      'Incoming Caller Phone',
      'Matched Lead / Company',
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
      `"${c.callerNumber}"`,
      `"${c.matchedLead?.companyName || 'Unregistered Caller'}"`,
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
    link.setAttribute('download', `my-inbound-calls-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: `Exported ${filteredCalls.length} calls to CSV.`,
    });
  };

  if (authLoading || loadingNumbers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading your Aircall profile & call history...</p>
      </div>
    );
  }

  // If user has no linked Aircall number
  if (userLinkedNumbers.length === 0) {
    return <AccessDenied />;
  }

  // Active Linked Line Details
  const primaryLine = userLinkedNumbers[0];
  const isMultiLine = userLinkedNumbers.length > 1;

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <PhoneIncoming className="h-7 w-7 text-[#095c7b]" />
              My Inbound Calls
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 text-xs font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {userLinkedNumbers.length === 1
                ? `${primaryLine.name} (${primaryLine.digits})`
                : `${userLinkedNumbers.length} Linked Lines`}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracking all incoming and missed calls received on your Aircall line, with automatic lead & customer attribution.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReport(appliedDateRange, appliedNumberId, true)}
            disabled={loading || isRefreshing}
            className="text-xs gap-1.5 h-9 bg-white dark:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={loading || !filteredCalls.length}
            className="text-xs gap-1.5 h-9 bg-white dark:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Date Preset Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" /> Period:
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border text-xs shadow-sm">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'last_7_days', label: 'Last 7 Days' },
                  { id: 'last_14_days', label: '14 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className={`px-2.5 py-1 rounded-md transition font-medium ${
                      pendingDatePreset === p.id
                        ? 'bg-[#095c7b] text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-xs gap-1.5 bg-white dark:bg-slate-800 ${
                      pendingDatePreset === 'custom' ? 'border-[#095c7b] text-[#095c7b] font-semibold' : ''
                    }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>
                      {pendingDateRange?.from ? (
                        pendingDateRange.to ? (
                          <>
                            {format(pendingDateRange.from, 'dd MMM')} - {format(pendingDateRange.to, 'dd MMM yyyy')}
                          </>
                        ) : (
                          format(pendingDateRange.from, 'dd MMM yyyy')
                        )
                      ) : (
                        'Custom Date'
                      )}
                    </span>
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

            {/* If user has multiple linked numbers, show line switcher */}
            {isMultiLine && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">My Line:</span>
                <Select value={pendingNumberId} onValueChange={setPendingNumberId}>
                  <SelectTrigger className="h-8 text-xs w-[220px] bg-white dark:bg-slate-800">
                    <SelectValue placeholder="All My Lines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_my_lines">All My Lines ({userLinkedNumbers.length})</SelectItem>
                    {userLinkedNumbers.map((num) => (
                      <SelectItem key={num.id} value={String(num.id)}>
                        {num.name} ({num.digits})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Secondary Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            {/* Call Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <Select
                value={pendingCallStatusFilter}
                onValueChange={(val: any) => setPendingCallStatusFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs w-[140px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inbound</SelectItem>
                  <SelectItem value="missed">Missed Only</SelectItem>
                  <SelectItem value="answered">Answered Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lead Match Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">CRM Match:</span>
              <Select
                value={pendingMatchFilter}
                onValueChange={(val: any) => setPendingMatchFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs w-[150px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Callers</SelectItem>
                  <SelectItem value="matched">Matched in CRM</SelectItem>
                  <SelectItem value="unmatched">Unregistered Caller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Hours Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Hours:</span>
              <Select
                value={pendingHoursFilter}
                onValueChange={(val: any) => setPendingHoursFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs w-[140px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hours</SelectItem>
                  <SelectItem value="in_hours">Business Hours</SelectItem>
                  <SelectItem value="out_of_hours">After Hours</SelectItem>
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
                Click &quot;Apply Filters&quot; to update your calls list
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
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
              {loading ? '-' : `Across ${reportData?.calls.length || 0} recorded sessions`}
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
              <PhoneCall className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '-' : reportData?.summary.totalAnswered ?? 0}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{loading ? '-' : `${reportData?.summary.answeredRate ?? 0}% Answer Rate`}</span>
            </p>
          </CardContent>
        </Card>

        {/* Missed Calls */}
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

        {/* Matched CRM Leads */}
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
          <p className="text-sm text-slate-500 mt-3 animate-pulse">Syncing calls from your Aircall line...</p>
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
                  <CardTitle className="text-base font-semibold">Incoming Calls Log</CardTitle>
                  <CardDescription className="text-xs">
                    Showing {filteredCalls.length} inbound calls received on your Aircall line with Prospect+ CRM matching.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search phone, lead, contact..."
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
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[160px]">Incoming Phone</TableHead>
                        <TableHead>Matched Prospect+ Lead</TableHead>
                        <TableHead className="w-[140px]">Lead Assigned Rep</TableHead>
                        <TableHead className="w-[150px]">Outcome / Reason</TableHead>
                        {isMultiLine && <TableHead className="w-[160px]">Line Received</TableHead>}
                        <TableHead className="text-right w-[130px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isMultiLine ? 8 : 7} className="h-40 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                              <p className="font-semibold text-slate-800 dark:text-slate-200">No Calls Found</p>
                              <p className="text-xs text-slate-400">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'No inbound calls match the selected filters.'}
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

                              {/* Line Received (if multiple) */}
                              {isMultiLine && (
                                <TableCell className="text-xs">
                                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                    {call.aircallNumberName}
                                  </div>
                                  <div className="text-slate-400 text-[11px] font-mono">
                                    {call.aircallNumberDigits}
                                  </div>
                                </TableCell>
                              )}

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

          {/* TAB 2: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Call Distribution */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#095c7b]" />
                    Hourly Call Traffic
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Inbound and missed call distribution by hour of day (Sydney AEST/AEDT)
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData?.hourlyDistribution || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="answeredCount" name="Answered" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="missedCount" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Day of Week Distribution */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-[#095c7b]" />
                    Day of Week Activity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Volume of inbound calls across days of the week
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData?.dayOfWeekDistribution || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="inboundCount" name="Total Inbound" fill="#095c7b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="missedCount" name="Missed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Missed Call Reasons */}
              <Card className="border shadow-sm lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-[#095c7b]" />
                    Missed Call Reasons
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown of reasons why calls went unanswered
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {reportData?.reasonsBreakdown && reportData.reasonsBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.reasonsBreakdown}
                              dataKey="count"
                              nameKey="label"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {reportData.reasonsBreakdown.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3">
                        {reportData.reasonsBreakdown.map((r, i) => (
                          <div key={r.reason} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{r.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{r.count}</span>
                              <span className="text-slate-400">({r.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No missed call reasons recorded in this period.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
