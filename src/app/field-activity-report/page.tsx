
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, VisitNote, Appointment, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, User, Users, Percent, TrendingUp, Briefcase, FileCheck, FileX, Map } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getVisitNotes, getAllLeadsForReport, getAllAppointments, getAllUsers } from '@/services/firebase';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadStatusBadge } from '@/components/lead-status-badge';

const OUTCOME_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A855F7'];

export default function FieldActivityReportPage() {
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
    outcome: [] as string[],
    franchisee: [] as string[],
  });

  const fetchData = async () => {
    setIsRefreshing(true);
    setLoading(true);
    toast({ title: 'Loading Report Data...', description: 'Fetching the latest information.' });
    try {
      const [notes, leads, appointments, users] = await Promise.all([
        getVisitNotes(),
        getAllLeadsForReport(),
        getAllAppointments(),
        getAllUsers(),
      ]);
      setAllVisitNotes(notes);
      setAllLeads(leads);
      setAllAppointments(appointments);
      setAllFieldSalesUsers(users.filter(u => u.role === 'Field Sales'));
      toast({ title: 'Success', description: 'Report data has been loaded.' });
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ date: undefined, user: [], outcome: [], franchisee: [] });
  };
  
  const leadsMap = useMemo(() => new Map(allLeads.map(l => [l.id, l])), [allLeads]);

  const filteredVisitNotes = useMemo(() => {
    return allVisitNotes.filter(note => {
      const capturedByUserMatch = filters.user.length === 0 || filters.user.includes(note.capturedBy);
      const outcomeMatch = filters.outcome.length === 0 || (note.outcome?.type && filters.outcome.includes(note.outcome.type));
      
      const lead = note.leadId ? leadsMap.get(note.leadId) : null;
      const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));

      let dateMatch = true;
      if (filters.date?.from) {
        const noteDate = parseISO(note.createdAt);
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        dateMatch = noteDate >= fromDate && noteDate <= toDate;
      }
      
      return capturedByUserMatch && outcomeMatch && franchiseeMatch && dateMatch;
    });
  }, [allVisitNotes, filters, leadsMap]);

  const stats = useMemo(() => {
    const totalVisits = filteredVisitNotes.length;
    const convertedNotes = filteredVisitNotes.filter(n => n.status === 'Converted' && n.leadId);
    const rejectedNotes = filteredVisitNotes.filter(n => n.status === 'Rejected');
    
    const conversionRate = totalVisits > 0 ? (convertedNotes.length / totalVisits) * 100 : 0;

    const visitsByUser = filteredVisitNotes.reduce((acc, note) => {
      acc[note.capturedBy] = (acc[note.capturedBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const visitsByUserData = Object.entries(visitsByUser).map(([name, visits]) => ({ name, visits: visits })).sort((a,b) => b.visits - a.visits);
    
    let visitsOverTimeData: { name: string; visits: number }[] = [];
    if (filters.date?.from && filters.date?.to) {
        const diffDays = (filters.date.to.getTime() - filters.date.from.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 90) { // Monthly
             const months = eachMonthOfInterval({ start: filters.date.from, end: filters.date.to });
             visitsOverTimeData = months.map(month => {
                const monthStr = format(month, 'MMM yyyy');
                const visitsInMonth = filteredVisitNotes.filter(n => format(parseISO(n.createdAt), 'MMM yyyy') === monthStr).length;
                return { name: monthStr, visits: visitsInMonth };
             });
        } else if (diffDays > 14) { // Weekly
            const weeks = eachWeekOfInterval({ start: filters.date.from, end: filters.date.to }, { weekStartsOn: 1 });
            visitsOverTimeData = weeks.map(week => {
                const weekStartStr = format(week, 'dd MMM');
                const visitsInWeek = filteredVisitNotes.filter(n => {
                    const noteDate = parseISO(n.createdAt);
                    return noteDate >= week && noteDate < new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000);
                }).length;
                return { name: weekStartStr, visits: visitsInWeek };
            });
        } else { // Daily
            const days = eachDayOfInterval({ start: filters.date.from, end: filters.date.to });
            visitsOverTimeData = days.map(day => {
                const dayStr = format(day, 'dd MMM');
                const visitsInDay = filteredVisitNotes.filter(n => format(parseISO(n.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length;
                return { name: dayStr, visits: visitsInDay };
            });
        }
    }


    const visitsByOutcome = filteredVisitNotes.reduce((acc, note) => {
        const outcome = note.outcome?.type || 'No Outcome';
        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const visitsByOutcomeData = Object.entries(visitsByOutcome).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);


    const convertedLeads = convertedNotes.map(note => leadsMap.get(note.leadId!)).filter((l): l is Lead => !!l);
    const convertedLeadsByStatus = convertedLeads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const convertedLeadsByStatusData = Object.entries(convertedLeadsByStatus).map(([name, value]) => ({ name, value }));

    const convertedLeadsWithFranchisee = convertedLeads.map(lead => ({...lead, franchisee: lead.franchisee || 'Unknown' }));
    const visitsByFranchisee = convertedLeadsWithFranchisee.reduce((acc, lead) => {
        acc[lead.franchisee!] = (acc[lead.franchisee!] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const visitsByFranchiseeData = Object.entries(visitsByFranchisee).map(([name, visits]) => ({ name, visits })).sort((a,b) => b.visits - a.visits);
    
    const commissionEligible = convertedNotes.filter(note => {
        const lead = leadsMap.get(note.leadId!);
        if (!lead) return false;
        
        if (note.outcome?.type === 'Needs Follow-up' && lead.status === 'Won') {
            return true;
        }
        
        const hasAttendedAppointment = allAppointments.some(appt => appt.leadId === lead.id && appt.appointmentStatus === 'Completed');
        if (hasAttendedAppointment) {
            return true;
        }
        return false;
    });

    return {
      totalVisits,
      totalConverted: convertedNotes.length,
      totalRejected: rejectedNotes.length,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      visitsByUserData,
      visitsByOutcomeData,
      visitsOverTimeData,
      convertedLeadsByStatusData,
      visitsByFranchiseeData,
      commissionEligibleCount: commissionEligible.length,
    };
  }, [filteredVisitNotes, leadsMap, allAppointments, filters.date]);

  const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string; }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(allVisitNotes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [allVisitNotes]);

  const outcomeOptions: Option[] = useMemo(() => {
    const outcomes = new Set(allVisitNotes.map(n => n.outcome?.type).filter(Boolean));
    return Array.from(outcomes as string[]).map(o => ({ value: o, label: o }));
  }, [allVisitNotes]);
  
  const franchiseeOptions: Option[] = useMemo(() => {
    const leadIds = allVisitNotes.map(n => n.leadId).filter(Boolean);
    const franchisees = new Set(allLeads.filter(l => leadIds.includes(l.id) && l.franchisee).map(l => l.franchisee));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [allVisitNotes, allLeads]);


  if (authLoading || loading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }
  
  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Activity Report</h1>
        <p className="text-muted-foreground">Insights into field sales visit notes and their outcomes.</p>
      </header>

      <Collapsible>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={fetchData} variant="outline" disabled={isRefreshing}><RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh</Button>
              <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4" /><span className="ml-2">Toggle</span></Button></CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Captured By</Label>
                <MultiSelectCombobox options={userOptions} selected={filters.user} onSelectedChange={(val) => handleFilterChange('user', val)} placeholder="Select users..."/>
              </div>
               <div className="space-y-2">
                <Label>Franchisee</Label>
                <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..."/>
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <MultiSelectCombobox options={outcomeOptions} selected={filters.outcome} onSelectedChange={(val) => handleFilterChange('outcome', val)} placeholder="Select outcomes..."/>
              </div>
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild><Button id="date" variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start">
                        <Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} />
                    </PopoverContent>
                </Popover>
              </div>
              {hasActiveFilters && <Button variant="ghost" onClick={clearFilters}><X className="mr-2 h-4 w-4" /> Clear Filters</Button>}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Total Visits" value={stats.totalVisits} icon={Briefcase} />
        <StatCard title="Converted to Leads" value={stats.totalConverted} icon={FileCheck} />
        <StatCard title="Rejected Notes" value={stats.totalRejected} icon={FileX} />
        <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} />
        <StatCard title="Commission Eligible" value={stats.commissionEligibleCount} icon={Star} description="Based on appointment or signed status" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader><CardTitle>Visits by Field Sales Rep</CardTitle></CardHeader>
            <CardContent>
              {stats.visitsByUserData.length > 0 ? (
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <BarChart data={stats.visitsByUserData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" name="Visits" />
                  </BarChart>
                </ChartContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data to display</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Visits Over Time</CardTitle></CardHeader>
            <CardContent>
              {stats.visitsOverTimeData.length > 0 ? (
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <BarChart data={stats.visitsOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" name="Visits" />
                  </BarChart>
                </ChartContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">Select a date range to see trend data</div>}
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card>
            <CardHeader><CardTitle>Visits by Outcome</CardTitle></CardHeader>
            <CardContent>
                {stats.visitsByOutcomeData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] w-full">
                        <PieChart>
                            <Pie data={stats.visitsByOutcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                {stats.visitsByOutcomeData.map((entry, index) => <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} />
                        </PieChart>
                    </ChartContainer>
                ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data to display</div>}
            </CardContent>
         </Card>
          <Card>
            <CardHeader><CardTitle>Status of Converted Leads</CardTitle></CardHeader>
            <CardContent>
                {stats.convertedLeadsByStatusData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] w-full">
                        <PieChart>
                            <Pie data={stats.convertedLeadsByStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {stats.convertedLeadsByStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} />
                        </PieChart>
                    </ChartContainer>
                ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No converted leads</div>}
            </CardContent>
         </Card>
          <Card>
            <CardHeader><CardTitle>Visits by Franchisee</CardTitle></CardHeader>
            <CardContent>
              {stats.visitsByFranchiseeData.length > 0 ? (
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <BarChart data={stats.visitsByFranchiseeData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" name="Visits" />
                  </BarChart>
                </ChartContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No franchisee data from converted leads</div>}
            </CardContent>
         </Card>
      </div>

    </div>
  );
}
