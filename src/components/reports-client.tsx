

"use client"

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, AppointmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Phone, Users, UserCheck, UserX, Percent, Clock, Filter, SlidersHorizontal, X, Sparkles, Send, Route, Star, Calendar as CalendarIconLucide, Goal, CheckCircle, TrendingUp, Briefcase, Archive, Frown, BarChart3, TrendingDown, Target, RefreshCw, Presentation, Flame } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllCallActivities, getAllLeadsForReport, getAllAppointments } from '@/services/firebase';
import { ChartTooltipContent, ChartContainer } from './ui/chart';

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
  'Trialing ShipMate': '#EC4899', // Pink
  'Reschedule': '#FBBF24', // Amber 500
  'Hot Lead': '#F97316', // Orange 500
};

const APPOINTMENT_STATUS_COLORS: { [key in AppointmentStatus | 'Pending']: string } = {
  'Completed': '#22C55E',
  'Cancelled': '#EF4444',
  'No Show': '#F59E0B',
  'Rescheduled': '#8884d8',
  'Pending': '#A0A0A0',
};


const SOURCE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A855F7', '#22C55E', '#EF4444'];


type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status'] };

interface ReportsClientPageProps {
  initialCalls: CallActivity[];
  initialLeads: Lead[];
  initialAppointments: AppointmentWithLead[];
  initialDialers: string[];
}

