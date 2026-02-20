
"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, AppointmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Phone, Users, UserCheck, UserX, Percent, Clock, Filter, SlidersHorizontal, X, Sparkles, Send, Route, Star, Calendar as CalendarIconLucide, Goal, CheckCircle, TrendingUp, Briefcase, Archive, Frown, BarChart3, TrendingDown, Target, RefreshCw, Presentation, Flame, AlertCircle, ExternalLink, ClipboardCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, where, getDocs, limit, collectionGroup, orderBy, documentId } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'];

const STATUS_COLORS: { [key in LeadStatus]?: string } = {
  'New': '#A0A0A0',
  'Contacted': '#FFBB28',
  'In Progress': '#FF8042',
  'Connected': '#0088FE',
  'High Touch': '#8884d8',
  'Qualified': '#00C49F',
  'Pre Qualified': '#F59E0B',
  'Won': '#22C55E',
  'Unqualified': '#D1D5DB',
  'Lost': '#EF4444',
  'LPO Review': '#A855F7',
  'Trialing ShipMate': '#EC4899',
  'Reschedule': '#FBBF24',
  'Priority Lead': '#F97316',
  'Priority Field Lead': '#F97316',
  'Free Trial': '#EC4899',
  'Prospect Opportunity': '#F59E0B',
  'Customer Opportunity': '#22C55E',
  'Email Brush Off': '#A0A0A0',
};

const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Pre Qualified', 'Unqualified', 'Won', 'Lost', 'Reschedule', 'Trialing ShipMate', 'Priority Field Lead', 'Email Brush Off'];

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status'] };

