"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Activity, LeadStatus, Appointment, VisitNote, LeadBucket } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Phone, Percent, Filter, SlidersHorizontal, X, Star, Calendar as CalendarIcon, Goal, TrendingUp, BarChart3, RefreshCw, 
  Flame, AlertCircle, ExternalLink, Layers, Send, User, Download, ClipboardCheck, CalendarCheck, Clock, ArrowRight, Info, Briefcase, DollarSign
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, startOfDay, endOfDay, isValid, parseISO,
  startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek,
  subMonths, subWeeks
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, where, limit, documentId, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { cn, getQuickDateRange } from '@/lib/utils';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const COLORS = ['#095c7b', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399', '#2dd4bf'];

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 
    'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 
    'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'LocalMile Opportunity', 
    'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent', 'Out of Territory', 'Future Follow-up'
];

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="h-3 w-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-4 text-xs space-y-2 shadow-lg border bg-popover text-popover-foreground z-50 leading-relaxed font-normal" onClick={(e) => e.stopPropagation()}>
      {content}
    </PopoverContent>
  </Popover>
);

const parseDateString = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
        const d = new Date(dateVal);
        d.setHours(0, 0, 0, 0);
        return d;
    }
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
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

// Value Calculation Logic (MRR)
const calculateMonthlyValue = (lead: Lead) => {
    const applicableStatuses = ['Quote Sent', 'Won', 'LocalMile Opportunity', 'LocalMile Pending', 'Trialing LocalMile', 'Free Trial', 'Trialing ShipMate'];
    const currentStatus = lead.customerStatus || lead.status;
    
    if (!applicableStatuses.includes(currentStatus)) {
        return 0;
    }
    
    if (!lead.services || lead.services.length === 0) {
        return 0;
    }
    
    let totalMonthlyValue = 0;
    for (const service of lead.services) {
        if (!service.rate) continue;
        
        if (service.frequency === 'Adhoc') {
             totalMonthlyValue += service.rate * 1;
             continue;
        } else if (Array.isArray(service.frequency)) {
            const weeklyDays = service.frequency.length;
            if (weeklyDays > 0) {
                totalMonthlyValue += service.rate * weeklyDays * 4.33;
            }
        }
    }
    
    return totalMonthlyValue;
};

// Group Statuses into 6 Logical Phases
const getPipelinePhase = (status: string): string => {
  const s = status || 'New';
  if (['Priority Lead', 'Priority Field Lead', 'Hot Lead'].includes(s)) {
    return 'Priority & Hot Leads';
  }
  if (['New'].includes(s)) {
    return 'New / Prospecting';
  }
  if (['Contacted', 'Connected', 'In Progress', 'Reschedule', 'In Qualification', 'Pre Qualified'].includes(s)) {
    return 'Active Engagement';
  }
  if (['Qualified', 'Prospect Opportunity', 'Customer Opportunity', 'LocalMile Opportunity', 'Quote Sent', 'Trialing ShipMate', 'Free Trial', 'LocalMile Pending', 'LPO Review', 'High Touch'].includes(s)) {
    return 'High-Intent / Opportunity';
  }
  if (['Won', 'Signed', 'Customer'].includes(s)) {
    return 'Converted';
  }
  return 'Closed / Inactive'; // Lost, Lost Customer, Unqualified, Email Brush Off, Out of Territory, Future Follow-up
};