export default function ReportsClientPage({
  initialCalls,
  initialLeads,
  initialAppointments,
  initialDialers
}: ReportsClientPageProps) {
  const [allCalls, setAllCalls] = useState<CallActivity[]>(initialCalls);
  const [allLeads, setAllLeads] = useState<Lead[]>(initialLeads);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>(initialAppointments);
  const [allDialers, setAllDialers] = useState<string[]>(initialDialers);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [inactiveStatus, setInactiveStatus] = useState<string[]>([]);
  const [inactiveSource, setInactiveSource] = useState<string[]>([]);
  const [inactiveLostSource, setInactiveLostSource] = useState<string[]>([]);
  const [inactiveLeadType, setInactiveLeadType] = useState<string[]>([]);
  const [inactiveRoutingTag, setInactiveRoutingTag] = useState<string[]>([]);
  const [inactiveAppointmentStatus, setInactiveAppointmentStatus] = useState<string[]>([]);


  const [filters, setFilters] = useState({
    status: 'all' as LeadStatus | 'all',
    date: undefined as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: 'all',
  });
  
  useEffect(() => {
    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
      handleFilterChange('dialerAssigned', userProfile.displayName);
    }
  }, [userProfile]);
  
  const fetchData = async () => {
    setIsRefreshing(true);
    toast({ title: 'Refreshing data...', description: 'Fetching the latest information from the database.' });
    try {
        const [refreshedCalls, refreshedLeads, refreshedAppointments] = await Promise.all([
            getAllCallActivities(),
            getAllLeadsForReport(),
            getAllAppointments()
        ]);
        setAllCalls(refreshedCalls);
        setAllLeads(refreshedLeads);
        setAllAppointments(refreshedAppointments);
        toast({ title: 'Success', description: 'Report data has been updated.' });
    } catch (error) {
        console.error("Failed to refresh data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleLegendClick = (inactiveState: string[], setInactiveState: React.Dispatch<React.SetStateAction<string[]>>, entry: any) => {
    const { value } = entry;
    if (inactiveState.includes(value)) {
      setInactiveState(inactiveState.filter(item => item !== value));
    } else {
      setInactiveState([...inactiveState, value]);
    }
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      date: undefined,
      appointmentDate: undefined,
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
        if (filters.date?.from) {
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            // Check if any activity falls within the date range
            const activitiesForLead = allCalls.filter(c => c.leadId === lead.id);
            dateMatch = activitiesForLead.some(a => {
                const activityDate = new Date(a.date);
                return activityDate >= fromDate && activityDate <= toDate;
            });
        }
        return dialerMatch && statusMatch && dateMatch;
    });
  }, [allLeads, filters, allCalls]);

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

        let creationDateMatch = true;
        if (filters.date?.from) {
            const appointmentCreatedDate = parseDateString(appointment.appointmentDate);
            if (!appointmentCreatedDate) return false;
            const fromDate = startOfDay(filters.date.from);
            const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            creationDateMatch = appointmentCreatedDate >= fromDate && appointmentCreatedDate <= toDate;
        }

        let appointmentDateMatch = true;
        if (filters.appointmentDate?.from) {
            const apptDate = new Date(appointment.duedate);
            const fromDate = startOfDay(filters.appointmentDate.from);
            const toDate = filters.appointmentDate.to ? endOfDay(filters.appointmentDate.to) : endOfDay(filters.appointmentDate.from);
            appointmentDateMatch = apptDate >= fromDate && apptDate <= toDate;
        }

        return dialerMatch && statusMatch && creationDateMatch && appointmentDateMatch;
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
    
    const hotLeadsRemaining = assignedLeads.filter(lead => lead.status === 'Hot Lead').length;
    
    const inProgressStatuses: LeadStatus[] = ['Contacted', 'Connected', 'High Touch', 'In Progress', 'Reschedule'];
    const leadsInProgress = assignedLeads.filter(lead => inProgressStatuses.includes(lead.status)).length;
    
    const queueStatuses: LeadStatus[] = ['New', 'Hot Lead'];
    const leadsInQueue = assignedLeads.filter(lead => queueStatuses.includes(lead.status)).length;
    
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

    const uniqueAppointments = Array.from(
        filteredAppointments
            .reduce((map, appt) => {
                const key = `${appt.leadName}-${appt.duedate}-${appt.starttime}`;
                if (!map.has(key)) {
                    map.set(key, appt);
                }
                return map;
            }, new Map<string, AppointmentWithLead>())
            .values()
    );

    const appointmentsBySource = uniqueAppointments.reduce((acc, appointment) => {
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

    const appointmentsByLeadType = uniqueAppointments.reduce((acc, appointment) => {
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

    const totalAppointments = uniqueAppointments.length;
    const appointmentsForWonLeads = uniqueAppointments.filter(a => a.leadStatus === 'Won').length;
    const appointmentsForTrialingShipMateLeads = uniqueAppointments.filter(a => a.leadStatus === 'Trialing ShipMate').length;
    const appointmentsForLostLeads = uniqueAppointments.filter(a => a.leadStatus === 'Lost').length;
    const wonAppointmentRate = totalAppointments > 0 ? (appointmentsForWonLeads / totalAppointments) * 100 : 0;
    const trialingShipMateAppointmentRate = totalAppointments > 0 ? (appointmentsForTrialingShipMateLeads / totalAppointments) * 100 : 0;
    const lostAppointmentRate = totalAppointments > 0 ? (appointmentsForLostLeads / totalAppointments) * 100 : 0;
    
    const appointmentToCallRatio = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;
    const appointmentToContactRatio = leadsContactedIds.size > 0 ? (totalAppointments / leadsContactedIds.size) * 100 : 0;
    
    const archivedStatuses: LeadStatus[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate'];
    const totalArchivedLeads = assignedLeads.filter(lead => archivedStatuses.includes(lead.status)).length;

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


    const processedToCallsRatio = totalCalls > 0 ? (totalArchivedLeads / totalCalls) * 100 : 0;
    const appointmentToArchivedRatio = totalArchivedLeads > 0 ? (totalAppointments / totalArchivedLeads) * 100 : 0;

    const totalPreQualified = filteredLeads.filter(l => l.status === 'Pre Qualified').length;
    const totalQualified = filteredLeads.filter(l => l.status === 'Qualified').length;
    const totalLost = filteredLeads.filter(l => l.status === 'Lost').length;
    const totalWon = filteredLeads.filter(l => l.status === 'Won').length;
    const totalTrialingShipMate = filteredLeads.filter(l => l.status === 'Trialing ShipMate').length;
    
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

    const qualifiedToArchivedRatio = totalArchivedLeads > 0 ? (totalQualified / totalArchivedLeads) * 100 : 0;
    const preQualifiedToArchivedRatio = totalArchivedLeads > 0 ? (totalPreQualified / totalArchivedLeads) * 100 : 0;
    const combinedQualifiedToArchivedRatio = totalArchivedLeads > 0 ? ((totalQualified + totalPreQualified) / totalArchivedLeads) * 100 : 0;
    
    const activeDialersInFilter = [...new Set(
        [...filteredCalls, ...filteredAppointments]
        .map(item => item.dialerAssigned)
        .filter((d): d is string => !!d)
    )];

    const teamPerformanceData = activeDialersInFilter.map(dialer => {
      const dialerCalls = uniqueCallsArray.filter(c => c.dialerAssigned === dialer);
      const totalDialerCalls = dialerCalls.length;
      
      const dialerAppointments = uniqueAppointments.filter(a => a.dialerAssigned === dialer);
      const totalDialerAppointments = dialerAppointments.length;
      
      const conversionRate = totalDialerCalls > 0 ? (totalDialerAppointments / totalDialerCalls) * 100 : 0;
      
      return {
        name: dialer,
        'Total Calls': totalDialerCalls,
        'Appointments': totalDialerAppointments,
        'Conversion Rate': conversionRate
      };
    });
    
    const appointmentOutcomes = uniqueAppointments.reduce((acc, appt) => {
        const status = appt.appointmentStatus || 'Pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<AppointmentStatus | 'Pending', number>);
    const appointmentOutcomeData = Object.entries(appointmentOutcomes).map(([name, value]) => ({ name: name as AppointmentStatus | 'Pending', value }));

    const totalCompleted = appointmentOutcomes['Completed'] || 0;
    const totalCancellations = appointmentOutcomes['Cancelled'] || 0;
    const totalNoShows = appointmentOutcomes['No Show'] || 0;
    const relevantAppointments = totalCompleted + totalNoShows + totalCancellations;
    
    const showRate = relevantAppointments > 0 ? (totalCompleted / relevantAppointments) * 100 : 0;
    const noShowRate = relevantAppointments > 0 ? (totalNoShows / relevantAppointments) * 100 : 0;

    const leadsWithDemoCompleted = filteredLeads.filter(l => l.demoCompleted === 'Yes');
    const totalDemosConducted = leadsWithDemoCompleted.length;
    const demosWon = leadsWithDemoCompleted.filter(l => l.status === 'Won').length;
    const demosLost = leadsWithDemoCompleted.filter(l => l.status === 'Lost').length;
    const demosTrialing = leadsWithDemoCompleted.filter(l => l.status === 'Trialing ShipMate').length;
    
    const callsToContactedRatio = leadsContactedIds.size > 0 ? (totalCalls / leadsContactedIds.size) : 0;


    return {
      totalCalls,
      leadsContacted: leadsContactedIds.size,
      leadsInQueue,
      hotLeadsRemaining,
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
      totalArchivedLeads,
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
      qualifiedToArchivedRatio,
      preQualifiedToArchivedRatio,
      combinedQualifiedToArchivedRatio,
      appointmentsForTrialingShipMateLeads: appointmentsForTrialingShipMateLeads,
      trialingShipMateAppointmentRate: trialingShipMateAppointmentRate,
      totalTrialingShipMate: totalTrialingShipMate,
      teamPerformanceData,
      appointmentOutcomeData,
      showRate,
      noShowRate,
      totalDemosConducted,
      demosWon,
      demosLost,
      demosTrialing,
      callsToContactedRatio,
    };
  }, [filteredCalls, filteredLeads, filteredAppointments, allLeads]);
  

  const hasActiveFilters = 
    (filters.dialerAssigned !== 'all' && userProfile?.role === 'admin') || 
    filters.status !== 'all' || 
    !!filters.date || 
    !!filters.appointmentDate ||
    filters.duration !== 'all';

  if (authLoading || !userProfile) {
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

  const chartConfig = {};

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Performance dashboard.</p>
      </header>

       <Collapsible>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle>Filters</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchData} variant="outline" disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
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
                                {(['New', 'Hot Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Trialing ShipMate', 'Reschedule'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Call/Creation Date</Label>
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
                        <Label htmlFor="appointmentDate">Appointment Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="appointmentDate"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.appointmentDate?.from ? (
                                  filters.appointmentDate.to ? (
                                    <>
                                      {format(filters.appointmentDate.from, "LLL dd, y")} -{" "}
                                      {format(filters.appointmentDate.to, "LLL dd, y")}
                                    </>
                                  ) : (
                                    format(filters.appointmentDate.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: new Date(), to: new Date()})}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('appointmentDate', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                </div>
                                <Calendar
                                  mode="range"
                                  selected={filters.appointmentDate}
                                  onSelect={(date) => handleFilterChange('appointmentDate', date)}
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
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
                 <CardDescription>Distribution of leads by their current status (excluding 'New').</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.leadsByStatus.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <PieChart>
                        <Pie
                            data={stats.leadsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                        >
                        {stats.leadsByStatus.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={inactiveStatus.includes(entry.name) ? 'transparent' : STATUS_COLORS[entry.name]} />
                        ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent
                            formatter={(value, name) => (
                                <div className="flex flex-col">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">{value} leads</span>
                                </div>
                            )}
                            />}
                        />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveStatus, setInactiveStatus, e)} />
                    </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                No lead status data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Appointments by Lead Source
                </CardTitle>
                <CardDescription>Appointments booked from different lead sources.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.appointmentsBySource.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <PieChart>
                        <Pie
                            data={stats.appointmentsBySource}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                        >
                        {stats.appointmentsBySource.map((entry, index) => (
                           <Cell key={`cell-source-${index}`} fill={inactiveSource.includes(entry.name) ? 'transparent' : SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                        </Pie>
                         <Tooltip content={<ChartTooltipContent
                            formatter={(value, name) => (
                                <div className="flex flex-col">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">{value} appointments</span>
                                </div>
                            )}
                            />}
                        />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveSource, setInactiveSource, e)} />
                    </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No appointment data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Appointments by Lead Type
                </CardTitle>
                <CardDescription>Breakdown of lead types for booked appointments.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.appointmentsByLeadType.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <PieChart>
                        <Pie
                            data={stats.appointmentsByLeadType}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                        >
                        {stats.appointmentsByLeadType.map((entry, index) => (
                           <Cell key={`cell-lead-type-${index}`} fill={inactiveLeadType.includes(entry.name) ? 'transparent' : SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent
                            formatter={(value, name) => (
                                <div className="flex flex-col">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">{value} appointments</span>
                                </div>
                            )}
                            />}
                        />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveLeadType, setInactiveLeadType, e)} />
                    </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No lead type data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Frown className="h-5 w-5" />
                    Lost Leads by Source
                </CardTitle>
                <CardDescription>Breakdown of sources for leads with a 'Lost' status.</CardDescription>
            </CardHeader>
            <CardContent>
            {stats.lostLeadsBySource.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <PieChart>
                        <Pie
                           data={stats.lostLeadsBySource}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                        >
                        {stats.lostLeadsBySource.map((entry, index) => (
                            <Cell key={`cell-lost-source-${index}`} fill={inactiveLostSource.includes(entry.name) ? 'transparent' : SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                        </Pie>
                         <Tooltip content={<ChartTooltipContent
                            formatter={(value, name) => (
                                <div className="flex flex-col">
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">{value} leads</span>
                                </div>
                            )}
                            />}
                        />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveLostSource, setInactiveLostSource, e)} />
                    </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No lost lead data to display for the selected filters.
                </div>
            )}
            </CardContent>
        </Card>
      </div>

       {userProfile?.role === 'admin' && (
          <div className="space-y-6">
              <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Team Performance Leaderboard</h2>
                  <p className="text-muted-foreground">Comparison of dialer performance.</p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  {stats.teamPerformanceData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[400px] w-full">
                          <BarChart data={stats.teamPerformanceData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={120} />
                              <Tooltip 
                                content={<ChartTooltipContent 
                                  formatter={(value, name) => (
                                      <div className="flex flex-col">
                                          <span className="font-medium">{name}</span>
                                          <span className="text-muted-foreground">{typeof value === 'number' && name === 'Conversion Rate' ? `${value.toFixed(1)}%` : value}</span>
                                      </div>
                                  )}
                                />} 
                              />
                              <Legend />
                              <Bar dataKey="Total Calls" fill="#8884d8" />
                              <Bar dataKey="Appointments" fill="#82ca9d" />
                              <Bar dataKey="Conversion Rate" fill="#ffc658" />
                          </BarChart>
                      </ChartContainer>
                  ) : (
                      <div className="flex h-[400px] items-center justify-center text-muted-foreground">No team performance data available.</div>
                  )}
                </CardContent>
              </Card>
          </div>
        )}
      
      <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Call Performance</h2>
                <p className="text-muted-foreground">Metrics related to call activities.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                 <StatCard title="Total Calls Made" value={stats.totalCalls} icon={Phone} />
                 <StatCard title="Unique Leads Contacted" value={stats.leadsContacted} icon={UserCheck} description={`out of ${stats.totalLeadsInFilter} total leads`} />
                 <StatCard title="Calls to Contacted Ratio" value={`${stats.callsToContactedRatio.toFixed(1)} : 1`} icon={Percent} description="Avg. calls per unique lead contacted" />
                 <StatCard title="Average Call Duration" value={stats.averageDurationFormatted} icon={Clock} description="Based on unique calls" />
                 <StatCard title="Calls > 2min" value={stats.callsOver2Min} icon={TrendingUp} description={`${stats.ratioOver2Min.toFixed(1)}% of total calls`} />
            </div>
        </div>

       <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lead Funnel</h2>
                <p className="text-muted-foreground">Metrics related to lead progression and status.</p>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                <StatCard title="Total Assigned Leads" value={stats.totalAssignedLeads} icon={Users} description="Matching current filters" />
                <StatCard title="Leads in Queue" value={stats.leadsInQueue} icon={UserX} description="New or Hot leads" />
                <StatCard title="Leads In Progress" value={stats.leadsInProgress} icon={TrendingUp} description="Contacted leads not yet archived" />
                <StatCard title="Total Archived Leads" value={stats.totalArchivedLeads} icon={Archive} description="Includes Lost, Qualified, Won, LPO Review, Pre Qualified, and Unqualified statuses." />
                <StatCard title="Hot Leads Remaining" value={stats.hotLeadsRemaining} icon={Flame} description="Priority leads to be actioned." />
            </div>
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
                            <ChartContainer config={chartConfig} className="h-[200px] w-full">
                                <PieChart>
                                    <Pie data={stats.routingTagData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                                        {stats.routingTagData.map((entry, index) => (
                                            <Cell key={`cell-route-${index}`} fill={inactiveRoutingTag.includes(entry.name) ? 'transparent' : SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent
                                      formatter={(value, name) => (
                                          <div className="flex flex-col">
                                              <span className="font-medium">{name}</span>
                                              <span className="text-muted-foreground">{value} leads</span>
                                          </div>
                                      )}
                                      />}
                                    />
                                    <Legend iconSize={10} onClick={(e) => handleLegendClick(inactiveRoutingTag, setInactiveRoutingTag, e)} />
                                </PieChart>
                            </ChartContainer>
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
                <h2 className="text-2xl font-semibold tracking-tight">Conversion Rates</h2>
                <p className="text-muted-foreground">Key conversion metrics.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <StatCard title="Processed to Call Ratio" value={`${stats.processedToCallsRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of processed leads to calls" />
                <StatCard title="Appt. to Contact Ratio" value={`${stats.appointmentToContactRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of appointments to unique leads contacted" />
                <StatCard title="Appt. to Archived Ratio" value={`${stats.appointmentToArchivedRatio.toFixed(1)}%`} icon={TrendingUp} description="Ratio of appointments to archived leads" />
                <StatCard title="Qualified to Archived" value={`${stats.qualifiedToArchivedRatio.toFixed(1)}%`} icon={Percent} description="Ratio of 'Qualified' to all archived leads" />
                <StatCard title="Pre-Qualified to Archived" value={`${stats.preQualifiedToArchivedRatio.toFixed(1)}%`} icon={Percent} description="Ratio of 'Pre-Qualified' to all archived leads" />
                <StatCard title="Total Qualified to Archived" value={`${stats.combinedQualifiedToArchivedRatio.toFixed(1)}%`} icon={Percent} description="Ratio of 'Qualified' + 'Pre-Qualified' to all archived" />
            </div>
        </div>

       <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Appointment Performance</h2>
            <p className="text-muted-foreground">Metrics related to booked appointments.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                 <StatCard title="Total Appointments Booked" value={stats.totalAppointments} icon={CalendarIconLucide} description="Unique appointments" />
                 <StatCard 
                    title="Appointments to Won Leads" 
                    value={stats.appointmentsForWonLeads} 
                    icon={Goal} 
                    description={`${stats.wonAppointmentRate.toFixed(1)}% of total appointments`} 
                />
                <StatCard 
                    title="Appointments to Trialing ShipMate" 
                    value={stats.appointmentsForTrialingShipMateLeads} 
                    icon={Presentation} 
                    description={`${stats.trialingShipMateAppointmentRate.toFixed(1)}% of total appointments`} 
                />
                <StatCard 
                    title="Appointments to Lost Leads" 
                    value={stats.appointmentsForLostLeads} 
                    icon={UserX} 
                    description={`${stats.lostAppointmentRate.toFixed(1)}% of total appointments`} 
                />
                 <StatCard title="Appointment Booking Rate" value={`${stats.appointmentToCallRatio.toFixed(1)}%`} icon={Percent} description="Ratio of appointments to calls" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Appointment Show Rate" value={`${stats.showRate.toFixed(1)}%`} icon={TrendingUp} description="Completed / (Completed + No Shows + Cancelled)" />
                <StatCard title="Appointment No-Show Rate" value={`${stats.noShowRate.toFixed(1)}%`} icon={TrendingDown} description="No Shows / (Completed + No Shows + Cancelled)" />
                <Card>
                <CardHeader>
                    <CardTitle>Appointment Outcomes</CardTitle>
                    <CardDescription>Distribution of appointment statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.appointmentOutcomeData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <PieChart>
                        <Pie
                            data={stats.appointmentOutcomeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                        >
                            {stats.appointmentOutcomeData.map((entry, index) => (
                            <Cell key={`cell-appt-status-${index}`} fill={inactiveAppointmentStatus.includes(entry.name) ? 'transparent' : APPOINTMENT_STATUS_COLORS[entry.name]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent
                            formatter={(value, name) => (
                            <div className="flex flex-col">
                                <span className="font-medium">{name}</span>
                                <span className="text-muted-foreground">{value} appointments</span>
                            </div>
                            )}
                        />} />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveAppointmentStatus, setInactiveAppointmentStatus, e)} />
                        </PieChart>
                    </ChartContainer>
                    ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No appointment outcome data to display.
                    </div>
                    )}
                </CardContent>
              </Card>
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Demo Performance</h2>
                <p className="text-muted-foreground">Metrics related to conducted demos.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Demos Conducted" value={stats.totalDemosConducted} icon={Presentation} />
                 <StatCard title="Demos Won" value={stats.demosWon} icon={Goal} />
                 <StatCard title="Demos Lost" value={stats.demosLost} icon={Frown} />
                 <StatCard title="Demos in Trial" value={stats.demosTrialing} icon={TrendingUp} />
            </div>
        </div>
        
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lead Outcomes</h2>
                <p className="text-muted-foreground">Final breakdown of lead statuses.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Total Pre-Qualified Leads" value={stats.totalPreQualified} icon={UserCheck} />
                <StatCard title="Total Qualified Leads" value={stats.totalQualified} icon={UserCheck} />
                <StatCard title="Total Trialing ShipMate Leads" value={stats.totalTrialingShipMate} icon={Presentation} />
                <StatCard title="Total Lost Leads" value={stats.totalLost} icon={UserX} />
                <StatCard title="Total Won Leads" value={stats.totalWon} icon={Goal} />
            </div>
        </div>

    </div>
  );
}
