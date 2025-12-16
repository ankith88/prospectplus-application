

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
import { getAllCallActivities, getAllLeadsForReport, getAllAppointments, getAllUsers } from '@/services/firebase';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';


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
  'Priority Lead': '#F97316', // Orange 500
};

const APPOINTMENT_STATUS_COLORS: { [key in AppointmentStatus | 'Pending']: string } = {
  'Completed': '#22C55E',
  'Cancelled': '#EF4444',
  'No Show': '#F59E0B',
  'Rescheduled': '#8884d8',
  'Pending': '#A0A0A0',
};


const SOURCE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A855F7', '#22C55E', '#EF4444'];
const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Demo', 'Reschedule', 'Trialing ShipMate'];

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status'] };

export default function ReportsClientPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [allDialers, setAllDialers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
    status: [] as string[],
    callDate: undefined as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: [] as string[],
    franchisee: [] as string[],
    appointmentAssignedTo: [] as string[],
  });

  const allFranchiseesOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allLeads]);
  
  const allAppointmentAssigneesOptions: Option[] = useMemo(() => {
    const assignees = new Set(allAppointments.map(a => a.assignedTo).filter(Boolean));
    return Array.from(assignees as string[]).map(a => ({ value: a, label: a })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allAppointments]);

   useEffect(() => {
    if (!authLoading && (!userProfile?.role || !['admin', 'user'].includes(userProfile.role))) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    
    if (user) {
        fetchData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userProfile?.role !== 'admin' && userProfile?.displayName) {
      handleFilterChange('dialerAssigned', [userProfile.displayName]);
    }
  }, [userProfile]);
  
  const fetchData = async () => {
    setLoading(true);
    toast({ title: 'Loading Report Data...', description: 'Fetching the latest information from the database.' });
    try {
        const [refreshedCalls, refreshedLeads, refreshedAppointments, refreshedUsers] = await Promise.all([
            getAllCallActivities(),
            getAllLeadsForReport(),
            getAllAppointments(),
            getAllUsers(),
        ]);
        setAllCalls(refreshedCalls);
        setAllLeads(refreshedLeads);
        setAllAppointments(refreshedAppointments);
        const dialers = refreshedUsers
            .filter(u => u.role !== 'admin' && u.displayName)
            .map(u => u.displayName!);
        setAllDialers(dialers);
        toast({ title: 'Success', description: 'Report data has been loaded.' });
    } catch (error) {
        console.error("Failed to refresh data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest data.' });
    } finally {
        setLoading(false);
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
      status: [],
      callDate: undefined,
      appointmentDate: undefined,
      duration: 'all',
      dialerAssigned: userProfile?.role === 'admin' ? [] : (userProfile?.displayName ? [userProfile.displayName] : []),
      franchisee: [],
      appointmentAssignedTo: [],
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
     return (allLeads || []).filter(lead => {
        const dialerMatch = filters.dialerAssigned.length === 0 || (lead.dialerAssigned && filters.dialerAssigned.includes(lead.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(lead.status);
        
        let callDateMatch = true;
        if (filters.callDate?.from) {
            const fromDate = startOfDay(filters.callDate.from);
            const toDate = filters.callDate.to ? endOfDay(filters.callDate.to) : endOfDay(filters.callDate.from);
            
            const hasMatchingActivity = (allCalls || []).some(c => c.leadId === lead.id && new Date(c.date) >= fromDate && new Date(c.date) <= toDate);
            const hasMatchingAppointment = (allAppointments || []).some(a => {
                if (a.leadId !== lead.id) return false;
                const createdDate = parseDateString(a.appointmentDate);
                if (!createdDate) return false;
                return createdDate >= fromDate && createdDate <= toDate;
            });
            callDateMatch = hasMatchingActivity || hasMatchingAppointment;
        }
        
        const appointmentAssignedToMatch = filters.appointmentAssignedTo.length === 0 || (allAppointments || []).some(a => a.leadId === lead.id && a.assignedTo && filters.appointmentAssignedTo.includes(a.assignedTo));

        return dialerMatch && franchiseeMatch && statusMatch && callDateMatch && appointmentAssignedToMatch;
    });
  }, [allLeads, filters, allCalls, allAppointments]);

  const filteredCalls = useMemo(() => {
    return (allCalls || []).filter(call => {
        const lead = (allLeads || []).find(l => l.id === call.leadId);
        const dialerMatch = filters.dialerAssigned.length === 0 || (call.dialerAssigned && filters.dialerAssigned.includes(call.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(call.leadStatus);

        let callDateMatch = true;
        if (filters.callDate?.from) {
          const callDate = new Date(call.date);
          const fromDate = startOfDay(filters.callDate.from);
          const toDate = filters.callDate.to ? endOfDay(filters.callDate.to) : endOfDay(filters.callDate.from);
          callDateMatch = callDate >= fromDate && callDate <= toDate;
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

        const appointmentAssignedToMatch = filters.appointmentAssignedTo.length === 0 || (allAppointments || []).some(a => a.leadId === call.leadId && a.assignedTo && filters.appointmentAssignedTo.includes(a.assignedTo));

        return dialerMatch && franchiseeMatch && statusMatch && callDateMatch && durationMatch() && appointmentAssignedToMatch;
    });
  }, [allCalls, allLeads, filters, allAppointments]);
  
  const filteredAppointments = useMemo(() => {
    return (allAppointments || []).filter(appointment => {
        if (appointment.leadName === 'Unknown Lead') {
          return false;
        }
        const lead = (allLeads || []).find(l => l.id === appointment.leadId);
        const dialerMatch = filters.dialerAssigned.length === 0 || (appointment.dialerAssigned && filters.dialerAssigned.includes(appointment.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(appointment.leadStatus);
        const appointmentAssignedToMatch = filters.appointmentAssignedTo.length === 0 || (appointment.assignedTo && filters.appointmentAssignedTo.includes(appointment.assignedTo));

        let creationDateMatch = true;
        if (filters.callDate?.from) {
            const appointmentCreatedDate = parseDateString(appointment.appointmentDate);
            if (!appointmentCreatedDate) return false;
            const fromDate = startOfDay(filters.callDate.from);
            const toDate = filters.callDate.to ? endOfDay(filters.callDate.to) : endOfDay(filters.callDate.from);
            creationDateMatch = appointmentCreatedDate >= fromDate && appointmentCreatedDate <= toDate;
        }

        let appointmentDateMatch = true;
        if (filters.appointmentDate?.from) {
            const apptDate = new Date(appointment.duedate);
            const fromDate = startOfDay(filters.appointmentDate.from);
            const toDate = filters.appointmentDate.to ? endOfDay(filters.appointmentDate.to) : endOfDay(filters.appointmentDate.from);
            appointmentDateMatch = apptDate >= fromDate && apptDate <= toDate;
        }

        return dialerMatch && franchiseeMatch && statusMatch && creationDateMatch && appointmentDateMatch && appointmentAssignedToMatch;
    });
  }, [allAppointments, allLeads, filters]);


  const stats = useMemo(() => {
    const leadsMap = new Map((allLeads || []).map(l => [l.id, l]));
    const validCalls = filteredCalls.filter(c => c.callId);
    const uniqueCallIds = new Set(validCalls.map(c => c.callId));
    const totalCalls = uniqueCallIds.size;
    const leadsContactedIds = new Set(validCalls.map(c => c.leadId));
    const uniqueLeadsContacted = leadsContactedIds.size;

    const totalLeadsInFilter = filteredLeads.length;
    const assignedLeads = filteredLeads.filter(lead => !!lead.dialerAssigned);
    const totalAssignedLeads = assignedLeads.length;
    
    const priorityLeadsRemaining = assignedLeads.filter(lead => lead.status === 'Priority Lead').length;
    const newLeads = assignedLeads.filter(lead => lead.status === 'New').length;
    
    const inProgressStatuses: LeadStatus[] = ['Contacted', 'Connected', 'High Touch', 'In Progress', 'Reschedule'];
    const leadsInProgress = assignedLeads.filter(lead => inProgressStatuses.includes(lead.status)).length;
    
    const queueStatuses: LeadStatus[] = ['New', 'Priority Lead'];
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
    
    const combinedQualifiedToArchivedRatio = totalArchivedLeads > 0 ? ((totalQualified + totalPreQualified + totalWon) / totalArchivedLeads) * 100 : 0;

    const qualifiedStatuses: LeadStatus[] = ['Qualified', 'Pre Qualified', 'Won'];
    const totalCombinedQualifiedLeads = filteredLeads.filter(l => qualifiedStatuses.includes(l.status)).length;
    const qualifiedToContactedRatio = uniqueLeadsContacted > 0 ? (totalCombinedQualifiedLeads / uniqueLeadsContacted) * 100 : 0;

    
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
        'Conversion Rate': parseFloat(conversionRate.toFixed(2))
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

    const completedAppointments = uniqueAppointments.filter(a => a.appointmentStatus === 'Completed');
    const completedAppointmentsWon = completedAppointments.filter(a => a.leadStatus === 'Won').length;
    const wonFromCompletedRate = completedAppointments.length > 0 ? (completedAppointmentsWon / completedAppointments.length) * 100 : 0;

    const leadsWithDemoCompleted = filteredLeads.filter(l => l.demoCompleted === 'Yes');
    const totalDemosConducted = leadsWithDemoCompleted.length;
    const demosWon = leadsWithDemoCompleted.filter(l => l.status === 'Won').length;
    const demosLost = leadsWithDemoCompleted.filter(l => l.status === 'Lost').length;
    const demosTrialing = leadsWithDemoCompleted.filter(l => l.status === 'Trialing ShipMate').length;
    
    const callsToContactedRatio = totalCalls > 0 && uniqueLeadsContacted > 0 ? (totalCalls / uniqueLeadsContacted) : 0;

    const appointmentsByAssignee = uniqueAppointments.reduce((acc, appt) => {
        const assignee = appt.assignedTo || 'Unassigned';
        if (!acc[assignee]) {
            acc[assignee] = { name: assignee, appointments: 0 };
        }
        acc[assignee].appointments++;
        return acc;
    }, {} as Record<string, { name: string; appointments: number }>);
    const appointmentsByAssigneeData = Object.values(appointmentsByAssignee);

    const appointmentOutcomesByAssignee = uniqueAppointments.reduce((acc, appt) => {
        const assignee = appt.assignedTo || 'Unassigned';
        const status = appt.leadStatus;
        if (!acc[assignee]) {
            acc[assignee] = { name: assignee };
        }
        acc[assignee][status] = (acc[assignee][status] || 0) + 1;
        return acc;
    }, {} as Record<string, { name: string } & Partial<Record<LeadStatus, number>>>);

    const allStatuses = [...new Set(uniqueAppointments.map(a => a.leadStatus))];
    const appointmentOutcomesByAssigneeData = Object.values(appointmentOutcomesByAssignee);


    return {
      totalCalls,
      leadsContacted: uniqueLeadsContacted,
      leadsInQueue,
      priorityLeadsRemaining,
      newLeads,
      leadsByStatus,
      totalAssignedLeads,
      callsOver2Min,
      calls30sTo2min,
      ratioOver2Min: parseFloat(ratioOver2Min.toFixed(2)),
      ratio30sTo2min: parseFloat(ratio30sTo2min.toFixed(2)),
      totalLeadsInFilter,
      totalAppointments,
      averageDurationFormatted,
      appointmentsForWonLeads,
      appointmentsForLostLeads,
      wonAppointmentRate: parseFloat(wonAppointmentRate.toFixed(2)),
      lostAppointmentRate: parseFloat(lostAppointmentRate.toFixed(2)),
      appointmentToCallRatio: parseFloat(appointmentToCallRatio.toFixed(2)),
      appointmentToContactRatio: parseFloat(appointmentToContactRatio.toFixed(2)),
      totalArchivedLeads,
      processedToCallsRatio: parseFloat(processedToCallsRatio.toFixed(2)),
      totalPreQualified,
      totalQualified,
      totalLost,
      totalWon,
      appointmentsBySource,
      lostLeadsBySource,
      averageDiscoveryScore: parseFloat(averageDiscoveryScore.toFixed(2)),
      routingTagData,
      scoreRangeData,
      appointmentsByLeadType,
      leadsInProgress,
      appointmentToArchivedRatio: parseFloat(appointmentToArchivedRatio.toFixed(2)),
      qualifiedToArchivedRatio: parseFloat(qualifiedToArchivedRatio.toFixed(2)),
      preQualifiedToArchivedRatio: parseFloat(preQualifiedToArchivedRatio.toFixed(2)),
      combinedQualifiedToArchivedRatio: parseFloat(combinedQualifiedToArchivedRatio.toFixed(2)),
      appointmentsForTrialingShipMateLeads: appointmentsForTrialingShipMateLeads,
      trialingShipMateAppointmentRate: parseFloat(trialingShipMateAppointmentRate.toFixed(2)),
      totalTrialingShipMate: totalTrialingShipMate,
      teamPerformanceData,
      appointmentOutcomeData,
      showRate: parseFloat(showRate.toFixed(2)),
      noShowRate: parseFloat(noShowRate.toFixed(2)),
      totalDemosConducted,
      demosWon,
      demosLost,
      demosTrialing,
      callsToContactedRatio: parseFloat(callsToContactedRatio.toFixed(2)),
      qualifiedToContactedRatio: parseFloat(qualifiedToContactedRatio.toFixed(2)),
      appointmentsByAssigneeData,
      appointmentOutcomesByAssigneeData,
      allStatuses,
      wonFromCompletedRate: parseFloat(wonFromCompletedRate.toFixed(2)),
    };
  }, [filteredCalls, filteredLeads, filteredAppointments, allLeads]);
  

  const hasActiveFilters = filters.dialerAssigned.length > 0 ||
                           filters.franchisee.length > 0 ||
                           filters.status.length > 0 ||
                           !!filters.callDate ||
                           !!filters.appointmentDate ||
                           filters.duration !== 'all' ||
                           filters.appointmentAssignedTo.length > 0;

  if (authLoading || !userProfile || loading) {
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
  
  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
  const dialerOptions: Option[] = allDialers.map(d => ({ value: d, label: d })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Reporting</h1>
        <p className="text-muted-foreground">Performance dashboard for outbound calling.</p>
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="user">Assigned To (Dialer)</Label>
                        <MultiSelectCombobox
                            options={dialerOptions}
                            selected={filters.dialerAssigned}
                            onSelectedChange={(selected) => handleFilterChange('dialerAssigned', selected)}
                            placeholder="Select users..."
                            className={userProfile?.role !== 'admin' ? 'cursor-not-allowed' : ''}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="franchisee">Franchisee</Label>
                        <MultiSelectCombobox
                            options={allFranchiseesOptions}
                            selected={filters.franchisee}
                            onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                            placeholder="Select franchisees..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="appointmentAssignedTo">Assigned To (Appointment)</Label>
                        <MultiSelectCombobox
                            options={allAppointmentAssigneesOptions}
                            selected={filters.appointmentAssignedTo}
                            onSelectedChange={(selected) => handleFilterChange('appointmentAssignedTo', selected)}
                            placeholder="Select users..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Lead Status</Label>
                        <MultiSelectCombobox
                            options={leadStatusOptions}
                            selected={filters.status}
                            onSelectedChange={(selected) => handleFilterChange('status', selected)}
                            placeholder="Select statuses..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="callDate">Call/Creation Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="callDate"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.callDate?.from ? (
                                  filters.callDate.to ? (
                                    <>
                                      {format(filters.callDate.from, "LLL dd, y")} -{" "}
                                      {format(filters.callDate.to, "LLL dd, y")}
                                    </>
                                  ) : (
                                    format(filters.callDate.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-2 border-r p-2">
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: new Date(), to: new Date()})}>Today</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: subDays(new Date(), 1), to: subDays(new Date(), 1)})}>Yesterday</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: startOfWeek(new Date()), to: endOfWeek(new Date())})}>This Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7))})}>Last Week</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                                  <Button variant="ghost" className="justify-start" onClick={() => handleFilterChange('callDate', {from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                                </div>
                                <Calendar
                                  mode="range"
                                  selected={filters.callDate}
                                  onSelect={(date) => handleFilterChange('callDate', date)}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
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
                            label={({ name, percent }) => `${name === 'Won' ? 'Signed' : name}: ${(percent * 100).toFixed(0)}%`}
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
                                    <span className="font-medium">{name === 'Won' ? 'Signed' : name}</span>
                                    <span className="text-muted-foreground">{value} leads</span>
                                </div>
                            )}
                            />}
                        />
                        <Legend iconSize={12} wrapperStyle={{fontSize: "12px"}} onClick={(e) => handleLegendClick(inactiveStatus, setInactiveStatus, e)} formatter={(value) => value === 'Won' ? 'Signed' : value}/>
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

       <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Appointment Performance by Account Manager</h2>
            <p className="text-muted-foreground">Breakdown of appointment metrics for each appointment setter.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                  <CardTitle>Appointments per Account Manager</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.appointmentsByAssigneeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.appointmentsByAssigneeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="appointments" fill="#82ca9d" name="Appointments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data to display.</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                  <CardTitle>Appointment Outcomes by Account Manager</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.appointmentOutcomesByAssigneeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.appointmentOutcomesByAssigneeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" stackId="a" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Legend formatter={(value) => value === 'Won' ? 'Signed' : value} />
                      {stats.allStatuses.map((status, index) => (
                        <Bar key={status} dataKey={status} stackId="a" name={status === 'Won' ? 'Signed' : status} fill={STATUS_COLORS[status] || SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data to display.</div>
                )}
              </CardContent>
            </Card>
          </div>
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
                                          <span className="text-muted-foreground">{typeof value === 'number' && name === 'Conversion Rate' ? `${value.toFixed(2)}%` : value}</span>
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
                 <StatCard title="Calls to Contacted Ratio" value={`${stats.callsToContactedRatio.toFixed(2)} : 1`} icon={Percent} description="Avg. calls per unique lead contacted" />
                 <StatCard title="Average Call Duration" value={stats.averageDurationFormatted} icon={Clock} description="Based on unique calls" />
                 <StatCard title="Calls > 2min" value={stats.callsOver2Min} icon={TrendingUp} description={`${stats.ratioOver2Min.toFixed(2)}% of total calls`} />
            </div>
        </div>

       <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lead Funnel</h2>
                <p className="text-muted-foreground">Metrics related to lead progression and status.</p>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="New Leads" value={stats.newLeads} icon={Users} description="Leads not yet actioned." />
                <StatCard title="Priority Leads Remaining" value={stats.priorityLeadsRemaining} icon={Flame} description="Priority leads to be actioned." />
                <StatCard title="Total Assigned Leads" value={stats.totalAssignedLeads} icon={Users} description="Matching current filters" />
                <StatCard title="Leads In Progress" value={stats.leadsInProgress} icon={TrendingUp} description="Contacted leads not yet archived" />
                <StatCard title="Total Archived Leads" value={stats.totalArchivedLeads} icon={Archive} description="Includes Lost, Qualified, Won, LPO Review, Pre Qualified, and Unqualified statuses." />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Processed to Call Ratio" value={`${stats.processedToCallsRatio.toFixed(2)}%`} icon={TrendingUp} description="Ratio of processed leads to calls" />
                <StatCard title="Appt. to Contact Ratio" value={`${stats.appointmentToContactRatio.toFixed(2)}%`} icon={TrendingUp} description="Ratio of appointments to unique leads contacted" />
                <StatCard title="Appt. to Archived Ratio" value={`${stats.appointmentToArchivedRatio.toFixed(2)}%`} icon={TrendingUp} description="Ratio of appointments to archived leads" />
                 <StatCard title="Qualified to Contacted" value={`${stats.qualifiedToContactedRatio.toFixed(2)}%`} icon={Percent} description="Ratio of 'Qualified'/'Pre-Qualified'/'Won' to contacted leads" />
                <StatCard title="Total Qualified to Archived" value={`${stats.combinedQualifiedToArchivedRatio.toFixed(2)}%`} icon={Percent} description="Ratio of 'Qualified' + 'Pre-Qualified' + 'Won' to all archived" />
            </div>
        </div>

       <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Appointment Performance</h2>
            <p className="text-muted-foreground">Metrics related to booked appointments.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                 <StatCard title="Total Appointments Booked" value={stats.totalAppointments} icon={CalendarIconLucide} description="Unique appointments" />
                 <StatCard 
                    title="Appointments to Won Leads" 
                    value={stats.appointmentsForWonLeads} 
                    icon={Goal} 
                    description={`${stats.wonAppointmentRate.toFixed(2)}% of total appointments`} 
                />
                <StatCard 
                    title="Appointments to Trialing ShipMate" 
                    value={stats.appointmentsForTrialingShipMateLeads} 
                    icon={Presentation} 
                    description={`${stats.trialingShipMateAppointmentRate.toFixed(2)}% of total appointments`} 
                />
                <StatCard 
                    title="Appointments to Lost Leads" 
                    value={stats.appointmentsForLostLeads} 
                    icon={UserX} 
                    description={`${stats.lostAppointmentRate.toFixed(2)}% of total appointments`} 
                />
                 <StatCard title="Appointment Booking Rate" value={`${stats.appointmentToCallRatio.toFixed(2)}%`} icon={Percent} description="Ratio of appointments to calls" />
                 <StatCard title="Won from Completed" value={`${stats.wonFromCompletedRate}%`} icon={TrendingUp} description="%% of completed appointments that resulted in a 'Won' status" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Appointment Show Rate" value={`${stats.showRate.toFixed(2)}%`} icon={TrendingUp} description="Completed / (Completed + No Shows + Cancelled)" />
                <StatCard title="Appointment No-Show Rate" value={`${stats.noShowRate.toFixed(2)}%`} icon={TrendingDown} description="No Shows / (Completed + No Shows + Cancelled)" />
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
