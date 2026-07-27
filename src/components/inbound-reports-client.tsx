"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { usePermissions } from '@/hooks/use-permissions';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, ReviewCategory, VisitNote } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Loader } from '@/components/ui/loader';
import { PercentageLoader } from '@/components/ui/percentage-loader';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, LabelList } from 'recharts';
import { 
  Phone, 
  Percent, 
  Filter, 
  SlidersHorizontal, 
  X, 
  Star, 
  Calendar as CalendarIconLucide, 
  TrendingUp, 
  RefreshCw, 
  Download, 
  Inbox,
  User,
  ArrowUpRight,
  Target,
  BarChart3,
  ExternalLink,
  Quote,
  Clock,
  MapPin,
  AlertCircle,
  Goal,
  Info,
  Zap,
  Package,
  Activity as ActivityIcon,
  Layers
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isValid, isWithinInterval, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWeekend } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, where, orderBy, collectionGroup, or, and } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { StatusOutcomeInfo, StatusChartTooltipContent } from './status-outcome-info';
import { StatusOutcomeBanner, StatusOutcomeGuideButton } from './status-outcome-guide';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getStatusColor } from '@/lib/status-colors';

const COLORS = ['#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#4f46e5', '#0d9488', '#e11d48', '#ea580c'];

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4.5 h-4.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-4 text-xs space-y-2 shadow-lg border bg-popover text-popover-foreground z-50 leading-relaxed font-normal" onClick={(e) => e.stopPropagation()}>
      {content}
    </PopoverContent>
  </Popover>
);

const StatCard = ({ title, value, icon: Icon, description, onClick, helpContent }: { title: string; value: string | number | React.ReactNode; icon: React.ElementType; description?: React.ReactNode; onClick?: () => void; helpContent?: React.ReactNode }) => (
  <Card className={cn(onClick && "cursor-pointer hover:bg-muted/50 transition-colors shadow-sm")} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
        <span>{title}</span>
        {helpContent && <SectionHelp content={helpContent} />}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

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


const isManualActivity = (act: { type: string; notes?: string; author?: string }): boolean => {
    if (!act.author) return false;
    const authorLower = act.author.toLowerCase();
    
    const isSystemAuthor = 
        authorLower.includes('system') || 
        authorLower.includes('engine') || 
        authorLower.includes('webhook') || 
        authorLower.includes('api') || 
        authorLower.includes('assistant') || 
        authorLower.includes('operator') || 
        authorLower.includes('nudge');
        
    if (isSystemAuthor) return false;
    
    const notesLower = (act.notes || '').toLowerCase();
    const isSystemNote = 
        notesLower.includes('bucket changed') || 
        notesLower.includes('status changed') || 
        notesLower.includes('imported from') || 
        notesLower.includes('synced from');
        
    if (isSystemNote) return false;

    return true;
};

const isManualEmail = (email: { campaignId?: string; sender?: string }): boolean => {
    if (email.campaignId) return false;
    
    if (email.sender) {
        const senderLower = email.sender.toLowerCase();
        const isSystemSender = 
            senderLower.includes('system') || 
            senderLower.includes('engine') || 
            senderLower.includes('webhook') || 
            senderLower.includes('api') || 
            senderLower.includes('assistant') || 
            senderLower.includes('operator') || 
            senderLower.includes('nudge') || 
            senderLower.includes('no-reply') || 
            senderLower.includes('noreply');
        if (isSystemSender) return false;
    }
    
    return true;
};

const getSydneyDate = (date: Date): Date => {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
};

const isBusinessHoursSydney = (date: Date): boolean => {
    const sydDate = getSydneyDate(date);
    const day = sydDate.getDay();
    const hour = sydDate.getHours();
    if (day === 0 || day === 6) return false;
    if (hour < 9 || hour >= 17) return false;
    return true;
};

const calculateBusinessHoursSydney = (start: Date, end: Date): number => {
    if (start >= end) return 0;
    
    // Helper to get local date representing Sydney clock time
    const getSydneyLocal = (d: Date): Date => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Australia/Sydney',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(d);
        const partObj: Record<string, string> = {};
        for (const part of parts) {
            partObj[part.type] = part.value;
        }
        return new Date(
            parseInt(partObj.year),
            parseInt(partObj.month) - 1,
            parseInt(partObj.day),
            parseInt(partObj.hour) === 24 ? 0 : parseInt(partObj.hour),
            parseInt(partObj.minute),
            parseInt(partObj.second)
        );
    };

    const startSyd = getSydneyLocal(start);
    const endSyd = getSydneyLocal(end);

    // Let's get the start of the day for date comparison
    const startDay = new Date(startSyd.getFullYear(), startSyd.getMonth(), startSyd.getDate());
    const endDay = new Date(endSyd.getFullYear(), endSyd.getMonth(), endSyd.getDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    
    // If start and end are on the same calendar day
    if (startDay.getTime() === endDay.getTime()) {
        const dayOfWeek = startSyd.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

        const businessStart = new Date(startDay);
        businessStart.setHours(9, 0, 0, 0);
        const businessEnd = new Date(startDay);
        businessEnd.setHours(17, 0, 0, 0);

        const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
        const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));

        return Math.max(0, clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60);
    }

    let totalMs = 0;

    // 1. First day business hours
    const startDayOfWeek = startSyd.getDay();
    if (startDayOfWeek !== 0 && startDayOfWeek !== 6) {
        const businessStart = new Date(startDay);
        businessStart.setHours(9, 0, 0, 0);
        const businessEnd = new Date(startDay);
        businessEnd.setHours(17, 0, 0, 0);

        const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
        totalMs += Math.max(0, businessEnd.getTime() - clampedStart.getTime());
    }

    // 2. Intermediate days
    let currentDay = new Date(startDay.getTime() + msPerDay);
    while (currentDay.getTime() < endDay.getTime()) {
        const dayOfWeek = currentDay.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            totalMs += 8 * 60 * 60 * 1000; // 8 hours
        }
        currentDay.setTime(currentDay.getTime() + msPerDay);
    }

    // 3. Last day business hours
    const endDayOfWeek = endSyd.getDay();
    if (endDayOfWeek !== 0 && endDayOfWeek !== 6) {
        const businessStart = new Date(endDay);
        businessStart.setHours(9, 0, 0, 0);
        const businessEnd = new Date(endDay);
        businessEnd.setHours(17, 0, 0, 0);

        const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));
        totalMs += Math.max(0, clampedEnd.getTime() - businessStart.getTime());
    }

    return totalMs / (1000 * 60 * 60);
};

export interface InboundReportsClientPageProps {
  externalDateRange?: DateRange;
  hideHeaderAndFilters?: boolean;
  visibleSections?: string[];
}

