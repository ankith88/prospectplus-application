
"use client"

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Phone, Users, UserCheck, UserX, Percent, Clock, Filter, SlidersHorizontal, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getAllCallActivities, getAllLeadsForReport } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: { [key in LeadStatus]: string } = {
  'New': '#A0A0A0', // Neutral Gray
  'Contacted': '#FFBB28', // Yellow
  'In Progress': '#FF8042', // Orange
  'Connected': '#0088FE', // Blue
  'High Touch': '#8884d8', // Purple
  'Qualified': '#00C49F', // Teal Green
  'Won': '#22C55E', // Strong Green
  'Unqualified': '#D1D5DB', // Light Gray
  'Lost': '#EF4444', // Red
  'LPO Review': '#A855F7', // Violet
};
type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };

export default function ReportsPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [adminSelectedUser, setAdminSelectedUser] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all' as LeadStatus | 'all',
    date: undefined as DateRange | undefined,
    duration: 'all',
  });

  useEffect(() => {
    async function getData() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading || !user || !userProfile) return;

      try {
        setLoading(true);
        const [fetchedCalls, fetchedLeads] = await Promise.all([
            getAllCallActivities(),
            getAllLeadsForReport()
        ]);
        
        if (userProfile.role === 'admin') {
            setAllCalls(fetchedCalls);
            setAllLeads(fetchedLeads);
        } else {
            const userDisplayName = userProfile.displayName || '';
            setAllCalls(fetchedCalls.filter(c => c.dialerAssigned === userDisplayName));
            setAllLeads(fetchedLeads.filter(l => l.dialerAssigned === userDisplayName));
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch report data.'})
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [user, userProfile, authLoading, router, toast]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      date: undefined,
      duration: 'all',
    });
    setAdminSelectedUser('all');
  };

  const parseDuration = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const minutesMatch = durationStr.match(/(\d+)m/);
    const secondsMatch = durationStr.match(/(\d+)s/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  };
  
  const allDialers = useMemo(() => {
    const dialers = new Set(allLeads.map(l => l.dialerAssigned).filter(Boolean));
    return Array.from(dialers as string[]);
  }, [allLeads]);
  
  const selectedUser = userProfile?.role === 'admin' ? adminSelectedUser : userProfile?.displayName || 'all';

  const filteredLeads = useMemo(() => {
     return allLeads.filter(lead => {
      const dialerMatch = selectedUser === 'all' || lead.dialerAssigned === selectedUser;
      const statusMatch = filters.status === 'all' || lead.status === filters.status;
      return dialerMatch && statusMatch;
    });
  }, [allLeads, selectedUser, filters.status]);

  const filteredCalls = useMemo(() => {
    return allCalls.filter(call => {
        const dialerMatch = selectedUser === 'all' || call.dialerAssigned === selectedUser;
        const statusMatch = filters.status === 'all' || call.leadStatus === filters.status;

        let dateMatch = true;
        if (filters.date?.from) {
          const callDate = new Date(call.date);
          const fromDate = filters.date.from;
          const toDate = filters.date.to || filters.date.from;
          dateMatch = callDate >= fromDate && callDate <= toDate;
        }
        
        const durationInSeconds = parseDuration(call.duration);
        const durationMatch = () => {
            switch (filters.duration) {
                case 'under30s': return durationInSeconds < 30;
                case '30s-2min': return durationInSeconds >= 30 && durationInSeconds < 120;
                case 'over2min': return durationInSeconds >= 120;
                case 'none': return durationInSeconds === 0;
                default: return true;
            }
        };

        return dialerMatch && statusMatch && dateMatch && durationMatch();
    });
  }, [allCalls, selectedUser, filters]);

  const stats = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const leadsContactedIds = new Set(filteredCalls.map(c => c.leadId));

    const totalLeadsInFilter = filteredLeads.length;
    const assignedLeads = filteredLeads.filter(lead => !!lead.dialerAssigned);
    const totalAssignedLeads = assignedLeads.length;

    const leadsInQueue = assignedLeads.filter(lead => lead.status === 'New').length;
    
    const callsOver2Min = filteredCalls.filter(c => parseDuration(c.duration) >= 120).length;
    const calls30sTo2min = filteredCalls.filter(c => {
        const duration = parseDuration(c.duration);
        return duration >= 30 && duration < 120;
    }).length;

    const ratioOver2Min = totalCalls > 0 ? (callsOver2Min / totalCalls) * 100 : 0;
    const ratio30sTo2min = totalCalls > 0 ? (calls30sTo2min / totalCalls) * 100 : 0;
    
    const leadsByStatus = filteredLeads.reduce((acc, lead) => {
      const status = lead.status;
      const existingEntry = acc.find(item => item.name === status);
      if (existingEntry) {
        existingEntry.value += 1;
      } else {
        acc.push({ name: status, value: 1 });
      }
      return acc;
    }, [] as { name: LeadStatus; value: number }[]);

    return {
      totalCalls,
      leadsContacted: leadsContactedIds.size,
      leadsInQueue,
      leadsByStatus,
      totalAssignedLeads,
      callsOver2Min,
      calls30sTo2min,
      ratioOver2Min,
      ratio30sTo2min,
      totalLeadsInFilter,
    };
  }, [filteredCalls, filteredLeads]);

  const hasActiveFilters = 
    (userProfile?.role === 'admin' && adminSelectedUser !== 'all') || 
    filters.status !== 'all' || 
    !!filters.date || 
    filters.duration !== 'all';

  if (loading || authLoading || !userProfile) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Performance dashboard.</p>
      </header>

       <Collapsible>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
               <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="ml-2">Toggle Filters</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {userProfile?.role === 'admin' && (
                        <div className="space-y-2">
                            <Label htmlFor="user">Assigned To</Label>
                             <Select value={adminSelectedUser} onValueChange={setAdminSelectedUser}>
                                <SelectTrigger id="user">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    {allDialers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Unqualified', 'Won', 'Lost'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Call Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.date?.from ? (
                                  filters.date.to ? (
                                    <>
                                      {format(filters.date.from, "LLL dd, y")} -{" "}
                                      {format(filters.date.to, "LLL dd, y")}
                                    </>
                                  ) : (
                                    format(filters.date.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: new Date(), to: new Date()})}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                </div>
                                <Calendar
                                  mode="range"
                                  selected={filters.date}
                                  onSelect={(date) => handleFilterChange('date', date)}
                                  initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration">Call Duration</Label>
                        <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
                            <SelectTrigger id="duration">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Durations</SelectItem>
                                <SelectItem value="under30s">Under 30s</SelectItem>
                                <SelectItem value="30s-2min">30s - 2min</SelectItem>
                                <SelectItem value="over2min">Over 2min</SelectItem>
                                <SelectItem value="none">No Duration</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {hasActiveFilters && (
                        <div className="space-y-2">
                            <Button variant="ghost" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </CollapsibleContent>
          </Card>
      </Collapsible>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Contacted</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsContacted}</div>
            <p className="text-xs text-muted-foreground">out of {stats.totalLeadsInFilter} total leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads in Queue</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsInQueue}</div>
            <p className="text-xs text-muted-foreground">New, assigned leads</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignedLeads}</div>
             <p className="text-xs text-muted-foreground">Matching current filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls 30s-2min</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.calls30sTo2min}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls &gt; 2min</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.callsOver2Min}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Calls 30s-2min</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ratio30sTo2min.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Calls &gt; 2min</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ratioOver2Min.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.leadsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No lead status data to display for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
