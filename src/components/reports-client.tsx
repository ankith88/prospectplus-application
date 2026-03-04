
"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, ReviewCategory, VisitNote } from '@/lib/types';
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
  Download,
  Hash,
  ClipboardCheck,
  CalendarCheck,
  Clock,
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
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, collectionGroup, orderBy, documentId, where, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status']; entityId?: string; discoveryData?: DiscoveryData };

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 
    'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 
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

const StatCard = ({ title, value, icon: Icon, description, onClick }: { title: string; value: string | number; icon: React.ElementType; description?: string; onClick?: () => void }) => (
  <Card className={cn(onClick && "cursor-pointer hover:bg-muted/50 transition-colors shadow-sm")} onClick={onClick}>
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

export default function ReportsClientPage() {
  const [allCalls, setAllCalls] = useState<CallActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allDialers, setAllDialers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApptListOpen, setIsApptListOpen] = useState(false);
  const [isWonListOpen, setIsWonListOpen] = useState(false);
  const [isFieldSourcedListOpen, setIsFieldSourcedListOpen] = useState(false);
  
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    status: [] as string[],
    activityDate: undefined as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: [] as string[],
    franchisee: [] as string[],
    appointmentAssignedTo: [] as string[],
  });

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
        const [usersSnap, leadsSnap, companiesSnap, visitNotesSnap] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'leads')),
            getDocs(collection(firestore, 'companies')),
            getDocs(collection(firestore, 'visitnotes'))
        ]);

        const userList = usersSnap.docs.map(doc => {
            const data = doc.data();
            return `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }).filter(Boolean);
        setAllDialers(userList);

        const notes = visitNotesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitNote));
        setAllVisitNotes(notes);

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
                    visitNoteID: data.visitNoteID,
                    isFromCompaniesCollection: isCompany, // Flag to identify records from companies collection
                } as unknown as Lead;
            }).filter((l: Lead) => l.fieldSales === false);
        };

        const combinedLeads = [
            ...processRecords(leadsSnap, false),
            ...processRecords(companiesSnap, true)
        ];
            
        setAllLeads(combinedLeads);
        const leadMap = new Map(combinedLeads.map(l => [l.id, l]));

        const [activitiesSnap, apptsSnap] = await Promise.all([
            getDocs(collectionGroup(firestore, 'activity')),
            getDocs(collectionGroup(firestore, 'appointments'))
        ]);

        const rawCalls = activitiesSnap.docs.map(activityDoc => {
            const data = activityDoc.data() as Activity;
            if (data.type !== 'Call') return null;

            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;
            
            if (userProfile?.role === 'Franchisee' && userProfile.franchisee) {
                if (lead.franchisee !== userProfile.franchisee) return null;
            }

            return {
                ...data,
                id: activityDoc.id,
                leadId,
                leadName: lead.companyName,
                leadStatus: lead.status,
                dialerAssigned: lead.dialerAssigned || 'Unassigned',
            };
        }).filter(Boolean) as CallActivity[];

        const finalCalls: CallActivity[] = [];
        const callsByLead: Record<string, CallActivity[]> = {};
        rawCalls.forEach(c => {
            if (!callsByLead[c.leadId]) callsByLead[c.leadId] = [];
            callsByLead[c.leadId].push(c);
        });

        Object.values(callsByLead).forEach(leadCalls => {
            const outcomes = leadCalls.filter(c => c.notes.includes('Outcome: ') || c.callId);
            const attempts = leadCalls.filter(c => c.notes.includes('Initiated call to'));

            finalCalls.push(...outcomes);

            attempts.forEach(attempt => {
                const attemptTime = new Date(attempt.date).getTime();
                const matched = outcomes.some(outcome => {
                    const outcomeTime = new Date(outcome.date).getTime();
                    return Math.abs(outcomeTime - attemptTime) < 5 * 60 * 1000;
                });
                if (!matched) {
                    finalCalls.push(attempt);
                }
            });
        });
        
        finalCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllCalls(finalCalls);

        const appts = apptsSnap.docs.map(apptDoc => {
            const data = apptDoc.data() as Appointment;
            const leadId = apptDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;

            if (userProfile?.role === 'Franchisee' && userProfile.franchisee) {
                if (lead.franchisee !== userProfile.franchisee) return null;
            }

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
        
        appts.sort((a, b) => new Date(b.starttime).getTime() - new Date(a.starttime).getTime());
        setAllAppointments(appts);

    } catch (error: any) {
        console.error("Failed to refresh reporting data:", error);
        setError(`Error: ${error.message || "An unexpected error occurred."}`);
        toast({ variant: 'destructive', title: 'Loading Failed', description: 'Could not load reporting data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [userProfile, toast]);

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
      activityDate: undefined,
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
        
        if (userProfile?.role === 'Franchisee' && userProfile.franchisee) {
            if (lead?.franchisee !== userProfile.franchisee) return false;
        }

        const dialerMatch = filters.dialerAssigned.length === 0 || (call.dialerAssigned && filters.dialerAssigned.includes(call.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(call.leadStatus);

        let activityDateMatch = true;
        if (filters.activityDate?.from) {
          const callDate = new Date(call.date);
          const fromDate = startOfDay(filters.activityDate.from);
          const toDate = filters.activityDate.to ? endOfDay(filters.activityDate.to) : endOfDay(filters.activityDate.from);
          activityDateMatch = callDate >= fromDate && callDate <= toDate;
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

        return dialerMatch && franchiseeMatch && statusMatch && activityDateMatch && durationMatch() && appointmentAssignedToMatch;
    });
  }, [allCalls, allLeads, filters, allAppointments, userProfile]);
  
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appointment => {
        if (appointment.leadName === 'Unknown Lead') return false;
        const lead = allLeads.find(l => l.id === appointment.leadId);

        if (userProfile?.role === 'Franchisee' && userProfile.franchisee) {
            if (lead?.franchisee !== userProfile.franchisee) return false;
        }

        const dialerMatch = filters.dialerAssigned.length === 0 || (appointment.dialerAssigned && filters.dialerAssigned.includes(appointment.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(appointment.leadStatus);
        const appointmentAssignedToMatch = filters.appointmentAssignedTo.length === 0 || (appointment.assignedTo && filters.appointmentAssignedTo.includes(appointment.assignedTo));

        let creationDateMatch = true;
        if (filters.activityDate?.from) {
            const appointmentCreatedDate = parseDateString(appointment.appointmentDate);
            if (!appointmentCreatedDate) return false;
            const fromDate = startOfDay(filters.activityDate.from);
            const toDate = filters.activityDate.to ? endOfDay(filters.activityDate.to) : endOfDay(filters.activityDate.from);
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
  }, [allAppointments, allLeads, filters, userProfile]);

  const stats = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const totalAppointments = filteredAppointments.length;
    
    const uniqueLeadIdsCalled = new Set(filteredCalls.map(c => c.leadId));
    const uniqueLeadIdsAppointed = new Set(filteredAppointments.map(a => a.leadId));

    const leadsWithAppts = allLeads.filter(l => uniqueLeadIdsAppointed.has(l.id));
    const leadsWithCalls = allLeads.filter(l => uniqueLeadIdsCalled.has(l.id));
    
    const wonCount = leadsWithAppts.filter(l => l.status === 'Won').length;
    const wonLeadsList = leadsWithAppts.filter(l => l.status === 'Won');
    
    const quoteCount = leadsWithAppts.filter(l => l.status === 'Prospect Opportunity').length;
    const trialCount = leadsWithAppts.filter(l => l.status === 'Trialing ShipMate').length;
    const lostCount = leadsWithAppts.filter(l => l.status === 'Lost').length;

    const leadsCalledCount = uniqueLeadIdsCalled.size;
    const leadsAppointedCount = uniqueLeadIdsAppointed.size;

    const baseFilteredLeads = allLeads.filter(l => {
        if (userProfile?.role === 'Franchisee' && userProfile.franchisee) {
            if (l.franchisee !== userProfile.franchisee) return false;
        }
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

    // Field-Sourced Pipeline Logic - Refined to exclude existing signed customers
    const visitNotesMap = new Map(allVisitNotes.map(n => [n.id, n]));
    const fieldSourcedLeads = baseFilteredLeads
        .filter(l => !!l.visitNoteID && !(l as any).isFromCompaniesCollection) // Only include prospects from the leads collection
        .map(l => ({
            ...l,
            visitNote: visitNotesMap.get(l.visitNoteID!)
        }));

    const fieldSourcedCount = fieldSourcedLeads.length;
    const fieldSourcedWon = fieldSourcedLeads.filter(l => l.status === 'Won').length;
    const fieldSourcedAppointedIds = new Set(filteredAppointments.filter(a => fieldSourcedLeads.some(l => l.id === a.leadId)).map(a => a.leadId));
    const fieldSourcedAppointedCount = fieldSourcedAppointedIds.size;
    
    const fieldSourcedStatusData = fieldSourcedLeads.reduce((acc, l) => {
        const existing = acc.find(item => item.name === l.status);
        if (existing) existing.value++;
        else acc.push({ name: l.status, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

    const teamPerformanceData = allDialers.map(dialer => {
      const dialerCalls = filteredCalls.filter(c => c.dialerAssigned === dialer).length;
      const dialerAppointments = filteredAppointments.filter(a => a.dialerAssigned === dialer).length;
      return { name: dialer, 'Total Engagement': dialerCalls, 'Appointments': dialerAppointments };
    }).filter(d => d['Total Engagement'] > 0);

    const callOutcomesData = filteredCalls.reduce((acc, call) => {
        let outcome = 'Other';
        const outcomeMatch = call.notes.match(/Outcome: ([^.]+)\./);
        if (outcomeMatch) {
            outcome = outcomeMatch[1];
        } else if (call.notes.includes('Initiated call to')) {
            outcome = 'Initiated (No Outcome Sync)';
        }
        
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
      wonLeadsList,
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
      
      fieldSourcedCount,
      fieldSourcedWon,
      fieldSourcedAppointedCount,
      fieldSourcedLeads,
      fieldSourcedStatusData,
      
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
  }, [filteredCalls, allLeads, filteredAppointments, allDialers, filters, userProfile, allVisitNotes]);

  const escapeCsvCell = (cellData: any) => {
    if (cellData === null || cellData === undefined) {
        return '';
    }
    const stringData = String(cellData);
    if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const handleExportChartData = (data: any[], filename: string) => {
    if (data.length === 0) {
        toast({ title: 'No Data', description: 'The chart is empty.' });
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = data.map(item => headers.map(h => escapeCsvCell(item[h])).join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `${filename} data exported to CSV.` });
  };

  const handleExportList = (data: any[], headers: string[], filename: string, rowMapper: (item: any) => string[]) => {
    if (data.length === 0) {
        toast({ title: 'No Data', description: 'List is empty.' });
        return;
    }
    const csvContent = [headers.join(','), ...data.map(item => rowMapper(item).map(escapeCsvCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `${filename} list exported to CSV.` });
  };

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

  if (loading || authLoading || !userProfile) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-bold tracking-tight">Outbound Reporting</h1><p className="text-muted-foreground">Performance dashboard for outbound engagement.</p></header>
      
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
                    {userProfile?.role !== 'Franchisee' && (
                        <div className="space-y-2"><Label>Franchisee</Label><MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..." /></div>
                    )}
                    <div className="space-y-2"><Label>Status</Label><MultiSelectCombobox options={leadStatusOptions} selected={filters.status} onSelectedChange={(val) => handleFilterChange('status', val)} placeholder="Select statuses..." /></div>
                    <div className="space-y-2">
                        <Label>Activity Date (Total Engagement)</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.activityDate?.from ? (filters.activityDate.to ? <>{format(filters.activityDate.from, "LLL dd, y")} - {format(filters.activityDate.to, "LLL dd, y")}</> : format(filters.activityDate.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start"><Calendar mode="range" selected={filters.activityDate} onSelect={(date) => handleFilterChange('activityDate', date)} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Appointment Date (Schedule)</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.appointmentDate?.from ? (filters.appointmentDate.to ? <>{format(filters.appointmentDate.from, "LLL dd, y")} - {format(filters.appointmentDate.to, "LLL dd, y")}</> : format(filters.appointmentDate.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
                <StatCard title="Total Engagement" value={stats.totalCalls} icon={Phone} description="Calls + Attempts" />
                <StatCard 
                    title="Appointments" 
                    value={stats.totalAppointments} 
                    icon={CalendarIconLucide} 
                    onClick={() => setIsApptListOpen(true)}
                />
                <StatCard 
                    title="Won Customers" 
                    value={stats.wonCount} 
                    icon={Star} 
                    onClick={() => setIsWonListOpen(true)}
                />
                <StatCard 
                    title="Engagement Conv. %" 
                    value={`${stats.callRatios.appointment.toFixed(1)}%`} 
                    icon={Percent} 
                    description="Calls to Appts"
                />
                <StatCard 
                    title="Booking Conv. %" 
                    value={`${stats.apptRatios.won.toFixed(1)}%`} 
                    icon={TrendingUp} 
                    description="Appts to Wins"
                />
                <StatCard title="Quotes Sent" value={stats.quoteCount} icon={Send} />
                <StatCard title="ShipMate Trials" value={stats.trialCount} icon={Flame} />
                <StatCard 
                    title="Field-to-Outbound" 
                    value={stats.fieldSourcedCount} 
                    icon={ClipboardCheck} 
                    description="Leads from Field" 
                    onClick={() => setIsFieldSourcedListOpen(true)}
                />
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
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsFieldSourcedListOpen(true)}>
                    <CardHeader>
                        <CardTitle>Field-to-Outbound Summary</CardTitle>
                        <CardDescription>Key metrics for high-intent prospects from the field. Click to view list.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                            <span className="text-sm font-medium">Total Transitioned</span>
                            <Badge variant="secondary" className="text-lg">{stats.fieldSourcedCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <span className="text-sm font-medium">Appointments Set</span>
                            <Badge className="text-lg bg-blue-500">{stats.fieldSourcedAppointedCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <span className="text-sm font-medium">Closed Wins</span>
                            <Badge className="text-lg bg-green-500">{stats.fieldSourcedWon}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg border">
                            <span className="text-sm font-medium">Cohort Win Rate</span>
                            <span className="text-lg font-bold">
                                {stats.fieldSourcedCount > 0 ? ((stats.fieldSourcedWon / stats.fieldSourcedCount) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Field-to-Outbound Progress</CardTitle>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleExportChartData(stats.fieldSourcedStatusData, 'field_sourced_progress'); }}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                        <CardDescription>Current status of field-sourced prospects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.fieldSourcedStatusData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <PieChart>
                                    <Pie 
                                        data={stats.fieldSourcedStatusData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.fieldSourcedStatusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No field-sourced leads in outbound campaign.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2"><Percent className="h-5 w-5 text-blue-500" /><CardTitle>Engagement Conversion Efficiency</CardTitle></div>
                        <CardDescription>Ratios based on unique leads engaged (Call or Attempt) in the period.</CardDescription>
                    </CardHeader>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Team Performance</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportChartData(stats.teamPerformanceData, 'team_performance')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                        <CardDescription>Total Engagement vs Appointments by Dialer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <BarChart data={stats.teamPerformanceData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="Total Engagement" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Appointments" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Account Manager Performance</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportChartData(stats.amPerformanceData, 'am_performance')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                        <CardDescription>Outcome distribution by Account Manager.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Manager</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Completed</TableHead>
                                        <TableHead className="text-right">Pending</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.amPerformanceData.map(am => (
                                        <TableRow key={am.name}>
                                            <TableCell className="font-medium">{am.name}</TableCell>
                                            <TableCell className="text-right">{am.Total}</TableCell>
                                            <TableCell className="text-right text-green-600 font-bold">{am.Completed}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{am.Pending}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Appointment Outcomes</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportChartData(stats.appointmentOutcomeData, 'appointment_outcomes')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
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
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Engagement Outcome Distribution</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportChartData(stats.callOutcomesData, 'call_outcomes')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
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
                        ) : <div className="h-[400px] flex items-center justify-center text-muted-foreground italic">No interactions recorded.</div>}
                    </CardContent>
                </Card>
            </div>
          </div>
      )}

      {/* Drill-down Dialogs */}
      <Dialog open={isApptListOpen} onOpenChange={setIsApptListOpen}>
          <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Filtered Appointments</DialogTitle>
                        <DialogDescription>Total scheduled in period: {filteredAppointments.length}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        filteredAppointments,
                        ['Lead Name', 'Dialer', 'Account Manager', 'Date', 'Status'],
                        'outbound_appointments',
                        (a) => [a.leadName, a.dialerAssigned || 'N/A', a.assignedTo || 'N/A', a.duedate && isValid(new Date(a.duedate)) ? format(new Date(a.duedate), 'PP') : 'N/A', a.appointmentStatus || 'Pending']
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead Name</TableHead>
                                <TableHead>Dialer</TableHead>
                                <TableHead>Account Manager</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAppointments.length > 0 ? filteredAppointments.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.leadName}</TableCell>
                                    <TableCell>{appt.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{appt.assignedTo || 'N/A'}</TableCell>
                                    <TableCell>{appt.duedate && isValid(new Date(appt.duedate)) ? format(new Date(appt.duedate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{appt.appointmentStatus || 'Pending'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${appt.leadId}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No appointments found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isWonListOpen} onOpenChange={setIsWonListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Won Customers (Filtered Cohort)</DialogTitle>
                        <DialogDescription>Total signed in period: {stats.wonCount}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.wonLeadsList,
                        ['Company Name', 'Entity ID', 'Dialer', 'Franchisee'],
                        'won_customers_cohort',
                        (l) => [l.companyName, l.entityId || 'N/A', l.dialerAssigned || 'N/A', l.franchisee || 'N/A']
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Entity ID</TableHead>
                                <TableHead>Dialer</TableHead>
                                <TableHead>Franchisee</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.wonLeadsList.length > 0 ? stats.wonLeadsList.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{lead.entityId || 'N/A'}</TableCell>
                                    <TableCell>{lead.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{lead.franchisee || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No won leads found in this cohort.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isFieldSourcedListOpen} onOpenChange={setIsFieldSourcedListOpen}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div className="space-y-1">
                        <DialogTitle>Field-to-Outbound Pipeline</DialogTitle>
                        <DialogDescription>Prospects with visit notes currently in the outbound campaign ({stats.fieldSourcedCount} leads).</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.fieldSourcedLeads,
                        ['Company', 'Captured Date', 'Captured By', 'Current Status', 'Outbound Dialer'],
                        'field_sourced_outbound_pipeline',
                        (l) => [
                            l.companyName, 
                            l.visitNote?.createdAt ? format(new Date(l.visitNote.createdAt), 'PP') : 'N/A',
                            l.visitNote?.capturedBy || 'N/A',
                            l.status,
                            l.dialerAssigned || 'Unassigned'
                        ]
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Visit Captured</TableHead>
                                <TableHead>By (Field Rep)</TableHead>
                                <TableHead>Current Status</TableHead>
                                <TableHead>Outbound Dialer</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.fieldSourcedLeads.length > 0 ? stats.fieldSourcedLeads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{lead.visitNote?.createdAt ? format(new Date(lead.visitNote.createdAt), 'PP') : 'N/A'}</span>
                                            <span className="text-muted-foreground">{lead.visitNote?.createdAt ? format(new Date(lead.visitNote.createdAt), 'p') : ''}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            <span>{lead.visitNote?.capturedBy || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            <span>{lead.dialerAssigned || 'Unassigned'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                                        No field-sourced leads found in the current outbound pipeline.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
