
"use client"

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Phone, Users, UserCheck, UserX, Percent, Clock, Filter, SlidersHorizontal, X, Sparkles, Send, Route, Star, Calendar as CalendarIconLucide, Goal, CheckCircle, TrendingUp, Briefcase, Archive, Frown, BarChart3, TrendingDown, Target } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getAllCallActivities, getAllLeadsForReport, getAllAppointments } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STATUS_COLORS: { [key in LeadStatus]: string } = {
  'New': '#A0A0A0', // Neutral Gray
  'Contacted': '#FFBB28', // Yellow
  'In Progress': '#FF8042', // Orange
  'Connected': '#0088FE', // Blue
  'High Touch': '#8884d8', // Purple
  'Qualified': '#00C49F', // Teal Green
  'Pre Qualified': '#F59E0B', // Amber
  'Won': '#22C55E', // Strong Green
  'Unqualified': '#D1D5DB', // Light Gray
  'Lost': '#EF4444', // Red
  'LPO Review': '#A855F7', // Violet
};

const SOURCE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A855F7', '#22C55E', '#EF4444'];


type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus };


const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 12;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={11}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#333" fontSize={10}>{`${value} leads`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={14} textAnchor={textAnchor} fill="#999" fontSize={9}>
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export default function ReportsPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [allDialers, setAllDialers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [statusActiveIndex, setStatusActiveIndex] = useState(0);
  const [sourceActiveIndex, setSourceActiveIndex] = useState(0);
  const [lostSourceActiveIndex, setLostSourceActiveIndex] = useState(0);
  const [leadTypeActiveIndex, setLeadTypeActiveIndex] = useState(0);


  const [filters, setFilters] = useState({
    status: 'all' as LeadStatus | 'all',
    date: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: 'all',
  });
  
  const onStatusPieEnter = (_: any, index: number) => {
    setStatusActiveIndex(index);
  };
  
  const onSourcePieEnter = (_: any, index: number) => {
    setSourceActiveIndex(index);
  };

  const onLostSourcePieEnter = (_: any, index: number) => {
    setLostSourceActiveIndex(index);
  };
  
  const onLeadTypePieEnter = (_: any, index: number) => {
    setLeadTypeActiveIndex(index);
  };

  useEffect(() => {
    async function getData() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading || !user || !userProfile) return;

      console.log("[Reports Page] Signed-in user profile:", userProfile);

      try {
        setLoading(true);
        const [fetchedCalls, fetchedLeads, fetchedAppointments] = await Promise.all([
            getAllCallActivities(),
            getAllLeadsForReport(),
            getAllAppointments()
        ]);
        
        const dialerSet = new Set(fetchedLeads.map(l => l.dialerAssigned).filter(Boolean));
        if (userProfile.displayName) { // Ensure current user is in the list
            dialerSet.add(userProfile.displayName);
        }
        setAllDialers(Array.from(dialerSet) as string[]);
        
        setAllCalls(fetchedCalls);
        setAllLeads(fetchedLeads);
        setAllAppointments(fetchedAppointments);
        
        if (userProfile.role !== 'admin' && userProfile.displayName) {
          console.log(`[Reports Page] Defaulting filter to non-admin user: ${userProfile.displayName}`);
          setFilters(prev => ({ ...prev, dialerAssigned: userProfile.displayName! }));
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
    console.log(`[Reports Page] Filter changed: ${filterName} =`, value);
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      date: undefined,
      duration: 'all',
      dialerAssigned: userProfile?.role === 'admin' ? 'all' : userProfile?.displayName || 'all',
    });
  };

  const parseDuration = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const minutesMatch = durationStr.match(/(\d+)m/);
    const secondsMatch = durationStr.match(/(\d+)s/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  };
  
  const parseDateString = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    
    const dateTimeParts = dateStr.split(' ');
    const datePart = dateTimeParts[0];
    const dateParts = datePart.split('/');
    
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, month - 1, day);
      }
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const filteredLeads = useMemo(() => {
     return allLeads.filter(lead => {
        const dialerMatch = filters.dialerAssigned === 'all' || lead.dialerAssigned === filters.dialerAssigned;
        const statusMatch = filters.status === 'all' || lead.status === filters.status;
        
        let dateMatch = true;
        if (filters.date?.from && lead.activity?.length) {
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            // Check if any activity falls within the date range
            dateMatch = lead.activity.some(a => {
                const activityDate = new Date(a.date);
                return activityDate >= fromDate && activityDate <= toDate;
            });
        }
        return dialerMatch && statusMatch && dateMatch;
    });
  }, [allLeads, filters]);

  const filteredCalls = useMemo(() => {
    return allCalls.filter(call => {
        const dialerMatch = filters.dialerAssigned === 'all' || call.dialerAssigned === filters.dialerAssigned;
        const statusMatch = filters.status === 'all' || call.leadStatus === filters.status;

        let dateMatch = true;
        if (filters.date?.from) {
          const callDate = new Date(call.date);
          const fromDate = startOfDay(filters.date.from);
          const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
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
  }, [allCalls, filters]);
  
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appointment => {
        if (appointment.leadName === 'Unknown Lead') {
          return false;
        }
        const dialerMatch = filters.dialerAssigned === 'all' || appointment.dialerAssigned === filters.dialerAssigned;
        const statusMatch = filters.status === 'all' || appointment.leadStatus === filters.status;
        let dateMatch = true;
        if (filters.date?.from) {
            const appointmentCreatedDate = parseDateString(appointment.appointmentDate);
            if (!appointmentCreatedDate) return false;
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            dateMatch = appointmentCreatedDate >= fromDate && appointmentCreatedDate <= toDate;
        }
        return dialerMatch && dateMatch && statusMatch;
    });
  }, [allAppointments, filters]);


  const stats = useMemo(() => {
    const leadsMap = new Map(allLeads.map(l => [l.id, l]));
    const validCalls = filteredCalls.filter(c => c.callId);
    const uniqueCallIds = new Set(validCalls.map(c => c.callId));
    const totalCalls = uniqueCallIds.size;
    const leadsContactedIds = new Set(validCalls.map(c => c.leadId));

    const totalLeadsInFilter = filteredLeads.length;
    const assignedLeads = filteredLeads.filter(lead => !!lead.dialerAssigned);
    const totalAssignedLeads = assignedLeads.length;

    const leadsInQueue = assignedLeads.filter(lead => lead.status === 'New').length;
    
    // To calculate duration stats correctly, we should also only use unique calls
    const uniqueCallsMap = new Map<string, CallActivity>();
    validCalls.forEach(call => {
      if (call.callId && !uniqueCallsMap.has(call.callId)) {
        uniqueCallsMap.set(call.callId, call);
      }
    });
    const uniqueCallsArray = Array.from(uniqueCallsMap.values());

    const callsOver2Min = uniqueCallsArray.filter(c => parseDuration(c.duration) >= 120).length;
    const calls30sTo2min = uniqueCallsArray.filter(c => {
        const duration = parseDuration(c.duration);
        return duration >= 30 && duration < 120;
    }).length;

    const ratioOver2Min = totalCalls > 0 ? (callsOver2Min / totalCalls) * 100 : 0;
    const ratio30sTo2min = totalCalls > 0 ? (calls30sTo2min / totalCalls) * 100 : 0;
    
    const callsWithDuration = uniqueCallsArray.filter(c => c.duration);
    const totalDuration = callsWithDuration.reduce((sum, call) => sum + parseDuration(call.duration), 0);
    const averageDuration = callsWithDuration.length > 0 ? totalDuration / callsWithDuration.length : 0;
    const avgMinutes = Math.floor(averageDuration / 60);
    const avgSeconds = Math.round(averageDuration % 60);
    const averageDurationFormatted = `${avgMinutes}m ${avgSeconds}s`;

    const leadsByStatus = filteredLeads
        .filter(lead => lead.status !== 'New')
        .reduce((acc, lead) => {
            const status = lead.status;
            const existingEntry = acc.find(item => item.name === status);
            if (existingEntry) {
                existingEntry.value += 1;
            } else {
                acc.push({ name: status, value: 1 });
            }
            return acc;
        }, [] as { name: LeadStatus; value: number }[]);

    const appointmentsBySource = filteredAppointments.reduce((acc, appointment) => {
        const lead = leadsMap.get(appointment.leadId);
        const source = lead?.campaign || 'Unknown';
        const existingEntry = acc.find(item => item.name === source);
        if (existingEntry) {
            existingEntry.value += 1;
        } else {
            acc.push({ name: source, value: 1 });
        }
        return acc;
    }, [] as { name: string; value: number }[]);

    const appointmentsByLeadType = filteredAppointments.reduce((acc, appointment) => {
        const lead = leadsMap.get(appointment.leadId);
        const leadType = lead?.leadType || 'Unknown';
        const existingEntry = acc.find(item => item.name === leadType);
        if (existingEntry) {
            existingEntry.value += 1;
        } else {
            acc.push({ name: leadType, value: 1 });
        }
        return acc;
    }, [] as { name: string; value: number }[]);

    const totalAppointments = filteredAppointments.length;
    const appointmentsForWonLeads = filteredAppointments.filter(a => a.leadStatus === 'Won').length;
    const appointmentsForLostLeads = filteredAppointments.filter(a => a.leadStatus === 'Lost').length;
    const wonAppointmentRate = totalAppointments > 0 ? (appointmentsForWonLeads / totalAppointments) * 100 : 0;
    const lostAppointmentRate = totalAppointments > 0 ? (appointmentsForLostLeads / totalAppointments) * 100 : 0;
    
    const appointmentToCallRatio = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;
    const appointmentToContactRatio = leadsContactedIds.size > 0 ? (totalAppointments / leadsContactedIds.size) * 100 : 0;
    
    const archivedStatuses: LeadStatus[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified'];
    const archivedLeads = filteredLeads.filter(lead => archivedStatuses.includes(lead.status));
    const archivedLeadsCount = archivedLeads.length;

    const lostLeadsBySource = filteredLeads
        .filter(lead => lead.status === 'Lost')
        .reduce((acc, lead) => {
            const source = lead.campaign || 'Unknown';
            const existingEntry = acc.find(item => item.name === source);
            if (existingEntry) {
                existingEntry.value += 1;
            } else {
                acc.push({ name: source, value: 1 });
            }
            return acc;
    }, [] as { name: string; value: number }[]);


    const processedToCallsRatio = totalCalls > 0 ? (archivedLeadsCount / totalCalls) * 100 : 0;
    const appointmentToArchivedRatio = archivedLeadsCount > 0 ? (totalAppointments / archivedLeadsCount) * 100 : 0;

    const totalPreQualified = filteredLeads.filter(l => l.status === 'Pre Qualified').length;
    const totalQualified = filteredLeads.filter(l => l.status === 'Qualified').length;
    const totalLost = filteredLeads.filter(l => l.status === 'Lost').length;
    const totalWon = filteredLeads.filter(l => l.status === 'Won').length;
    
    const leadsWithDiscoveryData = filteredLeads.filter((l): l is Lead & { discoveryData: DiscoveryData } => !!l.discoveryData && Object.keys(l.discoveryData).length > 0);

    const averageDiscoveryScore = leadsWithDiscoveryData.length > 0
        ? leadsWithDiscoveryData.reduce((sum, lead) => sum + (lead.discoveryData.score || 0), 0) / leadsWithDiscoveryData.length
        : 0;

    const leadsByRoutingTag = leadsWithDiscoveryData.reduce((acc, lead) => {
        const tag = lead.discoveryData.routingTag || 'Unknown';
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const routingTagData = Object.entries(leadsByRoutingTag).map(([name, value]) => ({ name, value }));

    const leadsByScoreRange = leadsWithDiscoveryData.reduce((acc, lead) => {
        const score = lead.discoveryData.score || 0;
        if (score >= 75) acc['75-100'] += 1;
        else if (score >= 50) acc['50-74'] += 1;
        else if (score >= 25) acc['25-49'] += 1;
        else acc['0-24'] += 1;
        return acc;
    }, { '0-24': 0, '25-49': 0, '50-74': 0, '75-100': 0 });
    const scoreRangeData = Object.entries(leadsByScoreRange).map(([name, value]) => ({ name, value }));

    const leadsInProgress = leadsContactedIds.size - archivedLeadsCount;

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
      totalAppointments,
      averageDurationFormatted,
      appointmentsForWonLeads,
      appointmentsForLostLeads,
      wonAppointmentRate,
      lostAppointmentRate,
      appointmentToCallRatio,
      appointmentToContactRatio,
      archivedLeadsCount,
      processedToCallsRatio,
      totalPreQualified,
      totalQualified,
      totalLost,
      totalWon,
      appointmentsBySource,
      lostLeadsBySource,
      averageDiscoveryScore,
      routingTagData,
      scoreRangeData,
      appointmentsByLeadType,
      leadsInProgress,
      appointmentToArchivedRatio,
    };
  }, [filteredCalls, filteredLeads, filteredAppointments, allLeads]);
  

  const hasActiveFilters = 
    (filters.dialerAssigned !== 'all' && userProfile?.role === 'admin') || 
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
                    <div className="space-y-2">
                        <Label htmlFor="user">Assigned To</Label>
                            <Select 
                                value={filters.dialerAssigned} 
                                onValueChange={(value) => handleFilterChange('dialerAssigned', value)}
                                disabled={userProfile?.role !== 'admin'}
                            >
                            <SelectTrigger id="user">
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {userProfile?.role === 'admin' && <SelectItem value="all">All Users</SelectItem>}
                                {allDialers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date (Call or Appt. Creation)</Label>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 xl:col-span-1">
            <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
                 <CardDescription>Distribution of leads by their current status (excluding 'New').</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.leadsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie
                        activeIndex={statusActiveIndex}
                        activeShape={renderActiveShape}
                        data={stats.leadsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onStatusPieEnter}
                        isAnimationActive={true}
                        animationDuration={500}
                    >
                    {stats.leadsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                    ))}
                    </Pie>
                    <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                No lead status data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 xl:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Appointments by Lead Source
                </CardTitle>
                <CardDescription>Appointments booked from different lead sources.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.appointmentsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie
                        activeIndex={sourceActiveIndex}
                        activeShape={renderActiveShape}
                        data={stats.appointmentsBySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onSourcePieEnter}
                        isAnimationActive={true}
                        animationDuration={500}
                    >
                    {stats.appointmentsBySource.map((entry, index) => (
                        <Cell key={`cell-source-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                    </Pie>
                    <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No appointment data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 xl:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Appointments by Lead Type
                </CardTitle>
                <CardDescription>Breakdown of lead types for booked appointments.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.appointmentsByLeadType.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie
                        activeIndex={leadTypeActiveIndex}
                        activeShape={renderActiveShape}
                        data={stats.appointmentsByLeadType}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onLeadTypePieEnter}
                        isAnimationActive={true}
                        animationDuration={500}
                    >
                    {stats.appointmentsByLeadType.map((entry, index) => (
                        <Cell key={`cell-lead-type-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                    </Pie>
                    <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No lead type data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>
        
        <Card className="lg:col-span-1 xl:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Frown className="h-5 w-5" />
                    Lost Leads by Source
                </CardTitle>
                <CardDescription>Breakdown of sources for leads with a 'Lost' status.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.lostLeadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie
                        activeIndex={lostSourceActiveIndex}
                        activeShape={renderActiveShape}
                        data={stats.lostLeadsBySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onLostSourcePieEnter}
                        isAnimationActive={true}
                        animationDuration={500}
                    >
                    {stats.lostLeadsBySource.map((entry, index) => (
                        <Cell key={`cell-lost-source-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                    </Pie>
                    <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No lost lead data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>
        
      </div>

       <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Discovery & Routing Insights</h2>
                <p className="text-muted-foreground">Metrics related to the discovery process.</p>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <StatCard title="Average Discovery Score" value={stats.averageDiscoveryScore.toFixed(0)} icon={Star} description="Average score across all leads with discovery data." />
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Route className="h-5 w-5" />
                           Leads by Routing Tag
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.routingTagData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={stats.routingTagData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                        {stats.routingTagData.map((entry, index) => (
                                            <Cell key={`cell-route-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconSize={10} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="flex h-[200px] items-center justify-center text-muted-foreground">No routing data.</div>
                        )}
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <BarChart3 className="h-5 w-5" />
                           Leads by Score Range
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                         {stats.scoreRangeData.some(d => d.value > 0) ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={stats.scoreRangeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className="flex h-[200px] items-center justify-center text-muted-foreground">No score data.</div>
                         )}
                    </CardContent>
                 </Card>
             </div>
        </div>
      
       <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Call Performance</h2>
                <p className="text-muted-foreground">Metrics related to call activities.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Calls Made" value={stats.totalCalls} icon={Phone} />
                 <StatCard title="Average Call Duration" value={stats.averageDurationFormatted} icon={Clock} description="Based on unique calls" />
                 <StatCard title="Calls 30s-2min" value={stats.calls30sTo2min} icon={TrendingDown} description={`${stats.ratio30sTo2min.toFixed(1)}% of total calls`} />
                 <StatCard title="Calls > 2min" value={stats.callsOver2Min} icon={TrendingUp} description={`${stats.ratioOver2Min.toFixed(1)}% of total calls`} />
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Appointment Performance</h2>
                <p className="text-muted-foreground">Metrics related to booked appointments.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Appointments Booked" value={stats.totalAppointments} icon={CalendarIconLucide} description="Across all time" />
                 <StatCard 
                    title="Appointments to Won Leads" 
                    value={stats.appointmentsForWonLeads} 
                    icon={Goal} 
                    description={`${stats.wonAppointmentRate.toFixed(1)}% of total appointments`} 
                />
                <StatCard 
                    title="Appointments to Lost Leads" 
                    value={stats.appointmentsForLostLeads} 
                    icon={UserX} 
                    description={`${stats.lostAppointmentRate.toFixed(1)}% of total appointments`} 
                />
                 <StatCard title="Appointment Booking Rate" value={`${stats.appointmentToCallRatio.toFixed(1)}%`} icon={Percent} description="Ratio of appointments to calls" />
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lead Funnel</h2>
                <p className="text-muted-foreground">Metrics related to lead progression and status.</p>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <StatCard title="Total Assigned Leads" value={stats.totalAssignedLeads} icon={Users} description="Matching current filters" />
                <StatCard title="Unique Leads Contacted" value={stats.leadsContacted} icon={UserCheck} description={`out of ${stats.totalLeadsInFilter} total leads`} />
                <StatCard title="Leads In Progress" value={stats.leadsInProgress} icon={TrendingUp} description="Contacted leads not yet archived" />
                <StatCard title="Total Archived Leads" value={stats.archivedLeadsCount} icon={Archive} description="Includes Lost, Qualified, Won, LPO Review, Pre Qualified, and Unqualified statuses." />
                <StatCard title="Leads in Queue" value={stats.leadsInQueue} icon={UserX} description="New, assigned leads" />
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Conversion Rates</h2>
                <p className="text-muted-foreground">Key conversion metrics.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Processed to Call Ratio" value={`${stats.processedToCallsRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of processed leads to calls" />
                <StatCard title="Appt. to Contact Ratio" value={`${stats.appointmentToContactRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of appointments to unique leads contacted" />
                <StatCard title="Appt. to Archived Ratio" value={`${stats.appointmentToArchivedRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of appointments to archived leads" />
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lead Outcomes</h2>
                <p className="text-muted-foreground">Final breakdown of lead statuses.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pre-Qualified Leads" value={stats.totalPreQualified} icon={UserCheck} />
                <StatCard title="Total Qualified Leads" value={stats.totalQualified} icon={UserCheck} />
                <StatCard title="Total Lost Leads" value={stats.totalLost} icon={UserX} />
                <StatCard title="Total Won Leads" value={stats.totalWon} icon={Goal} />
            </div>
        </div>

    </div>
  );
}

    

    