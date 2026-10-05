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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Phone,
  PhoneMissed,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
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
  FileText,
  Mail,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Layers,
  List,
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
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import type { LeadStatus } from '@/lib/types';
import type { InboundCallsReportResponse, EnrichedInboundCall, AircallNumber, MatchedLeadInfo } from '@/services/aircall-reporting-server';
import { ResolveMissedCallDialog } from './reports/resolve-missed-call-dialog';

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'];

function formatDurationSeconds(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatResponseTime(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

function normalizeDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

interface CallerPhoneGroup {
  callerNumber: string;
  matchedLead: MatchedLeadInfo | null;
  totalCalls: number;
  missedCount: number;
  answeredCount: number;
  unreturnedCount: number;
  latestCallDate: Date;
  latestCall: EnrichedInboundCall;
  calls: EnrichedInboundCall[];
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
  const [appliedFollowupFilter, setAppliedFollowupFilter] = useState<'all' | 'unreturned' | 'callback' | 'lead_activity' | 'resolved'>('all');

  // Pending Filters (controlled by user inputs before applying)
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(appliedDateRange);
  const [pendingDatePreset, setPendingDatePreset] = useState<string>('last_7_days');
  const [pendingNumberId, setPendingNumberId] = useState<string>('all_my_lines');
  const [pendingCallStatusFilter, setPendingCallStatusFilter] = useState<'all' | 'missed' | 'answered'>('all');
  const [pendingMatchFilter, setPendingMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [pendingHoursFilter, setPendingHoursFilter] = useState<'all' | 'in_hours' | 'out_of_hours'>('all');
  const [pendingFollowupFilter, setPendingFollowupFilter] = useState<'all' | 'unreturned' | 'callback' | 'lead_activity' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Grouping & Display View Mode: default to grouped by caller phone number
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedPhoneGroups, setExpandedPhoneGroups] = useState<Record<string, boolean>>({});

  // Aircall Numbers & Selection
  const [allAircallNumbers, setAllAircallNumbers] = useState<AircallNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState<boolean>(true);

  // Resolution Dialog State
  const [resolutionCall, setResolutionCall] = useState<EnrichedInboundCall | null>(null);
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState<boolean>(false);

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
    const followupChanged = pendingFollowupFilter !== appliedFollowupFilter;

    return dateChanged || numberChanged || statusChanged || matchChanged || hoursChanged || followupChanged;
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
    pendingFollowupFilter,
    appliedFollowupFilter,
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
        setPendingDateRange({ from: startOfMonth(now), to: endOfDay(now) });
        break;
      case 'last_month': {
        const prevM = subMonths(now, 1);
        setPendingDateRange({ from: startOfMonth(prevM), to: endOfMonth(prevM) });
        break;
      }
      default:
        break;
    }
  };

  // Apply Pending Filters
  const handleApplyFilters = () => {
    setAppliedDateRange(pendingDateRange);
    setAppliedDatePreset(pendingDatePreset);
    setAppliedNumberId(pendingNumberId);
    setAppliedCallStatusFilter(pendingCallStatusFilter);
    setAppliedMatchFilter(pendingMatchFilter);
    setAppliedHoursFilter(pendingHoursFilter);
    setAppliedFollowupFilter(pendingFollowupFilter);

    fetchReport(pendingDateRange, pendingNumberId);
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
    setPendingFollowupFilter('all');
    setSearchQuery('');

    setAppliedDateRange(defRange);
    setAppliedDatePreset('last_7_days');
    setAppliedNumberId('all_my_lines');
    setAppliedCallStatusFilter('all');
    setAppliedMatchFilter('all');
    setAppliedHoursFilter('all');
    setAppliedFollowupFilter('all');

    fetchReport(defRange, 'all_my_lines');
  };

  // Update a single call after resolution
  const handleCallResolved = (updatedCall: EnrichedInboundCall) => {
    if (!reportData) return;
    const updatedCalls = reportData.calls.map((c) => (c.id === updatedCall.id ? updatedCall : c));

    let totalResolved = 0;
    let totalMissed = 0;
    updatedCalls.forEach((c) => {
      if (c.callType === 'missed') {
        totalMissed++;
        if (c.followup.status !== 'unreturned') totalResolved++;
      }
    });

    const followupRate = totalMissed > 0 ? Number(((totalResolved / totalMissed) * 100).toFixed(1)) : 100;
    const unaddressedMissedCount = totalMissed - totalResolved;

    setReportData({
      ...reportData,
      summary: {
        ...reportData.summary,
        resolvedCount: totalResolved,
        unreturnedCount: unaddressedMissedCount,
        unaddressedMissedCount,
        followupRate,
      },
      calls: updatedCalls,
    });
  };

  // Client-side filtering on calls
  const filteredCalls = useMemo(() => {
    if (!reportData || !reportData.calls) return [];

    return reportData.calls.filter((call) => {
      // 1. Call status filter
      if (appliedCallStatusFilter === 'missed' && call.callType !== 'missed') return false;
      if (appliedCallStatusFilter === 'answered' && call.callType !== 'answered') return false;

      // 2. Lead Match filter
      if (appliedMatchFilter === 'matched' && !call.matchedLead) return false;
      if (appliedMatchFilter === 'unmatched' && call.matchedLead) return false;

      // 3. Opening Hours filter
      const isOOH = call.missedReason === 'Out of Opening Hours';
      if (appliedHoursFilter === 'in_hours' && isOOH) return false;
      if (appliedHoursFilter === 'out_of_hours' && !isOOH) return false;

      // 4. Follow-up Status filter
      if (appliedFollowupFilter === 'unreturned') {
        if (call.callType !== 'missed' || call.followup.status !== 'unreturned') return false;
      } else if (appliedFollowupFilter === 'callback') {
        if (call.followup.status !== 'callback_connected' && call.followup.status !== 'callback_attempted') return false;
      } else if (appliedFollowupFilter === 'lead_activity') {
        if (call.followup.status !== 'lead_activity') return false;
      } else if (appliedFollowupFilter === 'resolved') {
        if (call.followup.status !== 'resolved_manually') return false;
      }

      // 5. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPhone = call.callerNumber.toLowerCase().includes(q);
        const matchesLead = call.matchedLead?.companyName.toLowerCase().includes(q);
        const matchesContact = call.matchedLead?.contactName?.toLowerCase().includes(q);
        const matchesLine = call.aircallNumberName.toLowerCase().includes(q);
        const matchesReason = call.missedReason.toLowerCase().includes(q);
        const matchesFollowup = call.followup.label.toLowerCase().includes(q) || (call.followup.author && call.followup.author.toLowerCase().includes(q));

        return matchesPhone || matchesLead || matchesContact || matchesLine || matchesReason || matchesFollowup;
      }

      return true;
    });
  }, [reportData, appliedCallStatusFilter, appliedMatchFilter, appliedHoursFilter, appliedFollowupFilter, searchQuery]);

  // Group filtered calls by Inbound Caller Phone Number
  const groupedCallsByPhone = useMemo<CallerPhoneGroup[]>(() => {
    const groupsMap = new Map<string, CallerPhoneGroup>();

    filteredCalls.forEach((call) => {
      const phoneKey = call.callerNumber || 'Unknown';
      let group = groupsMap.get(phoneKey);

      if (!group) {
        group = {
          callerNumber: phoneKey,
          matchedLead: call.matchedLead,
          totalCalls: 0,
          missedCount: 0,
          answeredCount: 0,
          unreturnedCount: 0,
          latestCallDate: new Date(call.startedAt),
          latestCall: call,
          calls: [],
        };
        groupsMap.set(phoneKey, group);
      }

      group.totalCalls++;
      if (call.callType === 'missed') {
        group.missedCount++;
        if (call.followup.status === 'unreturned') {
          group.unreturnedCount++;
        }
      } else {
        group.answeredCount++;
      }

      const callTime = new Date(call.startedAt);
      if (callTime > group.latestCallDate) {
        group.latestCallDate = callTime;
        group.latestCall = call;
      }

      if (!group.matchedLead && call.matchedLead) {
        group.matchedLead = call.matchedLead;
      }

      group.calls.push(call);
    });

    // Sort calls within each group from newest to oldest
    groupsMap.forEach((group) => {
      group.calls.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    });

    const groupList = Array.from(groupsMap.values());

    // Sort groups: Priority 1: Unreturned missed calls first, Priority 2: Newest latest call date
    groupList.sort((a, b) => {
      if (a.unreturnedCount > 0 && b.unreturnedCount === 0) return -1;
      if (a.unreturnedCount === 0 && b.unreturnedCount > 0) return 1;
      return b.latestCallDate.getTime() - a.latestCallDate.getTime();
    });

    return groupList;
  }, [filteredCalls]);

  const toggleGroupExpand = (phone: string) => {
    setExpandedPhoneGroups((prev) => ({
      ...prev,
      [phone]: !prev[phone],
    }));
  };

  const expandAllGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    groupedCallsByPhone.forEach((g) => {
      allExpanded[g.callerNumber] = true;
    });
    setExpandedPhoneGroups(allExpanded);
  };

  const collapseAllGroups = () => {
    setExpandedPhoneGroups({});
  };

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
      'Missed / Call Time (AEST)',
      'Call Type',
      'Follow-Up Status',
      'Follow-Up Action',
      'Follow-Up Performed At (AEST)',
      'Follow-Up By',
      'Response Time (Mins)',
      'Aircall Line Name',
      'Aircall Line Digits',
      'Incoming Caller Phone',
      'Matched Lead',
      'Lead Status',
      'Contact Name',
      'Reason / Outcome',
      'Duration (Seconds)',
    ];

    const rows = filteredCalls.map((c) => [
      c.id,
      format(new Date(c.startedAt), 'dd/MM/yyyy HH:mm:ss'),
      `"${c.callType.toUpperCase()}"`,
      `"${c.followup.status}"`,
      `"${c.followup.label}"`,
      c.followup.performedAt ? `"${format(new Date(c.followup.performedAt), 'dd/MM/yyyy HH:mm:ss')}"` : 'N/A',
      `"${c.followup.author || 'N/A'}"`,
      c.followup.responseTimeMinutes ?? 'N/A',
      `"${c.aircallNumberName}"`,
      `"${c.aircallNumberDigits}"`,
      `"${c.callerNumber}"`,
      `"${c.matchedLead?.companyName || 'Unmatched'}"`,
      `"${c.matchedLead?.status || 'N/A'}"`,
      `"${c.matchedLead?.contactName || 'N/A'}"`,
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

  const openResolutionModal = (call: EnrichedInboundCall) => {
    setResolutionCall(call);
    setIsResolutionDialogOpen(true);
  };

  if (authLoading || loadingNumbers) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader />
        <p className="text-sm text-slate-500 mt-3 animate-pulse">Detecting your Aircall phone line...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Inbound & Missed Calls
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 font-semibold px-2.5 py-0.5">
                Personal Line
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your direct inbound calls log grouped by caller phone number, with live callback timeline tracking and quick resolution logging.
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

        {/* Warning if no lines matched to user */}
        {userLinkedNumbers.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-full text-amber-800 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  No Personal Aircall Line Auto-Detected
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  We could not automatically detect an Aircall number matching your profile email ({user?.email}) or name ({userProfile?.displayName || userProfile?.name}).
                  Please make sure your Aircall User ID or Phone Number is configured in your user profile, or visit the global Inbound Calls Report.
                </p>
                <div className="mt-3 flex items-center gap-3 justify-center sm:justify-start">
                  <Link href="/reports/missed-calls">
                    <Button size="sm" variant="outline" className="text-xs h-8 bg-white dark:bg-slate-800">
                      View All Aircall Lines Report
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter Toolbar */}
            <Card className="border shadow-sm bg-slate-50/50 dark:bg-slate-900/40">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                            <span>Pick date range</span>
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

                  {/* Call Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Call Type</label>
                    <Select value={pendingCallStatusFilter} onValueChange={(v: any) => setPendingCallStatusFilter(v)}>
                      <SelectTrigger className="bg-white dark:bg-slate-800">
                        <SelectValue placeholder="All Calls" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Inbound Calls</SelectItem>
                        <SelectItem value="missed">Missed Calls Only</SelectItem>
                        <SelectItem value="answered">Answered Calls Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Follow-Up Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Follow-Up Status</label>
                    <Select value={pendingFollowupFilter} onValueChange={(v: any) => setPendingFollowupFilter(v)}>
                      <SelectTrigger className="bg-white dark:bg-slate-800">
                        <SelectValue placeholder="All Follow-ups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Follow-Up States</SelectItem>
                        <SelectItem value="unreturned">🔴 Action Needed</SelectItem>
                        <SelectItem value="callback">🟢 Callback Made</SelectItem>
                        <SelectItem value="lead_activity">🔵 CRM Activity Logged</SelectItem>
                        <SelectItem value="resolved">⚪ Resolved Manually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* User Line Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">My Line</label>
                    <Select value={pendingNumberId} onValueChange={setPendingNumberId}>
                      <SelectTrigger className="bg-white dark:bg-slate-800">
                        <SelectValue placeholder="Select Line" />
                      </SelectTrigger>
                      <SelectContent>
                        {userLinkedNumbers.length > 1 && (
                          <SelectItem value="all_my_lines">
                            All My Lines ({userLinkedNumbers.length})
                          </SelectItem>
                        )}
                        {userLinkedNumbers.map((num) => (
                          <SelectItem key={num.id} value={String(num.id)}>
                            {num.name} ({num.digits})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead Match Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Lead Match</label>
                    <Select value={pendingMatchFilter} onValueChange={(v: any) => setPendingMatchFilter(v)}>
                      <SelectTrigger className="bg-white dark:bg-slate-800">
                        <SelectValue placeholder="All Callers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Callers</SelectItem>
                        <SelectItem value="matched">Matched Leads Only</SelectItem>
                        <SelectItem value="unmatched">Unregistered Numbers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleApplyFilters}
                      disabled={loading}
                      className={`h-9 px-4 text-xs font-semibold gap-2 transition-all duration-200 shadow-sm ${
                        hasUnappliedFilters
                          ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 scale-[1.02]'
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
                      className="h-9 px-3 text-xs bg-white dark:bg-slate-800 text-slate-600"
                    >
                      Reset
                    </Button>
                  </div>

                  {hasUnappliedFilters && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200">
                      Click &quot;Apply Filters&quot; to load data with your new criteria
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Inbound */}
              <Card className="border shadow-sm bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Inbound
                  </CardTitle>
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                    <PhoneIncoming className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? '-' : reportData?.summary.totalInbound ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Calls to your line</p>
                </CardContent>
              </Card>

              {/* Answered Calls */}
              <Card className="border shadow-sm bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Answered Calls
                  </CardTitle>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {loading ? '-' : reportData?.summary.totalAnswered ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {loading ? '-' : `${reportData?.summary.answeredRate ?? 0}% Answered Rate`}
                  </p>
                </CardContent>
              </Card>

              {/* Missed Calls */}
              <Card className="border shadow-sm bg-gradient-to-br from-white to-red-50/40 dark:from-slate-900 dark:to-red-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Missed Calls
                  </CardTitle>
                  <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400">
                    <PhoneMissed className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {loading ? '-' : reportData?.summary.totalMissed ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {loading ? '-' : `${reportData?.summary.inHoursMissed ?? 0} in-hours missed`}
                  </p>
                </CardContent>
              </Card>

              {/* Follow-up Rate */}
              <Card className="border shadow-sm bg-gradient-to-br from-white to-purple-50/40 dark:from-slate-900 dark:to-purple-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Follow-Up Rate
                  </CardTitle>
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      (reportData?.summary.followupRate ?? 100) >= 80
                        ? 'text-emerald-600'
                        : (reportData?.summary.followupRate ?? 100) >= 50
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      {loading ? '-' : `${reportData?.summary.followupRate ?? 100}%`}
                    </span>
                    <span className="text-xs text-slate-500">followed up</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    {(reportData?.summary.unaddressedMissedCount ?? 0) > 0 ? (
                      <Badge variant="destructive" className="text-[10px] font-semibold py-0 px-1.5 bg-red-100 text-red-800 border-red-200">
                        {reportData?.summary.unaddressedMissedCount} Action Needed
                      </Badge>
                    ) : (
                      <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> All followed up
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Avg Response Time */}
              <Card className="border shadow-sm bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Avg Response Time
                  </CardTitle>
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Clock className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? '-' : reportData?.summary.avgResponseTimeMinutes ? formatResponseTime(reportData.summary.avgResponseTimeMinutes) : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {loading ? '-' : `${reportData?.summary.callbackCount ?? 0} callbacks & ${(reportData?.summary.leadActivityCount ?? 0) + (reportData?.summary.manualResolvedCount ?? 0)} CRM actions`}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border">
                <Loader />
                <p className="text-sm text-slate-500 mt-3 animate-pulse">Syncing call records from Aircall & CRM activities...</p>
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
                          ? 'border-blue-600 text-blue-600 font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      My Calls Log ({filteredCalls.length} calls • {groupedCallsByPhone.length} callers)
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'analytics'
                          ? 'border-blue-600 text-blue-600 font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Call Analytics & Peak Times
                    </button>
                  </div>
                </div>

                {/* TAB 1: CALLS LOG */}
                {activeTab === 'calls' && (
                  <Card className="border shadow-sm">
                    <CardHeader className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b bg-slate-50/40 dark:bg-slate-900/40">
                      <div>
                        <CardTitle className="text-base font-semibold">Inbound Calls & Callback Verification</CardTitle>
                        <CardDescription className="text-xs">
                          {viewMode === 'grouped'
                            ? `Grouped into ${groupedCallsByPhone.length} caller phone numbers (${filteredCalls.length} total calls).`
                            : `Showing all ${filteredCalls.length} inbound calls.`}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                          <button
                            onClick={() => setViewMode('grouped')}
                            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                              viewMode === 'grouped'
                                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Group calls by inbound caller phone number"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Group by Phone</span>
                          </button>
                          <button
                            onClick={() => setViewMode('flat')}
                            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                              viewMode === 'flat'
                                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Flat list of all individual calls"
                          >
                            <List className="h-3.5 w-3.5" />
                            <span>Flat List</span>
                          </button>
                        </div>

                        {viewMode === 'grouped' && (
                          <div className="flex items-center gap-1 text-xs">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={expandAllGroups}
                              className="h-8 px-2 text-xs bg-white dark:bg-slate-800"
                            >
                              Expand All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={collapseAllGroups}
                              className="h-8 px-2 text-xs bg-white dark:bg-slate-800"
                            >
                              Collapse All
                            </Button>
                          </div>
                        )}

                        <div className="relative flex-1 sm:w-60">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search phone, lead, rep, action..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-xs bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      {/* GROUPED VIEW (DEFAULT) */}
                      {viewMode === 'grouped' ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                          {groupedCallsByPhone.length === 0 ? (
                            <div className="py-20 text-center text-slate-500">
                              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                              <p className="font-semibold text-slate-800 dark:text-slate-200">No Calls Found</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'No calls match the selected filters.'}
                              </p>
                            </div>
                          ) : (
                            groupedCallsByPhone.map((group) => {
                              const isExpanded = !!expandedPhoneGroups[group.callerNumber];
                              const hasUnreturned = group.unreturnedCount > 0;

                              return (
                                <div key={group.callerNumber} className="transition-colors">
                                  {/* Group Header Row */}
                                  <div
                                    onClick={() => toggleGroupExpand(group.callerNumber)}
                                    className={`p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/60 ${
                                      hasUnreturned
                                        ? 'bg-red-50/30 dark:bg-red-950/10'
                                        : 'bg-white dark:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <button
                                        type="button"
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-blue-600" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </button>

                                      {/* Caller Phone & Lead Name */}
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                            {group.callerNumber}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyPhoneNumber(group.callerNumber);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-0.5"
                                            title="Copy phone"
                                          >
                                            {copiedPhone === group.callerNumber ? (
                                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                              <Copy className="h-3.5 w-3.5" />
                                            )}
                                          </button>

                                          {/* Lead Match */}
                                          {group.matchedLead ? (
                                            <div className="flex items-center gap-1.5 ml-1">
                                              <Link
                                                href={group.matchedLead.leadUrl}
                                                onClick={(e) => e.stopPropagation()}
                                                className="font-semibold text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                                              >
                                                <span>{group.matchedLead.companyName}</span>
                                                <ArrowUpRight className="h-3 w-3" />
                                              </Link>
                                              <LeadStatusBadge status={group.matchedLead.status as LeadStatus} />
                                            </div>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-100 font-normal">
                                              Unregistered Caller
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Contact Info */}
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                          {group.matchedLead?.contactName && (
                                            <span className="flex items-center gap-1">
                                              <User className="h-3 w-3 text-slate-400" />
                                              {group.matchedLead.contactName}
                                            </span>
                                          )}
                                          <span className="text-slate-400">• Latest Call: {format(group.latestCallDate, 'dd MMM, hh:mm a')}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right Side: Call Counts & Follow-Up Status Summary */}
                                    <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
                                      {/* Call Volume Badge */}
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                                          {group.totalCalls} {group.totalCalls === 1 ? 'Call' : 'Calls'}
                                        </Badge>
                                        {group.missedCount > 0 && (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] font-medium">
                                            {group.missedCount} Missed
                                          </Badge>
                                        )}
                                        {group.answeredCount > 0 && (
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium">
                                            {group.answeredCount} Answered
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Follow-up State Pill */}
                                      {hasUnreturned ? (
                                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300 font-semibold text-xs gap-1 py-1">
                                          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                          <span>{group.unreturnedCount} Needs Action</span>
                                        </Badge>
                                      ) : group.missedCount > 0 ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-xs gap-1 py-1">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                          <span>Followed Up</span>
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                                          Answered
                                        </Badge>
                                      )}

                                      {/* Quick Call Button */}
                                      <a
                                        href={`tel:${group.callerNumber.replace(/\s+/g, '')}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md transition shadow-xs"
                                        title="Dial caller"
                                      >
                                        <PhoneCall className="h-3.5 w-3.5" />
                                        <span>Call</span>
                                      </a>
                                    </div>
                                  </div>

                                  {/* Expanded Table showing each call and its Timeline */}
                                  {isExpanded && (
                                    <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800">
                                      <div className="overflow-x-auto rounded-md border bg-white dark:bg-slate-900">
                                        <Table>
                                          <TableHeader className="bg-slate-100/70 dark:bg-slate-800/70">
                                            <TableRow>
                                              <TableHead className="w-[160px]">Call Time (When Received)</TableHead>
                                              <TableHead className="w-[100px]">Type</TableHead>
                                              <TableHead className="w-[280px]">Follow-Up Timeline & Activity</TableHead>
                                              <TableHead className="w-[150px]">Line Called</TableHead>
                                              <TableHead className="w-[130px]">Reason</TableHead>
                                              <TableHead className="text-right w-[140px]">Actions</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {group.calls.map((call) => {
                                              const callDate = new Date(call.startedAt);
                                              const isMissed = call.callType === 'missed';
                                              const followup = call.followup;

                                              return (
                                                <TableRow key={call.id} className="hover:bg-slate-50/80">
                                                  {/* 1. When Missed Call Happened */}
                                                  <TableCell className="text-xs">
                                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                      {isMissed ? (
                                                        <PhoneMissed className="h-3.5 w-3.5 text-red-500" />
                                                      ) : (
                                                        <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />
                                                      )}
                                                      <span>{format(callDate, 'dd MMM yyyy')}</span>
                                                    </div>
                                                    <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 font-mono">
                                                      <Clock className="h-3 w-3 text-slate-400" />
                                                      <span>{format(callDate, 'hh:mm:ss a')}</span>
                                                    </div>
                                                  </TableCell>

                                                  {/* Call Type */}
                                                  <TableCell className="text-xs">
                                                    {isMissed ? (
                                                      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold">
                                                        Missed
                                                      </Badge>
                                                    ) : (
                                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                                        Answered
                                                      </Badge>
                                                    )}
                                                  </TableCell>

                                                  {/* 2. Full Timeline of Activities (When follow up happened) */}
                                                  <TableCell className="text-xs">
                                                    {!isMissed ? (
                                                      <span className="text-slate-400 text-[11px] italic">
                                                        Answered on line ({formatDurationSeconds(call.duration)})
                                                      </span>
                                                    ) : followup.status === 'unreturned' ? (
                                                      <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 font-semibold text-[10px] gap-1 py-0.5">
                                                            <AlertCircle className="h-3 w-3 text-red-600" />
                                                            <span>Action Needed (Unreturned)</span>
                                                          </Badge>
                                                        </div>
                                                        <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                                                          ⏳ Elapsed: {formatDistanceToNow(callDate)} ago
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      /* Activity timeline showing When call happened -> When follow-up happened */
                                                      <div className="flex flex-col gap-1 p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                                                        <div className="flex items-center gap-1.5 text-[11px]">
                                                          <span className="text-slate-500 font-medium">
                                                            {followup.actionType === 'call' ? '📞 Callback' : followup.actionType === 'email' ? '✉️ Email' : '📝 CRM Note'}:
                                                          </span>
                                                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {followup.label}
                                                          </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                                                          {followup.performedAt && (
                                                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                              <Clock className="h-3 w-3 inline" />
                                                              {format(new Date(followup.performedAt), 'dd MMM, hh:mm a')}
                                                            </span>
                                                          )}
                                                          {followup.responseTimeMinutes !== undefined && (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] py-0 px-1 font-bold">
                                                              +{formatResponseTime(followup.responseTimeMinutes)} response
                                                            </Badge>
                                                          )}
                                                          {followup.author && (
                                                            <span className="text-slate-500 text-[10px]">
                                                              by {followup.author}
                                                            </span>
                                                          )}
                                                        </div>

                                                        {followup.notes && (
                                                          <p className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-[260px]" title={followup.notes}>
                                                            &quot;{followup.notes}&quot;
                                                          </p>
                                                        )}
                                                      </div>
                                                    )}
                                                  </TableCell>

                                                  {/* Line */}
                                                  <TableCell className="text-xs">
                                                    <div className="font-medium text-slate-900 truncate max-w-[140px]">
                                                      {call.aircallNumberName}
                                                    </div>
                                                    <div className="text-slate-400 text-[11px] font-mono">
                                                      {call.aircallNumberDigits}
                                                    </div>
                                                  </TableCell>

                                                  {/* Missed Reason */}
                                                  <TableCell className="text-xs">
                                                    <Badge variant="secondary" className="text-[10px]">
                                                      {call.missedReason}
                                                    </Badge>
                                                  </TableCell>

                                                  {/* Actions */}
                                                  <TableCell className="text-right text-xs">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                      {isMissed && (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => openResolutionModal(call)}
                                                          className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100"
                                                          title="Log follow-up action or mark resolved"
                                                        >
                                                          <Edit3 className="h-3 w-3 mr-1" />
                                                          <span>Resolve</span>
                                                        </Button>
                                                      )}

                                                      {call.matchedLead ? (
                                                        <Link
                                                          href={call.matchedLead.leadUrl}
                                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border"
                                                        >
                                                          <span>View</span>
                                                        </Link>
                                                      ) : (
                                                        <Link
                                                          href={`/leads?create=true&phone=${encodeURIComponent(call.callerNumber)}`}
                                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200"
                                                        >
                                                          <span>+ Lead</span>
                                                        </Link>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        /* FLAT LIST VIEW */
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                              <TableRow>
                                <TableHead className="w-[150px]">Missed Call Time</TableHead>
                                <TableHead className="w-[90px]">Status</TableHead>
                                <TableHead className="w-[280px]">Follow-Up Timeline & Activity</TableHead>
                                <TableHead className="w-[150px]">Line Called</TableHead>
                                <TableHead className="w-[130px]">Caller Phone</TableHead>
                                <TableHead>Matched Lead</TableHead>
                                <TableHead className="text-right w-[140px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredCalls.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                                      <p className="font-semibold text-slate-800 dark:text-slate-200">No Calls Found</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredCalls.map((call) => {
                                  const callDate = new Date(call.startedAt);
                                  const isMissed = call.callType === 'missed';
                                  const followup = call.followup;

                                  return (
                                    <TableRow key={call.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                      {/* Missed Call Time */}
                                      <TableCell className="text-xs">
                                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          {isMissed ? (
                                            <PhoneMissed className="h-3.5 w-3.5 text-red-500" />
                                          ) : (
                                            <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />
                                          )}
                                          <span>{format(callDate, 'dd MMM yyyy')}</span>
                                        </div>
                                        <div className="text-slate-500 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                                          <Clock className="h-3 w-3 text-slate-400" />
                                          <span>{format(callDate, 'hh:mm:ss a')}</span>
                                        </div>
                                      </TableCell>

                                      {/* Status */}
                                      <TableCell className="text-xs">
                                        {isMissed ? (
                                          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold">
                                            Missed
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                            Answered
                                          </Badge>
                                        )}
                                      </TableCell>

                                      {/* Follow-Up Timeline & Activity */}
                                      <TableCell className="text-xs">
                                        {!isMissed ? (
                                          <span className="text-slate-400 text-[11px] italic">
                                            Answered ({formatDurationSeconds(call.duration)})
                                          </span>
                                        ) : followup.status === 'unreturned' ? (
                                          <div className="flex flex-col gap-1">
                                            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 font-semibold text-[10px] gap-1 py-0.5 w-fit">
                                              <AlertCircle className="h-3 w-3 text-red-600" />
                                              <span>Action Needed (Unreturned)</span>
                                            </Badge>
                                            <span className="text-[11px] text-red-600 dark:text-red-400">
                                              ⏳ Waiting {formatDistanceToNow(callDate)} ago
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col gap-1 p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80">
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {followup.label}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                              {followup.performedAt && (
                                                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                                                  {format(new Date(followup.performedAt), 'dd MMM, hh:mm a')}
                                                </span>
                                              )}
                                              {followup.responseTimeMinutes !== undefined && (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] py-0 px-1 font-bold">
                                                  +{formatResponseTime(followup.responseTimeMinutes)}
                                                </Badge>
                                              )}
                                              {followup.author && (
                                                <span className="text-slate-500 text-[10px]">by {followup.author}</span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </TableCell>

                                      {/* Line */}
                                      <TableCell className="text-xs">
                                        <div className="font-medium text-slate-900 truncate max-w-[140px]">
                                          {call.aircallNumberName}
                                        </div>
                                        <div className="text-slate-400 text-[11px] font-mono">
                                          {call.aircallNumberDigits}
                                        </div>
                                      </TableCell>

                                      {/* Caller Phone */}
                                      <TableCell className="text-xs font-mono">
                                        <div className="flex items-center gap-1">
                                          <span>{call.callerNumber}</span>
                                          <button
                                            onClick={() => copyPhoneNumber(call.callerNumber)}
                                            className="text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </TableCell>

                                      {/* Matched Lead */}
                                      <TableCell className="text-xs">
                                        {call.matchedLead ? (
                                          <div className="flex flex-col gap-0.5">
                                            <Link
                                              href={call.matchedLead.leadUrl}
                                              className="font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                                            >
                                              {call.matchedLead.companyName}
                                              <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <LeadStatusBadge status={call.matchedLead.status as LeadStatus} />
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-[11px] italic">Unregistered</span>
                                        )}
                                      </TableCell>

                                      {/* Actions */}
                                      <TableCell className="text-right text-xs">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <a
                                            href={`tel:${call.callerNumber.replace(/\s+/g, '')}`}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md"
                                          >
                                            <PhoneCall className="h-3 w-3" />
                                            <span>Call</span>
                                          </a>

                                          {isMissed && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => openResolutionModal(call)}
                                              className="h-7 px-2 text-xs"
                                            >
                                              <Edit3 className="h-3 w-3 mr-1" />
                                              <span>Resolve</span>
                                            </Button>
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* TAB 2: ANALYTICS */}
                {activeTab === 'analytics' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hourly Breakdown Chart */}
                    <Card className="border shadow-sm">
                      <CardHeader className="p-4 sm:p-5 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-blue-600" />
                          My Calls by Time of Day (AEST)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Hourly volume of answered vs missed calls received on your line.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData?.hourlyDistribution || []}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                              <XAxis dataKey="label" fontSize={10} interval={2} />
                              <YAxis fontSize={10} allowDecimals={false} />
                              <ChartTooltip />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                              <Bar dataKey="answeredCount" name="Answered" fill="#10b981" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="missedCount" name="Missed" fill="#ef4444" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reasons Breakdown Pie Chart */}
                    <Card className="border shadow-sm">
                      <CardHeader className="p-4 sm:p-5 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <PieChartIcon className="h-4 w-4 text-purple-600" />
                          Missed Call Reasons
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Breakdown of reasons for missed calls.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="h-72 w-full flex items-center justify-center">
                          {reportData?.reasonsBreakdown && reportData.reasonsBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={reportData.reasonsBreakdown}
                                  dataKey="count"
                                  nameKey="label"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  innerRadius={40}
                                  paddingAngle={2}
                                  label={({ label, percentage }) => `${label} (${percentage}%)`}
                                  labelLine={false}
                                >
                                  {reportData.reasonsBreakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-xs text-slate-400">No missed call data available.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Resolution Dialog Modal */}
        <ResolveMissedCallDialog
          call={resolutionCall}
          isOpen={isResolutionDialogOpen}
          onClose={() => {
            setIsResolutionDialogOpen(false);
            setResolutionCall(null);
          }}
          onResolved={handleCallResolved}
        />
      </div>
    </TooltipProvider>
  );
}