export default function InboundReportsClientPage({
  externalDateRange,
  hideHeaderAndFilters = false,
  visibleSections,
}: InboundReportsClientPageProps = {}) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allActivities, setAllActivities] = useState<Array<Activity & { leadId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { setLoadTime, setPageName, setIsCustom } = usePerformance();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ leads: Lead[], companies: Lead[] } | null>(null);
  const lastFetchedStartISORef = useRef<string | null>(null);

  useEffect(() => {
    setIsCustom(true);
    setPageName("Inbound Reporting");
  }, [setIsCustom, setPageName]);
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const { canView, loadingPermissions } = usePermissions();
  const hasAccess = canView('inboundReporting');
  
  const [filters, setFilters] = useState({
    customerStatus: [] as string[],
    dateEntered: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    accountManagerAssigned: [] as string[],
    source: [] as string[],
    franchisee: [] as string[],
  });
  const [appliedFilters, setAppliedFilters] = useState({
    customerStatus: [] as string[],
    dateEntered: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    accountManagerAssigned: [] as string[],
    source: [] as string[],
    franchisee: [] as string[],
  });

  useEffect(() => {
    if (externalDateRange !== undefined) {
      setFilters(prev => ({
        ...prev,
        dateEntered: externalDateRange,
      }));
      setAppliedFilters(prev => ({
        ...prev,
        dateEntered: externalDateRange,
      }));
    }
  }, [externalDateRange]);
  const [datePreset, setDatePreset] = useState<string>("this_month");

  const hasUnappliedFilters = useMemo(() => {
    return JSON.stringify(filters.customerStatus) !== JSON.stringify(appliedFilters.customerStatus) ||
           JSON.stringify(filters.accountManagerAssigned) !== JSON.stringify(appliedFilters.accountManagerAssigned) ||
           JSON.stringify(filters.source) !== JSON.stringify(appliedFilters.source) ||
           JSON.stringify(filters.franchisee) !== JSON.stringify(appliedFilters.franchisee) ||
           filters.dateEntered?.from?.getTime() !== appliedFilters.dateEntered?.from?.getTime() ||
           filters.dateEntered?.to?.getTime() !== appliedFilters.dateEntered?.to?.getTime();
  }, [filters, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const [activeNetsuiteIndex, setActiveNetsuiteIndex] = useState<number | null>(null);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState<number | null>(null);
  const [activeLeadTypeIndex, setActiveLeadTypeIndex] = useState<number | null>(null);
  const [drillDownData, setDrillDownData] = useState<{ title: string; leads: Lead[] } | null>(null);
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState<string>("all");
  const [drillDownSlaFilter, setDrillDownSlaFilter] = useState<string>("all");
  const [drillDownSearchQuery, setDrillDownSearchQuery] = useState<string>("");
  const [showFranchiseeTable, setShowFranchiseeTable] = useState(false);
  const [amDailyMetricMode, setAmDailyMetricMode] = useState<'by_am' | 'by_am_unique' | 'by_type' | 'combined'>('by_am_unique');
  const [amDailyViewMode, setAmDailyViewMode] = useState<'chart' | 'table'>('chart');
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [fetchProgress, setFetchProgress] = useState(15);

  useEffect(() => {
    if (!drillDownData) {
      setDrillDownStatusFilter("all");
      setDrillDownSlaFilter("all");
      setDrillDownSearchQuery("");
    }
  }, [drillDownData]);

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setFetchProgress(20);
    setError(null);
    console.time("Inbound Reporting - Load Time");
    const startTimePerf = performance.now();
    try {
        let startISO = '';
        if (appliedFilters.dateEntered?.from) {
            startISO = startOfDay(appliedFilters.dateEntered.from).toISOString();
        } else {
            const defaultLimit = new Date();
            defaultLimit.setDate(defaultLimit.getDate() - 60);
            startISO = defaultLimit.toISOString();
        }

        const isDateRangeChanged = lastFetchedStartISORef.current !== startISO;
        if (isDateRangeChanged) {
            cacheRef.current = null;
            lastFetchedStartISORef.current = startISO;
        }

        const activityQuery = query(
            collectionGroup(firestore, 'activity'),
            where('date', '>=', startISO)
        );

        const apptQuery = query(
            collectionGroup(firestore, 'appointments'),
            where('duedate', '>=', startISO)
        );

        const usersQuery = query(collection(firestore, 'users'));

        let fetchedLeads: Lead[] = [];
        let fetchedCompanies: Lead[] = [];
        let activitiesSnap;

        if (cacheRef.current) {
            fetchedLeads = cacheRef.current.leads;
            fetchedCompanies = cacheRef.current.companies;
            const [actSnap, apptSnap, usersSnap] = await Promise.all([
                getDocs(activityQuery),
                getDocs(apptQuery),
                getDocs(usersQuery)
            ]);
            activitiesSnap = actSnap;

            const userList = usersSnap.docs.map((doc: any) => {
                const data = doc.data();
                return `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName;
            }).filter(Boolean);
            setAllUsers(userList);

            const apptsList = apptSnap.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            } as Appointment));
            setAllAppointments(apptsList);
        } else {
            let leadsQuery, companiesQuery;
            if (appliedFilters.dateEntered?.from) {
                if (userProfile.activeRole === 'Franchisee' && userProfile.franchisee) {
                    leadsQuery = query(
                        collection(firestore, 'leads'),
                        where('dateLeadEntered', '>=', startISO),
                        where('franchisee', '==', userProfile.franchisee)
                    );
                    companiesQuery = query(
                        collection(firestore, 'companies'),
                        where('dateLeadEntered', '>=', startISO),
                        where('franchisee', '==', userProfile.franchisee)
                    );
                } else {
                    leadsQuery = query(
                        collection(firestore, 'leads'),
                        where('dateLeadEntered', '>=', startISO)
                    );
                    companiesQuery = query(
                        collection(firestore, 'companies'),
                        where('dateLeadEntered', '>=', startISO)
                    );
                }
            } else {
                // Enforce a fallback range of last 90 days to avoid loading the entire database
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                const fallbackISO = ninetyDaysAgo.toISOString();

                if (userProfile.activeRole === 'Franchisee' && userProfile.franchisee) {
                  leadsQuery = query(
                    collection(firestore, 'leads'),
                    where('dateLeadEntered', '>=', fallbackISO),
                    where('franchisee', '==', userProfile.franchisee)
                  );
                  companiesQuery = query(
                    collection(firestore, 'companies'),
                    where('dateLeadEntered', '>=', fallbackISO),
                    where('franchisee', '==', userProfile.franchisee)
                  );
                } else {
                  leadsQuery = query(
                    collection(firestore, 'leads'),
                    where('dateLeadEntered', '>=', fallbackISO)
                  );
                  companiesQuery = query(
                    collection(firestore, 'companies'),
                    where('dateLeadEntered', '>=', fallbackISO)
                  );
                }
            }
            
            const [snap, actSnap, compSnap, apptSnap, usersSnap] = await Promise.all([
              getDocs(leadsQuery),
              getDocs(activityQuery),
              getDocs(companiesQuery),
              getDocs(apptQuery),
              getDocs(usersQuery)
            ]);
            setFetchProgress(70);

            const rawLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
            const rawCompanies = compSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

            const isInbound = (l: Lead) => {
                if (l.bucket === 'inbound') return true;
                const hasWebsite = Object.entries(l).some(([key, val]) => {
                    if (typeof val !== 'string') return false;
                    const keyLower = key.toLowerCase();
                    if (keyLower.includes('url') || keyLower === 'website') return false;
                    return val.toLowerCase().includes('website');
                });
                return hasWebsite;
            };
            fetchedLeads = rawLeads.filter(isInbound);
            fetchedCompanies = rawCompanies.filter(isInbound);

            activitiesSnap = actSnap;

            const userList = usersSnap.docs.map((doc: any) => {
                const data = doc.data();
                return `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName;
            }).filter(Boolean);
            setAllUsers(userList);

            const apptsList = apptSnap.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            } as Appointment));
            setAllAppointments(apptsList);

            cacheRef.current = { leads: fetchedLeads, companies: fetchedCompanies };
        }
        
        const leadMap = new Map<string, Lead>();
        for (const lead of [...fetchedLeads, ...fetchedCompanies]) {
            leadMap.set(lead.id, lead);
        }
        setAllLeads(Array.from(leadMap.values()));

        const activities = activitiesSnap.docs.map(doc => {
            const data = doc.data() as Activity;
            return {
                ...data,
                id: doc.id,
                leadId: doc.ref.parent.parent!.id
            };
        });

        setAllActivities(activities);

    } catch (error: any) {
        console.error("Failed to refresh inbound reporting data:", error);
        setError(`Error: ${error.message || "An unexpected error occurred."}`);
        toast({ variant: 'destructive', title: 'Loading Failed', description: 'Could not load inbound reporting data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
        console.timeEnd("Inbound Reporting - Load Time");
        setLoadTime(Math.round(performance.now() - startTimePerf));
    }
  }, [userProfile, toast, appliedFilters.dateEntered]);

  useEffect(() => {
    if (userProfile && hasAccess) {
      fetchData();
    }
  }, [userProfile, hasAccess, fetchData]);

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (preset) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'yesterday':
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case 'this_week':
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'this_month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'all_time':
        from = undefined;
        to = undefined;
        break;
      default:
        return;
    }
    setFilters(prev => ({ ...prev, dateEntered: from ? { from, to } : undefined }));
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    if (filterName === 'dateEntered') {
      setDatePreset('custom');
    }
  };

  const clearFilters = () => {
    setDatePreset('this_month');
    const defaultFilters = {
      customerStatus: [],
      dateEntered: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      accountManagerAssigned: [],
      source: [],
      franchisee: [],
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        if (lead.isDuplicate) return false;
        
        const statusMatch = appliedFilters.customerStatus.length === 0 || (lead.customerStatus && appliedFilters.customerStatus.includes(lead.customerStatus));
        const amMatch = appliedFilters.accountManagerAssigned.length === 0 || (lead.accountManagerAssigned && appliedFilters.accountManagerAssigned.includes(lead.accountManagerAssigned));
        const sourceMatch = appliedFilters.source.length === 0 || (lead.customerSource && appliedFilters.source.includes(lead.customerSource));
        const franchiseeMatch = appliedFilters.franchisee.length === 0 || (lead.franchisee && appliedFilters.franchisee.includes(lead.franchisee));

        let dateMatch = true;
        if (appliedFilters.dateEntered?.from) {
            const enteredDate = parseDateString(lead.dateLeadEntered);
            if (!enteredDate) return false;
            const fromDate = startOfDay(appliedFilters.dateEntered.from);
            const toDate = appliedFilters.dateEntered.to ? endOfDay(appliedFilters.dateEntered.to) : endOfDay(appliedFilters.dateEntered.from);
            dateMatch = enteredDate >= fromDate && enteredDate <= toDate;
        }

        return statusMatch && amMatch && sourceMatch && franchiseeMatch && dateMatch;
    });
  }, [allLeads, appliedFilters]);

  const stats = useMemo(() => {
    const totalInbound = filteredLeads.length;
    
    // Lead Response Time, Stale Leads & Overdue Hot Leads calculated first so we can use them in AM performance
    let totalResponseTime = 0;
    let leadsWithResponseTime = 0;
    
    const staleLeadsList: Lead[] = [];
    const overdueHotLeadsList: Lead[] = [];
    const now = new Date();

    filteredLeads.forEach(lead => {
        const entered = parseDateString(lead.dateLeadEntered);
        const normalizedCustomerStatus = (lead.customerStatus || '').toLowerCase();
        const isClosed = normalizedCustomerStatus.includes('won') || normalizedCustomerStatus.includes('lost') || normalizedCustomerStatus.includes('dead') || normalizedCustomerStatus.includes('rejected') || normalizedCustomerStatus.includes('customer') || normalizedCustomerStatus.includes('signed');
        const isHotLead = lead.customerStatus === 'Hot Lead';
        
        // Collect all activity dates
        let activityDates: Date[] = [];
        const leadActivities = allActivities.filter(act => act.leadId === lead.id && isManualActivity(act));
        if (leadActivities.length > 0) {
            activityDates = activityDates.concat(leadActivities.map(a => new Date(a.date)).filter(d => isValid(d)));
        }
        if (lead.emails && lead.emails.length > 0) {
            const manualEmails = lead.emails.filter(e => isManualEmail(e));
            activityDates = activityDates.concat(manualEmails.map(e => new Date(e.sentAt)).filter(d => isValid(d)));
        }

        if (activityDates.length > 0) {
            activityDates.sort((a, b) => a.getTime() - b.getTime());
            const firstAction = activityDates[0];
            const lastAction = activityDates[activityDates.length - 1];

            if (entered && isValid(entered) && firstAction.getTime() >= entered.getTime()) {
                const hoursToResponse = calculateBusinessHoursSydney(entered, firstAction);
                totalResponseTime += hoursToResponse;
                leadsWithResponseTime++;
            }

            if (!isClosed && calculateBusinessHoursSydney(lastAction, now) > 56) {
                staleLeadsList.push(lead);
            }
            
            if (isHotLead && calculateBusinessHoursSydney(lastAction, now) > 8) {
                overdueHotLeadsList.push(lead);
            }
        } else {
            // No activity
            if (!isClosed && entered && calculateBusinessHoursSydney(entered, now) > 56) {
                staleLeadsList.push(lead);
            }
            if (isHotLead && entered && calculateBusinessHoursSydney(entered, now) > 8) {
                overdueHotLeadsList.push(lead);
            }
        }
    });

    const avgResponseTime = leadsWithResponseTime > 0 ? totalResponseTime / leadsWithResponseTime : 0;

    const wonLeads = filteredLeads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed');
    const hotLeadsCount = filteredLeads.filter(l => l.customerStatus === 'Hot Lead').length;
    
    const wonCount = wonLeads.length;
    const quoteSentCount = filteredLeads.filter(l => l.customerStatus === 'Quote Sent').length;
    const conversionRate = totalInbound > 0 ? (wonCount / totalInbound) * 100 : 0;
    const hotLeadsRate = totalInbound > 0 ? (hotLeadsCount / totalInbound) * 100 : 0;

    const netsuiteStatusDist = filteredLeads.reduce((acc, l) => {
        const status = l.netsuiteLeadStatus || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const netsuiteStatusData = Object.entries(netsuiteStatusDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const customerStatusDist = filteredLeads.reduce((acc, l) => {
        const status = l.customerStatus || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const customerStatusData = Object.entries(customerStatusDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const leadTypeDist = filteredLeads.reduce((acc, l) => {
        const type = l.leadType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const leadTypeData = Object.entries(leadTypeDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const amDist = filteredLeads.reduce((acc, l) => {
        const am = l.accountManagerAssigned || 'Unassigned';
        acc[am] = (acc[am] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const amPerformanceData = Object.entries(amDist)
        .map(([name, total]) => {
            const amLeads = filteredLeads.filter(l => (l.accountManagerAssigned || 'Unassigned') === name);
            const amWon = amLeads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed').length;
            const amOverdue = amLeads.filter(l => overdueHotLeadsList.some(overdue => overdue.id === l.id)).length;
            return { name, 'Total Leads': total, 'Won': amWon, 'Overdue Leads': amOverdue };
        })
        .sort((a, b) => b['Total Leads'] - a['Total Leads']);

    const sourceDist = filteredLeads.reduce((acc, l) => {
        const source = l.customerSource || 'Other';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sourceData = Object.entries(sourceDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const franchiseeDist = filteredLeads.reduce((acc, l) => {
        const franchisee = l.franchisee || 'Unassigned';
        const status = l.customerStatus || 'Unknown';
        
        if (!acc[franchisee]) {
            acc[franchisee] = { total: 0, statuses: {} };
        }
        acc[franchisee].total += 1;
        acc[franchisee].statuses[status] = (acc[franchisee].statuses[status] || 0) + 1;
        
        return acc;
    }, {} as Record<string, { total: number, statuses: Record<string, number> }>);

    const franchiseeData = Object.entries(franchiseeDist)
        .map(([name, data]) => {
            return {
                name,
                value: data.total,
                labelTotal: 0, // Used for placing the total label
                percentage: totalInbound > 0 ? (data.total / totalInbound) * 100 : 0,
                ...data.statuses
            };
        })
        .sort((a, b) => b.value - a.value);

    const topFranchiseeData = franchiseeData.slice(0, 10);
    const franchiseeStatuses = Array.from(new Set(topFranchiseeData.flatMap(d => Object.keys(d).filter(k => k !== 'name' && k !== 'value' && k !== 'percentage' && k !== 'labelTotal'))));

    // Leads over time data
    const leadsByDate = filteredLeads.reduce((acc, l) => {
        const date = parseDateString(l.dateLeadEntered);
        if (date && !isWeekend(date)) {
            const dateStr = format(date, 'yyyy-MM-dd');
            acc[dateStr] = (acc[dateStr] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const leadsOverTimeData = Object.entries(leadsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(item => ({
            ...item,
            formattedDate: format(new Date(item.date), 'MMM dd')
        }));

    // Lead Funnel
    const funnelData = [
        { name: 'Total Inbound', value: totalInbound },
        { name: 'Hot Leads', value: hotLeadsCount },
        { name: 'Quote Sent', value: quoteSentCount },
        { name: 'Won Customers', value: wonCount }
    ];

    // Average Time to Close
    let totalCloseTime = 0;
    let closedLeadsWithTime = 0;

    wonLeads.forEach(lead => {
        let entered = parseDateString(lead.dateLeadEntered);
        if (!entered) return;
        
        let closeDate: Date | null = null;
        
        // 1. Check SCF links acceptedAt
        if (lead.scfLinks && lead.scfLinks.length > 0) {
            const acceptedLinks = lead.scfLinks.filter(l => l.status === 'Accepted' && l.acceptedAt);
            if (acceptedLinks.length > 0) {
                // sort by acceptedAt desc to get latest
                acceptedLinks.sort((a, b) => new Date(b.acceptedAt!).getTime() - new Date(a.acceptedAt!).getTime());
                closeDate = new Date(acceptedLinks[0].acceptedAt!);
            }
        }
        // 2. Fallback to SOF details signedAt
        if (!closeDate && lead.sofDetails?.signedAt) {
            closeDate = new Date(lead.sofDetails.signedAt);
        }

        if (closeDate && isValid(closeDate)) {
            const daysToClose = (closeDate.getTime() - entered.getTime()) / (1000 * 3600 * 24);
            if (daysToClose >= 0) {
                totalCloseTime += daysToClose;
                closedLeadsWithTime++;
            }
        }
    });
    
    const avgTimeToClose = closedLeadsWithTime > 0 ? totalCloseTime / closedLeadsWithTime : 0;

    // Geographic Distribution
    const geoDist = filteredLeads.reduce((acc, l) => {
        const state = (l as any).state || l.address?.state || (l as any).city || l.address?.city || 'Unknown';
        if (!state || state === 'Unknown') return acc;
        acc[state] = (acc[state] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const geoDistData = Object.entries(geoDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

    // Arrival Time (Business vs Off-Hours)
    let businessHoursCount = 0;
    let offHoursCount = 0;
    filteredLeads.forEach(lead => {
        const entered = parseDateString(lead.dateLeadEntered);
        if (entered && isValid(entered)) {
            if (isBusinessHoursSydney(entered)) {
                businessHoursCount++;
            } else {
                offHoursCount++;
            }
        }
    });
    
    const arrivalTimeData = [
        { name: 'Business Hours (9AM-5PM, M-F)', value: businessHoursCount },
        { name: 'Off-Hours / Weekends', value: offHoursCount }
    ];

    // Free Trial Journeys
    const isDateInRange = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        const d = parseDateString(dateStr);
        if (!d) return false;

        let fromDate: Date;
        let toDate: Date = new Date();
        toDate.setHours(23, 59, 59, 999);

        if (appliedFilters.dateEntered?.from) {
            fromDate = startOfDay(appliedFilters.dateEntered.from);
            if (appliedFilters.dateEntered.to) {
                toDate = endOfDay(appliedFilters.dateEntered.to);
            } else {
                toDate = endOfDay(appliedFilters.dateEntered.from);
            }
        } else {
            const defaultStart = new Date();
            defaultStart.setDate(defaultStart.getDate() - 30);
            fromDate = startOfDay(defaultStart);
        }

        return d >= fromDate && d <= toDate;
    };

    const shipmateTrialLeads: Lead[] = [];
    const localmileTrialLeads: Lead[] = [];
    const anyTrialLeads: Lead[] = [];

    filteredLeads.forEach(lead => {
        const leadActivities = allActivities.filter(act => act.leadId === lead.id);
        
        // ShipMate Trial Detection
        const hasShipMateTrialActivity = leadActivities.some(act => 
            (act.notes?.includes("Initiated ShipMate Trial") || act.notes?.includes("Status changed to Trialing ShipMate")) &&
            isDateInRange(act.date)
        );
        const isCurrentlyShipMate = lead.customerStatus === 'Trialing ShipMate';
        const startedShipMate = hasShipMateTrialActivity || (isCurrentlyShipMate && (!appliedFilters.dateEntered?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

        // LocalMile Trial Detection
        const hasLocalMileTrialActivity = leadActivities.some(act => 
            (act.notes?.includes("Initiated LocalMile Trial") || act.notes?.includes("Status changed to Trialing LocalMile") || act.notes?.includes("First LocalMile Job created")) &&
            isDateInRange(act.date)
        );
        const isCurrentlyLocalMile = lead.customerStatus === 'Trialing LocalMile' || lead.customerStatus === 'LocalMile Opportunity';
        const hasLocalMileFields = !!lead.firstJobCreatedAt || (lead.jobCount !== undefined && lead.jobCount > 0) || lead.localMileTrialsRemaining !== undefined;
        const startedLocalMile = hasLocalMileTrialActivity || ((isCurrentlyLocalMile || hasLocalMileFields) && (!appliedFilters.dateEntered?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

        if (startedShipMate) {
            shipmateTrialLeads.push(lead);
        }
        if (startedLocalMile) {
            localmileTrialLeads.push(lead);
        }
        if (startedShipMate || startedLocalMile || lead.customerStatus === 'Free Trial') {
            anyTrialLeads.push(lead);
        }
    });

    const isDirectSignup = (l: Lead) => {
        const sourceLower = (l.customerSource || '').toLowerCase();
        const hasWebSource = sourceLower.includes('website') || 
                             sourceLower.includes('web') || 
                             sourceLower.includes('self') || 
                             sourceLower.includes('direct') || 
                             sourceLower.includes('organic') || 
                             sourceLower.includes('form') || 
                             sourceLower.includes('registration') || 
                             sourceLower.includes('online');
        
        const hasInboundDetails = !!l.inboundDetails;
        
        const leadActivities = allActivities.filter(act => act.leadId === l.id);
        const hasPublicRegistrationNote = leadActivities.some(act => 
            act.notes?.toLowerCase().includes('public registration') || 
            act.notes?.toLowerCase().includes('website registration') || 
            act.notes?.toLowerCase().includes('via website') ||
            act.notes?.toLowerCase().includes('web signup')
        );

        const hasAMTrialInitiation = leadActivities.some(act => {
            const isAMAuthor = act.author && act.author !== 'System' && act.author !== 'Unknown' && act.author !== 'N/A';
            const isTrialNote = (act.notes?.includes("Initiated LocalMile Trial") || act.notes?.includes("Initiated ShipMate Trial") || act.notes?.includes("Status changed to Trialing")) && !act.notes?.includes("public registration link");
            return isAMAuthor && isTrialNote;
        });

        if (hasAMTrialInitiation) return false;
        if (hasWebSource || hasInboundDetails || hasPublicRegistrationNote) return true;

        const humanAMActivities = leadActivities.filter(act => isManualActivity(act) && act.author && act.author !== 'System' && act.author !== 'Unknown' && act.author !== 'N/A');
        if (humanAMActivities.length === 0) return true;

        return false;
    };

    const getJourneyBreakdown = (leads: Lead[]) => {
        const total = leads.length;
        const signed = leads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed').length;
        const lost = leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(l.customerStatus || '')).length;
        const trialing = leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.customerStatus || '')).length;
        const other = total - signed - lost - trialing;

        const directLeads = leads.filter(isDirectSignup);
        const amProcessedLeads = leads.filter(l => !isDirectSignup(l));
        
        return {
            total,
            signed,
            lost,
            trialing,
            other,
            signedRate: total > 0 ? (signed / total) * 100 : 0,
            lostRate: total > 0 ? (lost / total) * 100 : 0,
            amProcessedCount: amProcessedLeads.length,
            directCount: directLeads.length,
            amProcessedLeads,
            directLeads,
            leads
        };
    };

    const shipmateJourney = getJourneyBreakdown(shipmateTrialLeads);
    const localmileJourney = getJourneyBreakdown(localmileTrialLeads);
    const combinedJourney = getJourneyBreakdown(anyTrialLeads);

    // Inbound Lead Journey Velocity & Drop-offs
    let sumTimeToDropoff = 0;
    let dropoffCount = 0;
    const dropoffStages: Record<string, { count: number; totalDays: number }> = {};
    const dropoffStageLeads: Record<string, Lead[]> = {};

    const parseDurationToMinutes = (durationStr?: string): number => {
        if (!durationStr) return 0;
        let minutes = 0;
        const mMatch = durationStr.match(/(\d+)\s*m/i);
        if (mMatch) minutes += parseInt(mMatch[1], 10);
        const sMatch = durationStr.match(/(\d+)\s*s/i);
        if (sMatch) minutes += parseInt(sMatch[1], 10) / 60;
        
        if (durationStr.includes(':')) {
           const parts = durationStr.split(':').map(Number);
           if (parts.length === 3) {
               minutes += parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
           } else if (parts.length === 2) {
               minutes += parts[0] + (parts[1] || 0) / 60;
           }
        }
        
        if (minutes === 0 && durationStr && /^\d+$/.test(durationStr)) {
            minutes = parseInt(durationStr, 10) / 60;
        }
        
        return minutes;
    };

    // Map to accumulate rep efficiency & velocity metrics
    const amDataMap: Record<string, {
        totalLeads: number;
        activitiesCount: number;
        totalResponseHours: number;
        responseCount: number;
        totalDaysToWin: number;
        winCount: number;
        totalDaysToLoss: number;
        lossCount: number;
        callsWithIdCount: number;
        totalCallDurationMinutes: number;
    }> = {};

    filteredLeads.forEach(lead => {
        const leadActivities = allActivities.filter(a => a.leadId === lead.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const enteredDate = parseDateString(lead.dateLeadEntered);
        const isLost = ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(lead.customerStatus || '');

        // AM grouping initialization
        const am = lead.accountManagerAssigned || 'Unassigned';
        if (!amDataMap[am]) {
            amDataMap[am] = {
                totalLeads: 0,
                activitiesCount: 0,
                totalResponseHours: 0,
                responseCount: 0,
                totalDaysToWin: 0,
                winCount: 0,
                totalDaysToLoss: 0,
                lossCount: 0,
                callsWithIdCount: 0,
                totalCallDurationMinutes: 0
            };
        }
        const amStats = amDataMap[am];
        amStats.totalLeads += 1;

        // Call metrics with callId
        leadActivities.forEach(act => {
            if (act.type === 'Call' && act.callId) {
                amStats.callsWithIdCount += 1;
                amStats.totalCallDurationMinutes += parseDurationToMinutes(act.duration);
            }
        });

        // Activity Count per Lead per AM
        let leadEmailCount = 0;
        if (lead.emails && lead.emails.length > 0) {
            leadEmailCount = lead.emails.filter(e => isValid(new Date(e.sentAt))).length;
        }
        amStats.activitiesCount += leadActivities.length + leadEmailCount;

        // Response Time per AM
        let activityDates: Date[] = [];
        const manualLeadActivities = leadActivities.filter(act => isManualActivity(act));
        if (manualLeadActivities.length > 0) {
            activityDates = activityDates.concat(manualLeadActivities.map(a => new Date(a.date)).filter(d => isValid(d)));
        }
        if (lead.emails && lead.emails.length > 0) {
            const manualEmails = lead.emails.filter(e => isManualEmail(e));
            activityDates = activityDates.concat(manualEmails.map(e => new Date(e.sentAt)).filter(d => isValid(d)));
        }
        if (activityDates.length > 0 && enteredDate && isValid(enteredDate)) {
            activityDates.sort((a, b) => a.getTime() - b.getTime());
            const firstAction = activityDates[0];
            if (firstAction.getTime() >= enteredDate.getTime()) {
                const hoursToResponse = calculateBusinessHoursSydney(enteredDate, firstAction);
                amStats.totalResponseHours += hoursToResponse;
                amStats.responseCount += 1;
            }
        }

        // Win Velocity per AM
        const isWon = lead.customerStatus === 'Won' || lead.customerStatus === 'Signed';
        if (isWon && enteredDate) {
            let closeDate: Date | null = null;
            if (lead.scfLinks && lead.scfLinks.length > 0) {
                const acceptedLinks = lead.scfLinks.filter(l => l.status === 'Accepted' && l.acceptedAt);
                if (acceptedLinks.length > 0) {
                    acceptedLinks.sort((a, b) => new Date(b.acceptedAt!).getTime() - new Date(a.acceptedAt!).getTime());
                    closeDate = new Date(acceptedLinks[0].acceptedAt!);
                }
            }
            if (!closeDate && lead.sofDetails?.signedAt) {
                closeDate = new Date(lead.sofDetails.signedAt);
            }
            if (closeDate && isValid(closeDate)) {
                const daysToClose = (closeDate.getTime() - enteredDate.getTime()) / (1000 * 3600 * 24);
                if (daysToClose >= 0) {
                    amStats.totalDaysToWin += daysToClose;
                    amStats.winCount += 1;
                }
            }
        }

        if (isLost && enteredDate) {
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
                lostDate = new Date(lostActivity.date);

                for (let i = lostActivityIndex - 1; i >= 0; i--) {
                    const match = leadActivities[i].notes?.match(/Status changed to ([^(]+)/);
                    if (match && match[1]) {
                        const status = match[1].trim();
                        if (status !== 'Lost' && status !== 'Unqualified' && status !== 'Lost Customer') {
                            priorStatus = status;
                            break;
                        }
                    }
                }
            } else {
                const lastAct = leadActivities[leadActivities.length - 1];
                lostDate = lastAct ? new Date(lastAct.date) : enteredDate;
            }

            const timeToDropoff = (lostDate.getTime() - enteredDate.getTime()) / (1000 * 3600 * 24);
            if (timeToDropoff >= 0) {
                sumTimeToDropoff += timeToDropoff;
                dropoffCount++;

                // Loss Velocity per AM
                amStats.totalDaysToLoss += timeToDropoff;
                amStats.lossCount += 1;
            }

            const stageLabel = priorStatus === 'Won' ? 'In Progress' : priorStatus;
            if (!dropoffStages[stageLabel]) {
                dropoffStages[stageLabel] = { count: 0, totalDays: 0 };
            }
            dropoffStages[stageLabel].count += 1;
            dropoffStages[stageLabel].totalDays += timeToDropoff;

            if (!dropoffStageLeads[stageLabel]) {
                dropoffStageLeads[stageLabel] = [];
            }
            dropoffStageLeads[stageLabel].push(lead);
        }
    });

    const inboundJourneyStats = {
        avgTimeToDropoff: dropoffCount > 0 ? sumTimeToDropoff / dropoffCount : 0,
        dropoffCount,
        dropoffStagesData: Object.entries(dropoffStages).map(([name, data]) => ({
            name,
            value: data.count,
            avgDays: data.count > 0 ? parseFloat((data.totalDays / data.count).toFixed(1)) : 0
        })).sort((a, b) => b.value - a.value),
        dropoffStageLeads
    };

    const amEfficiencyData = Object.entries(amDataMap).map(([name, data]) => ({
        name,
        totalLeads: data.totalLeads,
        avgActivities: data.totalLeads > 0 ? parseFloat((data.activitiesCount / data.totalLeads).toFixed(1)) : 0,
        avgResponseTime: data.responseCount > 0 ? parseFloat((data.totalResponseHours / data.responseCount).toFixed(1)) : null,
        avgDaysToWin: data.winCount > 0 ? parseFloat((data.totalDaysToWin / data.winCount).toFixed(1)) : null,
        avgDaysToLoss: data.lossCount > 0 ? parseFloat((data.totalDaysToLoss / data.lossCount).toFixed(1)) : null,
        callsWithIdCount: data.callsWithIdCount,
        avgCallDuration: data.callsWithIdCount > 0 ? parseFloat((data.totalCallDurationMinutes / data.callsWithIdCount).toFixed(2)) : null
    })).sort((a, b) => b.totalLeads - a.totalLeads);

    // Calculate how long a lead stays at a particular status
    const statusTimes: Record<string, { totalDays: number; count: number }> = {};

    filteredLeads.forEach(lead => {
        const enteredDate = parseDateString(lead.dateLeadEntered);
        if (!enteredDate) return;

        const currentStatus = lead.customerStatus || 'New';

        const leadActivities = allActivities
            .filter(act => act.leadId === lead.id)
            .map(a => ({ date: new Date(a.date), notes: a.notes }))
            .filter(a => isValid(a.date));

        // Scan activities for status changes
        const statusActivities = leadActivities
            .map(act => {
                if (!act.notes) return null;
                const match = act.notes.match(/Status changed to ([^(]+)/);
                return match && match[1] ? { status: match[1].trim(), date: act.date } : null;
            })
            .filter((a): a is { status: string; date: Date } => a !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const timeline: { status: string; date: Date }[] = [];

        if (statusActivities.length === 0) {
            // No status changes recorded, assume it spent all time in current status
            timeline.push({ status: currentStatus, date: enteredDate });
        } else {
            // We have activities. The status before the first logged change was "New" (or if the first change is "New", then "New")
            timeline.push({ status: 'New', date: enteredDate });
            
            statusActivities.forEach(act => {
                // Only push if the status changes (prevent duplicate consecutive entries)
                if (timeline[timeline.length - 1].status !== act.status) {
                    timeline.push(act);
                }
            });

            // If the last status in timeline is not the current status, append current status starting at the last transition date
            if (timeline[timeline.length - 1].status !== currentStatus) {
                const lastDate = timeline[timeline.length - 1].date;
                timeline.push({ status: currentStatus, date: lastDate });
            }
        }

        // Sort timeline chronologically to be safe
        timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Compute durations between transitions
        for (let i = 0; i < timeline.length; i++) {
            const start = timeline[i];
            const end = timeline[i + 1] ? timeline[i + 1] : { date: new Date() };

            const diffMs = end.date.getTime() - start.date.getTime();
            const diffDays = Math.max(0, diffMs / (1000 * 3600 * 24));

            if (!statusTimes[start.status]) {
                statusTimes[start.status] = { totalDays: 0, count: 0 };
            }
            statusTimes[start.status].totalDays += diffDays;
            statusTimes[start.status].count += 1;
        }
    });

    const avgDurationByStatusData = Object.entries(statusTimes)
        .map(([name, data]) => ({
            name,
            value: parseFloat((data.totalDays / data.count).toFixed(1))
        }))
        .filter(item => {
            const normalized = item.name.toLowerCase();
            return normalized !== 'lost' && !normalized.includes('out of territory');
        })
        .sort((a, b) => b.value - a.value);

    const connectedOutcomes = [
      'Appointment Booked', 'Call Back/Follow-up', 'Email Interested',
      'Gatekeeper', 'Not Interested', 'Not a Fit', 'Qualified - Call Back/Send Info',
      'Reschedule', 'Unqualified Opportunity', 'Upsell', 'Future Follow-up',
      'DNC - Stop List', 'Empty / Closed', 'LOST - Duplicate', 'LOST - Existing Customer'
    ];

    const leadMapForCalls = new Map<string, Lead>(allLeads.map(l => [l.id, l]));
    const filteredLeadIds = new Set(filteredLeads.map(l => l.id));

    const seenTeamCallIds = new Set<string>();
    const filteredCalls = allActivities.filter(act => {
        if (act.type !== 'Call') return false;
        if (!filteredLeadIds.has(act.leadId)) return false;
        if (!isManualActivity(act)) return false;
        if (!isDateInRange(act.date)) return false;
        if (!act.callId || typeof act.callId !== 'string' || !act.callId.trim()) return false;

        const cleanCallId = act.callId.trim();
        if (seenTeamCallIds.has(cleanCallId)) return false;

        const notesLower = (act.notes || '').toLowerCase();
        const eventLower = (act.event || '').toLowerCase();
        if (notesLower.includes('initiated call') || notesLower.includes('initiating call') || eventLower.includes('initiated call')) return false;

        seenTeamCallIds.add(cleanCallId);
        return true;
    });
    const filteredAppointments = allAppointments.filter(a => isDateInRange(a.duedate || a.appointmentDate || a.createdAt) && filteredLeadIds.has(a.leadId));

    const getLeadAM = (l: Lead) => {
        const val = l.accountManagerAssigned;
        if (val && typeof val === 'string' && val.trim() && val !== 'System' && val !== 'Unknown' && val !== 'N/A') {
            return val.trim();
        }
        return 'Unassigned';
    };

    const allAMs = Array.from(new Set(
      filteredLeads.map(getLeadAM)
    )).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

    const amActionedLeadIdsMap = new Map<string, Set<string>>();
    allAMs.forEach(am => amActionedLeadIdsMap.set(am, new Set<string>()));

    const seenCallIdsForPerf = new Set<string>();
    allActivities.forEach(act => {
        if (!filteredLeadIds.has(act.leadId)) return;
        if (!isDateInRange(act.date)) return;
        if (!isManualActivity(act)) return;

        if (act.type === 'Call') {
            if (!act.callId || typeof act.callId !== 'string' || !act.callId.trim()) return;
            const cleanCallId = act.callId.trim();
            if (seenCallIdsForPerf.has(cleanCallId)) return;
            const notesLower = (act.notes || '').toLowerCase();
            const eventLower = (act.event || '').toLowerCase();
            if (notesLower.includes('initiated call') || notesLower.includes('initiating call') || eventLower.includes('initiated call')) return;
            seenCallIdsForPerf.add(cleanCallId);
        }

        let author = (act.author || '').trim();
        if (author.toLowerCase() === 'leeroy russell') author = 'Lee Russell';
        let matchedAM = allAMs.find(a => a.toLowerCase() === author.toLowerCase());
        if (!matchedAM && leadMapForCalls.has(act.leadId)) {
            const leadObj = leadMapForCalls.get(act.leadId)!;
            const assignedAM = getLeadAM(leadObj);
            if (allAMs.includes(assignedAM)) matchedAM = assignedAM;
        }

        if (matchedAM && matchedAM !== 'Unassigned') {
            amActionedLeadIdsMap.get(matchedAM)?.add(act.leadId);
        }
    });

    filteredLeads.forEach(lead => {
        if (lead.emails && lead.emails.length > 0) {
            lead.emails.forEach(email => {
                if (isManualEmail(email) && isDateInRange(email.sentAt)) {
                    const senderName = email.sender || lead.accountManagerAssigned;
                    let author = (senderName || '').trim();
                    if (author.toLowerCase() === 'leeroy russell') author = 'Lee Russell';
                    let matchedAM = allAMs.find(a => a.toLowerCase() === author.toLowerCase());
                    if (!matchedAM) {
                        const assignedAM = getLeadAM(lead);
                        if (allAMs.includes(assignedAM)) matchedAM = assignedAM;
                    }
                    if (matchedAM && matchedAM !== 'Unassigned') {
                        amActionedLeadIdsMap.get(matchedAM)?.add(lead.id);
                    }
                }
            });
        }
    });

    const activePipelineStatuses = ['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'];

    const teamPerformanceData = allAMs.map(dialer => {
      const dialerInboundLeads = filteredLeads.filter(l => getLeadAM(l) === dialer);
      const dialerInboundLeadIds = new Set(dialerInboundLeads.map(l => l.id));

      const dialerCallsList = filteredCalls.filter(c => dialerInboundLeadIds.has(c.leadId) || c.author === dialer);
      const dialerCalls = dialerCallsList.length;
      const dialerLeadsCalled = new Set(dialerCallsList.map(c => c.leadId)).size;
      const avgAttempts = dialerLeadsCalled > 0 ? dialerCalls / dialerLeadsCalled : 0;
      
      const dialerConnectedCalls = dialerCallsList.filter(c => connectedOutcomes.includes((c as any).outcome)).length;
      const connectRate = dialerCalls > 0 ? (dialerConnectedCalls / dialerCalls) * 100 : 0;

      const lmOppLeads = dialerInboundLeads.filter(l => l.customerStatus === 'LocalMile Opportunity');
      const lmOppCount = lmOppLeads.length;
      const lmOppCallRate = dialerCalls > 0 ? (lmOppCount / dialerCalls) * 100 : 0;

      const lmPendingLeads = dialerInboundLeads.filter(l => l.customerStatus === 'LocalMile Pending');
      const lmPendingCount = lmPendingLeads.length;
      const lmPendingCallRate = dialerCalls > 0 ? (lmPendingCount / dialerCalls) * 100 : 0;

      const trialingLMLeads = localmileTrialLeads.filter(l => getLeadAM(l) === dialer);
      const trialingLMCount = trialingLMLeads.length;
      const trialingLMCallRate = dialerCalls > 0 ? (trialingLMCount / dialerCalls) * 100 : 0;

      const dialerAppointments = filteredAppointments.filter(a => dialerInboundLeadIds.has(a.leadId) || a.dialerAssigned === dialer || a.amName === dialer || a.assignedTo === dialer).length;
      const dialerQuotes = dialerInboundLeads.filter(l => l.customerStatus === 'Prospect Opportunity' || l.customerStatus === 'Quote Sent').length;
      const dialerTrials = anyTrialLeads.filter(l => getLeadAM(l) === dialer).length;
      const dialerWon = dialerInboundLeads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed').length;

      const dialerActionedSet = amActionedLeadIdsMap.get(dialer) || new Set<string>();

      const dialerOutsidePipelineLeads = dialerInboundLeads.filter(l => !activePipelineStatuses.includes(l.customerStatus || ''));
      const dialerOutsidePipeline = dialerOutsidePipelineLeads.length;

      const dialerProcessedLeads = dialerInboundLeads.filter(l => activePipelineStatuses.includes(l.customerStatus || '') && dialerActionedSet.has(l.id));
      const dialerLeadsProcessed = dialerProcessedLeads.length;

      const dialerStillInPipelineLeads = dialerInboundLeads.filter(l => activePipelineStatuses.includes(l.customerStatus || '') && !dialerActionedSet.has(l.id));
      const dialerStillInPipeline = dialerStillInPipelineLeads.length;

      return { 
        name: dialer, 
        'Total Engagement': dialerCalls, 
        'Leads Processed': dialerLeadsProcessed,
        'Outside Pipeline': dialerOutsidePipeline,
        'Still In Pipeline': dialerStillInPipeline,
        'Avg Attempts': avgAttempts,
        'Connect Rate': connectRate,
        'Appointments': dialerAppointments,
        'Quotes Sent': dialerQuotes,
        'LM Opportunity': lmOppCount,
        'LM Opportunity Rate': lmOppCallRate,
        'LM Pending': lmPendingCount,
        'LM Pending Rate': lmPendingCallRate,
        'Trialing LocalMile': trialingLMCount,
        'Trialing LocalMile Rate': trialingLMCallRate,
        'ShipMate / LocalMile Trials': dialerTrials,
        'Signed Customers': dialerWon
      };
    });

    const totalTeamCalls = teamPerformanceData.reduce((acc, d) => acc + d['Total Engagement'], 0);
    const totalLeadsProcessed = teamPerformanceData.reduce((acc, d) => acc + d['Leads Processed'], 0);
    const totalAvgAttempts = totalLeadsProcessed > 0 ? totalTeamCalls / totalLeadsProcessed : 0;
    const totalConnectedCalls = allAMs.reduce((acc, dialer) => {
      const dialerCallsList = filteredCalls.filter(c => c.author === dialer);
      return acc + dialerCallsList.filter(c => connectedOutcomes.includes((c as any).outcome)).length;
    }, 0);
    const totalConnectRate = totalTeamCalls > 0 ? (totalConnectedCalls / totalTeamCalls) * 100 : 0;
    const totalAppts = teamPerformanceData.reduce((acc, d) => acc + d.Appointments, 0);
    const totalQuotes = teamPerformanceData.reduce((acc, d) => acc + d['Quotes Sent'], 0);
    const totalLMOpp = teamPerformanceData.reduce((acc, d) => acc + d['LM Opportunity'], 0);
    const totalLMOppRate = totalTeamCalls > 0 ? (totalLMOpp / totalTeamCalls) * 100 : 0;
    const totalLMPending = teamPerformanceData.reduce((acc, d) => acc + d['LM Pending'], 0);
    const totalLMPendingRate = totalTeamCalls > 0 ? (totalLMPending / totalTeamCalls) * 100 : 0;
    const totalTrialingLM = teamPerformanceData.reduce((acc, d) => acc + d['Trialing LocalMile'], 0);
    const totalTrialingLMRate = totalTeamCalls > 0 ? (totalTrialingLM / totalTeamCalls) * 100 : 0;
    const totalTrials = teamPerformanceData.reduce((acc, d) => acc + d['ShipMate / LocalMile Trials'], 0);
    const totalOutsidePipeline = teamPerformanceData.reduce((acc, d) => acc + d['Outside Pipeline'], 0);
    const totalInPipeline = teamPerformanceData.reduce((acc, d) => acc + d['Still In Pipeline'], 0);
    const totalWon = teamPerformanceData.reduce((acc, d) => acc + d['Signed Customers'], 0);

    const teamPerformanceTotals = {
      name: 'Total',
      'Total Engagement': totalTeamCalls,
      'Leads Processed': totalLeadsProcessed,
      'Outside Pipeline': totalOutsidePipeline,
      'Still In Pipeline': totalInPipeline,
      'Avg Attempts': totalAvgAttempts,
      'Connect Rate': totalConnectRate,
      Appointments: totalAppts,
      'Quotes Sent': totalQuotes,
      'LM Opportunity': totalLMOpp,
      'LM Opportunity Rate': totalLMOppRate,
      'LM Pending': totalLMPending,
      'LM Pending Rate': totalLMPendingRate,
      'Trialing LocalMile': totalTrialingLM,
      'Trialing LocalMile Rate': totalTrialingLMRate,
      'ShipMate / LocalMile Trials': totalTrials,
      'Signed Customers': totalWon
    };

    // Daily Account Manager Activity Breakdown (all manual activity types)
    const activeAMsList = allAMs.filter(am => {
        if (appliedFilters.accountManagerAssigned.length > 0) {
            return appliedFilters.accountManagerAssigned.includes(am);
        }
        return true;
    });

    let actStartDate: Date;
    let actEndDate: Date = new Date();
    actEndDate.setHours(23, 59, 59, 999);

    if (appliedFilters.dateEntered?.from) {
        actStartDate = startOfDay(appliedFilters.dateEntered.from);
        if (appliedFilters.dateEntered.to) {
            actEndDate = endOfDay(appliedFilters.dateEntered.to);
        } else {
            actEndDate = endOfDay(appliedFilters.dateEntered.from);
        }
    } else {
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 30);
        actStartDate = startOfDay(defaultStart);
    }

    const dailyAMDates: Date[] = [];
    let currAMDate = new Date(actStartDate);
    currAMDate.setHours(0, 0, 0, 0);

    while (currAMDate <= actEndDate) {
        if (!isWeekend(currAMDate)) {
            dailyAMDates.push(new Date(currAMDate));
        }
        currAMDate.setDate(currAMDate.getDate() + 1);
    }

    const dailyAMMap = new Map<string, {
        totalLeadsSet: Set<string>;
        totalActionsCount: number;
        amLeadsMap: Map<string, Set<string>>;
        amActionsMap: Map<string, number>;
        typeActionsMap: Map<string, number>;
    }>();

    dailyAMDates.forEach(d => {
        const key = format(d, 'yyyy-MM-dd');
        dailyAMMap.set(key, {
            totalLeadsSet: new Set<string>(),
            totalActionsCount: 0,
            amLeadsMap: new Map(),
            amActionsMap: new Map(),
            typeActionsMap: new Map(),
        });
    });

    const recordAMActivity = (dateStr: string | undefined, type: string, authorName: string | undefined, leadId: string) => {
        if (!dateStr || !leadId) return;
        const actDate = parseDateString(dateStr);
        if (!actDate || isWeekend(actDate)) return;
        const dateKey = format(actDate, 'yyyy-MM-dd');
        const dayData = dailyAMMap.get(dateKey);
        if (!dayData) return;

        let author = (authorName || '').trim();
        if (author.toLowerCase() === 'leeroy russell') {
            author = 'Lee Russell';
        }

        let matchedAM = activeAMsList.find(a => a.toLowerCase() === author.toLowerCase());
        
        if (!matchedAM && leadMapForCalls.has(leadId)) {
            const leadObj = leadMapForCalls.get(leadId)!;
            const assignedAM = getLeadAM(leadObj);
            if (activeAMsList.includes(assignedAM)) {
                matchedAM = assignedAM;
            }
        }

        if (!matchedAM || matchedAM === 'Unassigned') return;

        dayData.totalLeadsSet.add(leadId);
        dayData.totalActionsCount += 1;

        if (!dayData.amLeadsMap.has(matchedAM)) {
            dayData.amLeadsMap.set(matchedAM, new Set());
        }
        dayData.amLeadsMap.get(matchedAM)!.add(leadId);

        const prevAMCount = dayData.amActionsMap.get(matchedAM) || 0;
        dayData.amActionsMap.set(matchedAM, prevAMCount + 1);

        let categoryType = type || 'Update';
        if (categoryType !== 'Call' && categoryType !== 'Email' && categoryType !== 'Meeting') {
            categoryType = 'Update';
        }
        const prevTypeCount = dayData.typeActionsMap.get(categoryType) || 0;
        dayData.typeActionsMap.set(categoryType, prevTypeCount + 1);
    };

    const seenCallIds = new Set<string>();

    allActivities.forEach(act => {
        if (!filteredLeadIds.has(act.leadId)) return;
        if (!isDateInRange(act.date)) return;
        if (!isManualActivity(act)) return;

        if (act.type === 'Call') {
            if (!act.callId || typeof act.callId !== 'string' || !act.callId.trim()) return;

            const cleanCallId = act.callId.trim();
            if (seenCallIds.has(cleanCallId)) return;

            const notesLower = (act.notes || '').toLowerCase();
            const eventLower = (act.event || '').toLowerCase();
            if (notesLower.includes('initiated call') || notesLower.includes('initiating call') || eventLower.includes('initiated call')) return;

            seenCallIds.add(cleanCallId);
        }

        recordAMActivity(act.date, act.type || 'Activity', act.author, act.leadId);
    });

    filteredLeads.forEach(lead => {
        if (lead.emails && lead.emails.length > 0) {
            lead.emails.forEach(email => {
                if (isManualEmail(email)) {
                    const senderName = email.sender || lead.accountManagerAssigned;
                    recordAMActivity(email.sentAt, 'Email', senderName, lead.id);
                }
            });
        }
    });

    const dailyAMActivityChartData = dailyAMDates.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const displayDate = format(d, 'MMM dd');
        const fullFormattedDate = format(d, 'EEEE, MMM d, yyyy');
        const dayData = dailyAMMap.get(key)!;

        const row: Record<string, any> = {
            date: displayDate,
            fullDate: key,
            formattedDate: fullFormattedDate,
            'Total Actions': dayData.totalActionsCount,
            'Total Leads Actioned': dayData.totalLeadsSet.size,
            'Calls': dayData.typeActionsMap.get('Call') || 0,
            'Emails': dayData.typeActionsMap.get('Email') || 0,
            'Meetings': dayData.typeActionsMap.get('Meeting') || 0,
            'Updates': dayData.typeActionsMap.get('Update') || 0,
        };

        activeAMsList.forEach(am => {
            const leadSet = dayData.amLeadsMap.get(am) || new Set();
            row[am] = dayData.amActionsMap.get(am) || 0;
            row[`${am}_unique`] = leadSet.size;
            row[`${am}_leadIds`] = Array.from(leadSet);
        });
        row['total_leadIds'] = Array.from(dayData.totalLeadsSet);

        return row;
    });

    const amPeriodTotalsMap = new Map<string, number>();
    activeAMsList.forEach(am => amPeriodTotalsMap.set(am, 0));
    dailyAMActivityChartData.forEach(row => {
        activeAMsList.forEach(am => {
            const count = row[am] || 0;
            amPeriodTotalsMap.set(am, (amPeriodTotalsMap.get(am) || 0) + count);
        });
    });

    const totalAMActionsPeriod = dailyAMActivityChartData.reduce((sum, r) => sum + (r['Total Actions'] || 0), 0);
    const totalCallsPeriod = dailyAMActivityChartData.reduce((sum, r) => sum + (r.Calls || 0), 0);
    const totalEmailsPeriod = dailyAMActivityChartData.reduce((sum, r) => sum + (r.Emails || 0), 0);
    const totalMeetingsPeriod = dailyAMActivityChartData.reduce((sum, r) => sum + (r.Meetings || 0), 0);
    const totalUpdatesPeriod = dailyAMActivityChartData.reduce((sum, r) => sum + (r.Updates || 0), 0);

    const totalUniqueLeadsPeriod = new Set(
        dailyAMActivityChartData.flatMap(r => r.total_leadIds || [])
    ).size;
    const activeAMsWithActivity = activeAMsList.filter(am => (amPeriodTotalsMap.get(am) || 0) > 0);

    const activeDaysCount = dailyAMDates.filter(d => {
        const key = format(d, 'yyyy-MM-dd');
        return (dailyAMMap.get(key)?.totalActionsCount || 0) > 0;
    }).length;

    const avgDailyActionsPerAM = (activeDaysCount > 0 && activeAMsWithActivity.length > 0)
        ? (totalAMActionsPeriod / (activeDaysCount * activeAMsWithActivity.length)).toFixed(1)
        : '0.0';

    const avgDailyUniqueLeadsPerAM = (activeDaysCount > 0 && activeAMsWithActivity.length > 0)
        ? (totalUniqueLeadsPeriod / (activeDaysCount * activeAMsWithActivity.length)).toFixed(1)
        : '0.0';

    const amPeriodUniqueLeadsMap = new Map<string, Set<string>>();
    activeAMsList.forEach(am => amPeriodUniqueLeadsMap.set(am, new Set<string>()));
    dailyAMActivityChartData.forEach(row => {
        activeAMsList.forEach(am => {
            const leadIds: string[] = row[`${am}_leadIds`] || [];
            const amSet = amPeriodUniqueLeadsMap.get(am);
            if (amSet) {
                leadIds.forEach(id => amSet.add(id));
            }
        });
    });

    let topAMName = 'N/A';
    let maxAMUniqueLeadsCount = 0;
    let maxAMActionsCount = 0;
    amPeriodTotalsMap.forEach((cnt, am) => {
        if (cnt > maxAMActionsCount) {
            maxAMActionsCount = cnt;
        }
    });

    amPeriodUniqueLeadsMap.forEach((leadSet, am) => {
        if (leadSet.size > maxAMUniqueLeadsCount) {
            maxAMUniqueLeadsCount = leadSet.size;
            topAMName = am;
        }
    });

    const dailyAMActivity = {
        chartData: dailyAMActivityChartData,
        amsList: activeAMsWithActivity,
        totalAMActionsPeriod,
        totalCallsPeriod,
        totalEmailsPeriod,
        totalMeetingsPeriod,
        totalUpdatesPeriod,
        totalUniqueLeadsPeriod,
        avgDailyActionsPerAM,
        avgDailyUniqueLeadsPerAM,
        topAMName,
        maxAMUniqueLeadsCount,
        maxAMActionsCount,
        activeAMsCount: activeAMsWithActivity.length,
        amPeriodTotalsMap,
    };

    return {
        inboundJourneyStats,
        shipmateJourney,
        localmileJourney,
        combinedJourney,
        totalInbound,
        wonCount,
        hotLeadsCount,
        quoteSentCount,
        conversionRate,
        hotLeadsRate,
        netsuiteStatusData,
        customerStatusData,
        leadTypeData,
        franchiseeData,
        topFranchiseeData,
        amPerformanceData,
        sourceData,
        leadsOverTimeData,
        franchiseeStatuses,
        funnelData,
        avgTimeToClose,
        avgResponseTime,
        staleLeadsList,
        overdueHotLeadsList,
        geoDistData,
        arrivalTimeData,
        avgDurationByStatusData,
        amEfficiencyData,
        teamPerformanceData,
        teamPerformanceTotals,
        dailyAMActivity,
        amActionedLeadIdsMap
    };
  }, [filteredLeads, allActivities, allAppointments, allUsers, appliedFilters]);

  const drillDownAvailableStatuses = useMemo(() => {
    if (!drillDownData) return [];
    const statuses = new Set(drillDownData.leads.map(l => l.customerStatus || 'Unknown'));
    return Array.from(statuses).sort();
  }, [drillDownData]);

  const filteredDrillDownLeads = useMemo(() => {
    if (!drillDownData) return [];
    let leads = drillDownData.leads;
    if (drillDownStatusFilter !== "all") {
        leads = leads.filter(l => {
            const status = l.customerStatus || 'Unknown';
            return status === drillDownStatusFilter;
        });
    }
    if (drillDownData.title === 'Hot Leads' && drillDownSlaFilter !== "all") {
        leads = leads.filter(l => {
            const isOverdue = stats.overdueHotLeadsList.some(overdue => overdue.id === l.id);
            if (drillDownSlaFilter === 'overdue') return isOverdue;
            if (drillDownSlaFilter === 'on_track') return !isOverdue;
            return true;
        });
    }
    if (drillDownSearchQuery.trim() !== "") {
        const query = drillDownSearchQuery.toLowerCase();
        leads = leads.filter(l => 
            (l.companyName || "").toLowerCase().includes(query)
        );
    }
    return leads;
  }, [drillDownData, drillDownStatusFilter, drillDownSlaFilter, drillDownSearchQuery, stats.overdueHotLeadsList]);

  const handleExportData = (data: any[], filename: string) => {
    if (data.length === 0) {
        toast({ title: 'No Data', description: 'The dataset is empty.' });
        return;
    }
    const headers = Object.keys(data[0]);
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvRows = data.map(item => headers.map(h => escapeCsv(item[h])).join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const customerStatusOptions: Option[] = useMemo(() => {
    const statuses = new Set(allLeads.map(l => l.customerStatus).filter(Boolean));
    return Array.from(statuses).map(s => ({ value: s as string, label: s as string }));
  }, [allLeads]);

  const amOptions: Option[] = useMemo(() => {
    const ams = new Set(allLeads.map(l => l.accountManagerAssigned).filter(Boolean));
    return Array.from(ams).map(r => ({ value: r as string, label: r as string }));
  }, [allLeads]);

  const sourceOptions: Option[] = useMemo(() => {
    const sources = new Set(allLeads.map(l => l.customerSource).filter(Boolean));
    return Array.from(sources).map(s => ({ value: s as string, label: s as string }));
  }, [allLeads]);

  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f as string, label: f as string }));
  }, [allLeads]);

  if (loading || authLoading || loadingPermissions || !userProfile) {
    return (
      <PercentageLoader 
        value={fetchProgress}
        label="Loading Inbound Leads Performance" 
        sublabel="Fetching lead volume over time & Account Manager activity..." 
        minHeight="min-h-[220px]" 
      />
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the Inbound Reporting page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!hideHeaderAndFilters && (
        <>
          <header>
              <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                      <Inbox className="h-6 w-6 text-primary" />
                      <h1 className="text-3xl font-bold tracking-tight">Inbound Reporting</h1>
                  </div>
                  <StatusOutcomeGuideButton />
              </div>
              <p className="text-muted-foreground">Lead performance and status tracking for NetSuite Inbound leads.</p>
          </header>

          <StatusOutcomeBanner />
          
          <Collapsible defaultOpen={false}>
            <Card id="step-inbound-filters">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:px-6">
                  <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-muted-foreground" /><CardTitle className="text-lg font-bold leading-none">Filters</CardTitle></div>
                  <div className="flex items-center gap-2">
                      <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                      </Button>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust</Button>
                      </CollapsibleTrigger>
                  </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Date Preset</Label>
                        <Select value={datePreset} onValueChange={applyPreset}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="this_week">This Week</SelectItem>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="last_month">Last Month</SelectItem>
                                <SelectItem value="all_time">All Time</SelectItem>
                                <SelectItem value="custom" disabled>Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Date Entered</Label>
                        <div className="relative w-full">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full h-10 pl-3 pr-8 py-2 justify-start text-left font-normal text-xs md:text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                        <CalendarIconLucide className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {filters.dateEntered?.from ? (
                                                filters.dateEntered.to ? (
                                                    <>{format(filters.dateEntered.from, "LLL dd, y")} - {format(filters.dateEntered.to, "LLL dd, y")}</>
                                                ) : format(filters.dateEntered.from, "LLL dd, y")
                                            ) : (
                                                "Pick a date range"
                                            )}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={filters.dateEntered} onSelect={(date) => handleFilterChange('dateEntered', date)} initialFocus />
                                </PopoverContent>
                            </Popover>
                            {filters.dateEntered && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFilterChange('dateEntered', undefined);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                    title="Clear date filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Manager Assigned</Label>
                        <MultiSelectCombobox 
                            options={amOptions} 
                            selected={filters.accountManagerAssigned} 
                            onSelectedChange={(val) => handleFilterChange('accountManagerAssigned', val)} 
                            placeholder="Select AMs..." 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <MultiSelectCombobox 
                            options={customerStatusOptions} 
                            selected={filters.customerStatus} 
                            onSelectedChange={(val) => handleFilterChange('customerStatus', val)} 
                            placeholder="Select statuses..." 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Lead Source</Label>
                        <MultiSelectCombobox 
                            options={sourceOptions} 
                            selected={filters.source} 
                            onSelectedChange={(val) => handleFilterChange('source', val)} 
                            placeholder="Select sources..." 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Franchisee</Label>
                        <MultiSelectCombobox 
                            options={franchiseeOptions} 
                            selected={filters.franchisee} 
                            onSelectedChange={(val) => handleFilterChange('franchisee', val)} 
                            placeholder="Select franchisees..." 
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <Button variant="ghost" onClick={clearFilters} className="h-9 text-xs"><X className="mr-2 h-4 w-4"/> Clear Filters</Button>
                    <div className="flex items-center gap-3">
                        {hasUnappliedFilters && (
                            <span className="text-xs text-amber-600 font-medium animate-pulse">
                                Pending changes...
                            </span>
                        )}
                        <Button 
                            onClick={applyFilters} 
                            className={cn(
                                "h-9 text-xs font-semibold px-4 transition-all duration-200",
                                hasUnappliedFilters 
                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md scale-105" 
                                    : "bg-[#095c7b] hover:bg-[#095c7b]/90 text-white"
                            )}
                        >
                            <Filter className="mr-2 h-3 w-3"/> Apply Filters
                        </Button>
                    </div>
                </div>
            </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {!error && (
          <div className="space-y-6">
            {!visibleSections && (
            <div id="step-inbound-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Inbound" 
                    value={stats.totalInbound} 
                    icon={Inbox} 
                    description="Total in period" 
                    onClick={() => setDrillDownData({ title: "Total Inbound Leads", leads: filteredLeads })}
                    helpContent="Total number of unique, non-duplicate inbound leads matching your active filters. Excludes duplicate lead entries."
                />
                <StatCard 
                    title="Hot Leads" 
                    value={stats.hotLeadsCount} 
                    icon={Target} 
                    description={
                        <span className="flex items-center gap-1">
                            {`${stats.hotLeadsRate.toFixed(1)}% of total`}
                            <span className={`font-medium ml-1 ${stats.overdueHotLeadsList.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                ({stats.overdueHotLeadsList.length} Overdue)
                            </span>
                        </span>
                    }
                    onClick={() => setDrillDownData({ 
                        title: "Hot Leads", 
                        leads: filteredLeads.filter(l => l.customerStatus === 'Hot Lead') 
                    })}
                    helpContent="Inbound leads categorized with 'Hot Lead' customer status. Overdue leads are hot leads where the last activity (or lead entry) was more than 8 business hours ago."
                />
                <StatCard 
                    title="Won Customers" 
                    value={stats.wonCount} 
                    icon={Star} 
                    description={`${stats.conversionRate.toFixed(1)}% conversion`}
                    onClick={() => setDrillDownData({ 
                        title: "Won Customers", 
                        leads: filteredLeads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed') 
                    })}
                    helpContent="Total number of leads converted to signed customers (Status is 'Won' or 'Signed')."
                />
                <StatCard 
                    title="Stale Leads" 
                    value={stats.staleLeadsList.length} 
                    icon={AlertCircle} 
                    description="No action in 7 business days" 
                    onClick={() => setDrillDownData({ 
                        title: "Stale Leads", 
                        leads: stats.staleLeadsList
                    })}
                    helpContent="Inbound leads that have been in an open, non-closed status for more than 56 business hours (7 working days, 9am-5pm Mon-Fri Sydney time) without any manual activities or emails logged."
                />
                <StatCard 
                    title="Avg Time to Close" 
                    value={`${stats.avgTimeToClose.toFixed(1)} d`} 
                    icon={Clock} 
                    description="Lead creation to Won" 
                    helpContent="Average calendar days to turn a lead into a signed customer. Calculated from the lead's entry date to the Service Commencement Form (SCF) acceptance date or Sign-off Form (SOF) signature date."
                />
                <StatCard 
                    title="Avg Response Time" 
                    value={`${stats.avgResponseTime.toFixed(1)} h`} 
                    icon={User} 
                    description="Time to first action" 
                    onClick={() => setDrillDownData({ 
                        title: "Avg Response Time Leads", 
                        leads: filteredLeads.filter(lead => {
                            const entered = parseDateString(lead.dateLeadEntered);
                            if (!entered || !isValid(entered)) return false;
                            
                            let activityDates: Date[] = [];
                            const leadActivities = allActivities.filter(act => act.leadId === lead.id && isManualActivity(act));
                            if (leadActivities.length > 0) {
                                activityDates = activityDates.concat(leadActivities.map(a => new Date(a.date)).filter(d => isValid(d)));
                            }
                            if (lead.emails && lead.emails.length > 0) {
                                const manualEmails = lead.emails.filter(e => isManualEmail(e));
                                activityDates = activityDates.concat(manualEmails.map(e => new Date(e.sentAt)).filter(d => isValid(d)));
                            }
                            
                            if (activityDates.length > 0) {
                                activityDates.sort((a, b) => a.getTime() - b.getTime());
                                const firstAction = activityDates[0];
                                return firstAction.getTime() >= entered.getTime();
                            }
                            return false;
                        })
                    })}
                    helpContent="Average hours to perform the first manual action (activity or email) on a lead, calculated using Sydney business hours (9:00 AM - 5:00 PM, Mon-Fri, excluding weekends)."
                />
                <StatCard 
                    title="Quote Sent" 
                    value={stats.quoteSentCount} 
                    icon={Quote} 
                    description="Waiting for acceptance" 
                    onClick={() => setDrillDownData({ 
                        title: "Quote Sent Leads", 
                        leads: filteredLeads.filter(l => l.customerStatus === 'Quote Sent') 
                    })}
                    helpContent="Leads currently in 'Quote Sent' customer status, awaiting client acceptance."
                />
                <StatCard title="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} icon={TrendingUp} description="Won / Total" helpContent="Percentage of total inbound leads that converted to Won Customers. Calculated as: (Won Customers / Total Inbound) × 100." />
                <StatCard title="Hot Leads Rate" value={`${stats.hotLeadsRate.toFixed(1)}%`} icon={Percent} description="Hot Leads / Total" helpContent="Percentage of total inbound leads categorized as Hot Leads. Calculated as: (Hot Leads / Total Inbound) × 100." />
                <StatCard 
                    title="LocalMile Trials" 
                    value={stats.localmileJourney.total} 
                    icon={Zap} 
                    description="Active / Total LocalMile trials" 
                    onClick={() => setDrillDownData({ 
                        title: "LocalMile Trial Leads", 
                        leads: stats.localmileJourney.leads 
                    })}
                    helpContent="Total inbound leads that started a LocalMile trial in this period."
                />
                <StatCard 
                    title="ShipMate Trials" 
                    value={stats.shipmateJourney.total} 
                    icon={Package} 
                    description="Active / Total ShipMate trials" 
                    onClick={() => setDrillDownData({ 
                        title: "ShipMate Trial Leads", 
                        leads: stats.shipmateJourney.leads 
                    })}
                    helpContent="Total inbound leads that started a ShipMate trial in this period."
                />
            </div>
            )}

            {/* Leads Volume Over Time & Geographic Distribution */}
            {(!visibleSections || visibleSections.includes('leads-volume') || visibleSections.includes('geo-dist')) && (
            <div className={visibleSections ? "flex flex-col gap-6 mt-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6"}>
                {(!visibleSections || visibleSections.includes('leads-volume')) && (
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Leads Volume Over Time</span>
                                    <SectionHelp content="Daily volume of inbound leads received in the selected date range to identify spikes or trends in lead acquisition." />
                                </CardTitle>
                                <CardDescription>Number of inbound leads received by date.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.leadsOverTimeData, 'leads_over_time')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.leadsOverTimeData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.leadsOverTimeData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis 
                                            dataKey="formattedDate" 
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis 
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line 
                                            type="monotone" 
                                            dataKey="count" 
                                            name="New Leads"
                                            stroke="#0ea5e9" 
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: "#0ea5e9" }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No time-series data available.</div>
                        )}
                    </CardContent>
                </Card>
                )}

                {(!visibleSections || visibleSections.includes('geo-dist')) && (
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Geographic Distribution (Top 10)</span>
                                    <SectionHelp content="Distribution of inbound leads across states or regions based on the lead's address." />
                                </CardTitle>
                                <CardDescription>Inbound leads received by State/Region.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.geoDistData, 'geo_distribution')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.geoDistData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.geoDistData} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No location data available.</div>
                        )}
                    </CardContent>
                </Card>
                )}
            </div>
            )}

            {/* Daily Account Manager Activity */}
            {(!visibleSections || visibleSections.includes('am-activity')) && (
            <Card id="step-report-am-daily-activity" className="mt-6 shadow-md border-primary/10">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <ActivityIcon className="h-5 w-5 text-[#095c7b]" />
                                <span>Daily Account Manager Activity</span>
                                <SectionHelp content="Day-by-day activity trend across all manual activity types (Calls, Emails, Meetings, Updates) performed by Account Managers on Inbound leads." />
                            </CardTitle>
                            <CardDescription>
                                Monitor daily touchpoints, emails, calls, and actions performed by Account Managers.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Metric Mode Toggle */}
                            <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
                                <Button
                                    variant={amDailyMetricMode === 'by_am_unique' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs font-medium px-3 ${amDailyMetricMode === 'by_am_unique' ? 'bg-[#9a6428] text-white hover:bg-[#83531f]' : ''}`}
                                    onClick={() => setAmDailyMetricMode('by_am_unique')}
                                >
                                    Unique Leads
                                </Button>
                                <Button
                                    variant={amDailyMetricMode === 'by_am' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs font-medium px-3 ${amDailyMetricMode === 'by_am' ? 'bg-[#9a6428] text-white hover:bg-[#83531f]' : ''}`}
                                    onClick={() => setAmDailyMetricMode('by_am')}
                                >
                                    Total Actions
                                </Button>
                            </div>

                            {/* View Mode Toggle (Chart vs Table) */}
                            <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
                                <Button
                                    variant={amDailyViewMode === 'chart' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs font-medium px-2.5 ${amDailyViewMode === 'chart' ? 'bg-[#9a6428] text-white hover:bg-[#83531f]' : ''}`}
                                    onClick={() => setAmDailyViewMode('chart')}
                                >
                                    <BarChart3 className="h-3.5 w-3.5 mr-1" /> Chart
                                </Button>
                                <Button
                                    variant={amDailyViewMode === 'table' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={`h-7 text-xs font-medium px-2.5 ${amDailyViewMode === 'table' ? 'bg-[#9a6428] text-white hover:bg-[#83531f]' : ''}`}
                                    onClick={() => setAmDailyViewMode('table')}
                                >
                                    <Layers className="h-3.5 w-3.5 mr-1" /> Table
                                </Button>
                            </div>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs"
                                onClick={() => {
                                    const exportData = stats.dailyAMActivity.chartData.map(row => {
                                        const exportRow: Record<string, any> = {
                                            'Date': row.formattedDate || row.date,
                                            'Total Actions': row['Total Actions'],
                                            'Total Leads Actioned': row['Total Leads Actioned'],
                                            'Calls': row.Calls,
                                            'Emails': row.Emails,
                                            'Meetings': row.Meetings,
                                            'Updates': row.Updates,
                                        };
                                        stats.dailyAMActivity.amsList.forEach(am => {
                                            exportRow[`${am} (Unique Leads)`] = row[`${am}_unique`] || 0;
                                            exportRow[`${am} (Total Actions)`] = row[am] || 0;
                                        });
                                        return exportRow;
                                    });
                                    handleExportData(exportData, 'daily_account_manager_activity');
                                }}
                            >
                                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div 
                            className="p-3.5 bg-muted/20 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => setDrillDownData({ 
                                title: "Unique Leads Actioned by AMs", 
                                leads: filteredLeads.filter(l => stats.dailyAMActivity.chartData.some(r => (r.total_leadIds || []).includes(l.id)))
                            })}
                        >
                            <p className="text-xs text-muted-foreground font-medium">Unique Leads Actioned</p>
                            <p className="text-xl font-bold text-[#095c7b] mt-0.5">{stats.dailyAMActivity.totalUniqueLeadsPeriod}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 underline">Click to view actioned leads</p>
                        </div>
                        <div className="p-3.5 bg-muted/20 border rounded-lg">
                            <p className="text-xs text-muted-foreground font-medium">Total Period Actions</p>
                            <p className="text-xl font-bold text-blue-600 mt-0.5">{stats.dailyAMActivity.totalAMActionsPeriod}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] mt-1 pt-1 border-t border-border/40">
                                <span className="font-semibold text-sky-600">Calls: {stats.dailyAMActivity.totalCallsPeriod}</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="font-semibold text-emerald-600">Emails: {stats.dailyAMActivity.totalEmailsPeriod}</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="font-semibold text-amber-600">Meetings: {stats.dailyAMActivity.totalMeetingsPeriod}</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="font-semibold text-pink-600">Updates: {stats.dailyAMActivity.totalUpdatesPeriod}</span>
                            </div>
                        </div>
                        <div className="p-3.5 bg-muted/20 border rounded-lg">
                            <p className="text-xs text-muted-foreground font-medium">Avg Daily Unique Leads / AM</p>
                            <p className="text-xl font-bold text-indigo-600 mt-0.5">{stats.dailyAMActivity.avgDailyUniqueLeadsPerAM}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Per active working day</p>
                        </div>
                        <div className="p-3.5 bg-muted/20 border rounded-lg">
                            <p className="text-xs text-muted-foreground font-medium">Top AM (Unique Leads)</p>
                            <p className="text-xl font-bold text-emerald-600 mt-0.5 truncate">{stats.dailyAMActivity.topAMName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.dailyAMActivity.maxAMUniqueLeadsCount} unique leads worked ({stats.dailyAMActivity.activeAMsCount} active AMs)</p>
                        </div>
                    </div>

                    {amDailyViewMode === 'table' ? (
                        <div className="border rounded-lg overflow-x-auto max-h-[420px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold min-w-[140px]">Date</TableHead>
                                        {stats.dailyAMActivity.amsList.map(am => (
                                            <TableHead key={am} className="text-right font-semibold min-w-[120px]">
                                                {am}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold min-w-[130px] text-[#095c7b] bg-muted">
                                            {amDailyMetricMode === 'by_am_unique' ? 'Total Unique Leads' : 'Total Actions'}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.dailyAMActivity.chartData.map((row: any) => (
                                        <TableRow key={row.fullDate} className="hover:bg-muted/30">
                                            <TableCell className="font-medium text-xs">
                                                {row.formattedDate || row.date}
                                            </TableCell>
                                            {stats.dailyAMActivity.amsList.map((am: string) => {
                                                const val = amDailyMetricMode === 'by_am_unique' ? (row[`${am}_unique`] || 0) : (row[am] || 0);
                                                const leadIds = row[`${am}_leadIds`] || [];
                                                return (
                                                    <TableCell key={am} className="text-right text-xs">
                                                        {val > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="font-semibold text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                                                                onClick={() => {
                                                                    const matchedLeads = filteredLeads.filter(l => leadIds.includes(l.id));
                                                                    setDrillDownData({
                                                                        title: `${am} - Actioned Leads on ${row.formattedDate || row.date}`,
                                                                        leads: matchedLeads,
                                                                    });
                                                                }}
                                                            >
                                                                {val}
                                                            </button>
                                                        ) : (
                                                            <span className="text-muted-foreground/40">-</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-right font-bold text-xs text-[#095c7b] bg-muted/30">
                                                {amDailyMetricMode === 'by_am_unique' ? row['Total Leads Actioned'] : row['Total Actions']}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="h-[350px] w-full border rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm">
                            {stats.dailyAMActivity.chartData.length > 0 ? (
                                <ChartContainer config={{}} className="h-full w-full bg-white dark:bg-slate-900">
                                    <LineChart data={stats.dailyAMActivity.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="date" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            tick={{ fill: '#475569', fontSize: 12 }}
                                        />
                                        <YAxis 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            tick={{ fill: '#475569', fontSize: 12 }}
                                            allowDecimals={false} 
                                        />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                        {amDailyMetricMode === 'combined' && (
                                            <>
                                                <Line type="monotone" dataKey="Total Actions" stroke="#095c7b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                                                <Line type="monotone" dataKey="Total Leads Actioned" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                            </>
                                        )}

                                        {amDailyMetricMode === 'by_type' && (
                                            <>
                                                <Line type="monotone" dataKey="Calls" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="Emails" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="Meetings" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="Updates" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                                            </>
                                        )}

                                        {amDailyMetricMode === 'by_am' && stats.dailyAMActivity.amsList.map((am, idx) => (
                                            <Line 
                                                key={am} 
                                                type="monotone" 
                                                dataKey={am} 
                                                name={am} 
                                                stroke={COLORS[idx % COLORS.length]} 
                                                strokeWidth={2} 
                                                dot={{ r: 4 }} 
                                                activeDot={{ r: 6 }} 
                                            />
                                        ))}

                                        {amDailyMetricMode === 'by_am_unique' && stats.dailyAMActivity.amsList.map((am, idx) => (
                                            <Line 
                                                key={am} 
                                                type="monotone" 
                                                dataKey={`${am}_unique`} 
                                                name={`${am} (Unique Leads)`} 
                                                stroke={COLORS[idx % COLORS.length]} 
                                                strokeWidth={2} 
                                                dot={{ r: 4 }} 
                                                activeDot={{ r: 6 }} 
                                            />
                                        ))}
                                    </LineChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic">No daily activity data available for the selected filters.</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
            )}

            {/* Inbound Team Performance Details */}
            {(!visibleSections || visibleSections.includes('team-performance')) && (
            <Card id="step-report-am-efficiency" className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-1.5">
                            <span>Inbound Team Performance Details</span>
                            <SectionHelp content="Detailed inbound performance report. 'Leads Processed' (actioned in active pipeline across calls, emails, meetings, updates), 'Outside Pipeline' (finished/archived leads), and 'Still In Pipeline' (un-actioned leads in active pipeline) sum to 100% of Total Inbound Leads." />
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => handleExportData([...stats.teamPerformanceData, stats.teamPerformanceTotals], 'inbound_team_performance_details')}>
                            <Download className="h-4 w-4 mr-2" /> Export Table
                        </Button>
                    </div>
                    <CardDescription>Comprehensive metrics breakdown for Account Manager and Rep inbound lead performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agent / Account Manager</TableHead>
                                <TableHead className="text-right">Calls Made</TableHead>
                                <TableHead className="text-right">Leads Processed</TableHead>
                                <TableHead className="text-right">Outside Pipeline</TableHead>
                                <TableHead className="text-right">Still In Pipeline</TableHead>
                                <TableHead className="text-right">Avg Attempts / Lead</TableHead>
                                <TableHead className="text-right">Connect Rate %</TableHead>
                                <TableHead className="text-right">Appointments Set</TableHead>
                                <TableHead className="text-right">Quotes Sent</TableHead>
                                <TableHead className="text-right">LM Opportunity (Registration Sent)</TableHead>
                                <TableHead className="text-right">LM Pending (T&C&apos;s Accepted)</TableHead>
                                <TableHead className="text-right">Trialing LocalMile</TableHead>
                                <TableHead className="text-right">ShipMate / LocalMile Trials</TableHead>
                                <TableHead className="text-right">Signed Customers</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.teamPerformanceData.map(dialer => (
                                <TableRow key={dialer.name}>
                                    <TableCell className="font-medium">{dialer.name}</TableCell>
                                    <TableCell className="text-right">{dialer['Total Engagement']}</TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-emerald-600 cursor-pointer hover:underline"
                                        onClick={() => {
                                            const actionedSet = stats.amActionedLeadIdsMap?.get(dialer.name) || new Set();
                                            setDrillDownData({ 
                                                title: `${dialer.name} - Leads Processed (Actioned in Pipeline)`, 
                                                leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && ['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '') && actionedSet.has(l.id)) 
                                            });
                                        }}
                                    >
                                        {dialer['Leads Processed']}
                                    </TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-slate-500 cursor-pointer hover:underline"
                                        onClick={() => setDrillDownData({ 
                                            title: `${dialer.name} - Outside Pipeline Leads (Finished Processing)`, 
                                            leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && !['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '')) 
                                        })}
                                    >
                                        {dialer['Outside Pipeline']}
                                    </TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-blue-500 cursor-pointer hover:underline"
                                        onClick={() => {
                                            const actionedSet = stats.amActionedLeadIdsMap?.get(dialer.name) || new Set();
                                            setDrillDownData({ 
                                                title: `${dialer.name} - Still In Pipeline Leads (Un-actioned)`, 
                                                leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && ['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '') && !actionedSet.has(l.id)) 
                                            });
                                        }}
                                    >
                                        {dialer['Still In Pipeline']}
                                    </TableCell>
                                    <TableCell className="text-right">{dialer['Avg Attempts'].toFixed(1)}</TableCell>
                                    <TableCell className="text-right">{dialer['Connect Rate'].toFixed(1)}%</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">{dialer.Appointments}</TableCell>
                                    <TableCell className="text-right font-semibold text-orange-600">{dialer['Quotes Sent']}</TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-indigo-600 cursor-pointer hover:underline"
                                        onClick={() => setDrillDownData({ 
                                            title: `${dialer.name} - LocalMile Opportunity Leads`, 
                                            leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && l.customerStatus === 'LocalMile Opportunity') 
                                        })}
                                    >
                                        {dialer['LM Opportunity']} <span className="text-xs text-muted-foreground font-normal">({dialer['LM Opportunity Rate'].toFixed(1)}%)</span>
                                    </TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-amber-600 cursor-pointer hover:underline"
                                        onClick={() => setDrillDownData({ 
                                            title: `${dialer.name} - LocalMile Pending Leads`, 
                                            leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && l.customerStatus === 'LocalMile Pending') 
                                        })}
                                    >
                                        {dialer['LM Pending']} <span className="text-xs text-muted-foreground font-normal">({dialer['LM Pending Rate'].toFixed(1)}%)</span>
                                    </TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-emerald-600 cursor-pointer hover:underline"
                                        onClick={() => {
                                            const dialerLmSet = stats.repLocalmileLeadsMap.get(dialer.name) || new Set();
                                            setDrillDownData({ 
                                                title: `${dialer.name} - Trialing LocalMile Leads`, 
                                                leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && dialerLmSet.has(l.id)) 
                                            });
                                        }}
                                    >
                                        {dialer['Trialing LocalMile']} <span className="text-xs text-muted-foreground font-normal">({dialer['Trialing LocalMile Rate'].toFixed(1)}%)</span>
                                    </TableCell>
                                    <TableCell 
                                        className="text-right font-semibold text-purple-600 cursor-pointer hover:underline"
                                        onClick={() => {
                                            const dialerSmSet = stats.repShipmateLeadsMap.get(dialer.name) || new Set();
                                            const dialerLmSet = stats.repLocalmileLeadsMap.get(dialer.name) || new Set();
                                            setDrillDownData({ 
                                                title: `${dialer.name} - ShipMate / LocalMile Trials`, 
                                                leads: filteredLeads.filter(l => (l.accountManagerAssigned ? l.accountManagerAssigned.trim() : 'Unassigned') === dialer.name && (dialerSmSet.has(l.id) || dialerLmSet.has(l.id))) 
                                            });
                                        }}
                                    >
                                        {dialer['ShipMate / LocalMile Trials']}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">{dialer['Signed Customers']}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold border-t-2 bg-muted/50">
                                <TableCell className="font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold">{stats.teamPerformanceTotals['Total Engagement']}</TableCell>
                                <TableCell 
                                    className="text-right font-bold text-emerald-600 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All Leads Processed (Actioned in Pipeline)", 
                                        leads: filteredLeads.filter(l => ['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '') && stats.allActionedLeadIdsSet.has(l.id)) 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['Leads Processed']}
                                </TableCell>
                                <TableCell 
                                    className="text-right font-bold text-slate-500 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All Outside Pipeline Leads (Finished Processing)", 
                                        leads: filteredLeads.filter(l => !['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '')) 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['Outside Pipeline']}
                                </TableCell>
                                <TableCell 
                                    className="text-right font-bold text-blue-500 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All Still In Pipeline Leads (Un-actioned)", 
                                        leads: filteredLeads.filter(l => ['New', 'Priority Lead', 'Priority Field Lead', 'In Progress', 'Quote Sent', 'Hot Lead'].includes(l.customerStatus || '') && !stats.allActionedLeadIdsSet.has(l.id)) 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['Still In Pipeline']}
                                </TableCell>
                                <TableCell className="text-right font-bold">{stats.teamPerformanceTotals['Avg Attempts'].toFixed(1)}</TableCell>
                                <TableCell className="text-right font-bold">{stats.teamPerformanceTotals['Connect Rate'].toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-bold text-blue-600">{stats.teamPerformanceTotals.Appointments}</TableCell>
                                <TableCell className="text-right font-bold text-orange-600">{stats.teamPerformanceTotals['Quotes Sent']}</TableCell>
                                <TableCell 
                                    className="text-right font-bold text-indigo-600 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All LocalMile Opportunity Leads", 
                                        leads: filteredLeads.filter(l => l.customerStatus === 'LocalMile Opportunity') 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['LM Opportunity']} <span className="text-xs text-muted-foreground font-normal">({stats.teamPerformanceTotals['LM Opportunity Rate'].toFixed(1)}%)</span>
                                </TableCell>
                                <TableCell 
                                    className="text-right font-bold text-amber-600 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All LocalMile Pending Leads", 
                                        leads: filteredLeads.filter(l => l.customerStatus === 'LocalMile Pending') 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['LM Pending']} <span className="text-xs text-muted-foreground font-normal">({stats.teamPerformanceTotals['LM Pending Rate'].toFixed(1)}%)</span>
                                </TableCell>
                                <TableCell 
                                    className="text-right font-bold text-emerald-600 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All Trialing LocalMile Leads", 
                                        leads: stats.localmileJourney.leads 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['Trialing LocalMile']} <span className="text-xs text-muted-foreground font-normal">({stats.teamPerformanceTotals['Trialing LocalMile Rate'].toFixed(1)}%)</span>
                                </TableCell>
                                <TableCell 
                                    className="text-right font-bold text-purple-600 cursor-pointer hover:underline"
                                    onClick={() => setDrillDownData({ 
                                        title: "All ShipMate / LocalMile Trials", 
                                        leads: stats.combinedJourney.leads 
                                    })}
                                >
                                    {stats.teamPerformanceTotals['ShipMate / LocalMile Trials']}
                                </TableCell>
                                <TableCell className="text-right font-bold text-green-600">{stats.teamPerformanceTotals['Signed Customers']}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
            )}

            {!visibleSections && (
              <>
            <Card id="step-report-free-trial-journeys" className="w-full shadow-md border-primary/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Goal className="h-5 w-5 text-amber-500" />
                                <span>Free Trial Conversion Journeys</span>
                                <SectionHelp content="Tracks the outcomes of leads that started a free trial (ShipMate or LocalMile). Shows the total trials, signed (won) rate, lost rate, and currently active trialing leads." />
                            </CardTitle>
                            <CardDescription>
                                Track inbound leads that started a free trial (ShipMate or LocalMile) and their outcomes (Signed vs Lost).
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
                                onClick={() => setDrillDownData({ title: "ShipMate Trials Started", leads: stats.shipmateJourney.leads })}
                            >
                                <span className="text-sm font-medium">Trials Started</span>
                                <Badge className="text-md bg-pink-500 hover:bg-pink-600">{stats.shipmateJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "ShipMate Trials Signed", 
                                    leads: stats.shipmateJourney.leads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed') 
                                })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.shipmateJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.shipmateJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "ShipMate Trials Lost", 
                                    leads: stats.shipmateJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(l.customerStatus || '')) 
                                })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.shipmateJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.shipmateJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "ShipMate Trials Active", 
                                    leads: stats.shipmateJourney.leads.filter(l => ['Trialing ShipMate', 'Free Trial'].includes(l.customerStatus || '')) 
                                })}
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
                                onClick={() => setDrillDownData({ title: "LocalMile Trials Started", leads: stats.localmileJourney.leads })}
                            >
                                <span className="text-sm font-medium">Trials Started</span>
                                <Badge className="text-md bg-emerald-500 hover:bg-emerald-600">{stats.localmileJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "LocalMile Trials Signed", 
                                    leads: stats.localmileJourney.leads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed') 
                                })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.localmileJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.localmileJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "LocalMile Trials Lost", 
                                    leads: stats.localmileJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(l.customerStatus || '')) 
                                })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.localmileJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.localmileJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "LocalMile Trials Active", 
                                    leads: stats.localmileJourney.leads.filter(l => ['Trialing LocalMile', 'LocalMile Opportunity'].includes(l.customerStatus || '')) 
                                })}
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
                                onClick={() => setDrillDownData({ title: "Total Free Trials Started", leads: stats.combinedJourney.leads })}
                            >
                                <span className="text-sm font-medium">Total Started</span>
                                <Badge className="text-md bg-amber-500 hover:bg-amber-600">{stats.combinedJourney.total}</Badge>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "Total Free Trials Signed", 
                                    leads: stats.combinedJourney.leads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed') 
                                })}
                            >
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Signed (Won)</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-green-600 hover:bg-green-700">{stats.combinedJourney.signed}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.combinedJourney.signedRate.toFixed(1)}% Conv</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "Total Free Trials Lost", 
                                    leads: stats.combinedJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(l.customerStatus || '')) 
                                })}
                            >
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">Lost</span>
                                <div className="text-right">
                                    <Badge className="text-md bg-red-500 hover:bg-red-600">{stats.combinedJourney.lost}</Badge>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{stats.combinedJourney.lostRate.toFixed(1)}% Lost</div>
                                </div>
                            </div>
                            <div 
                                className="flex justify-between items-center p-3 rounded-lg bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setDrillDownData({ 
                                    title: "Total Free Trials Active", 
                                    leads: stats.combinedJourney.leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.customerStatus || '')) 
                                })}
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
                                <TrendingUp className="h-5 w-5 text-indigo-500" />
                                <span>Lead Journey Velocity &amp; Drop-offs</span>
                                <SectionHelp content="Measures operational speed (average response, close, and drop-off times) and maps the last active stage leads were in before being marked lost or unqualified." />
                            </CardTitle>
                            <CardDescription>
                                Analyze how quickly inbound leads are actioned, how long they take to convert or drop off, and where the leak is.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setDrillDownData({ 
                                title: "Avg Response Time Leads", 
                                leads: filteredLeads.filter(lead => {
                                    const entered = parseDateString(lead.dateLeadEntered);
                                    if (!entered || !isValid(entered)) return false;
                                    
                                    let activityDates: Date[] = [];
                                    const leadActivities = allActivities.filter(act => act.leadId === lead.id && isManualActivity(act));
                                    if (leadActivities.length > 0) {
                                        activityDates = activityDates.concat(leadActivities.map(a => new Date(a.date)).filter(d => isValid(d)));
                                    }
                                    if (lead.emails && lead.emails.length > 0) {
                                        const manualEmails = lead.emails.filter(e => isManualEmail(e));
                                        activityDates = activityDates.concat(manualEmails.map(e => new Date(e.sentAt)).filter(d => isValid(d)));
                                    }
                                    
                                    if (activityDates.length > 0) {
                                        activityDates.sort((a, b) => a.getTime() - b.getTime());
                                        const firstAction = activityDates[0];
                                        return firstAction.getTime() >= entered.getTime();
                                    }
                                    return false;
                                })
                            })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats.avgResponseTime.toFixed(1)} hours
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Time to first action after lead entered</p>
                            </CardContent>
                        </Card>

                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setDrillDownData({ 
                                title: "Converted Customers Cohort", 
                                leads: filteredLeads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed') 
                            })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to Convert (Signed)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {stats.avgTimeToClose.toFixed(1)} days
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">From entry to Won/Signed ({stats.wonCount} leads)</p>
                            </CardContent>
                        </Card>

                        <Card 
                            className="bg-muted/20 border-primary/5 hover:bg-muted/40 cursor-pointer transition-colors"
                            onClick={() => setDrillDownData({ 
                                title: "Dropped-off Inbound Leads", 
                                leads: filteredLeads.filter(l => ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off'].includes(l.customerStatus || '')) 
                            })}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to Drop-off (Lost)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {stats.inboundJourneyStats.avgTimeToDropoff.toFixed(1)} days
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">From entry to Lost/Unqualified ({stats.inboundJourneyStats.dropoffCount} leads)</p>
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
                                            <TableHead className="text-right">Avg. Days to Drop-off</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.inboundJourneyStats.dropoffStagesData.length > 0 ? (
                                            stats.inboundJourneyStats.dropoffStagesData.map((stage) => {
                                                const pct = stats.inboundJourneyStats.dropoffCount > 0 
                                                    ? (stage.value / stats.inboundJourneyStats.dropoffCount) * 100 
                                                    : 0;
                                                return (
                                                    <TableRow 
                                                        key={stage.name} 
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => setDrillDownData({ 
                                                            title: `Dropped off from ${stage.name}`, 
                                                            leads: stats.inboundJourneyStats.dropoffStageLeads[stage.name] || [] 
                                                        })}
                                                    >
                                                        <TableCell className="font-semibold">{stage.name === 'Won' ? 'In Progress' : stage.name}</TableCell>
                                                        <TableCell className="text-right text-red-500 font-bold">{stage.value}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                                                        <TableCell className="text-right text-amber-600 font-medium">{stage.avgDays} days</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
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
                                {stats.inboundJourneyStats.dropoffStagesData.length > 0 ? (
                                    <ChartContainer config={{}} className="h-full w-full">
                                        <BarChart data={stats.inboundJourneyStats.dropoffStagesData}>
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

            <div id="step-inbound-charts" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Lead Type Distribution</span>
                                    <SectionHelp content="Breakdown of leads by their type (Product, Service, etc.) to monitor lead distribution types across all non-duplicate inbound leads." />
                                </CardTitle>
                                <CardDescription>Distribution of lead types.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.leadTypeData, 'lead_type_dist')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.leadTypeData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <PieChart>
                                    <Pie 
                                        data={stats.leadTypeData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={70} 
                                        outerRadius={100} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        onMouseEnter={(_, index) => setActiveLeadTypeIndex(index)}
                                        onMouseLeave={() => setActiveLeadTypeIndex(null)}
                                        label={({ percent, value }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {stats.leadTypeData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length]} 
                                                style={{ 
                                                    opacity: activeLeadTypeIndex === null || activeLeadTypeIndex === index ? 1 : 0.3,
                                                    transition: 'opacity 0.2s ease'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend 
                                        onClick={(e: any) => {
                                            const index = stats.leadTypeData.findIndex(d => d.name === e.value);
                                            setActiveLeadTypeIndex(index === activeLeadTypeIndex ? null : index);
                                        }}
                                        formatter={(value, entry: any) => (
                                            <span style={{ color: activeLeadTypeIndex !== null && stats.leadTypeData.findIndex(d => d.name === value) !== activeLeadTypeIndex ? '#94a3b8' : 'inherit' }}>
                                                {value} ({entry?.payload?.value ?? 0})
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No data available for the selected filters.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Customer Status Distribution</span>
                                    <SectionHelp content="Breakdown of leads by their internal lifecycle status to monitor pipeline volume across all non-duplicate inbound leads." />
                                </CardTitle>
                                <CardDescription>Internal lead lifecycle management.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.customerStatusData, 'customer_status_dist')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.customerStatusData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <PieChart>
                                    <Pie 
                                        data={stats.customerStatusData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={70} 
                                        outerRadius={100} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        onMouseEnter={(_, index) => setActiveCustomerIndex(index)}
                                        onMouseLeave={() => setActiveCustomerIndex(null)}
                                        label={({ percent, value }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {stats.customerStatusData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={getStatusColor(entry.name, COLORS[index % COLORS.length])} 
                                                style={{ 
                                                    opacity: activeCustomerIndex === null || activeCustomerIndex === index ? 1 : 0.3,
                                                    transition: 'opacity 0.2s ease'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<StatusChartTooltipContent unit="leads" />} />
                                    <Legend 
                                        onClick={(e: any) => {
                                            const index = stats.customerStatusData.findIndex(d => d.name === e.value);
                                            setActiveCustomerIndex(index === activeCustomerIndex ? null : index);
                                        }}
                                        formatter={(value, entry: any) => (
                                            <span style={{ color: activeCustomerIndex !== null && stats.customerStatusData.findIndex(d => d.name === value) !== activeCustomerIndex ? '#94a3b8' : 'inherit' }}>
                                                {value} ({entry?.payload?.value ?? 0})
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No data available for the selected filters.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Average Days in Status</span>
                                    <SectionHelp content="Average days spent by leads in each pipeline status. Calculated by mapping status transition history timestamps for each lead." />
                                </CardTitle>
                                <CardDescription>Average time leads spend in each lifecycle status.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.avgDurationByStatusData, 'avg_days_in_status')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.avgDurationByStatusData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <BarChart data={stats.avgDurationByStatusData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {stats.avgDurationByStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, COLORS[index % COLORS.length])} />
                                        ))}
                                        <LabelList dataKey="value" position="right" fill="#64748b" fontSize={12} formatter={(val: number) => `${val}d`} />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No duration data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Account Manager Performance</span>
                                    <SectionHelp content="Compares the count of total handled leads, won customers, and overdue hot leads assigned to each Account Manager." />
                                </CardTitle>
                                <CardDescription>Inbound leads handled, converted, and overdue by account manager.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.amPerformanceData, 'am_performance')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.amPerformanceData && stats.amPerformanceData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <BarChart data={stats.amPerformanceData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="Total Leads" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="Won" fill="#10b981" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="Overdue Leads" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No account manager data available.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Lead Funnel</span>
                                    <SectionHelp content="Visualizes drop-off and progression volume through major pipeline stages: Total Inbound → Hot Leads → Quote Sent → Won Customers." />
                                </CardTitle>
                                <CardDescription>Drop-off across major pipeline stages.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.funnelData, 'lead_funnel')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.funnelData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <BarChart data={stats.funnelData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="value" position="right" fill="#64748b" fontSize={12} />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No funnel data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>


            <div className="grid grid-cols-1 gap-6">
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-1.5">
                                    <span>Leads by Franchisee (Top 10)</span>
                                    <SectionHelp content="Stacked distribution showing lead counts and current pipeline statuses assigned to each franchisee (top 10)." />
                                </CardTitle>
                                <CardDescription>Distribution of inbound leads across assigned franchisees.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setShowFranchiseeTable(true)}>
                                    View All
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExportData(stats.franchiseeData, 'franchisee_dist')}>
                                    <Download className="h-4 w-4 mr-2" /> Export
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.topFranchiseeData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={stats.topFranchiseeData} 
                                        layout="vertical" 
                                        margin={{ left: 50, right: 100, top: 20, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={150} 
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-background border rounded-lg p-3 shadow-sm min-w-[200px]">
                                                            <p className="font-medium text-sm mb-2">{data.name}</p>
                                                            <p className="text-xs text-muted-foreground mb-2 pb-2 border-b">
                                                                Total Leads: <span className="font-bold text-foreground">{data.value}</span> ({data.percentage.toFixed(1)}%)
                                                            </p>
                                                            <div className="flex flex-col gap-1">
                                                                {stats.franchiseeStatuses.filter(s => data[s]).map((status, idx) => (
                                                                    <div key={status} className="flex items-center justify-between text-xs">
                                                                        <span className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(status, COLORS[idx % COLORS.length]) }} />
                                                                            {status}
                                                                        </span>
                                                                        <span className="font-medium">{data[status]}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend />
                                        {stats.franchiseeStatuses.map((status, idx) => (
                                            <Bar 
                                                key={status}
                                                dataKey={status} 
                                                name={status}
                                                stackId="a"
                                                fill={getStatusColor(status, COLORS[idx % COLORS.length])} 
                                            />
                                        ))}
                                        <Bar 
                                            dataKey="labelTotal" 
                                            stackId="a"
                                            fill="transparent" 
                                            isAnimationActive={false}
                                        >
                                            <LabelList 
                                                dataKey="value"
                                                position="right"
                                                formatter={(val: any) => {
                                                    const percentage = stats.totalInbound > 0 ? ((val as number) / stats.totalInbound) * 100 : 0;
                                                    return `${val} (${percentage.toFixed(1)}%)`;
                                                }}
                                                fontSize={11}
                                                fill="#64748b"
                                                offset={10}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground italic">No franchisee data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
              </>
            )}
          </div>
      )}

      <Dialog open={showFranchiseeTable} onOpenChange={setShowFranchiseeTable}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
                <div className="flex items-center justify-between mr-8">
                    <div>
                        <DialogTitle>All Franchisees</DialogTitle>
                        <DialogDescription>Showing lead distribution across all franchisees.</DialogDescription>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleExportData(stats.franchiseeData, 'all_franchisees')}
                    >
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </DialogHeader>
            <div className="mt-4 overflow-y-auto max-h-[50vh] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Franchisee</TableHead>
                            <TableHead className="text-right">Leads</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.franchiseeData.map((data, index) => (
                            <TableRow key={data.name}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length], flexShrink: 0 }} />
                                    {data.name}
                                </TableCell>
                                <TableCell className="text-right">{data.value}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {data.percentage.toFixed(1)}%
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
        <DialogContent className={cn("max-h-[80vh] flex flex-col transition-all duration-200", drillDownData?.title === 'Avg Response Time Leads' ? "max-w-6xl" : "max-w-4xl")}>
            <DialogHeader>
                <div className="flex items-center justify-between mr-8">
                    <div>
                        <DialogTitle className="flex items-center gap-2">
                            {drillDownData?.title}
                            <Badge variant="secondary" className="font-normal text-xs px-2 py-0.5">
                                {filteredDrillDownLeads.length} {filteredDrillDownLeads.length !== (drillDownData?.leads.length || 0) ? `of ${drillDownData?.leads.length || 0}` : ''}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Showing {filteredDrillDownLeads.length} of {drillDownData?.leads.length || 0} leads matching this metric.
                        </DialogDescription>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => drillDownData && handleExportData(filteredDrillDownLeads, drillDownData.title.toLowerCase().replace(/\s+/g, '_'))}
                    >
                        <Download className="h-4 w-4 mr-2" /> Export List
                    </Button>
                </div>
                {drillDownData && drillDownData.leads.length > 0 && (
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 max-w-xs">
                            <Input
                                placeholder="Search company name..."
                                value={drillDownSearchQuery}
                                onChange={(e) => setDrillDownSearchQuery(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Select value={drillDownStatusFilter} onValueChange={setDrillDownStatusFilter}>
                                <SelectTrigger className="w-[180px] h-8 text-sm">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {drillDownAvailableStatuses.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {drillDownData.title === 'Hot Leads' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">SLA Status:</span>
                                <Select value={drillDownSlaFilter} onValueChange={setDrillDownSlaFilter}>
                                    <SelectTrigger className="w-[150px] h-8 text-sm">
                                        <SelectValue placeholder="All SLAs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All SLAs</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="on_track">On Track</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}
            </DialogHeader>
            <ScrollArea className="mt-4 border rounded-md w-full h-[50vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {drillDownData?.title === 'Avg Response Time Leads' ? (
                                <>
                                    <TableHead>Company & Status</TableHead>
                                    <TableHead>Assigned AM & Franchisee</TableHead>
                                    <TableHead>Date Entered</TableHead>
                                    <TableHead>Response Action (Rep)</TableHead>
                                    <TableHead>Action Details</TableHead>
                                    <TableHead className="text-right">Response Time</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Account Manager</TableHead>
                                    <TableHead>Franchisee</TableHead>
                                    <TableHead>Date Entered</TableHead>
                                    {drillDownData?.title === 'Hot Leads' && <TableHead>SLA Status</TableHead>}
                                </>
                            )}
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDrillDownLeads.map((lead) => {
                            let firstActivityDetail: { date: Date; type: string; details: string; author: string } | null = null;
                            const entered = parseDateString(lead.dateLeadEntered);
                            
                            let activitiesAndEmails: Array<{ date: Date; type: string; details: string; author: string }> = [];
                            
                            const leadActivities = allActivities.filter(act => act.leadId === lead.id && isManualActivity(act));
                            leadActivities.forEach(act => {
                                const d = new Date(act.date);
                                if (isValid(d)) {
                                    activitiesAndEmails.push({
                                        date: d,
                                        type: act.type,
                                        details: act.notes || act.type,
                                        author: act.author || 'Unknown'
                                    });
                                }
                            });
                            
                            if (lead.emails && lead.emails.length > 0) {
                                const manualEmails = lead.emails.filter(e => isManualEmail(e));
                                manualEmails.forEach(e => {
                                    const d = new Date(e.sentAt);
                                    if (isValid(d)) {
                                        activitiesAndEmails.push({
                                            date: d,
                                            type: 'Email',
                                            details: e.subject || 'Email',
                                            author: e.sender || 'Unknown'
                                        });
                                    }
                                });
                            }
                            
                            let hoursToResponseStr = '-';
                            let calcBreakdownStr = '';
                            if (activitiesAndEmails.length > 0 && entered && isValid(entered)) {
                                activitiesAndEmails.sort((a, b) => a.date.getTime() - b.date.getTime());
                                const first = activitiesAndEmails[0];
                                if (first.date.getTime() >= entered.getTime()) {
                                    const hours = calculateBusinessHoursSydney(entered, first.date);
                                    hoursToResponseStr = `${hours.toFixed(1)} h`;
                                    firstActivityDetail = first;
                                    
                                    const startStr = format(entered, 'dd/MM/yy HH:mm');
                                    const endStr = format(first.date, 'dd/MM/yy HH:mm');
                                    calcBreakdownStr = `${startStr} → ${endStr} (Sydney Business Hours Mon-Fri 9am-5pm)`;
                                }
                            }
                            
                            return (
                                <TableRow key={lead.id}>
                                    {drillDownData?.title === 'Avg Response Time Leads' ? (
                                        <>
                                            <TableCell>
                                                <div className="font-medium text-sm">{lead.companyName}</div>
                                                <div className="mt-1">
                                                    <LeadStatusBadge status={(lead.customerStatus || 'Unknown') as any} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="font-medium text-foreground">{lead.accountManagerAssigned || '-'}</div>
                                                <div className="text-xs text-muted-foreground">{lead.franchisee || '-'}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {entered && isValid(entered) ? format(entered, 'dd/MM/yyyy') : (lead.dateLeadEntered || '-')}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="font-medium">
                                                    {firstActivityDetail ? format(firstActivityDetail.date, 'dd/MM/yyyy HH:mm') : '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {firstActivityDetail ? `by ${firstActivityDetail.author}` : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate" title={firstActivityDetail?.details || ''}>
                                                {firstActivityDetail ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="px-1 py-0 text-[10px]">{firstActivityDetail.type}</Badge>
                                                        <span className="truncate">{firstActivityDetail.details}</span>
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell 
                                                className="text-sm text-right font-medium cursor-help underline decoration-dotted decoration-muted-foreground/50" 
                                                title={calcBreakdownStr || 'No response data recorded'}
                                            >
                                                {hoursToResponseStr}
                                            </TableCell>
                                        </>
                                    ) : (
                                        <>
                                            <TableCell className="font-medium">{lead.companyName}</TableCell>
                                            <TableCell>
                                                <LeadStatusBadge status={(lead.customerStatus || 'Unknown') as any} />
                                            </TableCell>
                                            <TableCell className="text-sm">{lead.accountManagerAssigned || '-'}</TableCell>
                                            <TableCell className="text-sm">{lead.franchisee || '-'}</TableCell>
                                            <TableCell className="text-sm">
                                                {entered && isValid(entered) ? format(entered, 'dd/MM/yyyy') : (lead.dateLeadEntered || '-')}
                                            </TableCell>
                                            {drillDownData?.title === 'Hot Leads' && (
                                                <TableCell className="text-sm">
                                                    {stats.overdueHotLeadsList.find(l => l.id === lead.id) ? (
                                                        <Badge variant="destructive">Overdue</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-emerald-500 border-emerald-500">On Track</Badge>
                                                    )}
                                                </TableCell>
                                            )}
                                        </>
                                    )}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${lead.id}`} target="_blank">
                                                View <ExternalLink className="ml-2 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredDrillDownLeads.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={drillDownData?.title === 'Hot Leads' ? 7 : drillDownData?.title === 'Avg Response Time Leads' ? 7 : 6} className="text-center py-10 text-muted-foreground italic">
                                    No leads found matching your filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