const safeGetStatus = (status: any): LeadStatus => {
    const validStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off'];
    if (typeof status === 'string') {
        if (status === 'SUSPECT-Unqualified') return 'New';
        let cleanStatus = status.replace('SUSPECT-', '');
        if (cleanStatus === 'Signed') return 'Won';
        if (validStatuses.includes(cleanStatus as LeadStatus)) return cleanStatus as LeadStatus;
    }
    return 'New';
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

export default function ReportsClientPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [allDialers, setAllDialers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [inactiveStatus, setInactiveStatus] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    status: [] as string[],
    callDate: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    } as DateRange | undefined,
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
  
  const leadStatusOptions: Option[] = useMemo(() => {
    return leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const amOptions: Option[] = useMemo(() => {
    const ams = new Set(allAppointments.map(a => a.assignedTo).filter(Boolean));
    return Array.from(ams as string[]).map(am => ({ value: am, label: am })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allAppointments]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIndexUrl(null);
    try {
        const startDate = filters.callDate?.from?.toISOString();
        const endDate = filters.callDate?.to 
            ? endOfDay(filters.callDate.to).toISOString() 
            : filters.callDate?.from 
                ? endOfDay(filters.callDate.from).toISOString() 
                : undefined;

        console.log("[Reports] Starting optimized client-side direct data load...");
        
        // 1. Fetch Users
        const usersSnap = await getDocs(collection(firestore, 'users'));
        const userList = usersSnap.docs.map(doc => {
            const data = doc.data();
            return `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }).filter(Boolean);
        setAllDialers(userList);

        // 2. Fetch Leads (limit 5000 for client hydration map)
        const leadsQuery = query(collection(firestore, 'leads'), orderBy('dateLeadEntered', 'desc'), limit(5000));
        const leadsSnap = await getDocs(leadsQuery);
        const leadsData = leadsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                entityId: data.entityId || data.customerEntityId || data.internalid,
                companyName: data.companyName || 'Unknown Company',
                dialerAssigned: data.dialerAssigned,
                salesRepAssigned: data.salesRepAssigned,
                status: safeGetStatus(data.customerStatus),
                campaign: data.customerCampaign,
                leadType: data.leadType,
                demoCompleted: data.demoCompleted,
                franchisee: data.franchisee,
                fieldSales: data.fieldSales,
                dateLeadEntered: data.dateLeadEntered,
                discoveryData: data.discoveryData,
            } as Lead;
        });
        setAllLeads(leadsData);
        const leadMap = new Map(leadsData.map(l => [l.id, l]));

        // 3. Fetch Calls (Direct Collection Group)
        let activitiesQuery = query(collectionGroup(firestore, 'activity'), orderBy('date', 'desc'), limit(5000));
        if (startDate) activitiesQuery = query(activitiesQuery, where('date', '>=', startDate));
        if (endDate) activitiesQuery = query(activitiesQuery, where('date', '<=', endDate));
        
        const activitiesSnap = await getDocs(activitiesQuery);
        const calls = activitiesSnap.docs.map(activityDoc => {
            const data = activityDoc.data() as Activity;
            if (data.type !== 'Call') return null;

            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;
            
            return {
                ...data,
                id: activityDoc.id,
                leadId,
                leadName: lead.companyName,
                leadStatus: lead.status,
                dialerAssigned: lead.dialerAssigned || 'Unassigned',
            };
        }).filter(Boolean) as CallActivity[];
        setAllCalls(calls);

        // 4. Fetch Appointments (Direct Collection Group)
        let apptsQuery = query(collectionGroup(firestore, 'appointments'), orderBy('starttime', 'desc'), limit(3000));
        if (startDate) apptsQuery = query(apptsQuery, where('starttime', '>=', startDate));
        if (endDate) apptsQuery = query(apptsQuery, where('starttime', '<=', endDate));
        
        const apptsSnap = await getDocs(apptsQuery);
        const appts = apptsSnap.docs.map(apptDoc => {
            const data = apptDoc.data() as Appointment;
            const leadId = apptDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;

            return {
                ...data,
                id: apptDoc.id,
                leadId,
                leadName: lead.companyName,
                dialerAssigned: lead.dialerAssigned,
                leadStatus: lead.status,
                discoveryData: lead.discoveryData,
                entityId: lead.entityId || (lead as any).customerEntityId || (lead as any).internalid,
            };
        }).filter(Boolean) as AppointmentWithLead[];
        setAllAppointments(appts);

        console.log("[Reports] Client-side load complete.");

    } catch (error: any) {
        console.error("Failed to refresh reporting data:", error);
        
        const errorMsg = error.message || "";
        if (errorMsg.includes('index') || errorMsg.includes('https://console.firebase.google.com')) {
            const urlMatch = errorMsg.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (urlMatch) {
                const cleanUrl = urlMatch[0].replace(/[.\s]+$/, "");
                setIndexUrl(cleanUrl);
                setError("This report requires a database index to be created before it can load.");
            } else {
                setError(`Index Error: ${errorMsg}`);
            }
        } else {
            setError(`Error: ${errorMsg || "An unexpected error occurred."}`);
        }
        
        toast({ variant: 'destructive', title: 'Loading Failed', description: 'Could not load reporting data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [filters.callDate, toast]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if(user && !authLoading) {
        fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      callDate: {
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date())
      },
      appointmentDate: undefined,
      duration: 'all',
      dialerAssigned: [],
      franchisee: [],
      appointmentAssignedTo: [],
    });
  };

  const parseDurationLocal = (durationStr?: string): number => {
    if (!durationStr) return 0;
    const minutesMatch = durationStr.match(/(\d+)m/);
    const secondsMatch = durationStr.match(/(\d+)s/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  };

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
        
        const durationInSeconds = parseDurationLocal(call.duration);
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
        if (appointment.leadName === 'Unknown Lead') return false;
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
            appointmentDateMatch = apptDate >= fromDate && appointmentDate <= toDate;
        }

        return dialerMatch && franchiseeMatch && statusMatch && creationDateMatch && appointmentDateMatch && appointmentAssignedToMatch;
    });
  }, [allAppointments, allLeads, filters]);

  const stats = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const leadsContactedIds = new Set(filteredCalls.map(c => c.leadId));
    const uniqueLeadsContacted = leadsContactedIds.size;

    const leadsWithActivity = allLeads.filter(l => leadsContactedIds.has(l.id));
    
    const callsWithDuration = filteredCalls.filter(c => c.duration);
    const totalDuration = callsWithDuration.reduce((sum, call) => sum + parseDurationLocal(call.duration), 0);
    const averageDuration = callsWithDuration.length > 0 ? totalDuration / callsWithDuration.length : 0;
    const avgMinutes = Math.floor(averageDuration / 60);
    const avgSeconds = Math.round(averageDuration % 60);
    const averageDurationFormatted = `${avgMinutes}m ${avgSeconds}s`;

    const leadsByStatus = leadsWithActivity
        .filter(lead => lead.status !== 'New')
        .reduce((acc, lead) => {
            const status = lead.status;
            const existingEntry = acc.find(item => item.name === status);
            if (existingEntry) existingEntry.value += 1;
            else acc.push({ name: status, value: 1 });
            return acc;
        }, [] as { name: LeadStatus; value: number }[]);

    const totalAppointments = filteredAppointments.length;
    const appointmentToCallRatio = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;

    const teamPerformanceData = allDialers.map(dialer => {
      const dialerCalls = filteredCalls.filter(c => c.dialerAssigned === dialer).length;
      const dialerAppointments = filteredAppointments.filter(a => a.dialerAssigned === dialer).length;
      const conversionRate = dialerCalls > 0 ? (dialerAppointments / dialerCalls) * 100 : 0;
      return { name: dialer, 'Total Calls': dialerCalls, 'Appointments': dialerAppointments, 'Conversion Rate': parseFloat(conversionRate.toFixed(2)) };
    }).filter(d => d['Total Calls'] > 0);

    const callOutcomesData = filteredCalls.reduce((acc, call) => {
        // Extract outcome from notes like "Outcome: Busy. Notes: ..."
        const outcomeMatch = call.notes.match(/Outcome: ([^.]+)\./);
        const outcome = outcomeMatch ? outcomeMatch[1] : 'Other';
        const existing = acc.find(item => item.name === outcome);
        if (existing) existing.value++;
        else acc.push({ name: outcome, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

    const appointmentOutcomeData = filteredAppointments.reduce((acc, appt) => {
        const status = appt.appointmentStatus || 'Pending';
        const existing = acc.find(item => item.name === status);
        if (existing) existing.value++;
        else acc.push({ name: status, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]);

    const amPerformanceData = Array.from(new Set(filteredAppointments.map(a => a.assignedTo).filter(Boolean))).map(am => {
        const amAppts = filteredAppointments.filter(a => a.assignedTo === am);
        const completed = amAppts.filter(a => a.appointmentStatus === 'Completed').length;
        const cancelled = amAppts.filter(a => a.appointmentStatus === 'Cancelled').length;
        const noShow = amAppts.filter(a => a.appointmentStatus === 'No Show').length;
        const pending = amAppts.filter(a => !a.appointmentStatus || a.appointmentStatus === 'Pending').length;
        return { 
            name: am, 
            Total: amAppts.length,
            Completed: completed,
            Cancelled: cancelled,
            'No Show': noShow,
            Pending: pending
        };
    }).sort((a, b) => b.Total - a.Total);

    const dailyTrendMap = new Map<string, { date: string, calls: number, appointments: number }>();
    filteredCalls.forEach(c => {
        const d = format(new Date(c.date), 'yyyy-MM-dd');
        if(!dailyTrendMap.has(d)) dailyTrendMap.set(d, { date: d, calls: 0, appointments: 0 });
        dailyTrendMap.get(d)!.calls++;
    });
    filteredAppointments.forEach(a => {
        const createdDate = parseDateString(a.appointmentDate);
        if(createdDate) {
            const d = format(createdDate, 'yyyy-MM-dd');
            if(!dailyTrendMap.has(d)) dailyTrendMap.set(d, { date: d, calls: 0, appointments: 0 });
            dailyTrendMap.get(d)!.appointments++;
        }
    });
    const dailyTrendData = Array.from(dailyTrendMap.values()).sort((a,b) => a.date.localeCompare(b.date));

    const conversionFunnel = {
        'Signed': leadsWithActivity.filter(l => l.status === 'Won').length,
        'ShipMate Trials': leadsWithActivity.filter(l => l.status === 'Trialing ShipMate').length,
        'Quotes Sent': leadsWithActivity.filter(l => l.status === 'Prospect Opportunity').length,
        'Free Trials': leadsWithActivity.filter(l => l.status === 'Free Trial').length,
        'Qualified': leadsWithActivity.filter(l => l.status === 'Qualified').length,
    };
    
    return {
      totalCalls,
      leadsContacted: uniqueLeadsContacted,
      leadsByStatus,
      totalDurationFormatted: averageDurationFormatted,
      totalAppointments,
      appointmentToCallRatio: parseFloat(appointmentToCallRatio.toFixed(2)),
      teamPerformanceData,
      dailyTrendData,
      callOutcomesData,
      appointmentOutcomeData,
      amPerformanceData,
      conversionFunnel,
    };
  }, [filteredCalls, allLeads, filteredAppointments, allDialers]);

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

  const dialerOptionsUI: Option[] = allDialers.map(d => ({ value: d, label: d }));

  if (authLoading || !userProfile) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-bold tracking-tight">Outbound Reporting</h1><p className="text-muted-foreground">Performance dashboard for outbound calling.</p></header>
      
      <Collapsible defaultOpen={true}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchData} variant="outline" disabled={isRefreshing || loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                        {isRefreshing || loading ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" /> Toggle Filters</Button></CollapsibleTrigger>
                </div>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2"><Label>Assigned To (Dialer)</Label><MultiSelectCombobox options={dialerOptionsUI} selected={filters.dialerAssigned} onSelectedChange={(val) => handleFilterChange('dialerAssigned', val)} placeholder="Select users..." /></div>
                    <div className="space-y-2"><Label>Account Manager</Label><MultiSelectCombobox options={amOptions} selected={filters.appointmentAssignedTo} onSelectedChange={(val) => handleFilterChange('appointmentAssignedTo', val)} placeholder="Select AMs..." /></div>
                    <div className="space-y-2"><Label>Franchisee</Label><MultiSelectCombobox options={allFranchiseesOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..." /></div>
                    <div className="space-y-2"><Label>Status</Label><MultiSelectCombobox options={leadStatusOptions} selected={filters.status} onSelectedChange={(val) => handleFilterChange('status', val)} placeholder="Select statuses..." /></div>
                    <div className="space-y-2">
                        <Label>Call/Creation Date</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.callDate?.from ? (filters.callDate.to ? <>{format(filters.callDate.from, "LLL dd, y")} - {format(filters.callDate.to, "LLL dd, y")}</> : format(filters.callDate.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start"><Calendar mode="range" selected={filters.callDate} onSelect={(date) => handleFilterChange('callDate', date)} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Appointment Date</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.appointmentDate?.from ? (filters.appointmentDate.to ? <>{format(filters.appointmentDate.from, "LLL dd, y")} - {format(filters.appointmentDate.to, "LLL dd, y")}</> : format(filters.appointmentDate.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start"><Calendar mode="range" selected={filters.appointmentDate} onSelect={(date) => handleFilterChange('appointmentDate', date)} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <Button variant="ghost" onClick={clearFilters} className="col-start-1"><X className="mr-2 h-4 w-4"/> Clear Filters</Button>
                </CardContent>
            </CollapsibleContent>
          </Card>
      </Collapsible>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{error}</p>
            {indexUrl && (
              <Button asChild variant="outline" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-white">
                <a href={indexUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Click here to create the required index in Firebase Console
                </a>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4"><Loader /><p className="text-muted-foreground animate-pulse">Loading directly from database...</p></div>
      ) : !error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Calls" value={stats.totalCalls} icon={Phone} />
                <StatCard title="Leads Contacted" value={stats.leadsContacted} icon={UserCheck} />
                <StatCard title="Total Appointments" value={stats.totalAppointments} icon={CalendarIconLucide} />
                <StatCard title="Avg. Call Duration" value={stats.totalDurationFormatted} icon={Clock} />
                <StatCard title="Appt. Conversion" value={`${stats.appointmentToCallRatio}%`} icon={Percent} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Signed" value={stats.conversionFunnel['Signed']} icon={Star} />
                <StatCard title="ShipMate Trials" value={stats.conversionFunnel['ShipMate Trials']} icon={Flame} />
                <StatCard title="Quotes Sent" value={stats.conversionFunnel['Quotes Sent']} icon={Send} />
                <StatCard title="Free Trials" value={stats.conversionFunnel['Free Trials']} icon={Sparkles} />
                <StatCard title="Qualified" value={stats.conversionFunnel['Qualified']} icon={CheckCircle} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Daily Activity Trend</CardTitle></CardHeader>
                    <CardContent>
                        {stats.dailyTrendData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <LineChart data={stats.dailyTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="calls" stroke="#8884d8" name="Calls" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="appointments" stroke="#82ca9d" name="Appointments" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ChartContainer>
                        ) : <div className="flex h-[300px] items-center justify-center text-muted-foreground">No trend data.</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Appointment Status</CardTitle></CardHeader>
                    <CardContent>
                        {stats.appointmentOutcomeData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <PieChart>
                                    <Pie data={stats.appointmentOutcomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {stats.appointmentOutcomeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                        ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No outcomes.</div>}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Account Manager Performance</CardTitle><CardDescription>Breakdown of appointment outcomes by AM.</CardDescription></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Manager</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Completed</TableHead>
                                        <TableHead className="text-right">No Show</TableHead>
                                        <TableHead className="text-right">Cancelled</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.amPerformanceData.length > 0 ? (
                                        stats.amPerformanceData.map(am => (
                                            <TableRow key={am.name}>
                                                <TableCell className="font-medium">{am.name}</TableCell>
                                                <TableCell className="text-right">{am.Total}</TableCell>
                                                <TableCell className="text-right text-green-600 font-bold">{am.Completed}</TableCell>
                                                <TableCell className="text-right text-orange-600">{am['No Show']}</TableCell>
                                                <TableCell className="text-right text-red-600">{am.Cancelled}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No AM performance data.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Call Outcome Distribution</CardTitle></CardHeader>
                    <CardContent>
                        {stats.callOutcomesData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[400px] w-full">
                                <BarChart data={stats.callOutcomesData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill="#8884d8" name="Count" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : <div className="h-[400px] flex items-center justify-center text-muted-foreground italic">No call outcomes.</div>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Dialer Performance</CardTitle></CardHeader>
                <CardContent>
                    {stats.teamPerformanceData.length > 0 ? (
                        <ChartContainer config={{}} className="h-[400px] w-full">
                            <BarChart data={stats.teamPerformanceData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Total Calls" fill="#8884d8" />
                                <Bar dataKey="Appointments" fill="#82ca9d" />
                            </BarChart>
                        </ChartContainer>
                    ) : <div className="flex h-[400px] items-center justify-center text-muted-foreground">No team data.</div>}
                </CardContent>
            </Card>
          </div>
      )}
    </div>
  );
}
