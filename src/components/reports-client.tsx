
"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, ReviewCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Phone, 
  Percent, 
  Filter, 
  SlidersHorizontal, 
  X, 
  Star, 
  Calendar as CalendarIconLucide, 
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
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, collectionGroup, orderBy, documentId, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status']; entityId?: string; discoveryData?: DiscoveryData };

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 
    'Lost', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 
    'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 
    'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off'
];

const safeGetStatus = (status: any): LeadStatus => {
    const validStatuses: LeadStatus[] = [...leadStatuses];
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
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    status: [] as string[],
    callDate: undefined as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: [] as string[],
    franchisee: [] as string[],
    appointmentAssignedTo: [] as string[],
  });

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

        const usersSnap = await getDocs(collection(firestore, 'users'));
        const userList = usersSnap.docs.map(doc => {
            const data = doc.data();
            return `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }).filter(Boolean);
        setAllDialers(userList);

        // Fetch leads AND companies to ensure "Won" accounts are included
        const [leadsSnap, companiesSnap] = await Promise.all([
            getDocs(collection(firestore, 'leads')),
            getDocs(collection(firestore, 'companies'))
        ]);

        const processRecords = (snap: any, isCompany: boolean) => {
            return snap.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    entityId: data.entityId || data.customerEntityId || data.internalid,
                    companyName: data.companyName || 'Unknown Company',
                    dialerAssigned: data.dialerAssigned,
                    salesRepAssigned: data.salesRepAssigned,
                    status: isCompany ? 'Won' : safeGetStatus(data.customerStatus),
                    franchisee: data.franchisee,
                    fieldSales: data.fieldSales === true,
                    dateLeadEntered: data.dateLeadEntered,
                    discoveryData: data.discoveryData,
                } as unknown as Lead;
            }).filter((l: Lead) => l.fieldSales === false);
        };

        const combinedLeads = [
            ...processRecords(leadsSnap, false),
            ...processRecords(companiesSnap, true)
        ];
            
        setAllLeads(combinedLeads);
        const leadMap = new Map(combinedLeads.map(l => [l.id, l]));

        // Fetch activities within filtered period
        let activitiesQuery = query(collectionGroup(firestore, 'activity'), orderBy('date', 'desc'));
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

        // Fetch appointments within filtered period
        let apptsQuery = query(collectionGroup(firestore, 'appointments'), orderBy('starttime', 'desc'));
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

    } catch (error: any) {
        console.error("Failed to refresh reporting data:", error);
        setError(`Error: ${error.message || "An unexpected error occurred."}`);
        toast({ variant: 'destructive', title: 'Loading Failed', description: 'Could not load reporting data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [filters.callDate, toast]);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile, fetchData]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      callDate: undefined,
      appointmentDate: undefined,
      duration: 'all',
      dialerAssigned: [],
      franchisee: [],
      appointmentAssignedTo: [],
    });
  };

  const filteredCalls = useMemo(() => {
    return allCalls.filter(call => {
        const lead = allLeads.find(l => l.id === call.leadId);
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
        
        const d = call.duration || '';
        const minutesMatch = d.match(/(\d+)m/);
        const secondsMatch = d.match(/(\d+)s/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
        const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
        const durationInSeconds = minutes * 60 + seconds;

        const durationMatch = () => {
            switch (filters.duration) {
                case 'under30s': return durationInSeconds < 30;
                case '30s-2min': return durationInSeconds >= 30 && durationInSeconds < 120;
                case 'over2min': return durationInSeconds >= 120;
                case 'none': return durationInSeconds === 0;
                default: return true;
            }
        };

        const appointmentAssignedToMatch = filters.appointmentAssignedTo.length === 0 || allAppointments.some(a => a.leadId === call.leadId && a.assignedTo && filters.appointmentAssignedTo.includes(a.assignedTo));

        return dialerMatch && franchiseeMatch && statusMatch && callDateMatch && durationMatch() && appointmentAssignedToMatch;
    });
  }, [allCalls, allLeads, filters, allAppointments]);
  
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appointment => {
        if (appointment.leadName === 'Unknown Lead') return false;
        const lead = allLeads.find(l => l.id === appointment.leadId);
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
    const totalCalls = filteredCalls.length;
    const totalAppointments = filteredAppointments.length;
    
    // Unique sets of leads associated with the filtered period
    const uniqueLeadIdsCalled = new Set(filteredCalls.map(c => c.leadId));
    const uniqueLeadIdsAppointed = new Set(filteredAppointments.map(a => a.leadId));

    const leadsWithCalls = allLeads.filter(l => uniqueLeadIdsCalled.has(l.id));
    const leadsWithAppts = allLeads.filter(l => uniqueLeadIdsAppointed.has(l.id));
    
    const wonCount = leadsWithAppts.filter(l => l.status === 'Won').length;
    const quoteCount = leadsWithAppts.filter(l => l.status === 'Prospect Opportunity').length;
    const trialCount = leadsWithAppts.filter(l => l.status === 'Trialing ShipMate').length;
    const lostCount = leadsWithAppts.filter(l => l.status === 'Lost').length;

    // Standard denominators for ratios
    const leadsCalledCount = uniqueLeadIdsCalled.size;
    const leadsAppointedCount = uniqueLeadIdsAppointed.size;

    // Pipeline Logic
    const baseFilteredLeads = allLeads.filter(l => {
        const franchiseeMatch = filters.franchisee.length === 0 || (l.franchisee && filters.franchisee.includes(l.franchisee));
        const dialerMatch = filters.dialerAssigned.length === 0 || (l.dialerAssigned && filters.dialerAssigned.includes(l.dialerAssigned));
        return franchiseeMatch && dialerMatch;
    });

    const queueLeads = baseFilteredLeads.filter(l => ['New', 'Priority Lead', 'Priority Field Lead'].includes(l.status));
    const inProgressLeads = baseFilteredLeads.filter(l => l.status === 'In Progress');
    const processedLeads = baseFilteredLeads.filter(l => !['New', 'Priority Lead', 'Priority Field Lead', 'In Progress'].includes(l.status));

    const queueStatusDist = queueLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const inProgressStatusDist = inProgressLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const teamPerformanceData = allDialers.map(dialer => {
      const dialerCalls = filteredCalls.filter(c => c.dialerAssigned === dialer).length;
      const dialerAppointments = filteredAppointments.filter(a => a.dialerAssigned === dialer).length;
      return { name: dialer, 'Total Calls': dialerCalls, 'Appointments': dialerAppointments };
    }).filter(d => d['Total Calls'] > 0);

    const callOutcomesData = filteredCalls.reduce((acc, call) => {
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
        return { 
            name: am, 
            Total: amAppts.length,
            Completed: amAppts.filter(a => a.appointmentStatus === 'Completed').length,
            Cancelled: amAppts.filter(a => a.appointmentStatus === 'Cancelled').length,
            'No Show': amAppts.filter(a => a.appointmentStatus === 'No Show').length,
            Pending: amAppts.filter(a => !a.appointmentStatus || a.appointmentStatus === 'Pending').length
        };
    }).sort((a, b) => b.Total - a.Total);

    return {
      totalCalls,
      wonCount,
      quoteCount,
      trialCount,
      lostCount,
      totalAppointments,
      queueCount: queueLeads.length,
      inProgressCount: inProgressLeads.length,
      processedCount: processedLeads.length,
      queueStatusDist,
      inProgressStatusDist,
      teamPerformanceData,
      callOutcomesData,
      appointmentOutcomeData,
      amPerformanceData,
      
      callRatios: {
          appointment: leadsCalledCount > 0 ? (leadsAppointedCount / leadsCalledCount) * 100 : 0,
          won: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Won').length / leadsCalledCount) * 100 : 0,
          quote: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Prospect Opportunity').length / leadsCalledCount) * 100 : 0,
          trial: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Trialing ShipMate').length / leadsCalledCount) * 100 : 0,
          lost: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Lost').length / leadsCalledCount) * 100 : 0,
      },
      apptRatios: {
          won: leadsAppointedCount > 0 ? (wonCount / leadsAppointedCount) * 100 : 0,
          trial: leadsAppointedCount > 0 ? (trialCount / leadsAppointedCount) * 100 : 0,
          quote: leadsAppointedCount > 0 ? (quoteCount / leadsAppointedCount) * 100 : 0,
          lost: leadsAppointedCount > 0 ? (lostCount / leadsAppointedCount) * 100 : 0,
      }
    };
  }, [filteredCalls, allLeads, filteredAppointments, allDialers, filters]);

  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s }));
  const amOptions: Option[] = useMemo(() => {
    const ams = new Set(allAppointments.map(a => a.assignedTo).filter(Boolean));
    return Array.from(ams as string[]).map(am => ({ value: am, label: am }));
  }, [allAppointments]);
  const dialerOptionsUI: Option[] = allDialers.map(d => ({ value: d, label: d }));
  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [allLeads]);

  if (loading || authLoading || !userProfile) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader /></div>;

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
                    <div className="space-y-2"><Label>Franchisee</Label><MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..." /></div>
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
          </AlertDescription>
        </Alert>
      )}

      {!error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Calls" value={stats.totalCalls} icon={Phone} />
                <StatCard title="Appointments" value={stats.totalAppointments} icon={CalendarIconLucide} />
                <StatCard title="Won Customers" value={stats.wonCount} icon={Star} />
                <StatCard title="Quotes Sent" value={stats.quoteCount} icon={Send} />
                <StatCard title="ShipMate Trials" value={stats.trialCount} icon={Flame} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Pipeline Status</CardTitle><CardDescription>Current volume across the outbound lifecycle.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                            <span className="text-sm font-medium">In Calling Queue</span>
                            <Badge variant="secondary" className="text-lg">{stats.queueCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <span className="text-sm font-medium">Currently In Progress</span>
                            <Badge className="text-lg bg-blue-500">{stats.inProgressCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <span className="text-sm font-medium">Fully Processed (Archived)</span>
                            <Badge className="text-lg bg-green-500">{stats.processedCount}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Status Distribution</CardTitle><CardDescription>Breakdown of leads in active stages.</CardDescription></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold border-b pb-1">Queue Distribution</h4>
                                {Object.entries(stats.queueStatusDist).map(([status, count]) => (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{status}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                ))}
                                {Object.keys(stats.queueStatusDist).length === 0 && <p className="text-xs text-muted-foreground italic">No leads in queue.</p>}
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold border-b pb-1">In Progress Distribution</h4>
                                {Object.entries(stats.inProgressStatusDist).map(([status, count]) => (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{status}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                ))}
                                {Object.keys(stats.inProgressStatusDist).length === 0 && <p className="text-xs text-muted-foreground italic">No leads in progress.</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Call Conversion Efficiency</CardTitle><CardDescription>Ratios based on unique leads called in the period.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell className="font-medium">Call to Appointment</TableCell><TableCell className="text-right font-bold">{stats.callRatios.appointment.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Call to Won</TableCell><TableCell className="text-right font-bold">{stats.callRatios.won.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Call to Quote</TableCell><TableCell className="text-right font-bold">{stats.callRatios.quote.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Call to Trial</TableCell><TableCell className="text-right font-bold">{stats.callRatios.trial.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Call to Lost</TableCell><TableCell className="text-right font-bold text-destructive">{stats.callRatios.lost.toFixed(1)}%</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Goal className="h-5 w-5" /> Appt Closing Efficiency</CardTitle><CardDescription>Ratios based on unique leads appointed in the period.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell className="font-medium">Appt to Won</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.won.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appt to Trial</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.trial.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appt to Quote</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.quote.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appt to Lost</TableCell><TableCell className="text-right font-bold text-destructive">{stats.apptRatios.lost.toFixed(1)}%</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

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
                                    <TableHead className="text-right">Pending</TableHead>
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
                                            <TableCell className="text-right text-muted-foreground">{am.Pending}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No AM performance data available for selected filters.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Appointment Outcomes</CardTitle></CardHeader>
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
                        ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No appointment outcomes found.</div>}
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
                        ) : <div className="h-[400px] flex items-center justify-center text-muted-foreground italic">No call outcomes recorded.</div>}
                    </CardContent>
                </Card>
            </div>
          </div>
      )}
    </div>
  );
}
