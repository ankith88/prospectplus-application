"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { LeadCampaign, getLeadCampaigns } from '@/services/lead-campaigns';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  PhoneCall, 
  Users, 
  TrendingUp, 
  Target, 
  Calendar as CalendarIcon, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  BarChart3, 
  MessageSquare,
  Clock
} from 'lucide-react';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { StatusOutcomeBanner, StatusOutcomeGuideButton } from '@/components/status-outcome-guide';
import type { DateRange } from 'react-day-picker';

interface CsCallRecord {
  id: string;
  leadId: string;
  leadName?: string;
  companyName?: string;
  author: string;
  outcome: string;
  notes: string;
  date: string;
  leadStatus?: string;
  customerSuccessAssigned?: string;
}

interface CsLeadSummary {
  leadId: string;
  leadName: string;
  companyName: string;
  csCallCount: number;
  lastCsOutcome: string;
  lastCsContactedDate: string;
  customerStatus: string;
  customerSuccessAssigned: string;
}

const COLORS = ['#095c7b', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#38bdf8', '#a78bfa', '#f472b6'];

export default function CustomerSuccessReportingClient() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [csCalls, setCsCalls] = useState<CsCallRecord[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<LeadCampaign[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCsRep, setSelectedCsRep] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [quickDateRange, setQuickDateRange] = useState<string>('30days');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    getLeadCampaigns().then((camps: LeadCampaign[]) => setAvailableCampaigns(camps.filter((c: LeadCampaign) => c.isActive))).catch(console.error);
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch leads assigned to CS or with CS calls
      const leadsSnap = await getDocs(collection(firestore, 'leads'));
      const fetchedLeads: any[] = [];
      const extractedCsCalls: CsCallRecord[] = [];

      leadsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const leadId = docSnap.id;
        fetchedLeads.push({ id: leadId, ...data });

        // Extract outcome history if present on lead doc
        if (data.csOutcomeHistory && Array.isArray(data.csOutcomeHistory)) {
          data.csOutcomeHistory.forEach((hist: any, index: number) => {
            extractedCsCalls.push({
              id: `${leadId}_hist_${index}`,
              leadId,
              leadName: data.contactName || data.leadName || data.companyName || 'Unknown Lead',
              companyName: data.companyName || 'N/A',
              author: hist.author || 'System',
              outcome: hist.outcome || 'Call Back/Follow-up',
              notes: hist.notes || '',
              date: hist.date || data.lastCsContactedDate || new Date().toISOString(),
              leadStatus: data.customerStatus || data.status || 'New',
              customerSuccessAssigned: data.customerSuccessAssigned || ''
            });
          });
        }
      });

      // 2. Also try fetching from activities collectionGroup for CS activities if available
      try {
        const activityQuery = query(
          collectionGroup(firestore, 'activity'),
          where('isCustomerSuccess', '==', true)
        );
        const actSnap = await getDocs(activityQuery);
        actSnap.forEach((actDoc) => {
          const actData = actDoc.data();
          const parentLeadRef = actDoc.ref.parent.parent;
          const leadId = parentLeadRef ? parentLeadRef.id : 'unknown';
          const matchedLead = fetchedLeads.find(l => l.id === leadId);

          const rawNotes = actData.notes || '';
          let outcome = 'Call Back/Follow-up';
          if (rawNotes.includes('[CS Outcome] ')) {
            const parts = rawNotes.split('[CS Outcome] ')[1]?.split('. Notes:');
            if (parts && parts[0]) outcome = parts[0].trim();
          }

          const existing = extractedCsCalls.some(c => c.id === actDoc.id);
          if (!existing) {
            extractedCsCalls.push({
              id: actDoc.id,
              leadId,
              leadName: matchedLead?.contactName || matchedLead?.companyName || 'Unknown Lead',
              companyName: matchedLead?.companyName || 'N/A',
              author: actData.author || 'System',
              outcome,
              notes: rawNotes.replace(/^\[CS Outcome\]\s*/, ''),
              date: actData.date || new Date().toISOString(),
              leadStatus: matchedLead?.customerStatus || matchedLead?.status || 'New',
              customerSuccessAssigned: matchedLead?.customerSuccessAssigned || ''
            });
          }
        });
      } catch (err) {
        console.warn('CollectionGroup activity query skipped:', err);
      }

      // Sort calls descending by date
      extractedCsCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRawLeads(fetchedLeads);
      setCsCalls(extractedCsCalls);
    } catch (err) {
      console.error('Error fetching CS reporting data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Date Range Handler
  const handleQuickDateChange = (value: string) => {
    setQuickDateRange(value);
    const now = new Date();
    if (value === 'today') {
      setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    } else if (value === '7days') {
      setDateRange({ from: subDays(now, 7), to: now });
    } else if (value === '30days') {
      setDateRange({ from: subDays(now, 30), to: now });
    } else if (value === 'month') {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (value === 'all') {
      setDateRange(undefined);
    }
  };

  // Distinct CS Reps list for filtering
  const csRepsList = useMemo(() => {
    const repsSet = new Set<string>();
    rawLeads.forEach(l => {
      if (l.customerSuccessAssigned) repsSet.add(l.customerSuccessAssigned);
    });
    csCalls.forEach(c => {
      if (c.author && c.author !== 'System') repsSet.add(c.author);
    });
    return Array.from(repsSet).sort();
  }, [rawLeads, csCalls]);

  // Filtered CS Calls
  const filteredCalls = useMemo(() => {
    return csCalls.filter(call => {
      // Campaign filter
      if (selectedCampaign !== 'all') {
        const lead = rawLeads.find(l => l.id === call.leadId);
        const camp = lead?.campaign || lead?.customerCampaign;
        if (camp !== selectedCampaign) return false;
      }

      // Rep filter
      if (selectedCsRep !== 'all') {
        const matchesAuthor = call.author.toLowerCase() === selectedCsRep.toLowerCase();
        const matchesAssigned = call.customerSuccessAssigned?.toLowerCase() === selectedCsRep.toLowerCase();
        if (!matchesAuthor && !matchesAssigned) return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const callDate = new Date(call.date);
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        if (!isWithinInterval(callDate, { start: fromDate, end: toDate })) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLead = call.leadName?.toLowerCase().includes(q);
        const matchesCompany = call.companyName?.toLowerCase().includes(q);
        const matchesAuthor = call.author.toLowerCase().includes(q);
        const matchesOutcome = call.outcome.toLowerCase().includes(q);
        const matchesNotes = call.notes.toLowerCase().includes(q);
        if (!matchesLead && !matchesCompany && !matchesAuthor && !matchesOutcome && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [csCalls, rawLeads, selectedCampaign, selectedCsRep, dateRange, searchQuery]);

  // Filtered CS Leads cohort
  const filteredLeads = useMemo(() => {
    return rawLeads.filter(lead => {
      // Campaign filter
      if (selectedCampaign !== 'all') {
        const camp = lead.campaign || lead.customerCampaign;
        if (camp !== selectedCampaign) return false;
      }

      // Only include leads with CS activity or assigned CS
      const hasCsActivity = (lead.csCallCount && lead.csCallCount > 0) || lead.csCalled || (lead.csOutcomeHistory && lead.csOutcomeHistory.length > 0);
      const isCsAssigned = !!lead.customerSuccessAssigned;
      if (!hasCsActivity && !isCsAssigned) return false;

      if (selectedCsRep !== 'all') {
        const matchesAssigned = lead.customerSuccessAssigned?.toLowerCase() === selectedCsRep.toLowerCase();
        const matchesAuthor = lead.lastCsAuthor?.toLowerCase() === selectedCsRep.toLowerCase();
        if (!matchesAssigned && !matchesAuthor) return false;
      }
      return true;
    });
  }, [rawLeads, selectedCampaign, selectedCsRep]);

  // Key KPI Metrics
  const totalAttempts = filteredCalls.length;

  const uniqueLeadsContacted = useMemo(() => {
    const setIds = new Set(filteredCalls.map(c => c.leadId));
    return setIds.size;
  }, [filteredCalls]);

  const avgAttemptsPerLead = uniqueLeadsContacted > 0 ? (totalAttempts / uniqueLeadsContacted).toFixed(1) : '0';

  const totalCsAssignedLeads = filteredLeads.length;
  const csContactCoverage = totalCsAssignedLeads > 0 
    ? Math.round((uniqueLeadsContacted / totalCsAssignedLeads) * 100) 
    : 0;

  // Outcome breakdown for Donut Chart & Table
  const outcomeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCalls.forEach(c => {
      const outcome = c.outcome || 'Other';
      counts[outcome] = (counts[outcome] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCalls]);

  const topOutcome = outcomeDistribution[0]?.name || 'N/A';

  // Contact Attempt Frequency Distribution (1 attempt, 2 attempts, 3-4 attempts, 5+ attempts)
  const attemptFrequencyData = useMemo(() => {
    const countsMap: Record<string, number> = {};
    filteredCalls.forEach(c => {
      countsMap[c.leadId] = (countsMap[c.leadId] || 0) + 1;
    });

    let oneAttempt = 0;
    let twoAttempts = 0;
    let threeToFour = 0;
    let fivePlus = 0;

    Object.values(countsMap).forEach(cnt => {
      if (cnt === 1) oneAttempt++;
      else if (cnt === 2) twoAttempts++;
      else if (cnt >= 3 && cnt <= 4) threeToFour++;
      else if (cnt >= 5) fivePlus++;
    });

    return [
      { category: '1 Contact Attempt', count: oneAttempt },
      { category: '2 Contact Attempts', count: twoAttempts },
      { category: '3-4 Contact Attempts', count: threeToFour },
      { category: '5+ Contact Attempts', count: fivePlus },
    ];
  }, [filteredCalls]);

  // CS Team Leaderboard Metrics
  const csRepLeaderboard = useMemo(() => {
    const repsMap: Record<string, { name: string; totalCalls: number; uniqueLeads: Set<string>; outcomesCount: Record<string, number>; lastDate: string }> = {};

    filteredCalls.forEach(c => {
      const author = c.author || 'Unassigned / System';
      if (!repsMap[author]) {
        repsMap[author] = {
          name: author,
          totalCalls: 0,
          uniqueLeads: new Set(),
          outcomesCount: {},
          lastDate: c.date
        };
      }

      repsMap[author].totalCalls += 1;
      repsMap[author].uniqueLeads.add(c.leadId);
      repsMap[author].outcomesCount[c.outcome] = (repsMap[author].outcomesCount[c.outcome] || 0) + 1;
      
      if (new Date(c.date).getTime() > new Date(repsMap[author].lastDate).getTime()) {
        repsMap[author].lastDate = c.date;
      }
    });

    return Object.values(repsMap)
      .map(r => ({
        name: r.name,
        totalCalls: r.totalCalls,
        uniqueLeadsCount: r.uniqueLeads.size,
        avgCallsPerLead: (r.totalCalls / (r.uniqueLeads.size || 1)).toFixed(1),
        topOutcome: Object.entries(r.outcomesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        lastDate: r.lastDate
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }, [filteredCalls]);

  // Export CSV
  const handleExportCsv = () => {
    const csvRows = [
      ['Date', 'Lead Name', 'Company', 'CS Representative', 'Outcome Logged', 'Notes', 'Current Sales Status'],
      ...filteredCalls.map(c => [
        format(new Date(c.date), 'yyyy-MM-dd HH:mm'),
        `"${(c.leadName || '').replace(/"/g, '""')}"`,
        `"${(c.companyName || '').replace(/"/g, '""')}"`,
        `"${(c.author || '').replace(/"/g, '""')}"`,
        `"${(c.outcome || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${(c.leadStatus || '').replace(/"/g, '""')}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_success_reporting_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#095c7b] to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-sky-400" />
            <h1 className="text-2xl font-extrabold tracking-tight">Customer Success Reporting</h1>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Tracking CS team touchpoints, call outcome frequency, contact attempt depth, and rep leaderboards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusOutcomeGuideButton className="bg-white/10 hover:bg-white/20 text-white border-0" />
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={fetchData} 
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleExportCsv}
            className="bg-sky-500 hover:bg-sky-600 text-white border-0 font-medium"
          >
            <Download className="h-4 w-4 mr-2" /> Export CS Report
          </Button>
        </div>
      </div>

      {/* Status Isolation Notice Banner */}
      <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-900/50 shadow-sm">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <p className="text-xs text-sky-900 dark:text-sky-300 leading-normal">
            <strong className="font-semibold">Isolated CS Outcomes:</strong> CS team outcome logs are recorded separately in the CS activity stream. Logging CS outcomes does not modify the lead&apos;s primary sales pipeline status.
          </p>
        </CardContent>
      </Card>

      <StatusOutcomeBanner />

      {/* Filter Bar */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lead, company, outcome or rep..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Quick Date Range */}
            <Select value={quickDateRange} onValueChange={handleQuickDateChange}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* CS Rep Filter */}
            <Select value={selectedCsRep} onValueChange={setSelectedCsRep}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Filter by CS Rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CS Representatives</SelectItem>
                {csRepsList.map(rep => (
                  <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campaign Filter */}
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Filter by Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {availableCampaigns.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Range Summary */}
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>
              {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Beginning'} - {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : 'Present'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total CS Contact Attempts</CardTitle>
            <PhoneCall className="h-4 w-4 text-[#095c7b]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalAttempts}</div>
            <p className="text-[11px] text-muted-foreground mt-1">CS outcomes logged in period</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unique Leads Reached</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{uniqueLeadsContacted}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Leads with at least 1 CS call</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Attempts / Lead</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{avgAttemptsPerLead}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Call frequency intensity</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CS Contact Coverage</CardTitle>
            <Target className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{csContactCoverage}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">{uniqueLeadsContacted} of {totalCsAssignedLeads} CS leads contacted</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top CS Outcome</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate" title={topOutcome}>{topOutcome}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Most frequent CS log outcome</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Attempt Frequency Distribution Chart */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#095c7b]" />
              <span>Contact Attempt Frequency Depth</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of CS contact persistence (how many times CS team tried contacting leads).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attemptFrequencyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(9, 92, 123, 0.08)' }}
                  />
                  <Bar dataKey="count" name="Leads Count" fill="#095c7b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CS Outcome Breakdown Chart */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-sky-600" />
              <span>CS Outcome Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of call outcomes logged specifically by the Customer Success team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {outcomeDistribution.length > 0 ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {outcomeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-xs italic">
                No CS call outcomes recorded for the selected filter.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CS Team Leaderboard */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>CS Team Member Leaderboard</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Performance breakdown per Customer Success representative.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">CS Representative</TableHead>
                <TableHead className="text-xs font-bold text-center">Total Contact Attempts</TableHead>
                <TableHead className="text-xs font-bold text-center">Unique Leads Reached</TableHead>
                <TableHead className="text-xs font-bold text-center">Avg Attempts/Lead</TableHead>
                <TableHead className="text-xs font-bold">Most Common Outcome</TableHead>
                <TableHead className="text-xs font-bold text-right">Last Touchpoint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {csRepLeaderboard.length > 0 ? (
                csRepLeaderboard.map(rep => (
                  <TableRow key={rep.name} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs py-3">{rep.name}</TableCell>
                    <TableCell className="text-xs text-center font-bold text-slate-800 dark:text-slate-200">{rep.totalCalls}</TableCell>
                    <TableCell className="text-xs text-center">{rep.uniqueLeadsCount}</TableCell>
                    <TableCell className="text-xs text-center">{rep.avgCallsPerLead}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[11px] bg-slate-100 dark:bg-slate-800 border-slate-300">
                        {rep.topOutcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {format(new Date(rep.lastDate), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground italic">
                    No CS team member activity records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CS Call Activity Log */}
      <Card className="shadow-sm border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#095c7b]" />
              <span>Detailed CS Contact Activity Log</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Complete history of Customer Success call attempts and outcomes.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {filteredCalls.length} Logs
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[550px]">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs font-bold w-[160px]">Date / Time</TableHead>
                  <TableHead className="text-xs font-bold">Lead Name & Company</TableHead>
                  <TableHead className="text-xs font-bold">CS Representative</TableHead>
                  <TableHead className="text-xs font-bold">Logged CS Outcome</TableHead>
                  <TableHead className="text-xs font-bold">Notes</TableHead>
                  <TableHead className="text-xs font-bold text-right">Lead Sales Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length > 0 ? (
                  filteredCalls.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3">
                        {format(new Date(c.date), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.leadName}</div>
                        {c.companyName && <div className="text-[11px] text-muted-foreground">{c.companyName}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {c.author}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          {c.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={c.notes}>
                        {c.notes || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right whitespace-nowrap">
                        <LeadStatusBadge status={(c.leadStatus || 'New') as any} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground italic">
                      No CS call logs match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
