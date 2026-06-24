
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
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, startOfDay, endOfDay, isValid, parseISO,
  startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek,
  subWeeks, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subYears 
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, collectionGroup, orderBy, documentId, where, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };
type AppointmentWithLead = Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: Lead['status']; entityId?: string; discoveryData?: DiscoveryData };

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 
    'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 
    'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'LocalMile Opportunity', 
    'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent'
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

const parseDateString = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    
    // If it's already a Date object
    if (dateVal instanceof Date) {
        const d = new Date(dateVal);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // If it's a Firestore Timestamp (has toDate method or seconds/nanoseconds properties)
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
    const dateTimeParts = cleaned.split(' ');
    const datePart = dateTimeParts[0];
    const dateParts = datePart.split('/');
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, month - 1, day, 0, 0, 0, 0);
      }
    }
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};


const safeFormat = (dateStr: string | undefined, formatStr: string = 'PP') => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (!isValid(date)) return 'N/A';
    return format(date, formatStr);
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
  const [allActivities, setAllActivities] = useState<Array<Activity & { leadId: string }>>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentWithLead[]>([]);
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allDialers, setAllDialers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApptListOpen, setIsApptListOpen] = useState(false);
  const [isWonListOpen, setIsWonListOpen] = useState(false);
  const [isQuotesListOpen, setIsQuotesListOpen] = useState(false);
  const [isTrialsListOpen, setIsTrialsListOpen] = useState(false);
  const [isFieldSourcedListOpen, setIsFieldSourcedListOpen] = useState(false);
  const [isApptOutcomeListOpen, setIsApptOutcomeListOpen] = useState(false);
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>('all');
  const [trialDrilldown, setTrialDrilldown] = useState<{ title: string; leads: Lead[] } | null>(null);
  
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    status: [] as string[],
    activityDate: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    appointmentDate: undefined as DateRange | undefined,
    duration: 'all',
    dialerAssigned: [] as string[],
    franchisee: [] as string[],
    appointmentAssignedTo: [] as string[],
    isFieldSourced: 'all' as 'all' | 'yes' | 'no',
  });

  const getQuickDateRange = (option: string): DateRange => {
    const now = new Date();
    switch (option) {
      case 'yesterday': {
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      }
      case 'this-week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last-week': {
        const lastWeek = subWeeks(now, 1);
        return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      }
      case 'this-month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last-month': {
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      }
      case 'this-quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'this-year':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'last-year': {
        const lastYear = subYears(now, 1);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      }
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
        const [usersSnap, leadsSnap, visitNotesSnap, companiesSnap] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'leads')),
            getDocs(collection(firestore, 'visitnotes')),
            getDocs(collection(firestore, 'companies'))
        ]);

        const userList = usersSnap.docs.map(doc => {
            const data = doc.data();
            return `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }).filter(Boolean);
        setAllDialers(userList);

        const notes = visitNotesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitNote));
        setAllVisitNotes(notes);

        const processRecords = (snap: any, isFromCompanies = false) => {
            return snap.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    entityId: data.entityId || data.customerEntityId || data.internalid,
                    companyName: data.companyName || 'Unknown Company',
                    dialerAssigned: data.dialerAssigned,
                    salesRepAssigned: data.salesRepAssigned,
                    status: safeGetStatus(data.customerStatus),
                    franchisee: data.franchisee,
                    fieldSales: data.fieldSales,
                    dateLeadEntered: data.dateLeadEntered,
                    discoveryData: data.discoveryData,
                    visitNoteID: data.visitNoteID,
                    isFromCompaniesCollection: isFromCompanies,
                    providedShipMateOnboarding: data.providedShipMateOnboarding,
                    firstJobCreatedAt: data.firstJobCreatedAt,
                    jobCount: data.jobCount,
                    localMileTrialsRemaining: data.localMileTrialsRemaining,
                    localMileTermsAccepted: data.localMileTermsAccepted,
                } as unknown as Lead;
            }).filter((l: Lead) => l.fieldSales !== true);
        };

        const rawLeads = processRecords(leadsSnap, false);
        const rawCompanies = processRecords(companiesSnap, true);
        
        // Deduplicate: Company takes precedence
        const leadMap = new Map<string, Lead>();
        for (const lead of [...rawLeads, ...rawCompanies]) {
             if (lead.isFromCompaniesCollection) {
                 leadMap.set(lead.id, lead);
             } else if (!leadMap.has(lead.id)) {
                 leadMap.set(lead.id, lead);
             }
        }
        const combinedLeads = Array.from(leadMap.values());
            
        setAllLeads(combinedLeads);
        // leadMap is already defined and correctly populated for lookups!

        const [activitiesSnap, apptsSnap] = await Promise.all([
            getDocs(collectionGroup(firestore, 'activity')),
            getDocs(collectionGroup(firestore, 'appointments'))
        ]);

        const rawActivities = activitiesSnap.docs.map(activityDoc => {
            const data = activityDoc.data() as Activity;
            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;
            
            if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
                if (lead.franchisee !== userProfile.franchisee) return null;
            }

            return {
                ...data,
                id: activityDoc.id,
                leadId,
            };
        }).filter(Boolean) as (Activity & { leadId: string })[];

        setAllActivities(rawActivities);

        const rawCalls = rawActivities.map(activity => {
            if (activity.type !== 'Call') return null;
            const lead = leadMap.get(activity.leadId)!;
            return {
                ...activity,
                leadName: lead.companyName,
                leadStatus: lead.status,
                dialerAssigned: lead.dialerAssigned || 'Unassigned',
            } as CallActivity;
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
                const parsedAttempt = parseDateString(attempt.date);
                const attemptTime = parsedAttempt ? parsedAttempt.getTime() : 0;
                const matched = outcomes.some(outcome => {
                    const parsedOutcome = parseDateString(outcome.date);
                    const outcomeTime = parsedOutcome ? parsedOutcome.getTime() : 0;
                    return attemptTime && outcomeTime && Math.abs(outcomeTime - attemptTime) < 5 * 60 * 1000;
                });
                if (!matched) {
                    finalCalls.push(attempt);
                }
            });
        });
        
        finalCalls.sort((a, b) => {
            const dateA = parseDateString(a.date) || new Date(0);
            const dateB = parseDateString(b.date) || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        setAllCalls(finalCalls);

        const appts = apptsSnap.docs.map(apptDoc => {
            const data = apptDoc.data() as Appointment;
            const leadId = apptDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const lead = leadMap.get(leadId);
            if (!lead) return null;

            if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
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
        
        appts.sort((a, b) => {
            const dateA = parseDateString(a.starttime) || new Date(0);
            const dateB = parseDateString(b.starttime) || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
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
      activityDate: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      appointmentDate: undefined,
      duration: 'all',
      dialerAssigned: [],
      franchisee: [],
      appointmentAssignedTo: [],
      isFieldSourced: 'all',
    });
  };

  const filteredCalls = useMemo(() => {
    return allCalls.filter(call => {
        const lead = allLeads.find(l => l.id === call.leadId);
        if (!lead) return false;
        
        if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
            if (lead.franchisee !== userProfile.franchisee) return false;
        }

        const dialerMatch = filters.dialerAssigned.length === 0 || (call.dialerAssigned && filters.dialerAssigned.includes(call.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(call.leadStatus);
        const sourceMatch = filters.isFieldSourced === 'all' || 
                           (filters.isFieldSourced === 'yes' && !!lead.visitNoteID) ||
                           (filters.isFieldSourced === 'no' && !lead.visitNoteID);

        let activityDateMatch = true;
        if (filters.activityDate?.from) {
          const callDate = parseDateString(call.date);
          if (callDate) {
            const fromDate = startOfDay(filters.activityDate.from);
            const toDate = filters.activityDate.to ? endOfDay(filters.activityDate.to) : endOfDay(filters.activityDate.from);
            activityDateMatch = callDate >= fromDate && callDate <= toDate;
          } else {
            activityDateMatch = false;
          }
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

        return dialerMatch && franchiseeMatch && statusMatch && sourceMatch && activityDateMatch && durationMatch() && appointmentAssignedToMatch;
    });
  }, [allCalls, allLeads, filters, allAppointments, userProfile]);
  
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appointment => {
        if (appointment.leadName === 'Unknown Lead') return false;
        const lead = allLeads.find(l => l.id === appointment.leadId);
        if (!lead) return false;

        if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
            if (lead.franchisee !== userProfile.franchisee) return false;
        }

        const dialerMatch = filters.dialerAssigned.length === 0 || (appointment.dialerAssigned && filters.dialerAssigned.includes(appointment.dialerAssigned));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));
        const statusMatch = filters.status.length === 0 || filters.status.includes(appointment.leadStatus);
        const sourceMatch = filters.isFieldSourced === 'all' || 
                           (filters.isFieldSourced === 'yes' && !!lead.visitNoteID) ||
                           (filters.isFieldSourced === 'no' && !lead.visitNoteID);
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
            const apptDate = parseDateString(appointment.duedate);
            if (!apptDate) return false;
            const fromDate = startOfDay(filters.appointmentDate.from);
            const toDate = filters.appointmentDate.to ? endOfDay(filters.appointmentDate.to) : endOfDay(filters.appointmentDate.from);
            appointmentDateMatch = apptDate >= fromDate && apptDate <= toDate;
        }

        return dialerMatch && franchiseeMatch && statusMatch && sourceMatch && creationDateMatch && appointmentDateMatch && appointmentAssignedToMatch;
    });
  }, [allAppointments, allLeads, filters, userProfile]);

  const stats = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const totalAppointments = filteredAppointments.length;
    
    const uniqueLeadIdsCalled = new Set(filteredCalls.map(c => c.leadId));
    const uniqueLeadIdsAppointed = new Set(filteredAppointments.map(a => a.leadId));

    const leadsWithAppts = allLeads.filter(l => uniqueLeadIdsAppointed.has(l.id));
    const leadsWithCalls = allLeads.filter(l => uniqueLeadIdsCalled.has(l.id));
    
    const wonLeadsList = leadsWithAppts.filter(l => l.status === 'Won');
    const wonCount = wonLeadsList.length;
    
    const quoteLeadsList = leadsWithAppts.filter(l => l.status === 'Prospect Opportunity' || l.status === 'Quote Sent');
    const quoteCount = quoteLeadsList.length;

    const trialLeadsList = leadsWithAppts.filter(l => l.status === 'Trialing ShipMate');
    const trialCount = trialLeadsList.length;

    const lostCount = leadsWithAppts.filter(l => l.status === 'Lost').length;

    const leadsCalledCount = uniqueLeadIdsCalled.size;
    const leadsAppointedCount = uniqueLeadIdsAppointed.size;

    const baseFilteredLeads = allLeads.filter(l => {
        if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
            if (l.franchisee !== userProfile.franchisee) return false;
        }
        const franchiseeMatch = filters.franchisee.length === 0 || (l.franchisee && filters.franchisee.includes(l.franchisee));
        const dialerMatch = filters.dialerAssigned.length === 0 || (l.dialerAssigned && filters.dialerAssigned.includes(l.dialerAssigned));
        const sourceMatch = filters.isFieldSourced === 'all' || 
                           (filters.isFieldSourced === 'yes' && !!l.visitNoteID) ||
                           (filters.isFieldSourced === 'no' && !l.visitNoteID);
        
        let interactionMatch = true;
        if (filters.activityDate?.from) {
            const leadActs = allActivities.filter(a => a.leadId === l.id);
            interactionMatch = leadActs.some(a => {
                const actDate = parseDateString(a.date);
                if (!actDate) return false;
                const fromDate = startOfDay(filters.activityDate!.from!);
                const toDate = filters.activityDate!.to ? endOfDay(filters.activityDate!.to) : endOfDay(filters.activityDate!.from!);
                return actDate >= fromDate && actDate <= toDate;
            });
        }
        return franchiseeMatch && dialerMatch && sourceMatch && interactionMatch;
    });

    const queueLeads = baseFilteredLeads.filter(l => ['New', 'Priority Lead', 'Priority Field Lead'].includes(l.status));
    const inProgressLeads = baseFilteredLeads.filter(l => l.status === 'In Progress' || l.status === 'Quote Sent');
    const processedLeads = baseFilteredLeads.filter(l => !['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent'].includes(l.status));

    const queueStatusDist = queueLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const inProgressStatusDist = inProgressLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const visitNotesMap = new Map(allVisitNotes.map(n => [n.id, n]));
    
    const fieldSourcedLeads = baseFilteredLeads
        .filter(l => 
            l.fieldSales === false &&
            !!l.visitNoteID
        ) 
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

    const fieldRepContribution = Array.from(
        fieldSourcedLeads.reduce((acc, l) => {
            const rep = l.visitNote?.capturedBy || 'Unknown Rep';
            if (!acc.has(rep)) {
                acc.set(rep, { name: rep, total: 0, appts: 0, wins: 0, outcomes: {} as Record<string, number> });
            }
            const data = acc.get(rep)!;
            data.total++;
            if (l.status === 'Won') data.wins++;
            if (fieldSourcedAppointedIds.has(l.id)) data.appts++;
            
            const outcome = l.visitNote?.outcome?.type || 'No Outcome Sync';
            data.outcomes[outcome] = (data.outcomes[outcome] || 0) + 1;
            
            return acc;
        }, new Map<string, { name: string, total: number, appts: number, wins: number, outcomes: Record<string, number> }>())
    ).map(([_, v]) => v).sort((a, b) => b.total - a.total);

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
    }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

    const amPerformanceData = Array.from(new Set(filteredAppointments.map(a => a.assignedTo).filter(Boolean))).map(am => {
        const amAppts = filteredAppointments.filter(a => a.assignedTo === am);
        return { 
            name: am, 
            Total: amAppts.length,
            Completed: amAppts.filter(a => a.appointmentStatus === 'Completed').length,
            Cancelled: amAppts.filter(a => a.appointmentStatus === 'Cancelled').length,
            'No Show': amAppts.filter(a => a.appointmentStatus === 'No Show').length,
            Rescheduled: amAppts.filter(a => a.appointmentStatus === 'Rescheduled').length,
            Pending: amAppts.filter(a => !a.appointmentStatus || a.appointmentStatus === 'Pending').length
        };
    }).sort((a, b) => b.Total - a.Total);

    // Free Trial Journeys
    const isDateInRange = (dateStr: any) => {
        if (!dateStr) return false;
        if (!filters.activityDate?.from) return true;
        const d = parseDateString(dateStr);
        if (!d) return false;
        const fromDate = startOfDay(filters.activityDate.from);
        const toDate = filters.activityDate.to ? endOfDay(filters.activityDate.to) : endOfDay(filters.activityDate.from);
        return d >= fromDate && d <= toDate;
    };

    const shipmateTrialLeads: Lead[] = [];
    const localmileTrialLeads: Lead[] = [];
    const anyTrialLeads: Lead[] = [];

    baseFilteredLeads.forEach(lead => {
        const leadActivities = allActivities.filter(act => act.leadId === lead.id);
        
        // ShipMate Trial Detection
        const hasShipMateTrialActivity = leadActivities.some(act => 
            (act.notes?.includes("Initiated ShipMate Trial") || act.notes?.includes("Status changed to Trialing ShipMate")) &&
            isDateInRange(act.date)
        );
        const isCurrentlyShipMate = lead.status === 'Trialing ShipMate';
        const startedShipMate = hasShipMateTrialActivity || (isCurrentlyShipMate && (!filters.activityDate?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

        // LocalMile Trial Detection
        const hasLocalMileTrialActivity = leadActivities.some(act => 
            (act.notes?.includes("Initiated LocalMile Trial") || act.notes?.includes("Status changed to Trialing LocalMile") || act.notes?.includes("First LocalMile Job created")) &&
            isDateInRange(act.date)
        );
        const isCurrentlyLocalMile = lead.status === 'Trialing LocalMile' || lead.status === 'LocalMile Opportunity';
        const hasLocalMileFields = !!lead.firstJobCreatedAt || (lead.jobCount !== undefined && lead.jobCount > 0) || lead.localMileTrialsRemaining !== undefined;
        const startedLocalMile = hasLocalMileTrialActivity || ((isCurrentlyLocalMile || hasLocalMileFields) && (!filters.activityDate?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

        if (startedShipMate) {
            shipmateTrialLeads.push(lead);
        }
        if (startedLocalMile) {
            localmileTrialLeads.push(lead);
        }
        if (startedShipMate || startedLocalMile || lead.status === 'Free Trial') {
            anyTrialLeads.push(lead);
        }
    });

    const getJourneyBreakdown = (leads: Lead[]) => {
        const total = leads.length;
        const signed = leads.filter(l => l.status === 'Won').length;
        const lost = leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.status)).length;
        const trialing = leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.status)).length;
        const other = total - signed - lost - trialing;
        
        return {
            total,
            signed,
            lost,
            trialing,
            other,
            signedRate: total > 0 ? (signed / total) * 100 : 0,
            lostRate: total > 0 ? (lost / total) * 100 : 0,
            leads
        };
    };

    const shipmateJourney = getJourneyBreakdown(shipmateTrialLeads);
    const localmileJourney = getJourneyBreakdown(localmileTrialLeads);
    const combinedJourney = getJourneyBreakdown(anyTrialLeads);

    // Lead Journey Velocity & Drop-offs
    let totalLeadsActioned = 0;
    let sumTimeToFirstAction = 0;
    let sumTimeToConvert = 0;
    let convertedCount = 0;
    let sumTimeToDropoff = 0;
    let dropoffCount = 0;
    const dropoffStages: Record<string, number> = {};
    const dropoffStageLeads: Record<string, Lead[]> = {};

    baseFilteredLeads.forEach(lead => {
        const leadActivities = allActivities.filter(a => a.leadId === lead.id).sort((a, b) => {
            const dateA = parseDateString(a.date) || new Date(0);
            const dateB = parseDateString(b.date) || new Date(0);
            return dateA.getTime() - dateB.getTime();
        });
        const enteredDate = parseDateString(lead.dateLeadEntered);

        // Time to First Action
        const firstAction = leadActivities[0];
        if (firstAction && enteredDate) {
            const parsedFirstDate = parseDateString(firstAction.date);
            if (parsedFirstDate) {
                const timeToFirstAction = (parsedFirstDate.getTime() - enteredDate.getTime()) / (1000 * 3600 * 24);
                if (timeToFirstAction >= 0) {
                    sumTimeToFirstAction += timeToFirstAction;
                    totalLeadsActioned++;
                }
            }
        }

        // Conversion Velocity
        let conversionDate: Date | null = null;
        const conversionActivity = leadActivities.find(act => 
            act.notes?.includes("Status changed to Won") || 
            act.notes?.includes("Status changed to Signed") || 
            act.notes?.includes("Outcome: Won") || 
            act.notes?.includes("Outcome: Upsell")
        );
        if (conversionActivity) {
            conversionDate = parseDateString(conversionActivity.date);
        } else if (lead.status === 'Won') {
            if (lead.sofDetails?.signedAt) {
                conversionDate = parseDateString(lead.sofDetails.signedAt);
            } else if (lead.scfLinks && lead.scfLinks.length > 0) {
                const accepted = lead.scfLinks.filter(l => l.status === 'Accepted' && l.acceptedAt);
                if (accepted.length > 0) {
                    accepted.sort((a, b) => {
                        const dateA = parseDateString(a.acceptedAt) || new Date(0);
                        const dateB = parseDateString(b.acceptedAt) || new Date(0);
                        return dateA.getTime() - dateB.getTime();
                    });
                    conversionDate = parseDateString(accepted[0].acceptedAt!);
                }
            }
        }
        if (conversionDate && enteredDate) {
            const timeToConvert = (conversionDate.getTime() - enteredDate.getTime()) / (1000 * 3600 * 24);
            if (timeToConvert >= 0) {
                sumTimeToConvert += timeToConvert;
                convertedCount++;
            }
        }

        // Drop-off Velocity & Stage
        let lostDate: Date | null = null;
        let priorStatus: string = 'New';

        const lostActivityIndex = leadActivities.findIndex(act => 
            act.notes?.includes("Status changed to Lost") || 
            act.notes?.includes("Status changed to Unqualified") ||
            act.notes?.includes("Status changed to Lost Customer") ||
            act.notes?.includes("Outcome: Lost") ||
            act.notes?.includes("Outcome: Wrong Number") ||
            act.notes?.includes("Outcome: Not Interested") ||
            act.notes?.includes("Outcome: Not a Fit")
        );

        if (lostActivityIndex !== -1) {
            const lostActivity = leadActivities[lostActivityIndex];
            lostDate = parseDateString(lostActivity.date);

            for (let i = lostActivityIndex - 1; i >= 0; i--) {
                const match = leadActivities[i].notes?.match(/Status changed to ([^ (]+)/);
                if (match && match[1] && match[1] !== 'Lost' && match[1] !== 'Unqualified' && match[1] !== 'Lost Customer') {
                    priorStatus = match[1];
                    break;
                }
            }
        } else if (['Lost', 'Lost Customer', 'Unqualified'].includes(lead.status)) {
            const lastAct = leadActivities[leadActivities.length - 1];
            lostDate = lastAct ? parseDateString(lastAct.date) : (enteredDate || null);
        }

        if (lostDate && enteredDate && ['Lost', 'Lost Customer', 'Unqualified'].includes(lead.status)) {
            const timeToDropoff = (lostDate.getTime() - enteredDate.getTime()) / (1000 * 3600 * 24);
            if (timeToDropoff >= 0) {
                sumTimeToDropoff += timeToDropoff;
                dropoffCount++;
            }

            const stageLabel = priorStatus === 'Won' ? 'In Progress' : priorStatus;
            dropoffStages[stageLabel] = (dropoffStages[stageLabel] || 0) + 1;
            if (!dropoffStageLeads[stageLabel]) {
                dropoffStageLeads[stageLabel] = [];
            }
            dropoffStageLeads[stageLabel].push(lead);
        }
    });

    const journeyStats = {
        avgTimeToFirstAction: totalLeadsActioned > 0 ? sumTimeToFirstAction / totalLeadsActioned : 0,
        avgTimeToConvert: convertedCount > 0 ? sumTimeToConvert / convertedCount : 0,
        avgTimeToDropoff: dropoffCount > 0 ? sumTimeToDropoff / dropoffCount : 0,
        totalLeadsActioned,
        convertedCount,
        dropoffCount,
        dropoffStagesData: Object.entries(dropoffStages).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        dropoffStageLeads
    };

    return {
      baseFilteredLeads,
      journeyStats,
      shipmateJourney,
      localmileJourney,
      combinedJourney,
      totalCalls,
      wonCount,
      wonLeadsList,
      quoteCount,
      quoteLeadsList,
      trialCount,
      trialLeadsList,
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
      fieldRepContribution,
      
      callRatios: {
          appointment: leadsCalledCount > 0 ? (leadsAppointedCount / leadsCalledCount) * 100 : 0,
          won: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Won').length / leadsCalledCount) * 100 : 0,
          quote: leadsCalledCount > 0 ? (leadsWithCalls.filter(l => l.status === 'Prospect Opportunity' || l.status === 'Quote Sent').length / leadsCalledCount) * 100 : 0,
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
    toast({ title: 'Export Successful', description: `${filename} list exported to CSV. ` });
  };

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

  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s }));
  const amOptions: Option[] = useMemo(() => {
    const ams = new Set(allAppointments.map(a => a.assignedTo).filter(Boolean));
    return Array.from(ams).map(am => ({ value: am as string, label: am as string }));
  }, [allAppointments]);
  const dialerOptionsUI: Option[] = allDialers.map(d => ({ value: d, label: d }));
  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f as string, label: f as string }));
  }, [allLeads]);

  if (loading || authLoading || !userProfile) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  const filteredSourcedAppts = filteredAppointments.filter(appt => 
    selectedOutcomeFilter === 'all' || (appt.appointmentStatus || 'Pending') === selectedOutcomeFilter
  );

  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-bold tracking-tight">Outbound Reporting</h1><p className="text-muted-foreground">Performance dashboard for outbound engagement.</p></header>
      
      <Collapsible defaultOpen={true}>
          <Card id="step-outbound-filters">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4" /> Toggle Filters</Button></CollapsibleTrigger>
                </div>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2"><Label>Assigned To (Dialer)</Label><MultiSelectCombobox options={dialerOptionsUI} selected={filters.dialerAssigned} onSelectedChange={(val) => handleFilterChange('dialerAssigned', val)} placeholder="Select users..." /></div>
                    <div className="space-y-2"><Label>Account Manager</Label><MultiSelectCombobox options={amOptions} selected={filters.appointmentAssignedTo} onSelectedChange={(val) => handleFilterChange('appointmentAssignedTo', val)} placeholder="Select AMs..." /></div>
                    {userProfile?.activeRole !== 'Franchisee' && (
                        <div className="space-y-2"><Label>Franchisee</Label><MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..." /></div>
                    )}
                    <div className="space-y-2">
                        <Label>Sourced from Field?</Label>
                        <Select value={filters.isFieldSourced} onValueChange={(val) => handleFilterChange('isFieldSourced', val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                <SelectItem value="yes">Transitioned from Field</SelectItem>
                                <SelectItem value="no">Outbound Original Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Status</Label><MultiSelectCombobox options={leadStatusOptions} selected={filters.status} onSelectedChange={(val) => handleFilterChange('status', val)} placeholder="Select statuses..." /></div>
                    <div className="space-y-2">
                        <Label>Activity Date Range Preset</Label>
                        <Select onValueChange={(val) => handleFilterChange('activityDate', getQuickDateRange(val))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="this-week">This Week</SelectItem>
                                <SelectItem value="last-week">Last Week</SelectItem>
                                <SelectItem value="this-month">This Month</SelectItem>
                                <SelectItem value="last-month">Last Month</SelectItem>
                                <SelectItem value="this-quarter">This Quarter</SelectItem>
                                <SelectItem value="this-year">This Year</SelectItem>
                                <SelectItem value="last-year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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

      {!error && (
          <div className="space-y-6">
            <div id="step-outbound-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
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
                <StatCard 
                    title="Quotes Sent" 
                    value={stats.quoteCount} 
                    icon={Send} 
                    onClick={() => setIsQuotesListOpen(true)}
                />
                <StatCard 
                    title="ShipMate Trials" 
                    value={stats.trialCount} 
                    icon={Flame} 
                    onClick={() => setIsTrialsListOpen(true)}
                />
                <StatCard 
                    title="Field-to-Outbound" 
                    value={stats.fieldSourcedCount} 
                    icon={ClipboardCheck} 
                    description="Leads from Field" 
                    onClick={() => setIsFieldSourcedListOpen(true)}
                />
            </div>

            <Card id="step-report-free-trial-journeys" className="w-full shadow-md border-primary/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Goal className="h-5 w-5 text-amber-500" /> Free Trial Conversion Journeys
                            </CardTitle>
                            <CardDescription>
                                Track leads that started a free trial (ShipMate or LocalMile) and their outcomes (Signed vs Lost).
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ShipMate Cohort */}
                    <Card className="bg-muted/30 border border-muted-foreground/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-md font-semibold text-pink-600 dark:text-pink-400">
                                ShipMate Trials
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "ShipMate Trials Started", leads: stats.shipmateJourney.leads })}
                            >
                                <span className="text-sm font-medium">Trials Started</span>
                                <Badge className="text-md bg-pink-500 hover:bg-pink-600">{stats.shipmateJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "ShipMate Trials Signed", leads: stats.shipmateJourney.leads.filter(l => l.status === 'Won') })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.shipmateJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.shipmateJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "ShipMate Trials Lost", leads: stats.shipmateJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.shipmateJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.shipmateJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "ShipMate Trials Active", leads: stats.shipmateJourney.leads.filter(l => ['Trialing ShipMate', 'Free Trial'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-muted-foreground">Still Active (Trialing)</span>
                                <Badge variant="outline" className="text-md">{stats.shipmateJourney.trialing}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* LocalMile Cohort */}
                    <Card className="bg-muted/30 border border-muted-foreground/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-md font-semibold text-emerald-600 dark:text-emerald-400">
                                LocalMile Trials
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "LocalMile Trials Started", leads: stats.localmileJourney.leads })}
                            >
                                <span className="text-sm font-medium">Trials Started</span>
                                <Badge className="text-md bg-emerald-500 hover:bg-emerald-600">{stats.localmileJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "LocalMile Trials Signed", leads: stats.localmileJourney.leads.filter(l => l.status === 'Won') })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.localmileJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.localmileJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "LocalMile Trials Lost", leads: stats.localmileJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.localmileJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.localmileJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "LocalMile Trials Active", leads: stats.localmileJourney.leads.filter(l => ['Trialing LocalMile', 'LocalMile Opportunity'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-muted-foreground">Still Active (Trialing)</span>
                                <Badge variant="outline" className="text-md">{stats.localmileJourney.trialing}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Combined Trial Journey */}
                    <Card className="bg-muted/30 border border-muted-foreground/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-md font-semibold text-amber-600 dark:text-amber-400">
                                Combined Funnel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "Total Free Trials Started", leads: stats.combinedJourney.leads })}
                            >
                                <span className="text-sm font-medium">Total Started</span>
                                <Badge className="text-md bg-amber-500 hover:bg-amber-600">{stats.combinedJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "Total Free Trials Signed", leads: stats.combinedJourney.leads.filter(l => l.status === 'Won') })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.combinedJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.combinedJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "Total Free Trials Lost", leads: stats.combinedJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.combinedJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.combinedJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setTrialDrilldown({ title: "Total Free Trials Active", leads: stats.combinedJourney.leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.status)) })}
                            >
                                <span className="text-sm font-medium text-muted-foreground">Still Active (Trialing)</span>
                                <Badge variant="outline" className="text-md">{stats.combinedJourney.trialing}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card id="step-report-journey-velocity" className="w-full shadow-md border-primary/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-500" /> Lead Journey Velocity &amp; Drop-offs
                            </CardTitle>
                            <CardDescription>
                                Analyze how quickly leads are actioned, how long they take to convert or drop off, and where the leak is.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setTrialDrilldown({ title: "Leads Actioned", leads: stats.baseFilteredLeads.filter((l: Lead) => allActivities.some(a => a.leadId === l.id)) })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to First Action</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats.journeyStats.avgTimeToFirstAction < 1 
                                        ? `${(stats.journeyStats.avgTimeToFirstAction * 24).toFixed(1)} hours` 
                                        : `${stats.journeyStats.avgTimeToFirstAction.toFixed(1)} days`
                                    }
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">From entry to first call/activity ({stats.journeyStats.totalLeadsActioned} leads)</p>
                            </CardContent>
                        </Card>

                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setTrialDrilldown({ title: "Converted Leads Cohort", leads: stats.baseFilteredLeads.filter((l: Lead) => l.status === 'Won') })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to Convert (Signed)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {stats.journeyStats.avgTimeToConvert.toFixed(1)} days
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">From entry to Won/Signed ({stats.journeyStats.convertedCount} leads)</p>
                            </CardContent>
                        </Card>

                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setTrialDrilldown({ title: "Dropped-off Leads Cohort", leads: stats.baseFilteredLeads.filter((l: Lead) => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.status)) })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to Drop-off (Lost)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {stats.journeyStats.avgTimeToDropoff.toFixed(1)} days
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">From entry to Lost/Unqualified ({stats.journeyStats.dropoffCount} leads)</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                            <h4 className="text-md font-semibold mb-2">Drop-off Stages Breakdown</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                                Shows the last active stage leads were in before dropping off to Lost/Unqualified. Click a stage to see the list.
                            </p>
                            <ScrollArea className="h-[250px] border rounded-lg p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Stage Dropped Off From</TableHead>
                                            <TableHead className="text-right">Lost Leads</TableHead>
                                            <TableHead className="text-right">% of Lost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.journeyStats.dropoffStagesData.length > 0 ? (
                                            stats.journeyStats.dropoffStagesData.map((stage) => {
                                                const pct = stats.journeyStats.dropoffCount > 0 
                                                    ? (stage.value / stats.journeyStats.dropoffCount) * 100 
                                                    : 0;
                                                return (
                                                    <TableRow 
                                                        key={stage.name} 
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => setTrialDrilldown({ 
                                                            title: `Dropped off from ${stage.name}`, 
                                                            leads: stats.journeyStats.dropoffStageLeads[stage.name] || [] 
                                                        })}
                                                    >
                                                        <TableCell className="font-semibold">{stage.name === 'Won' ? 'In Progress' : stage.name}</TableCell>
                                                        <TableCell className="text-right text-red-500 font-bold">{stage.value}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                                                    No drop-off stage logs available for this period.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        <div>
                            <h4 className="text-md font-semibold mb-2">Visual Drop-off Stages</h4>
                            <p className="text-xs text-muted-foreground mb-4">Distribution of drop-off points.</p>
                            <div className="h-[250px] w-full flex items-center justify-center border rounded-lg bg-muted/5 p-4">
                                {stats.journeyStats.dropoffStagesData.length > 0 ? (
                                    <ChartContainer config={{}} className="h-full w-full">
                                        <BarChart data={stats.journeyStats.dropoffStagesData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="text-sm text-muted-foreground italic">No visual data available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div id="step-outbound-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsApptOutcomeListOpen(true)}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Appointment Outcomes</CardTitle>
                                <CardDescription>Breakdown of appointment statuses. Click to view list.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                handleExportChartData(stats.appointmentOutcomeData, 'appointment_outcomes');
                            }}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.appointmentOutcomeData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <PieChart>
                                    <Pie 
                                        data={stats.appointmentOutcomeData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.appointmentOutcomeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No appointment data available.</div>
                        )}
                    </CardContent>
                </Card>

                <Card id="step-report-field-contribution">
                    <CardHeader>
                        <CardTitle>Field Rep Contribution to Outbound</CardTitle>
                        <CardDescription>Metrics based on original Field Rep who captured the visit note.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Field Rep</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Appts</TableHead>
                                        <TableHead className="text-right">Wins</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.fieldRepContribution.length > 0 ? (
                                        stats.fieldRepContribution.map((rep) => (
                                            <TableRow key={rep.name}>
                                                <TableCell className="font-medium">{rep.name}</TableCell>
                                                <TableCell className="text-right">{rep.total}</TableCell>
                                                <TableCell className="text-right text-blue-600 font-bold">{rep.appts}</TableCell>
                                                <TableCell className="text-right text-green-600 font-bold">{rep.wins}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No transitions in period.</TableCell>
                                        </TableRow>
                                    )}
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
                            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-blue-500" />Engagement Conversion Efficiency</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportList(
                                [
                                    { Metric: 'Call to Appointment', Rate: stats.callRatios.appointment.toFixed(1) + '%' },
                                    { Metric: 'Call to Won', Rate: stats.callRatios.won.toFixed(1) + '%' },
                                    { Metric: 'Call to Quote', Rate: stats.callRatios.quote.toFixed(1) + '%' },
                                    { Metric: 'Call to Trial', Rate: stats.callRatios.trial.toFixed(1) + '%' },
                                    { Metric: 'Call to Lost', Rate: stats.callRatios.lost.toFixed(1) + '%' },
                                ],
                                ['Metric', 'Rate'],
                                'engagement_efficiency',
                                (item) => [item.Metric, item.Rate]
                            )}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
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

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-green-500" />Appointment Conversion Efficiency</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => handleExportList(
                                [
                                    { Metric: 'Appointment to Win', Rate: stats.apptRatios.won.toFixed(1) + '%' },
                                    { Metric: 'Appointment to Quote', Rate: stats.apptRatios.quote.toFixed(1) + '%' },
                                    { Metric: 'Appointment to Trial', Rate: stats.apptRatios.trial.toFixed(1) + '%' },
                                    { Metric: 'Appointment to Lost', Rate: stats.apptRatios.lost.toFixed(1) + '%' },
                                ],
                                ['Metric', 'Rate'],
                                'appointment_efficiency',
                                (item) => [item.Metric, item.Rate]
                            )}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                        <CardDescription>Ratios based on leads with at least one appointment scheduled in the period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell className="font-medium">Appointment to Win</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.won.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appointment to Quote</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.quote.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appointment to Trial</TableCell><TableCell className="text-right font-bold">{stats.apptRatios.trial.toFixed(1)}%</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium">Appointment to Lost</TableCell><TableCell className="text-right font-bold text-destructive">{stats.apptRatios.lost.toFixed(1)}%</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card id="step-report-pipeline-status">
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

                <Card id="step-report-status-distribution" className="lg:col-span-2">
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
                        <CardDescription>Detailed outcome distribution by Account Manager.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Manager</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Completed</TableHead>
                                        <TableHead className="text-right">Cancelled</TableHead>
                                        <TableHead className="text-right">No Show</TableHead>
                                        <TableHead className="text-right">Rescheduled</TableHead>
                                        <TableHead className="text-right">Pending</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.amPerformanceData.map(am => (
                                        <TableRow key={am.name}>
                                            <TableCell className="font-medium">{am.name}</TableCell>
                                            <TableCell className="text-right">{am.Total}</TableCell>
                                            <TableCell className="text-right text-green-600 font-bold">{am.Completed}</TableCell>
                                            <TableCell className="text-right">{am.Cancelled}</TableCell>
                                            <TableCell className="text-right">{am['No Show']}</TableCell>
                                            <TableCell className="text-right">{am.Rescheduled}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{am.Pending}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
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
                        ['Lead Name', 'Lead Status', 'Dialer', 'Account Manager', 'Date', 'Appt Status'],
                        'outbound_appointments',
                        (a) => [a.leadName, a.leadStatus, a.dialerAssigned || 'N/A', a.assignedTo || 'N/A', a.duedate ? safeFormat(a.duedate, 'PP') : 'N/A', a.appointmentStatus || 'Pending']
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
                                <TableHead>Lead Status</TableHead>
                                <TableHead>Dialer</TableHead>
                                <TableHead>Account Manager</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Appt Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAppointments.length > 0 ? filteredAppointments.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.leadName}</TableCell>
                                    <TableCell><LeadStatusBadge status={appt.leadStatus} /></TableCell>
                                    <TableCell>{appt.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{appt.assignedTo || 'N/A'}</TableCell>
                                    <TableCell>{safeFormat(appt.duedate, 'PP')}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{appt.appointmentStatus || 'Pending'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${appt.leadId}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">No appointments found.</TableCell></TableRow>}
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

      <Dialog open={isQuotesListOpen} onOpenChange={setIsQuotesListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Quotes Sent (Filtered Cohort)</DialogTitle>
                        <DialogDescription>Total quotes in period: {stats.quoteCount}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.quoteLeadsList,
                        ['Company Name', 'Entity ID', 'Dialer', 'Franchisee', 'Status'],
                        'quotes_sent_cohort',
                        (l) => [l.companyName, l.entityId || 'N/A', l.dialerAssigned || 'N/A', l.franchisee || 'N/A', l.status]
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
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.quoteLeadsList.length > 0 ? stats.quoteLeadsList.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{lead.entityId || 'N/A'}</TableCell>
                                    <TableCell>{lead.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{lead.franchisee || 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No quotes found in this cohort.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isTrialsListOpen} onOpenChange={setIsTrialsListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>ShipMate Trials (Filtered Cohort)</DialogTitle>
                        <DialogDescription>Total trials in period: {stats.trialCount}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.trialLeadsList,
                        ['Company Name', 'Entity ID', 'Dialer', 'Franchisee'],
                        'shipmate_trials_cohort',
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
                            {stats.trialLeadsList.length > 0 ? stats.trialLeadsList.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{lead.entityId || 'N/A'}</TableCell>
                                    <TableCell>{lead.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{lead.franchisee || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No trials found in this cohort.</TableCell></TableRow>}
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
                        ['Company', 'Field Rep', 'Visit Outcome', 'Captured Date', 'Current Status', 'Outbound Dialer'],
                        'field_sourced_outbound_pipeline',
                        (l) => [
                            l.companyName, 
                            l.visitNote?.capturedBy || 'N/A',
                            l.visitNote?.outcome?.type || 'N/A',
                            l.visitNote?.createdAt ? format(new Date(l.visitNote.createdAt), 'PP') : 'N/A',
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
                                <TableHead>Field Rep</TableHead>
                                <TableHead>Visit Outcome</TableHead>
                                <TableHead>Transitioned</TableHead>
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
                                        <div className="flex items-center gap-2">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            <span>{lead.visitNote?.capturedBy || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{lead.visitNote?.outcome?.type || 'N/A'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{lead.visitNote?.createdAt ? format(new Date(lead.visitNote.createdAt), 'PP') : 'N/A'}</span>
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
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
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

      <Dialog open={isApptOutcomeListOpen} onOpenChange={setIsApptOutcomeListOpen}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div className="space-y-1">
                        <DialogTitle>Filtered Appointment Outcomes</DialogTitle>
                        <DialogDescription>Lifecycle of appointments generated in the selected period.</DialogDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md">
                            <Label htmlFor="status-filter" className="text-xs font-semibold whitespace-nowrap">Status:</Label>
                            <Select value={selectedOutcomeFilter} onValueChange={setSelectedOutcomeFilter}>
                                <SelectTrigger id="status-filter" className="h-8 w-[140px] border-none shadow-none focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Outcomes</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    <SelectItem value="No Show">No Show</SelectItem>
                                    <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportList(
                            filteredSourcedAppts,
                            ['Company', 'Lead Status', 'Appt Status', 'Source (Dialer)', 'Assigned Sales Rep', 'Appt Date'],
                            'appointment_outcomes_list',
                            (a) => [a.leadName, a.leadStatus, a.appointmentStatus || 'Pending', a.dialerAssigned || 'N/A', a.assignedTo || 'N/A', a.duedate ? safeFormat(a.duedate, 'PP') : 'N/A']
                        )}>
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </div>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Lead Status</TableHead>
                                <TableHead>Appt Status</TableHead>
                                <TableHead>Source (Dialer)</TableHead>
                                <TableHead>Assigned Sales Rep</TableHead>
                                <TableHead>Appt Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSourcedAppts.length > 0 ? filteredSourcedAppts.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.leadName}</TableCell>
                                    <TableCell><LeadStatusBadge status={appt.leadStatus} /></TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            appt.appointmentStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                            appt.appointmentStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        )}>
                                            {appt.appointmentStatus || 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{appt.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{appt.assignedTo || 'N/A'}</TableCell>
                                    <TableCell>{safeFormat(appt.duedate, 'PP')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${appt.leadId}`} target="_blank">
                                                View Record <ExternalLink className="ml-2 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                                        No appointments found for this status.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={!!trialDrilldown} onOpenChange={(open) => !open && setTrialDrilldown(null)}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>{trialDrilldown?.title}</DialogTitle>
                        <DialogDescription>Total count: {trialDrilldown?.leads.length || 0}</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => trialDrilldown && handleExportList(
                        trialDrilldown.leads,
                        ['Company Name', 'Status', 'Dialer', 'Franchisee', 'Date Entered'],
                        trialDrilldown.title.toLowerCase().replace(/\s+/g, '_'),
                        (l) => [l.companyName, l.status, l.dialerAssigned || 'N/A', l.franchisee || 'N/A', l.dateLeadEntered || 'N/A']
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
                                <TableHead>Status</TableHead>
                                <TableHead>Dialer</TableHead>
                                <TableHead>Franchisee</TableHead>
                                <TableHead>Date Entered</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trialDrilldown?.leads && trialDrilldown.leads.length > 0 ? trialDrilldown.leads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell>{lead.dialerAssigned || 'N/A'}</TableCell>
                                    <TableCell>{lead.franchisee || 'N/A'}</TableCell>
                                    <TableCell>{lead.dateLeadEntered || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No leads found in this cohort.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
