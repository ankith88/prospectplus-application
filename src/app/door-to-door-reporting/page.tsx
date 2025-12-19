

"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckSquare, UserPlus, Percent, TrendingUp, Filter, SlidersHorizontal, X, RefreshCw, BarChart3, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getAllLeadsForReport, getAllUsers, getAllActivities } from '@/services/firebase';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';

export default function DoorToDoorReportingPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  const fetchData = async () => {
    setLoading(true);
    toast({ title: 'Loading Report Data...', description: 'Fetching the latest information.' });
    try {
        const [refreshedLeads, refreshedUsers, refreshedActivities] = await Promise.all([
            getAllLeadsForReport(),
            getAllUsers(),
            getAllActivities(),
        ]);
        
        const fieldSalesLeads = refreshedLeads.filter(lead => (lead as any).fieldSales === true);

        setAllLeads(fieldSalesLeads);
        setAllActivities(refreshedActivities);
        setAllFieldSalesUsers(refreshedUsers.filter(u => u.role === 'Field Sales'));
        toast({ title: 'Success', description: 'Report data has been loaded.' });
    } catch (error) {
        console.error("Failed to refresh data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [hasAccess]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      date: undefined,
      user: [],
    });
  };

  const filteredActivities = useMemo(() => {
    return allActivities.filter(activity => {
      let dateMatch = true;
      if (filters.date?.from) {
        const activityDate = new Date(activity.date);
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        dateMatch = activityDate >= fromDate && activityDate <= toDate;
      }
      const userMatch = filters.user.length === 0 || (activity.author && filters.user.includes(activity.author));
      return dateMatch && userMatch;
    });
  }, [allActivities, filters]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        const userMatch = filters.user.length === 0 || (lead.dialerAssigned && filters.user.includes(lead.dialerAssigned));
        // We need to check if any activity for this lead matches the date filter
        let dateMatch = true;
        if (filters.date?.from) {
            dateMatch = filteredActivities.some(a => a.leadId === lead.id);
        }
        return userMatch && dateMatch;
    });
  }, [allLeads, filters, filteredActivities]);

  const stats = useMemo(() => {
    const checkInActivities = filteredActivities.filter(a => a.notes?.includes('Checked in at location via map.'));
    const totalCheckIns = new Set(checkInActivities.map(a => a.leadId)).size;
    
    const signedUpLeads = filteredLeads.filter(l => l.status === 'Won');
    const trialingLeads = filteredLeads.filter(l => l.status === 'Trialing ShipMate');
    
    const totalSignups = signedUpLeads.length;
    const totalTrials = trialingLeads.length;
    
    const conversionRate = totalCheckIns > 0 ? ((totalSignups + totalTrials) / totalCheckIns) * 100 : 0;

    const performanceData = allFieldSalesUsers.map(user => {
      const userName = user.displayName!;
      const userCheckins = new Set(checkInActivities.filter(a => a.author === userName).map(a => a.leadId)).size;
      const userSignups = signedUpLeads.filter(l => l.dialerAssigned === userName).length;
      const userTrials = trialingLeads.filter(l => l.dialerAssigned === userName).length;

      return {
        name: userName,
        'Check-ins': userCheckins,
        'Signups': userSignups,
        'Trials': userTrials,
      };
    }).filter(u => u['Check-ins'] > 0 || u['Signups'] > 0 || u['Trials'] > 0);

    const checkInsByDate = checkInActivities.reduce((acc, activity) => {
        const date = format(new Date(activity.date), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const checkInsTrendData = Object.entries(checkInsByDate).map(([date, count]) => ({ date, count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return {
      totalCheckIns,
      totalSignups,
      totalTrials,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      performanceData,
      checkInsTrendData,
    };
  }, [filteredActivities, filteredLeads, allFieldSalesUsers]);

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

  const hasActiveFilters = filters.user.length > 0 || !!filters.date;
  const userOptions: Option[] = allFieldSalesUsers.map(u => ({ value: u.displayName!, label: u.displayName! }));

  if (authLoading || loading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }
  
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Door-to-Door Reporting</h1>
        <p className="text-muted-foreground">Performance dashboard for field sales activities.</p>
      </header>

      <Collapsible>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={fetchData} variant="outline" disabled={isRefreshing || loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                    {isRefreshing || loading ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="ml-2">Toggle Filters</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="user">Field Sales User</Label>
                <MultiSelectCombobox
                    options={userOptions}
                    selected={filters.user}
                    onSelectedChange={(selected) => handleFilterChange('user', selected)}
                    placeholder="Select users..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button id="date" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.date?.from ? (
                          filters.date.to ? (
                            <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</>
                          ) : (
                            format(filters.date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start">
                        <div className="flex flex-col space-y-2 border-r p-2">
                          <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: new Date(), to: new Date()})}>Today</Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('date', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Check-ins" value={stats.totalCheckIns} icon={CheckSquare} description="Unique leads visited" />
        <StatCard title="Total Signups" value={stats.totalSignups} icon={UserPlus} description="Leads marked as 'Won'" />
        <StatCard title="Total Free Trials" value={stats.totalTrials} icon={TrendingUp} description="Leads in 'Trialing ShipMate' status" />
        <StatCard title="Visit Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} description="(Signups + Trials) / Check-ins" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
          <CardDescription>Breakdown of activity by Field Sales user.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.performanceData.length > 0 ? (
            <ChartContainer config={{}} className="h-[400px] w-full">
                <BarChart data={stats.performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="Check-ins" fill="#8884d8" />
                    <Bar dataKey="Signups" fill="#82ca9d" />
                    <Bar dataKey="Trials" fill="#ffc658" />
                </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">No performance data for the selected filters.</div>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Check-ins Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
            {stats.checkInsTrendData.length > 0 ? (
            <ChartContainer config={{}} className="h-[300px] w-full">
                <BarChart data={stats.checkInsTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(tick) => format(new Date(tick), 'MMM d')} />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#8884d8" name="Check-ins" />
                </BarChart>
            </ChartContainer>
            ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No check-in data to display.</div>
            )}
        </CardContent>
       </Card>

    </div>
  );
}