export default function SalesSnapshotClient() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<(Activity & { leadId: string })[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Drilldown states
  const [drilldownType, setDrilldownType] = useState<'mrr' | 'appointments' | 'appointmentCounts' | null>(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');
  
  const cacheRef = useRef<{ [key: string]: { leads: Lead[], activities: (Activity & { leadId: string })[], appointments: Appointment[] } }>({});
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    dateFilterType: 'dateLeadEntered' as 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
    accountManager: [] as string[],
    dialer: [] as string[],
  });

  const [appliedFilters, setAppliedFilters] = useState({
    dateFilterType: 'dateLeadEntered' as 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
    accountManager: [] as string[],
    dialer: [] as string[],
  });

  const hasUnappliedFilters = useMemo(() => {
    return filters.dateFilterType !== appliedFilters.dateFilterType ||
           filters.dateRange?.from?.getTime() !== appliedFilters.dateRange?.from?.getTime() ||
           filters.dateRange?.to?.getTime() !== appliedFilters.dateRange?.to?.getTime() ||
           JSON.stringify(filters.franchisee) !== JSON.stringify(appliedFilters.franchisee) ||
           JSON.stringify(filters.status) !== JSON.stringify(appliedFilters.status) ||
           JSON.stringify(filters.bucket) !== JSON.stringify(appliedFilters.bucket) ||
           JSON.stringify(filters.accountManager) !== JSON.stringify(appliedFilters.accountManager) ||
           JSON.stringify(filters.dialer) !== JSON.stringify(appliedFilters.dialer);
  }, [filters, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      dateFilterType: 'dateLeadEntered' as const,
      dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      franchisee: [],
      status: [],
      bucket: [],
      accountManager: [],
      dialer: [],
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    setProgressMsg("Connecting to Firestore...");

    try {
        let startISO = '';
        if (appliedFilters.dateRange?.from) {
            startISO = startOfDay(appliedFilters.dateRange.from).toISOString();
        } else {
            // High-performance rolling limit: Default "All Time" to past 365 days
            startISO = subDays(new Date(), 365).toISOString();
        }

        const dateFilterType = appliedFilters.dateFilterType;
        const cacheKey = `${dateFilterType}_${startISO || 'all_time'}`;

        if (cacheRef.current[cacheKey]) {
            setProgressMsg("Loading from local cache...");
            const cached = cacheRef.current[cacheKey];
            setAllLeads(cached.leads);
            setActivities(cached.activities);
            setAppointments(cached.appointments);
            setLoading(false);
            return;
        }

        setProgressMsg("Retrieving records concurrently...");
        const leadsQuery = query(
            collection(firestore, 'leads'),
            where(dateFilterType, '>=', startISO)
        );
        const companiesQuery = query(
            collection(firestore, 'companies'),
            where(dateFilterType, '>=', startISO)
        );
        
        // Retrieve activities and appointments matching window
        const activityQuery = query(
            collectionGroup(firestore, 'activity'),
            where('date', '>=', startISO)
        );
        const apptQuery = query(
            collectionGroup(firestore, 'appointments'),
            where('duedate', '>=', startISO)
        );

        const [leadsSnap, companiesSnap, activitiesSnap, apptsSnap] = await Promise.all([
            getDocs(leadsQuery),
            getDocs(companiesQuery),
            getDocs(activityQuery),
            getDocs(apptQuery)
        ]);

        const mapDocs = (snap: any, isCompany: boolean) => {
            return snap.docs.map((doc: any) => ({
                id: doc.id,
                isFromCompaniesCollection: isCompany,
                ...doc.data()
            } as unknown as Lead));
        };

        const rawLeads = mapDocs(leadsSnap, false);
        const rawCompanies = mapDocs(companiesSnap, true);

        // Merge leads and companies uniquely
        const leadMap = new Map<string, Lead>();
        for (const item of [...rawLeads, ...rawCompanies]) {
            leadMap.set(item.id, item);
        }
        const leadsList = Array.from(leadMap.values());

        const actList = activitiesSnap.docs.map(doc => {
            const leadId = doc.ref.parent?.parent?.id || '';
            return { id: doc.id, leadId, ...doc.data() } as unknown as (Activity & { leadId: string });
        });

        const apptList = apptsSnap.docs.map(doc => {
            const leadId = doc.ref.parent?.parent?.id || '';
            return { id: doc.id, leadId, ...doc.data() } as unknown as Appointment;
        });

        // Cache the result
        cacheRef.current[cacheKey] = { leads: leadsList, activities: actList, appointments: apptList };
        setAllLeads(leadsList);
        setActivities(actList);
        setAppointments(apptList);
    } catch (e: any) {
        console.error("Sales snapshot load error:", e);
        setError(e.message || "Failed to retrieve reporting data.");
        toast({ variant: 'destructive', title: 'Loading Error', description: 'Could not retrieve sales process data.' });
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [userProfile, appliedFilters, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client Side Filtering & Aggregation
  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        if (lead.isDuplicate) return false;

        // Franchisee role override
        if (userProfile?.activeRole === 'Franchisee' && userProfile.franchisee) {
            if (lead.franchisee !== userProfile.franchisee) return false;
        }

        // Status filter
        const statusMatch = appliedFilters.status.length === 0 || 
                            appliedFilters.status.includes(lead.customerStatus || lead.status);

        // Franchisee filter
        const franchiseeMatch = appliedFilters.franchisee.length === 0 || 
                                (lead.franchisee && appliedFilters.franchisee.includes(lead.franchisee));

        // Bucket filter
        const resolvedBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const bucketMatch = appliedFilters.bucket.length === 0 || appliedFilters.bucket.includes(resolvedBucket);

        // Account Manager filter
        const amMatch = appliedFilters.accountManager.length === 0 ||
                        (lead.accountManagerAssigned && appliedFilters.accountManager.includes(lead.accountManagerAssigned));

        // Dialer filter
        const dialerMatch = appliedFilters.dialer.length === 0 ||
                            (lead.dialerAssigned && appliedFilters.dialer.includes(lead.dialerAssigned));

        // Date Range match
        let dateMatch = true;
        if (appliedFilters.dateRange?.from) {
            const dateVal = lead[appliedFilters.dateFilterType];
            const parsedDate = parseDateString(dateVal);
            if (!parsedDate) return false;
            
            const fromDate = startOfDay(appliedFilters.dateRange.from);
            const toDate = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(appliedFilters.dateRange.from);
            dateMatch = parsedDate >= fromDate && parsedDate <= toDate;
        }

        return statusMatch && franchiseeMatch && bucketMatch && amMatch && dialerMatch && dateMatch;
    });
  }, [allLeads, appliedFilters, userProfile]);

  const filteredLeadIds = useMemo(() => new Set(filteredLeads.map(l => l.id)), [filteredLeads]);

  // Filter activities and appointments based on filtered leads and selected date window
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
        if (!filteredLeadIds.has(act.leadId)) return false;
        if (appliedFilters.dateRange?.from) {
            const date = new Date(act.date);
            const fromDate = startOfDay(appliedFilters.dateRange.from);
            const toDate = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(appliedFilters.dateRange.from);
            return date >= fromDate && date <= toDate;
        }
        return true;
    });
  }, [activities, filteredLeadIds, appliedFilters]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
        if (!filteredLeadIds.has(appt.leadId)) return false;
        if (appliedFilters.dateRange?.from) {
            const date = new Date(appt.duedate);
            const fromDate = startOfDay(appliedFilters.dateRange.from);
            const toDate = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(appliedFilters.dateRange.from);
            return date >= fromDate && date <= toDate;
        }
        return true;
    });
  }, [appointments, filteredLeadIds, appliedFilters]);

  // Comprehensive Metrics Calculations
  const metrics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    
    let quotesCount = 0;
    let scfsCount = 0;
    let trialsCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    // 1. Source distribution
    const sourceMap: Record<string, { total: number; won: number }> = {};
    
    // 2. Bucket and User assignment breakdown
    // Structure: bucket -> user -> count
    const assignmentMap: Record<string, Record<string, number>> = {
      inbound: {},
      outbound: {},
      field_sales: {},
      account_manager: {},
      customer_success: {},
      nurture: {},
      marketing: {},
    };

    // 3. Leads Volume Over Time
    const volumeMap: Record<string, number> = {};

    // 4. Average Days in Status
    const statusDurations: Record<string, { totalDays: number; count: number }> = {};

    // 5. Pipeline Value by Lead Type
    const typeValueMap: Record<string, number> = {};

    // 6. Pipeline MRR
    let totalPipelineMRR = 0;
    const mrrStatusMap: Record<string, number> = {};

    // 7. Leads with MRR list
    const mrrLeadsList: Lead[] = [];

    // 8. Appointments
    const leadApptCounts: Record<string, number> = {};

    filteredLeads.forEach(lead => {
        const status = lead.customerStatus || lead.status;
        if (lead.quoteSentAt || status === 'Quote Sent') quotesCount++;
        if (lead.scfAcceptedAt || (lead.scfLinks && lead.scfLinks.some(s => s.status === 'Accepted'))) scfsCount++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) trialsCount++;
        if (lead.signedUpAt || status === 'Won' || status === 'Signed') wonCount++;
        if (status === 'Lost') lostCount++;

        // Lead source
        const src = lead.customerSource || lead.inboundDetails?.utmSource || 'Other / Direct';
        if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0 };
        sourceMap[src].total++;
        if (status === 'Won' || status === 'Signed') sourceMap[src].won++;

        // Bucket & User Assignment
        const b = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const assignedUser = lead.dialerAssigned || lead.salesRepAssigned || lead.accountManagerAssigned || 'Unassigned';
        if (assignmentMap[b]) {
          assignmentMap[b][assignedUser] = (assignmentMap[b][assignedUser] || 0) + 1;
        }

        // Volume over time
        const createdDateVal = lead[appliedFilters.dateFilterType];
        const parsedCreated = parseDateString(createdDateVal);
        if (parsedCreated) {
          const dateStr = format(parsedCreated, 'yyyy-MM-dd');
          volumeMap[dateStr] = (volumeMap[dateStr] || 0) + 1;
        }

        // Average Days in Status calculations (timeline trace from activities + explicit fields)
        const enteredDate = parseDateString(lead.dateLeadEntered);
        if (enteredDate) {
          const leadActivities = filteredActivities.filter(act => act.leadId === lead.id);
          
          // Find all status changes in activities
          const statusChanges = leadActivities
            .map(act => {
              if (!act.notes) return null;
              const match = act.notes.match(/Status changed to ([^(]+)/i);
              const dateVal = parseDateString(act.date);
              return match && match[1] && dateVal ? { stage: match[1].trim(), date: dateVal } : null;
            })
            .filter((x): x is { stage: string; date: Date } => x !== null);

          // Seed the timeline with explicit fields if they are set
          const explicitTransitions = [
            { stage: 'New', date: enteredDate },
            { stage: 'Quote Sent', date: parseDateString(lead.quoteSentAt) },
            { stage: 'SCF Accepted', date: parseDateString(lead.scfAcceptedAt) },
            { stage: 'Trial Started', date: parseDateString(lead.trialStartedAt) },
            { stage: 'Won', date: parseDateString(lead.signedUpAt) }
          ].filter(t => t.date !== null) as { stage: string; date: Date }[];

          // Combine both and sort chronologically
          const timelineMap = new Map<string, Date>();
          [...explicitTransitions, ...statusChanges].forEach(t => {
            const existing = timelineMap.get(t.stage);
            if (!existing || t.date < existing) {
              timelineMap.set(t.stage, t.date);
            }
          });

          const timeline = Array.from(timelineMap.entries())
            .map(([stage, date]) => ({ stage, date }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          for (let i = 0; i < timeline.length; i++) {
            const start = timeline[i];
            const end = timeline[i + 1] ? timeline[i + 1] : { date: new Date() };
            const diffMs = end.date.getTime() - start.date.getTime();
            const diffDays = Math.max(0, diffMs / (1000 * 3600 * 24));
            
            if (!statusDurations[start.stage]) {
              statusDurations[start.stage] = { totalDays: 0, count: 0 };
            }
            statusDurations[start.stage].totalDays += diffDays;
            statusDurations[start.stage].count++;
          }
        }

        // Pipeline MRR & Value
        const mrr = calculateMonthlyValue(lead);
        if (mrr > 0) {
          totalPipelineMRR += mrr;
          mrrStatusMap[status] = (mrrStatusMap[status] || 0) + mrr;
          mrrLeadsList.push(lead);
        }

        // Pipeline Value by Lead Type
        const lType = lead.leadType || 'Standard';
        typeValueMap[lType] = (typeValueMap[lType] || 0) + mrr;
    });

    const quoteRate = totalLeads > 0 ? (quotesCount / totalLeads) * 100 : 0;
    const winRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;

    // Format Lead Source Chart data
    const sourceData = Object.entries(sourceMap).map(([name, data]) => ({
      name,
      Leads: data.total,
      Wins: data.won,
      ConversionRate: parseFloat(((data.won / data.total) * 100).toFixed(1))
    })).sort((a, b) => b.Leads - a.Leads);

    // Format Volume Over Time Chart data
    const volumeData = Object.entries(volumeMap).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Format Average Days in Status data
    const avgDaysData = Object.entries(statusDurations).map(([name, data]) => ({
      name,
      value: parseFloat((data.totalDays / data.count).toFixed(1))
    })).sort((a, b) => b.value - a.value);

    // Format Pipeline Value by Lead Type data
    const typeValueData = Object.entries(typeValueMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Format Pipeline MRR status distribution
    const mrrStatusData = Object.entries(mrrStatusMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Activity Leaderboard calculation (Excluding System Users & Bot Accounts)
    const actLeaderboardMap: Record<string, { name: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }> = {};
    filteredActivities.forEach(act => {
      const author = act.author || 'Unknown Rep';
      const authorLower = author.toLowerCase();
      const isSystemAuthor = 
        authorLower.includes('system') || 
        authorLower.includes('engine') || 
        authorLower.includes('webhook') || 
        authorLower.includes('api') || 
        authorLower.includes('assistant') || 
        authorLower.includes('operator') || 
        authorLower.includes('nudge') ||
        authorLower.includes('cron') ||
        authorLower.includes('automation') ||
        authorLower === 'unknown rep';

      if (isSystemAuthor) return; // Skip system/automated logs

      if (!actLeaderboardMap[author]) {
        actLeaderboardMap[author] = { name: author, Calls: 0, Emails: 0, Meetings: 0, Updates: 0, Total: 0 };
      }
      if (act.type === 'Call') actLeaderboardMap[author].Calls++;
      else if (act.type === 'Email') actLeaderboardMap[author].Emails++;
      else if (act.type === 'Meeting') actLeaderboardMap[author].Meetings++;
      else actLeaderboardMap[author].Updates++;
      actLeaderboardMap[author].Total++;
    });
    const activityLeaderboard = Object.values(actLeaderboardMap).sort((a, b) => b.Total - a.Total);

    // Appointment count per lead
    filteredAppointments.forEach(appt => {
      leadApptCounts[appt.leadId] = (leadApptCounts[appt.leadId] || 0) + 1;
    });

    const uniqueLeadsWithAppointments = Object.keys(leadApptCounts).length;
    const totalAppointments = filteredAppointments.length;

    // Appointment Conversion Efficiency
    // Ratios of unique leads with appointments converting to Won, Quote, Trial, or Lost
    let apptWon = 0;
    let apptTrial = 0;
    let apptQuote = 0;
    let apptLost = 0;
    filteredLeads.forEach(lead => {
      if (leadApptCounts[lead.id]) {
        const status = lead.customerStatus || lead.status;
        if (status === 'Won' || status === 'Signed') apptWon++;
        else if (['Trialing ShipMate', 'Free Trial'].includes(status)) apptTrial++;
        else if (status === 'Quote Sent') apptQuote++;
        else if (status === 'Lost') apptLost++;
      }
    });

    const appointmentEfficiency = {
      won: uniqueLeadsWithAppointments > 0 ? (apptWon / uniqueLeadsWithAppointments) * 100 : 0,
      trial: uniqueLeadsWithAppointments > 0 ? (apptTrial / uniqueLeadsWithAppointments) * 100 : 0,
      quote: uniqueLeadsWithAppointments > 0 ? (apptQuote / uniqueLeadsWithAppointments) * 100 : 0,
      lost: uniqueLeadsWithAppointments > 0 ? (apptLost / uniqueLeadsWithAppointments) * 100 : 0,
    };

    // Pipeline Stages (6 groups)
    const pipelinePhasesMap: Record<string, number> = {
      'New / Prospecting': 0,
      'Priority & Hot Leads': 0,
      'Active Engagement': 0,
      'High-Intent / Opportunity': 0,
      'Converted': 0,
      'Closed / Inactive': 0
    };
    filteredLeads.forEach(lead => {
      const phase = getPipelinePhase(lead.customerStatus || lead.status);
      pipelinePhasesMap[phase]++;
    });

    const pipelineStagesData = Object.entries(pipelinePhasesMap).map(([name, count]) => ({
      name,
      count,
      percentage: totalLeads > 0 ? parseFloat(((count / totalLeads) * 100).toFixed(1)) : 0
    }));

    // Franchisee performance table data
    const franchiseePerf = filteredLeads.reduce((acc, lead) => {
        const f = lead.franchisee || 'Unassigned';
        if (!acc[f]) {
            acc[f] = { name: f, total: 0, quotes: 0, trials: 0, wins: 0 };
        }
        acc[f].total++;
        const status = lead.customerStatus || lead.status;
        if (lead.quoteSentAt || status === 'Quote Sent') acc[f].quotes++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) acc[f].trials++;
        if (lead.signedUpAt || status === 'Won' || status === 'Signed') acc[f].wins++;
        return acc;
    }, {} as Record<string, { name: string; total: number; quotes: number; trials: number; wins: number }>);

    const franchiseeData = Object.values(franchiseePerf).sort((a, b) => b.total - a.total);

    return {
        totalLeads,
        quotesCount,
        scfsCount,
        trialsCount,
        wonCount,
        quoteRate,
        winRate,
        sourceData,
        assignmentMap,
        volumeData,
        avgDaysData,
        typeValueData,
        totalPipelineMRR,
        mrrStatusData,
        mrrLeadsList,
        activityLeaderboard,
        uniqueLeadsWithAppointments,
        totalAppointments,
        leadApptCounts,
        appointmentEfficiency,
        pipelineStagesData,
        franchiseeData
    };
  }, [filteredLeads, filteredActivities, filteredAppointments, appliedFilters.dateFilterType]);

  // Options lists
  const franchiseeOptions = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f!, label: f! }));
  }, [allLeads]);

  const amOptions = useMemo(() => {
    const ams = new Set(allLeads.map(l => l.accountManagerAssigned).filter(Boolean));
    return Array.from(ams).map(a => ({ value: a!, label: a! }));
  }, [allLeads]);

  const dialerOptions = useMemo(() => {
    const dialers = new Set(allLeads.map(l => l.dialerAssigned).filter(Boolean));
    return Array.from(dialers).map(d => ({ value: d!, label: d! }));
  }, [allLeads]);

  const statusOptions = useMemo(() => {
    return leadStatuses.map(s => ({ value: s, label: s === 'Won' ? 'Signed' : s }));
  }, []);

  const bucketOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'field_sales', label: 'Field Sales' },
    { value: 'account_manager', label: 'Account Manager' }
  ];

  // Export drilldown table to CSV helper
  const handleExportDrilldown = (data: Lead[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'List is empty.' });
      return;
    }
    const headers = ['Company Name', 'Status', 'Lead Type', 'MRR Value', 'Dialer Assigned', 'AM Assigned', 'Franchisee'];
    const csvContent = [
      headers.join(','),
      ...data.map(lead => [
        `"${lead.companyName.replace(/"/g, '""')}"`,
        `"${lead.customerStatus || lead.status}"`,
        `"${lead.leadType || ''}"`,
        `"${calculateMonthlyValue(lead)}"`,
        `"${lead.dialerAssigned || ''}"`,
        `"${lead.accountManagerAssigned || ''}"`,
        `"${lead.franchisee || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Trigger
  const triggerPdfExport = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 p-1 relative print:bg-white print:p-0">
      {/* Styles for Presentation Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
          .card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div id="print-area" className="space-y-6">
        <header className="flex flex-row items-center justify-between no-print">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Sales Process Snapshot</h1>
            <p className="text-muted-foreground">Unified conversion metrics across Inbound, Outbound, Field Sales, and AM.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={triggerPdfExport} variant="outline" size="sm" className="bg-[#095c7b] text-white hover:bg-[#095c7b]/90">
              <Download className="mr-2 h-4 w-4" /> Download PDF Report
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading || isRefreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", (loading || isRefreshing) && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </header>

        {/* Filters Card */}
        <Collapsible defaultOpen={true} className="no-print">
          <Card className="border-[#095c7b]/20 shadow-sm card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#095c7b]" />
                <CardTitle className="text-md">Report Filters</CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust</Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Date Field Filter Base</Label>
                  <Select value={filters.dateFilterType} onValueChange={(val: any) => setFilters(prev => ({ ...prev, dateFilterType: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dateLeadEntered">Date Lead Entered</SelectItem>
                      <SelectItem value="quoteSentAt">Date Quote Sent</SelectItem>
                      <SelectItem value="signedUpAt">Date Signed Up</SelectItem>
                      <SelectItem value="scfAcceptedAt">Date SCF Accepted</SelectItem>
                      <SelectItem value="trialStartedAt">Date Trial Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quick Date Range Preset</Label>
                  <Select onValueChange={(val) => setFilters(prev => ({ ...prev, dateRange: getQuickDateRange(val) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="all-time">All Time (Past 365 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Window</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full text-left font-normal justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {filters.dateRange?.from ? (
                            filters.dateRange.to ? `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}` : format(filters.dateRange.from, "LLL dd, y")
                          ) : "Pick a date range"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="range" selected={filters.dateRange} onSelect={(date) => setFilters(prev => ({ ...prev, dateRange: date }))} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <MultiSelectCombobox options={bucketOptions} selected={filters.bucket} onSelectedChange={(val) => setFilters(prev => ({ ...prev, bucket: val }))} placeholder="All Buckets" />
                </div>

                <div className="space-y-2">
                  <Label>Franchisee</Label>
                  <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => setFilters(prev => ({ ...prev, franchisee: val }))} placeholder="All Franchisees" />
                </div>

                <div className="space-y-2">
                  <Label>Account Manager</Label>
                  <MultiSelectCombobox options={amOptions} selected={filters.accountManager} onSelectedChange={(val) => setFilters(prev => ({ ...prev, accountManager: val }))} placeholder="All AMs" />
                </div>

                <div className="space-y-2">
                  <Label>User (Dialer)</Label>
                  <MultiSelectCombobox options={dialerOptions} selected={filters.dialer} onSelectedChange={(val) => setFilters(prev => ({ ...prev, dialer: val }))} placeholder="All Dialers" />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <MultiSelectCombobox options={statusOptions} selected={filters.status} onSelectedChange={(val) => setFilters(prev => ({ ...prev, status: val }))} placeholder="All Statuses" />
                </div>

                <div className="flex justify-between items-center col-span-full pt-2">
                  <Button variant="ghost" onClick={clearFilters} className="text-xs text-muted-foreground"><X className="mr-2 h-3.5 w-3.5" /> Reset Filters</Button>
                  <div className="flex items-center gap-3">
                    {hasUnappliedFilters && <span className="text-xs text-amber-600 font-medium">Pending changes...</span>}
                    <Button onClick={applyFilters} className={cn("bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-semibold text-xs", hasUnappliedFilters && "scale-105 shadow-md bg-amber-500 hover:bg-amber-600")}>
                      Apply Filter Range
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Main Content Area */}
        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16 border-dashed card">
            <Loader />
            <p className="text-xs text-muted-foreground mt-4 animate-pulse">{progressMsg}</p>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 p-6 flex flex-row items-center gap-3 card">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <CardTitle className="text-red-800 text-sm">Failed to Load Report</CardTitle>
              <CardDescription className="text-red-600 mt-1">{error}</CardDescription>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            
            {/* Unified KPI Summary Cards Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              <Card className="shadow-sm card hover:shadow-md transition-shadow">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase">Total Sourced</CardDescription>
                  <SectionHelp content="The overall count of non-duplicate leads created or active within the filtered time period." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-[#095c7b]">{metrics.totalLeads}</div>
                </CardContent>
              </Card>

              {/* Quotes Dispatched */}
              <Card className="shadow-sm card">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase">Quotes Sent</CardDescription>
                  <SectionHelp content="Number of leads with dispatched quotes in the selected period." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-[#095c7b]">{metrics.quotesCount}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.quoteRate.toFixed(1)}% quoting rate</p>
                </CardContent>
              </Card>

              {/* SCFs Accepted */}
              <Card className="shadow-sm card">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase">SCFs Accepted</CardDescription>
                  <SectionHelp content="Number of Sign-up Confirmation Forms (agreements) accepted in the period." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-[#095c7b]">{metrics.scfsCount}</div>
                </CardContent>
              </Card>

              {/* Free Trials */}
              <Card className="shadow-sm card">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase">Free Trials</CardDescription>
                  <SectionHelp content="Number of active or initiated ShipMate/LocalMile trials started in the period." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-[#095c7b]">{metrics.trialsCount}</div>
                </CardContent>
              </Card>

              {/* Leads with MRR (Drilldown Pop-up trigger) */}
              <Card className="shadow-sm card cursor-pointer hover:border-[#095c7b] transition-all bg-emerald-50/50" onClick={() => setDrilldownType('mrr')}>
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase text-emerald-800">Leads with MRR</CardDescription>
                  <SectionHelp content="Count of leads that have monthly recurring revenue services configured. Click to view lead list, search, and export." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-emerald-700 flex items-center gap-1">
                    {metrics.mrrLeadsList.length}
                    <ExternalLink className="h-3 w-3 no-print" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Pipeline MRR */}
              <Card className="shadow-sm card">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase text-sky-800">Pipeline MRR</CardDescription>
                  <SectionHelp content="Total Potential Monthly Recurring Revenue (MRR) calculated across all qualified, trialing, and signed leads." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-sky-700">${metrics.totalPipelineMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </CardContent>
              </Card>

              {/* Appointments (Drilldown Pop-up trigger, combined unique and total) */}
              <Card className="shadow-sm card cursor-pointer hover:border-[#095c7b] transition-all" onClick={() => setDrilldownType('appointments')}>
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase">Appointments</CardDescription>
                  <SectionHelp content="Unique leads with scheduled appointments (and total appointments) in the period. Click to view details." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-[#095c7b] flex items-center gap-1">
                    {metrics.uniqueLeadsWithAppointments}
                    <span className="text-[11px] text-muted-foreground font-normal">({metrics.totalAppointments} total)</span>
                    <ExternalLink className="h-3 w-3 no-print" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm card bg-green-50/50">
                <CardHeader className="pb-1 flex flex-row justify-between items-center space-y-0">
                  <CardDescription className="text-[10px] font-semibold uppercase text-green-800">Signed (Won)</CardDescription>
                  <SectionHelp content="Number of successfully converted and signed customers in the period, alongside overall win percentage." />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-extrabold text-green-700">{metrics.wonCount} ({metrics.winRate.toFixed(1)}%)</div>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Stages Breakdown (Status Groupings) */}
            <Card className="shadow-sm card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-5 w-5 text-[#095c7b]" />
                  <CardTitle className="text-sm font-semibold">Management & Franchisee Pipeline Stage Breakdown</CardTitle>
                </div>
                <SectionHelp content="High-level stages grouping all lead statuses to give management and franchisee owners an instant overview of the lead pipeline distribution." />
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.pipelineStagesData.map((stage, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-slate-50/50 flex flex-col justify-between min-h-[140px]">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block leading-none mb-1">{stage.name}</span>
                      <span className="text-2xl font-bold text-slate-800 block">{stage.count}</span>
                      <span className="text-[9px] text-muted-foreground block leading-tight mt-1 bg-slate-100 p-1.5 rounded border border-slate-200/50">
                        <strong>Includes:</strong> <br/>
                        {stage.name === 'New / Prospecting' && 'New'}
                        {stage.name === 'Priority & Hot Leads' && 'Priority Lead, Priority Field Lead, Hot Lead'}
                        {stage.name === 'Active Engagement' && 'Contacted, Connected, In Progress, Reschedule, In Qualification, Pre Qualified'}
                        {stage.name === 'High-Intent / Opportunity' && 'Qualified, Prospect Opportunity, Customer Opportunity, LocalMile Opportunity, Quote Sent, Trialing ShipMate, Free Trial, LocalMile Pending, LPO Review, High Touch'}
                        {stage.name === 'Converted' && 'Won, Signed, Customer'}
                        {stage.name === 'Closed / Inactive' && 'Lost, Lost Customer, Unqualified, Email Brush Off, Out of Territory, Future Follow-up'}
                      </span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#095c7b] h-full" style={{ width: `${stage.percentage}%` }}></div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">{stage.percentage}% of pipeline</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Visualisations Grid 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Leads Volume Over Time */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#095c7b]" /> Leads Volume Over Time
                  </CardTitle>
                  <SectionHelp content="Visual representation of new lead registration counts over days in the selected time period." />
                </CardHeader>
                <CardContent className="h-[260px]">
                  {metrics.volumeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.volumeData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#095c7b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#095c7b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#095c7b" fillOpacity={1} fill="url(#colorCount)" name="Leads Sourced" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No historical data in this range.</div>
                  )}
                </CardContent>
              </Card>

              {/* Lead Source Breakdown */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#095c7b]" /> Lead Source breakdown
                  </CardTitle>
                  <SectionHelp content="Volume distribution and conversion rates (Won %) mapped directly against the original customer source." />
                </CardHeader>
                <CardContent className="h-[260px]">
                  {metrics.sourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.sourceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip />
                        <Bar dataKey="Leads" fill="#095c7b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Wins" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No source data available.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Visualisations Grid 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Average Days in Status */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#095c7b]" /> Average Days in Status
                  </CardTitle>
                  <SectionHelp content="Average days spent by leads in each major pipeline transition. Helps isolate blockages." />
                </CardHeader>
                <CardContent className="h-[260px]">
                  {metrics.avgDaysData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.avgDaysData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} name="Average Days" maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No duration data available.</div>
                  )}
                </CardContent>
              </Card>

              {/* Pipeline Value by Lead Type */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#095c7b]" /> Pipeline Value by Lead Type
                  </CardTitle>
                  <SectionHelp content="Sum of monthly recurring revenue (MRR) pipeline value split across different lead types." />
                </CardHeader>
                <CardContent className="h-[260px]">
                  {metrics.typeValueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.typeValueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Pipeline Value']} />
                        <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No value data available.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Visualisations Grid 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Activity Leaderboard */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Goal className="h-4 w-4 text-[#095c7b]" /> Activity Leaderboard
                  </CardTitle>
                  <SectionHelp content="Ranks users/reps by total volume of logged calls, emails, and meetings." />
                </CardHeader>
                <CardContent className="h-[280px]">
                  {metrics.activityLeaderboard.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.activityLeaderboard.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip />
                        <Bar dataKey="Calls" stackId="a" fill="#095c7b" />
                        <Bar dataKey="Emails" stackId="a" fill="#38bdf8" />
                        <Bar dataKey="Meetings" stackId="a" fill="#fbbf24" />
                        <Bar dataKey="Updates" stackId="a" fill="#f472b6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No activities logged in this range.</div>
                  )}
                </CardContent>
              </Card>

              {/* Appointment Conversion Efficiency */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Percent className="h-4 w-4 text-[#095c7b]" /> Appointment Conversion Efficiency
                  </CardTitle>
                  <SectionHelp content="Measures rates of leads with scheduled appointments converting to Won status, Quote status, Trial status, or Lost status." />
                </CardHeader>
                <CardContent className="flex flex-col justify-center h-[280px]">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Transition Stage</TableHead>
                        <TableHead className="text-right text-xs font-semibold">Efficiency Rate (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs py-3 font-medium">Appointment to Win (Signed)</TableCell>
                        <TableCell className="text-right text-xs py-3 font-bold text-green-600">{metrics.appointmentEfficiency.won.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs py-3 font-medium">Appointment to Free Trial</TableCell>
                        <TableCell className="text-right text-xs py-3 font-bold text-[#095c7b]">{metrics.appointmentEfficiency.trial.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs py-3 font-medium">Appointment to Quote Sent</TableCell>
                        <TableCell className="text-right text-xs py-3 font-bold text-amber-500">{metrics.appointmentEfficiency.quote.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs py-3 font-medium">Appointment to Lost</TableCell>
                        <TableCell className="text-right text-xs py-3 font-bold text-rose-500">{metrics.appointmentEfficiency.lost.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Bucket & User Assignment Breakdown Table */}
            <Card className="shadow-sm card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-[#095c7b]" /> Bucket &amp; Rep Assignment Breakdown
                </CardTitle>
                <SectionHelp content="Shows the total volume of leads assigned to each user/rep segmented by their originating source bucket." />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {Object.entries(metrics.assignmentMap).map(([bucket, users]) => {
                    const displayName = bucket === 'outbound' ? 'Outbound' :
                                        bucket === 'inbound' ? 'Inbound' :
                                        bucket === 'field_sales' ? 'Field Sales' :
                                        bucket === 'account_manager' ? 'Account Manager' :
                                        bucket === 'customer_success' ? 'Customer Success' :
                                        bucket === 'nurture' ? 'Nurture' : 'Marketing';
                    return (
                      <div key={bucket} className="border rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between min-h-[180px]">
                        <div>
                          <h3 className="text-[11px] font-bold text-[#095c7b] border-b pb-1.5 mb-2.5 uppercase tracking-wider">{displayName}</h3>
                          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {Object.entries(users).length > 0 ? (
                              Object.entries(users).sort((a,b)=>b[1]-a[1]).map(([user, count]) => (
                                <div key={user} className="flex justify-between items-center text-[11px]">
                                  <span className="text-muted-foreground truncate max-w-[100px]">{user}</span>
                                  <Badge variant="secondary" className="font-semibold text-[10px] px-1 py-0">{count}</Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic block text-center py-4">No leads</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Franchisee Process Breakdown */}
            <Card className="shadow-sm card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#095c7b]" /> Franchisee Process Breakdown
                </CardTitle>
                <SectionHelp content="Breakdown of individual franchisee performance metrics across lead sourcing, quoting, trials, and signed accounts." />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#f8fafb] sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Franchisee</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Total Sourced</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Quotes Dispatched</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Trials Initiated</TableHead>
                        <TableHead className="text-right font-semibold text-xs text-green-700">Signed (Won)</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Conv. %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.franchiseeData.length > 0 ? (
                        metrics.franchiseeData.map((f) => {
                          const rate = f.total > 0 ? (f.wins / f.total) * 100 : 0;
                          return (
                            <TableRow key={f.name} className="hover:bg-muted/50">
                              <TableCell className="font-medium text-xs py-2">{f.name}</TableCell>
                              <TableCell className="text-right text-xs py-2">{f.total}</TableCell>
                              <TableCell className="text-right text-xs py-2">{f.quotes}</TableCell>
                              <TableCell className="text-right text-xs py-2">{f.trials}</TableCell>
                              <TableCell className="text-right text-xs py-2 font-bold text-green-600">{f.wins}</TableCell>
                              <TableCell className="text-right text-xs py-2 font-semibold">{rate.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">No franchisee records found matching filter criteria</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Drilldown Dialog Modal */}
      <Dialog open={drilldownType !== null} onOpenChange={(open) => { if (!open) setDrilldownType(null); setDrilldownSearch(''); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#095c7b]">
              {drilldownType === 'mrr' && 'Leads with configured MRR Value'}
              {drilldownType === 'appointments' && 'Leads with scheduled Appointments'}
              {drilldownType === 'appointmentCounts' && 'All Scheduled Appointments Details'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Filter and search the detail list below. Use the download button to export to CSV format.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-4 my-2">
            <Input 
              placeholder="Search by Company Name..." 
              value={drilldownSearch}
              onChange={(e) => setDrilldownSearch(e.target.value)}
              className="max-w-sm text-xs"
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold"
              onClick={() => {
                let listToExport: Lead[] = [];
                if (drilldownType === 'mrr') listToExport = metrics.mrrLeadsList;
                else if (drilldownType === 'appointments') {
                  listToExport = filteredLeads.filter(l => metrics.leadApptCounts[l.id] > 0);
                } else if (drilldownType === 'appointmentCounts') {
                  listToExport = filteredLeads.filter(l => metrics.leadApptCounts[l.id] > 0);
                }
                handleExportDrilldown(listToExport, `${drilldownType}_report`);
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV List
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs">Company Name</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Lead Type</TableHead>
                  <TableHead className="text-right text-xs">MRR Value ($)</TableHead>
                  <TableHead className="text-xs">Dialer Assigned</TableHead>
                  <TableHead className="text-xs">Franchisee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let filteredList = filteredLeads.filter(l => {
                    if (drilldownType === 'mrr') return calculateMonthlyValue(l) > 0;
                    if (drilldownType === 'appointments' || drilldownType === 'appointmentCounts') return (metrics.leadApptCounts[l.id] || 0) > 0;
                    return false;
                  });

                  if (drilldownSearch.trim()) {
                    filteredList = filteredList.filter(l => l.companyName.toLowerCase().includes(drilldownSearch.toLowerCase()));
                  }

                  if (filteredList.length > 0) {
                    return filteredList.map(lead => (
                      <TableRow key={lead.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs py-2 font-medium">{lead.companyName}</TableCell>
                        <TableCell className="text-xs py-2"><LeadStatusBadge status={(lead.customerStatus || lead.status) as LeadStatus} /></TableCell>
                        <TableCell className="text-xs py-2">{lead.leadType || 'Standard'}</TableCell>
                        <TableCell className="text-right text-xs py-2 font-bold">${calculateMonthlyValue(lead).toFixed(0)}</TableCell>
                        <TableCell className="text-xs py-2">{lead.dialerAssigned || '-'}</TableCell>
                        <TableCell className="text-xs py-2">{lead.franchisee || '-'}</TableCell>
                      </TableRow>
                    ));
                  } else {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground italic">No matching records found.</TableCell>
                      </TableRow>
                    );
                  }
                })()}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
