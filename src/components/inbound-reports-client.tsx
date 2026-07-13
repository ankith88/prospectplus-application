"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import type { Lead, Activity, LeadStatus, UserProfile, Appointment, DiscoveryData, ReviewCategory, VisitNote } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Loader } from '@/components/ui/loader';
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
  Info
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isValid, isWithinInterval, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, where, orderBy, collectionGroup, or, and } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getStatusColor } from '@/lib/status-colors';

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#818cf8', '#2dd4bf', '#fb7185', '#fb923c'];

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

export default function InboundReportsClientPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allActivities, setAllActivities] = useState<Array<Activity & { leadId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ leads: Lead[], companies: Lead[] } | null>(null);
  const lastFetchedStartISORef = useRef<string | null>(null);
  
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
    setError(null);
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

        let fetchedLeads: Lead[] = [];
        let fetchedCompanies: Lead[] = [];
        let activitiesSnap;

        if (cacheRef.current) {
            fetchedLeads = cacheRef.current.leads;
            fetchedCompanies = cacheRef.current.companies;
            activitiesSnap = await getDocs(activityQuery);
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
                if (userProfile.activeRole === 'Franchisee' && userProfile.franchisee) {
                  leadsQuery = query(
                    collection(firestore, 'leads'),
                    and(
                      or(
                        where('bucket', '==', 'inbound'),
                        where('customerSource', '==', 'Website'),
                        where('source', '==', 'Website')
                      ),
                      where('franchisee', '==', userProfile.franchisee)
                    )
                  );
                  companiesQuery = query(
                    collection(firestore, 'companies'),
                    and(
                      or(
                        where('bucket', '==', 'inbound'),
                        where('customerSource', '==', 'Website'),
                        where('source', '==', 'Website')
                      ),
                      where('franchisee', '==', userProfile.franchisee)
                    )
                  );
                } else {
                  leadsQuery = query(
                    collection(firestore, 'leads'),
                    or(
                      where('bucket', '==', 'inbound'),
                      where('customerSource', '==', 'Website'),
                      where('source', '==', 'Website')
                    )
                  );
                  companiesQuery = query(
                    collection(firestore, 'companies'),
                    or(
                      where('bucket', '==', 'inbound'),
                      where('customerSource', '==', 'Website'),
                      where('source', '==', 'Website')
                    )
                  );
                }
            }
            
            const [snap, actSnap, compSnap] = await Promise.all([
              getDocs(leadsQuery),
              getDocs(activityQuery),
              getDocs(companiesQuery)
            ]);

            const rawLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
            const rawCompanies = compSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

            if (appliedFilters.dateEntered?.from) {
                const isInbound = (l: Lead) => l.bucket === 'inbound' || l.customerSource === 'Website' || (l as any).source === 'Website' || l.customerSource === 'Inbound' || l.customerSource === 'Referral';
                fetchedLeads = rawLeads.filter(isInbound);
                fetchedCompanies = rawCompanies.filter(isInbound);
            } else {
                fetchedLeads = rawLeads;
                fetchedCompanies = rawCompanies;
            }

            activitiesSnap = actSnap;
            cacheRef.current = { leads: fetchedLeads, companies: fetchedCompanies };
        }
        
        setAllLeads([...fetchedLeads, ...fetchedCompanies]);

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
        const normalizedStatus = (lead.status || '').toLowerCase();
        const normalizedCustomerStatus = (lead.customerStatus || '').toLowerCase();
        const isClosed = normalizedStatus.includes('won') || normalizedStatus.includes('lost') || normalizedStatus.includes('dead') || normalizedStatus.includes('rejected') || normalizedStatus.includes('customer') || normalizedCustomerStatus.includes('won') || normalizedCustomerStatus.includes('signed') || normalizedCustomerStatus.includes('lost');
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
        if (date) {
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
        if (!appliedFilters.dateEntered?.from) return true;
        const d = new Date(dateStr);
        const fromDate = startOfDay(appliedFilters.dateEntered.from);
        const toDate = appliedFilters.dateEntered.to ? endOfDay(appliedFilters.dateEntered.to) : endOfDay(appliedFilters.dateEntered.from);
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
        const isCurrentlyShipMate = lead.status === 'Trialing ShipMate';
        const startedShipMate = hasShipMateTrialActivity || (isCurrentlyShipMate && (!appliedFilters.dateEntered?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

        // LocalMile Trial Detection
        const hasLocalMileTrialActivity = leadActivities.some(act => 
            (act.notes?.includes("Initiated LocalMile Trial") || act.notes?.includes("Status changed to Trialing LocalMile") || act.notes?.includes("First LocalMile Job created")) &&
            isDateInRange(act.date)
        );
        const isCurrentlyLocalMile = lead.status === 'Trialing LocalMile' || lead.status === 'LocalMile Opportunity';
        const hasLocalMileFields = !!lead.firstJobCreatedAt || (lead.jobCount !== undefined && lead.jobCount > 0) || lead.localMileTrialsRemaining !== undefined;
        const startedLocalMile = hasLocalMileTrialActivity || ((isCurrentlyLocalMile || hasLocalMileFields) && (!appliedFilters.dateEntered?.from || (lead.dateLeadEntered && isDateInRange(lead.dateLeadEntered))));

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
        const signed = leads.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed').length;
        const lost = leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.customerStatus || '')).length;
        const trialing = leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.status || '')).length;
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
        const isLost = ['Lost', 'Lost Customer', 'Unqualified'].includes(lead.customerStatus || '');

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

        const currentStatus = lead.customerStatus || lead.status || 'New';

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
        amEfficiencyData
    };
  }, [filteredLeads, allActivities]);

  const drillDownAvailableStatuses = useMemo(() => {
    if (!drillDownData) return [];
    const statuses = new Set(drillDownData.leads.map(l => l.status || l.customerStatus || 'Unknown'));
    return Array.from(statuses).sort();
  }, [drillDownData]);

  const filteredDrillDownLeads = useMemo(() => {
    if (!drillDownData) return [];
    let leads = drillDownData.leads;
    if (drillDownStatusFilter !== "all") {
        leads = leads.filter(l => {
            const status = l.status || l.customerStatus || 'Unknown';
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

  if (loading || authLoading || loadingPermissions || !userProfile) return <div className="flex h-full items-center justify-center"><Loader /></div>;

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
      <header>
          <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Inbound Reporting</h1>
          </div>
          <p className="text-muted-foreground">Lead performance and status tracking for NetSuite Inbound leads.</p>
      </header>
      
      <Card id="step-inbound-filters">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
            <div className="flex items-center gap-2">
                <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
            </div>
        </CardHeader>
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
      </Card>

      {!error && (
          <div className="space-y-6">
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
            </div>

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
                                    leads: stats.shipmateJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.customerStatus || '')) 
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
                                    leads: stats.shipmateJourney.leads.filter(l => ['Trialing ShipMate', 'Free Trial'].includes(l.status || '')) 
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
                                    leads: stats.localmileJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.customerStatus || '')) 
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
                                    leads: stats.localmileJourney.leads.filter(l => ['Trialing LocalMile', 'LocalMile Opportunity'].includes(l.status || '')) 
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
                                    leads: stats.combinedJourney.leads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.customerStatus || '')) 
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
                                    leads: stats.combinedJourney.leads.filter(l => ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(l.status || '')) 
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
                                leads: filteredLeads.filter(l => ['Lost', 'Lost Customer', 'Unqualified'].includes(l.customerStatus || '')) 
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

            <Card id="step-report-am-efficiency" className="w-full shadow-md border-primary/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-500" />
                                <span>Account Manager Efficiency &amp; Velocity</span>
                                <SectionHelp content="Tracks activity count (logged touchpoints), response times, and average days to win or lose a lead grouped by assigned Account Manager." />
                            </CardTitle>
                            <CardDescription>
                                Track touchpoints, response times, and conversion/loss velocity per Account Manager.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportData(stats.amEfficiencyData, 'am_efficiency_metrics')}>
                            <Download className="h-4 w-4 mr-2" /> Export
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Manager</TableHead>
                                    <TableHead className="text-right">Total Leads</TableHead>
                                    <TableHead className="text-right">Avg. Activities / Lead</TableHead>
                                    <TableHead className="text-right">Avg. Response Time</TableHead>
                                    <TableHead className="text-right">Avg. Days to Win</TableHead>
                                    <TableHead className="text-right">Avg. Days to Loss</TableHead>
                                    <TableHead className="text-right">Calls (with Aircall ID)</TableHead>
                                    <TableHead className="text-right">Avg. Call Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.amEfficiencyData && stats.amEfficiencyData.length > 0 ? (
                                    stats.amEfficiencyData.map((am) => (
                                        <TableRow key={am.name}>
                                            <TableCell className="font-semibold">{am.name}</TableCell>
                                            <TableCell className="text-right font-semibold text-primary">{am.totalLeads}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{am.avgActivities}</TableCell>
                                            <TableCell className="text-right text-cyan-600 font-medium">
                                                {am.avgResponseTime !== null ? `${am.avgResponseTime} hrs` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-600 font-semibold">
                                                {am.avgDaysToWin !== null ? `${am.avgDaysToWin} days` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-red-500">
                                                {am.avgDaysToLoss !== null ? `${am.avgDaysToLoss} days` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-blue-600 font-semibold">
                                                {am.callsWithIdCount}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-600 font-semibold">
                                                {am.avgCallDuration !== null ? `${am.avgCallDuration} min` : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                                            No efficiency data available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
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
                                    <Tooltip />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                    <LeadStatusBadge status={lead.status || lead.customerStatus} />
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
                                                <LeadStatusBadge status={lead.status || lead.customerStatus} />
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

