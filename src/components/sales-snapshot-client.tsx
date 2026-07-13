"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, Appointment, VisitNote, LeadBucket } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Phone, 
  Percent, 
  Filter, 
  SlidersHorizontal, 
  X, 
  Star, 
  Calendar as CalendarIcon, 
  Goal, 
  TrendingUp, 
  BarChart3, 
  RefreshCw, 
  Flame, 
  AlertCircle, 
  ExternalLink, 
  Layers,
  Send,
  User,
  Download,
  ClipboardCheck,
  CalendarCheck,
  Clock,
  ArrowRight,
  Info,
  Briefcase
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, startOfDay, endOfDay, isValid, parseISO,
  startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek,
  subMonths, subWeeks
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, where, limit, documentId } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { cn, getQuickDateRange } from '@/lib/utils';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#095c7b', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399', '#2dd4bf'];

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 
    'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 
    'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'LocalMile Opportunity', 
    'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent', 'Out of Territory', 'Future Follow-up'
];

const parseDateString = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
        const d = new Date(dateVal);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (typeof dateVal === 'object') {
        if (typeof dateVal.toDate === 'function') {
            const d = dateVal.toDate();
            d.setHours(0, 0, 0, 0);
            return d;
        }
        if ('seconds' in dateVal && 'nanoseconds' in dateVal) {
            const d = new Date(dateVal.seconds * 1000 + dateVal.nanoseconds / 1000000);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    let cleaned = String(dateVal).trim();
    cleaned = cleaned.replace(/\s*\([^)]*\)$/, '');
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

export default function SalesSnapshotClient() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Cache variables to prevent refetching same queries
  const cacheRef = useRef<{ [key: string]: Lead[] }>({});
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    dateFilterType: 'dateLeadEntered' as 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
  });

  const [appliedFilters, setAppliedFilters] = useState({
    dateFilterType: 'dateLeadEntered' as 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
  });

  const hasUnappliedFilters = useMemo(() => {
    return filters.dateFilterType !== appliedFilters.dateFilterType ||
           filters.dateRange?.from?.getTime() !== appliedFilters.dateRange?.from?.getTime() ||
           filters.dateRange?.to?.getTime() !== appliedFilters.dateRange?.to?.getTime() ||
           JSON.stringify(filters.franchisee) !== JSON.stringify(appliedFilters.franchisee) ||
           JSON.stringify(filters.status) !== JSON.stringify(appliedFilters.status) ||
           JSON.stringify(filters.bucket) !== JSON.stringify(appliedFilters.bucket);
  }, [filters, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      dateFilterType: 'dateLeadEntered' as const,
      dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      franchisee: [],
      status: [],
      bucket: [],
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    setProgressMsg("Connecting to Firestore...");

    try {
        let startISO = '';
        if (appliedFilters.dateRange?.from) {
            startISO = startOfDay(appliedFilters.dateRange.from).toISOString();
        }

        const dateFilterType = appliedFilters.dateFilterType;
        const cacheKey = `${dateFilterType}_${startISO || 'all_time'}`;

        if (cacheRef.current[cacheKey]) {
            setProgressMsg("Loading from local cache...");
            setAllLeads(cacheRef.current[cacheKey]);
            setLoading(false);
            return;
        }

        let leadsList: Lead[] = [];

        if (startISO) {
            setProgressMsg("Retrieving recent records...");
            
            // Query only documents that have a date field matching the start ISO to ensure fast loading
            const leadsQuery = query(
                collection(firestore, 'leads'),
                where(dateFilterType, '>=', startISO)
            );
            const companiesQuery = query(
                collection(firestore, 'companies'),
                where(dateFilterType, '>=', startISO)
            );

            const [leadsSnap, companiesSnap] = await Promise.all([
                getDocs(leadsQuery),
                getDocs(companiesQuery)
            ]);

            const mapDocs = (snap: any, isCompany: boolean) => {
                return snap.docs.map((doc: any) => ({
                    id: doc.id,
                    isFromCompaniesCollection: isCompany,
                    ...doc.data()
                } as unknown as Lead));
            };

            const rawLeads = mapDocs(leadsSnap, false);
            const rawCompanies = mapDocs(companiesSnap, true);

            // Merge leads and companies uniquely
            const leadMap = new Map<string, Lead>();
            for (const item of [...rawLeads, ...rawCompanies]) {
                leadMap.set(item.id, item);
            }
            leadsList = Array.from(leadMap.values());
        } else {
            // "All Time" query is loaded progressively to prevent freezes
            setProgressMsg("Loading all-time data progressively...");
            
            const [leadsSnap, companiesSnap] = await Promise.all([
                getDocs(collection(firestore, 'leads')),
                getDocs(collection(firestore, 'companies'))
            ]);

            setProgressMsg(`Mapping records (${leadsSnap.size + companiesSnap.size} found)...`);

            const rawLeads = leadsSnap.docs.map(doc => ({ id: doc.id, isFromCompaniesCollection: false, ...doc.data() } as unknown as Lead));
            const rawCompanies = companiesSnap.docs.map(doc => ({ id: doc.id, isFromCompaniesCollection: true, ...doc.data() } as unknown as Lead));

            const leadMap = new Map<string, Lead>();
            for (const item of [...rawLeads, ...rawCompanies]) {
                leadMap.set(item.id, item);
            }
            leadsList = Array.from(leadMap.values());
        }

        // Cache the result
        cacheRef.current[cacheKey] = leadsList;
        setAllLeads(leadsList);
    } catch (e: any) {
        console.error("Sales snapshot load error:", e);
        setError(e.message || "Failed to retrieve reporting data.");
        toast({ variant: 'destructive', title: 'Loading Error', description: 'Could not retrieve sales process data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [userProfile, appliedFilters, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client Side Filtering & Aggregation
  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        // Exclude duplicate flags
        if (lead.isDuplicate) return false;

        // Franchisee role override
        if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
            if (lead.franchisee !== userProfile.franchisee) return false;
        }

        // Status filter
        const statusMatch = appliedFilters.status.length === 0 || 
                            appliedFilters.status.includes(lead.customerStatus || lead.status);

        // Franchisee filter
        const franchiseeMatch = appliedFilters.franchisee.length === 0 || 
                                (lead.franchisee && appliedFilters.franchisee.includes(lead.franchisee));

        // Bucket filter
        const resolvedBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const bucketMatch = appliedFilters.bucket.length === 0 || appliedFilters.bucket.includes(resolvedBucket);

        // Date Range match (must match selected filter range if specified)
        let dateMatch = true;
        if (appliedFilters.dateRange?.from) {
            const dateVal = lead[appliedFilters.dateFilterType];
            const parsedDate = parseDateString(dateVal);
            if (!parsedDate) return false;
            
            const fromDate = startOfDay(appliedFilters.dateRange.from);
            const toDate = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(appliedFilters.dateRange.from);
            dateMatch = parsedDate >= fromDate && parsedDate <= toDate;
        }

        return statusMatch && franchiseeMatch && bucketMatch && dateMatch;
    });
  }, [allLeads, appliedFilters, userProfile]);

  const metrics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    
    let quotesCount = 0;
    let scfsCount = 0;
    let trialsCount = 0;
    let wonCount = 0;

    filteredLeads.forEach(lead => {
        const status = lead.customerStatus || lead.status;
        if (lead.quoteSentAt || status === 'Quote Sent') quotesCount++;
        if (lead.scfAcceptedAt || (lead.scfLinks && lead.scfLinks.some(s => s.status === 'Accepted'))) scfsCount++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) trialsCount++;
        if (lead.signedUpAt || status === 'Won' || status === 'Signed') wonCount++;
    });

    const quoteRate = totalLeads > 0 ? (quotesCount / totalLeads) * 100 : 0;
    const winRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;

    // Bucket distribution
    const bucketsDist = filteredLeads.reduce((acc, lead) => {
        const b = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        acc[b] = (acc[b] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const bucketData = Object.entries(bucketsDist).map(([name, value]) => {
        const displayName = name === 'outbound' ? 'Outbound' :
                            name === 'inbound' ? 'Inbound' :
                            name === 'field_sales' ? 'Field Sales' :
                            name === 'account_manager' ? 'Account Manager' : name;
        return { name: displayName, value };
    });

    // Franchisee performance table data
    const franchiseePerf = filteredLeads.reduce((acc, lead) => {
        const f = lead.franchisee || 'Unassigned';
        if (!acc[f]) {
            acc[f] = { name: f, total: 0, quotes: 0, trials: 0, wins: 0 };
        }
        acc[f].total++;
        const status = lead.customerStatus || lead.status;
        if (lead.quoteSentAt || status === 'Quote Sent') acc[f].quotes++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) acc[f].trials++;
        if (lead.signedUpAt || status === 'Won' || status === 'Signed') acc[f].wins++;
        return acc;
    }, {} as Record<string, { name: string, total: number, quotes: number, trials: number, wins: number }>);

    const franchiseeData = Object.values(franchiseePerf).sort((a, b) => b.total - a.total);

    return {
        totalLeads,
        quotesCount,
        scfsCount,
        trialsCount,
        wonCount,
        quoteRate,
        winRate,
        bucketData,
        franchiseeData
    };
  }, [filteredLeads]);

  // Options lists
  const franchiseeOptions = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f!, label: f! }));
  }, [allLeads]);

  const statusOptions = useMemo(() => {
    return leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s }));
  }, []);

  const bucketOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'field_sales', label: 'Field Sales' },
    { value: 'account_manager', label: 'Account Manager' }
  ];

  return (
    <div className="flex flex-col gap-6 p-1">
      <header className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Sales Process Snapshot</h1>
          <p className="text-muted-foreground">Unified conversion metrics across Inbound, Outbound, Field Sales, and AM.</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading || isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", (loading || isRefreshing) && "animate-spin")} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </header>

      {/* Filters Card */}
      <Collapsible defaultOpen={true}>
        <Card className="border-[#095c7b]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#095c7b]" />
              <CardTitle className="text-md">Report Filters</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust</Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Date Field Filter Base</Label>
                <Select value={filters.dateFilterType} onValueChange={(val: any) => setFilters(prev => ({ ...prev, dateFilterType: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateLeadEntered">Date Lead Entered</SelectItem>
                    <SelectItem value="quoteSentAt">Date Quote Sent</SelectItem>
                    <SelectItem value="signedUpAt">Date Signed Up</SelectItem>
                    <SelectItem value="scfAcceptedAt">Date SCF Accepted</SelectItem>
                    <SelectItem value="trialStartedAt">Date Trial Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quick Date Range Preset</Label>
                <Select onValueChange={(val) => setFilters(prev => ({ ...prev, dateRange: getQuickDateRange(val) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="all-time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Window</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full text-left font-normal justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {filters.dateRange?.from ? (
                          filters.dateRange.to ? `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}` : format(filters.dateRange.from, "LLL dd, y")
                        ) : "Pick a date range"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={filters.dateRange} onSelect={(date) => setFilters(prev => ({ ...prev, dateRange: date }))} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Bucket</Label>
                <MultiSelectCombobox options={bucketOptions} selected={filters.bucket} onSelectedChange={(val) => setFilters(prev => ({ ...prev, bucket: val }))} placeholder="All Buckets" />
              </div>

              <div className="space-y-2">
                <Label>Franchisee</Label>
                <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => setFilters(prev => ({ ...prev, franchisee: val }))} placeholder="All Franchisees" />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <MultiSelectCombobox options={statusOptions} selected={filters.status} onSelectedChange={(val) => setFilters(prev => ({ ...prev, status: val }))} placeholder="All Statuses" />
              </div>

              <div className="flex justify-between items-center col-span-full pt-2">
                <Button variant="ghost" onClick={clearFilters} className="text-xs text-muted-foreground"><X className="mr-2 h-3.5 w-3.5" /> Reset Filters</Button>
                <div className="flex items-center gap-3">
                  {hasUnappliedFilters && <span className="text-xs text-amber-600 font-medium">Pending changes...</span>}
                  <Button onClick={applyFilters} className={cn("bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-semibold text-xs", hasUnappliedFilters && "scale-105 shadow-md bg-amber-500 hover:bg-amber-600")}>
                    Apply Filter Range
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Main Content Area */}
      {loading ? (
        <Card className="flex flex-col items-center justify-center py-16 border-dashed">
          <Loader />
          <p className="text-xs text-muted-foreground mt-4 animate-pulse">{progressMsg}</p>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-6 flex flex-row items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <CardTitle className="text-red-800 text-sm">Failed to Load Report</CardTitle>
            <CardDescription className="text-red-600 mt-1">{error}</CardDescription>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-1"><CardDescription className="text-[11px] font-medium uppercase text-muted-foreground">Total Sourced</CardDescription></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[#095c7b]">{metrics.totalLeads}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Leads created in period</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-1"><CardDescription className="text-[11px] font-medium uppercase text-muted-foreground">Quotes Dispatched</CardDescription></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[#095c7b]">{metrics.quotesCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.quoteRate.toFixed(1)}% quoting rate</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-1"><CardDescription className="text-[11px] font-medium uppercase text-muted-foreground">SCFs Accepted</CardDescription></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[#095c7b]">{metrics.scfsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Agreements accepted</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-1"><CardDescription className="text-[11px] font-medium uppercase text-muted-foreground">Free Trials</CardDescription></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-[#095c7b]">{metrics.trialsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">ShipMate/LocalMile started</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-1"><CardDescription className="text-[11px] font-medium uppercase text-green-700 dark:text-green-400">Signed (Won)</CardDescription></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-green-600">{metrics.wonCount}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.winRate.toFixed(1)}% conversion rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Visualisations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel chart and bucket distribution */}
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">Bucket Distribution</CardTitle><CardDescription className="text-xs">Leads distribution by lead origin bucket.</CardDescription></CardHeader>
              <CardContent className="h-[260px] flex justify-center">
                {metrics.bucketData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.bucketData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {metrics.bucketData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Leads`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center text-xs text-muted-foreground">No data available for selected filter</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">Sales Process Funnel Analysis</CardTitle><CardDescription className="text-xs">Process pipeline stages from lead entry to conversion.</CardDescription></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { stage: 'Total Sourced', Count: metrics.totalLeads },
                    { stage: 'Quotes Sent', Count: metrics.quotesCount },
                    { stage: 'SCF Accepted', Count: metrics.scfsCount },
                    { stage: 'Trials Started', Count: metrics.trialsCount },
                    { stage: 'Signed Up (Won)', Count: metrics.wonCount }
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="stage" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis tickLine={false} style={{ fontSize: '11px' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="Count" fill="#095c7b" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {[{ stage: 'Total Sourced' }, { stage: 'Quotes Sent' }, { stage: 'SCF Accepted' }, { stage: 'Trials Started' }, { stage: 'Signed Up (Won)' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.stage === 'Signed Up (Won)' ? '#16a34a' : '#095c7b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Franchisee Performance Table */}
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm font-semibold">Franchisee Process Breakdown</CardTitle><CardDescription className="text-xs">Individual franchisee performance breakdown across stages.</CardDescription></CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader className="bg-[#f8fafb] sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Franchisee</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Sourced</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Quotes Dispatched</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Trials Initiated</TableHead>
                      <TableHead className="text-right font-semibold text-xs text-green-700">Signed (Won)</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Conv. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.franchiseeData.length > 0 ? (
                      metrics.franchiseeData.map((f) => {
                        const rate = f.total > 0 ? (f.wins / f.total) * 100 : 0;
                        return (
                          <TableRow key={f.name} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-xs py-2">{f.name}</TableCell>
                            <TableCell className="text-right text-xs py-2">{f.total}</TableCell>
                            <TableCell className="text-right text-xs py-2">{f.quotes}</TableCell>
                            <TableCell className="text-right text-xs py-2">{f.trials}</TableCell>
                            <TableCell className="text-right text-xs py-2 font-bold text-green-600">{f.wins}</TableCell>
                            <TableCell className="text-right text-xs py-2 font-semibold">{rate.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">No franchisee records found matching filter criteria</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
