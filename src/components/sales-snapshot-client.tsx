"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import type { Lead, Activity, LeadStatus, Appointment, VisitNote, LeadBucket } from '@/lib/types';
import { calculateMonthlyValue } from '@/lib/mrr';
import { LeadCampaign, getLeadCampaigns } from '@/services/lead-campaigns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, LabelList
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
  subMonths, subWeeks, isWeekend
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
import { StatusOutcomeBanner, StatusOutcomeGuideButton } from './status-outcome-guide';
import { cn, getQuickDateRange, isManualActivity } from '@/lib/utils';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const COLORS = ['#095c7b', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399', '#2dd4bf'];

const leadStatuses: LeadStatus[] = [
    'New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Appointment Booked', 'Unqualified', 
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

const getStageHelpContent = (stageName: string, count: number, totalLeads: number, percentage: number) => {
  switch (stageName) {
    case 'New / Prospecting':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-slate-900 border-b pb-1">New / Prospecting Stage</p>
          <p><strong className="text-sky-700">{count} Stage Count:</strong> Leads sitting specifically in the initial <strong>New</strong> status ({percentage}% of pipeline).</p>
          <p><strong className="text-[#095c7b]">{totalLeads} Total Sourced:</strong> Combined volume of leads created in the selected date range across <em>all 6 pipeline stages</em>.</p>
        </div>
      );
    case 'Priority & Hot Leads':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-amber-900 border-b pb-1">Priority &amp; Hot Leads Stage</p>
          <p><strong className="text-amber-800">{count} Stage Count:</strong> High-priority leads requiring urgent sales focus ({percentage}% of pipeline).</p>
          <p className="text-slate-600">Includes statuses: <em>Priority Lead, Priority Field Lead, Hot Lead</em>.</p>
        </div>
      );
    case 'Active Engagement':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-indigo-900 border-b pb-1">Active Engagement Stage</p>
          <p><strong className="text-indigo-800">{count} Stage Count:</strong> Leads actively in outreach or qualification dialogues ({percentage}% of pipeline).</p>
          <p className="text-slate-600">Includes statuses: <em>Contacted, Connected, In Progress, Reschedule, In Qualification, Pre Qualified</em>.</p>
        </div>
      );
    case 'High-Intent / Opportunity':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-purple-900 border-b pb-1">High-Intent / Opportunity Stage</p>
          <p><strong className="text-purple-800">{count} Stage Count:</strong> Advanced leads with active quotes, accepted SCFs, or ongoing free trials ({percentage}% of pipeline).</p>
          <p className="text-slate-600">Includes statuses: <em>Qualified, Quote Sent, SCF Accepted, Free Trial, Trialing ShipMate, LocalMile Pending, LPO Review</em>.</p>
        </div>
      );
    case 'Converted':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-emerald-900 border-b pb-1">Converted Stage (Won)</p>
          <p><strong className="text-emerald-800">{count} Stage Count:</strong> Successfully closed and signed paying customer accounts ({percentage}% of pipeline).</p>
          <p className="text-slate-600">Includes statuses: <em>Won, Signed, Customer</em>.</p>
        </div>
      );
    case 'Closed / Inactive':
      return (
        <div className="space-y-1.5">
          <p className="font-bold text-slate-900 border-b pb-1">Closed / Inactive Stage</p>
          <p><strong className="text-slate-700">{count} Stage Count:</strong> Leads marked as lost, unqualified, or out of service territory ({percentage}% of pipeline).</p>
          <p className="text-slate-600">Includes statuses: <em>Lost, Lost Customer, Unqualified, Email Brush Off, Out of Territory, Future Follow-up</em>.</p>
        </div>
      );
    default:
      return <div>Stage metric details for {stageName}.</div>;
  }
};

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

// Helper to check if status is Signed/Won/Customer
const isSignedStatus = (status: string): boolean => {
    const s = status || '';
    return ['Won', 'Signed', 'Customer'].includes(s);
};

// Helper to verify if a signed lead signed up within the active date filter range
const isRecentlySignedUp = (
  lead: Lead,
  leadActivities: Activity[],
  dateRange?: DateRange,
  dateFilterType?: string
): boolean => {
  const status = lead.customerStatus || lead.status;
  const isWonStatus = status === 'Won' || status === 'Signed' || !!lead.signedUpAt;
  if (!isWonStatus) return false;

  // If no date range filter is set, match any Won/Signed lead
  if (!dateRange?.from) return true;

  const fromDate = startOfDay(dateRange.from);
  const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

  // Check 1: Explicit signedUpAt date field
  if (lead.signedUpAt) {
    const parsedSignedUp = parseDateString(lead.signedUpAt);
    if (parsedSignedUp) {
      return parsedSignedUp >= fromDate && parsedSignedUp <= toDate;
    }
  }

  // Check 2: Status transition activity to 'Won' or 'Signed'
  const signedActivity = leadActivities.find(
    act => act.notes && /Status changed to (Won|Signed)/i.test(act.notes)
  );
  if (signedActivity) {
    const parsedActDate = parseDateString(signedActivity.date);
    if (parsedActDate) {
      return parsedActDate >= fromDate && parsedActDate <= toDate;
    }
  }

  // Check 3: If dateFilterType is 'signedUpAt', dateMatch in filteredLeads already verified range
  if (dateFilterType === 'signedUpAt') return true;

  // Check 4: Fallback for leads created during the period if signedUpAt is missing
  if (lead.dateLeadEntered) {
    const parsedEntered = parseDateString(lead.dateLeadEntered);
    if (parsedEntered) {
      return parsedEntered >= fromDate && parsedEntered <= toDate;
    }
  }

  return false;
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

const BUCKET_DISPLAY_NAMES: Record<string, string> = {
  outbound: 'Outbound (Dialer)',
  field_sales: 'Field Sales',
  inbound: 'Inbound',
  account_manager: 'Account Manager',
  customer_success: 'Customer Success',
  nurture: 'Nurture',
  marketing: 'Marketing',
  lpo_plus: 'LPO Plus',
  unassigned: 'Unassigned'
};

const getLeadBucketLabel = (lead: Lead): string => {
  const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
  return BUCKET_DISPLAY_NAMES[b] || b.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const isFranchiseeGeneratedLead = (lead: Lead, userProfile?: any): boolean => {
  if (lead.isZeeCreated || lead.franchiseeReviewPending) return true;
  if (lead.customerSource === 'Franchisee Generated' || lead.leadSource === 'Franchisee Generated' || lead.campaign === 'Franchisee Generated' || lead.leadSource === '-4') return true;
  if (lead.createdByRole && (lead.createdByRole === 'Franchisee' || lead.createdByRole.toLowerCase() === 'franchisee')) return true;
  if (userProfile && lead.createdByUid && lead.createdByUid === userProfile.uid) return true;
  return false;
};

const STAGE_COLOR_STYLES: Record<string, {
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  countColor: string;
  barBg: string;
  badgeBg: string;
}> = {
  'New / Prospecting': {
    cardBg: 'bg-sky-50/70 hover:bg-sky-100/80',
    cardBorder: 'border-sky-200 hover:border-sky-400',
    titleColor: 'text-sky-800',
    countColor: 'text-sky-950',
    barBg: 'bg-sky-500',
    badgeBg: 'bg-sky-100/80 border-sky-200'
  },
  'Priority & Hot Leads': {
    cardBg: 'bg-amber-50/70 hover:bg-amber-100/80',
    cardBorder: 'border-amber-200 hover:border-amber-400',
    titleColor: 'text-amber-800',
    countColor: 'text-amber-950',
    barBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100/80 border-amber-200'
  },
  'Active Engagement': {
    cardBg: 'bg-indigo-50/70 hover:bg-indigo-100/80',
    cardBorder: 'border-indigo-200 hover:border-indigo-400',
    titleColor: 'text-indigo-800',
    countColor: 'text-indigo-950',
    barBg: 'bg-indigo-500',
    badgeBg: 'bg-indigo-100/80 border-indigo-200'
  },
  'High-Intent / Opportunity': {
    cardBg: 'bg-purple-50/70 hover:bg-purple-100/80',
    cardBorder: 'border-purple-200 hover:border-purple-400',
    titleColor: 'text-purple-800',
    countColor: 'text-purple-950',
    barBg: 'bg-purple-500',
    badgeBg: 'bg-purple-100/80 border-purple-200'
  },
  'Converted': {
    cardBg: 'bg-emerald-50/80 hover:bg-emerald-100/90',
    cardBorder: 'border-emerald-300 hover:border-emerald-500',
    titleColor: 'text-emerald-800',
    countColor: 'text-emerald-950',
    barBg: 'bg-emerald-600',
    badgeBg: 'bg-emerald-100 border-emerald-300'
  },
  'Closed / Inactive': {
    cardBg: 'bg-slate-100/60 hover:bg-slate-200/70',
    cardBorder: 'border-slate-200 hover:border-slate-400',
    titleColor: 'text-slate-700',
    countColor: 'text-slate-900',
    barBg: 'bg-slate-400',
    badgeBg: 'bg-slate-200/70 border-slate-300'
  }
};

const getUserInCharge = (lead: Lead): string => {
  const b = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
  
  if (b === 'outbound' || b === 'inbound') {
    return lead.dialerAssigned || lead.salesRepAssigned || lead.accountManagerAssigned || 'Unassigned';
  }
  if (b === 'field_sales') {
    return lead.fieldRepAssigned || lead.salesRepAssigned || lead.dialerAssigned || 'Unassigned';
  }
  if (b === 'account_manager') {
    return lead.accountManagerAssigned || lead.salesRepAssigned || lead.dialerAssigned || 'Unassigned';
  }
  if (b === 'customer_success') {
    return lead.customerSuccessAssigned || lead.accountManagerAssigned || lead.salesRepAssigned || 'Unassigned';
  }
  return lead.dialerAssigned || lead.accountManagerAssigned || lead.salesRepAssigned || lead.fieldRepAssigned || lead.customerSuccessAssigned || 'Unassigned';
};

export default function SalesSnapshotClient() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<(Activity & { leadId: string })[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { setLoadTime, setPageName, setIsCustom } = usePerformance();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsCustom(true);
    setPageName("Sales Snapshot");
  }, [setIsCustom, setPageName]);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Drilldown & Franchisee states
  const [drilldownType, setDrilldownType] = useState<'mrr' | 'appointments' | 'quotes' | 'scfs' | 'trials' | 'signed' | 'signed_mrr' | 'stage' | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');
  const [franchiseeLeadSearch, setFranchiseeLeadSearch] = useState('');
  const [pipelineValueGroupBy, setPipelineValueGroupBy] = useState<'leadType' | 'bucket'>('bucket');
  
  const cacheRef = useRef<{ [key: string]: { leads: Lead[], activities: (Activity & { leadId: string })[], appointments: Appointment[] } }>({});
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const isFranchisee = userProfile?.activeRole === 'Franchisee' || 
                       userProfile?.role === 'Franchisee' || 
                       userProfile?.role?.toLowerCase() === 'franchisee' ||
                       (Array.isArray(userProfile?.assignedRoles) && userProfile.assignedRoles.some((r: string) => r.toLowerCase() === 'franchisee'));

  const [availableCampaigns, setAvailableCampaigns] = useState<LeadCampaign[]>([]);

  useEffect(() => {
    getLeadCampaigns().then((camps: LeadCampaign[]) => setAvailableCampaigns(camps.filter((c: LeadCampaign) => c.isActive))).catch(console.error);
  }, []);

  const [filters, setFilters] = useState({
    dateFilterType: 'activityDate' as 'activityDate' | 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
    accountManager: [] as string[],
    dialer: [] as string[],
    campaign: 'all',
  });

  const [appliedFilters, setAppliedFilters] = useState({
    dateFilterType: 'activityDate' as 'activityDate' | 'dateLeadEntered' | 'quoteSentAt' | 'signedUpAt' | 'scfAcceptedAt' | 'trialStartedAt',
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } as DateRange | undefined,
    franchisee: [] as string[],
    status: [] as string[],
    bucket: [] as string[],
    accountManager: [] as string[],
    dialer: [] as string[],
    campaign: 'all',
  });

  const hasUnappliedFilters = useMemo(() => {
    return filters.dateFilterType !== appliedFilters.dateFilterType ||
           filters.dateRange?.from?.getTime() !== appliedFilters.dateRange?.from?.getTime() ||
           filters.dateRange?.to?.getTime() !== appliedFilters.dateRange?.to?.getTime() ||
           filters.campaign !== appliedFilters.campaign ||
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
      dateFilterType: 'activityDate' as const,
      dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      franchisee: [],
      status: [],
      bucket: [],
      accountManager: [],
      dialer: [],
      campaign: 'all',
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    console.time("Sales Snapshot - Load Time");
    const startTimePerf = performance.now();
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

        setProgressMsg("Retrieving activities...");
        const endISO = appliedFilters.dateRange?.to ? endOfDay(appliedFilters.dateRange.to).toISOString() : endOfDay(new Date()).toISOString();
        
        // Retrieve activities and appointments matching window
        const activityQuery = query(
            collectionGroup(firestore, 'activity'),
            where('date', '>=', startISO),
            where('date', '<=', endISO)
        );
        const apptQuery = query(
            collectionGroup(firestore, 'appointments'),
            where('duedate', '>=', startISO),
            where('duedate', '<=', endISO)
        );

        const [activitiesSnap, apptsSnap, usersSnap] = await Promise.all([
            getDocs(activityQuery),
            getDocs(apptQuery),
            getDocs(collection(firestore, 'users'))
        ]);

        const amUserIdentifiers = new Set<string>();
        usersSnap.docs.forEach(doc => {
            const u = doc.data() || {};
            const roles = u.assignedRoles || [];
            const isAM = roles.some((r: string) => ['Account Manager', 'Account Managers', 'account managers'].includes(r));
            if (isAM && !u.disabled) {
                if (u.email) {
                    amUserIdentifiers.add(u.email.toLowerCase().trim());
                }
                const firstName = u.firstName || '';
                const lastName = u.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
                if (fullName) {
                    amUserIdentifiers.add(fullName);
                }
                if (u.displayName) {
                    amUserIdentifiers.add(u.displayName.toLowerCase().trim());
                }
            }
        });

        const actList = activitiesSnap.docs.map(doc => {
            const leadId = doc.ref.parent?.parent?.id || '';
            return { id: doc.id, leadId, ...doc.data() } as unknown as (Activity & { leadId: string });
        }).filter(act => {
            const author = (act.author || '').trim().toLowerCase();
            if (!author || author === 'system' || author === 'api' || author === 'prospectplus' || author.includes('automated')) {
                return false;
            }
            return amUserIdentifiers.has(author);
        });

        const apptList = apptsSnap.docs.map(doc => {
            const leadId = doc.ref.parent?.parent?.id || '';
            return { id: doc.id, leadId, ...doc.data() } as unknown as Appointment;
        });

        const activeLeadIds = new Set<string>();
        actList.forEach(act => { if (act.leadId) activeLeadIds.add(act.leadId); });
        apptList.forEach(appt => { if (appt.leadId) activeLeadIds.add(appt.leadId); });

        let leadsList: Lead[] = [];
        const leadMap = new Map<string, Lead>();

        if (dateFilterType === 'activityDate') {
            const leadIdArray = Array.from(activeLeadIds);
            if (leadIdArray.length > 0) {
                setProgressMsg(`Fetching ${leadIdArray.length} active leads...`);
                const chunks: string[][] = [];
                for (let i = 0; i < leadIdArray.length; i += 30) {
                    chunks.push(leadIdArray.slice(i, i + 30));
                }

                const leadQueries = chunks.map(chunk => 
                    getDocs(query(collection(firestore, 'leads'), where(documentId(), 'in', chunk)))
                );
                const companyQueries = chunks.map(chunk => 
                    getDocs(query(collection(firestore, 'companies'), where(documentId(), 'in', chunk)))
                );

                const querySnaps = await Promise.all([...leadQueries, ...companyQueries]);

                querySnaps.forEach((snap, idx) => {
                    const isCompany = idx >= chunks.length;
                    snap.docs.forEach(doc => {
                        leadMap.set(doc.id, {
                            id: doc.id,
                            isFromCompaniesCollection: isCompany,
                            ...doc.data()
                        } as unknown as Lead);
                    });
                });
            }

            // Also fetch leads created/entered within the selected date range
            setProgressMsg("Retrieving newly entered leads...");
            const [leadsCreatedSnap, companiesCreatedSnap] = await Promise.all([
                getDocs(query(collection(firestore, 'leads'), where('dateLeadEntered', '>=', startISO))),
                getDocs(query(collection(firestore, 'companies'), where('dateLeadEntered', '>=', startISO)))
            ]);
            leadsCreatedSnap.docs.forEach(doc => {
                if (!leadMap.has(doc.id)) {
                    leadMap.set(doc.id, { id: doc.id, isFromCompaniesCollection: false, ...doc.data() } as unknown as Lead);
                }
            });
            companiesCreatedSnap.docs.forEach(doc => {
                if (!leadMap.has(doc.id)) {
                    leadMap.set(doc.id, { id: doc.id, isFromCompaniesCollection: true, ...doc.data() } as unknown as Lead);
                }
            });

            // If logged in user is a Franchisee, also retrieve all leads for their franchisee directly
            if (userProfile?.franchisee) {
                const [fLeadsSnap, fCompSnap] = await Promise.all([
                    getDocs(query(collection(firestore, 'leads'), where('franchisee', '==', userProfile.franchisee))),
                    getDocs(query(collection(firestore, 'companies'), where('franchisee', '==', userProfile.franchisee)))
                ]);
                fLeadsSnap.docs.forEach(doc => {
                    if (!leadMap.has(doc.id)) {
                        leadMap.set(doc.id, { id: doc.id, isFromCompaniesCollection: false, ...doc.data() } as unknown as Lead);
                    }
                });
                fCompSnap.docs.forEach(doc => {
                    if (!leadMap.has(doc.id)) {
                        leadMap.set(doc.id, { id: doc.id, isFromCompaniesCollection: true, ...doc.data() } as unknown as Lead);
                    }
                });
            }

            leadsList = Array.from(leadMap.values());
        } else {
            setProgressMsg("Retrieving leads by status date...");
            const leadsQuery = query(
                collection(firestore, 'leads'),
                where(dateFilterType, '>=', startISO)
            );
            const companiesQuery = query(
                collection(firestore, 'companies'),
                where(dateFilterType, '>=', startISO)
            );

            const [leadsSnap, companiesSnap] = await Promise.all([
                getDocs(leadsQuery),
                getDocs(companiesQuery)
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

            for (const item of [...rawLeads, ...rawCompanies]) {
                leadMap.set(item.id, item);
            }
            leadsList = Array.from(leadMap.values());
        }

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
        console.timeEnd("Sales Snapshot - Load Time");
        setLoadTime(Math.round(performance.now() - startTimePerf));
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
        if ((userProfile?.activeRole === 'Franchisee' || userProfile?.role?.toLowerCase() === 'franchisee') && userProfile.franchisee) {
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
            const fromDateVal = appliedFilters.dateRange.from;
            const toDateVal = appliedFilters.dateRange.to || appliedFilters.dateRange.from;
            const fromDate = startOfDay(fromDateVal);
            const toDate = endOfDay(toDateVal);

            if (appliedFilters.dateFilterType === 'activityDate') {
                const leadActivities = activities.filter(act => act.leadId === lead.id);
                const hasActivityInWindow = leadActivities.some(act => {
                    const date = new Date(act.date);
                    return date >= fromDate && date <= toDate;
                });
                const parsedEntered = parseDateString(lead.dateLeadEntered);
                const isEnteredInWindow = parsedEntered ? (parsedEntered >= fromDate && parsedEntered <= toDate) : false;

                dateMatch = hasActivityInWindow || isEnteredInWindow;
            } else {
                const dateVal = lead[appliedFilters.dateFilterType];
                const parsedDate = parseDateString(dateVal);
                if (!parsedDate) return false;
                
                dateMatch = parsedDate >= fromDate && parsedDate <= toDate;
            }
        }

        const campaignMatch = !appliedFilters.campaign || appliedFilters.campaign === 'all' || (lead.campaign || (lead as any).customerCampaign) === appliedFilters.campaign;

        return statusMatch && franchiseeMatch && bucketMatch && amMatch && dialerMatch && dateMatch && campaignMatch;
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

    // 5. Pipeline Value by Lead Type & Bucket
    const typeValueMap: Record<string, number> = {};
    const bucketValueMap: Record<string, number> = {};

    // 6. Pipeline MRR & Signed MRR
    let totalPipelineMRR = 0;
    let totalSignedMRR = 0;
    const mrrStatusMap: Record<string, number> = {};
    // 7. Leads with MRR lists
    const mrrLeadsList: Lead[] = [];
    const signedMrrLeadsList: Lead[] = [];

    // 8. Weekly MRR Pipeline Map
    const weeklyMrrMap: Record<string, { weekKey: string; weekLabel: string; sortDate: string; pipelineMRR: number; signedMRR: number }> = {};

    // 9. Appointments
    const leadApptCounts: Record<string, number> = {};

    filteredLeads.forEach(lead => {
        const status = lead.customerStatus || lead.status;
        const leadActivities = filteredActivities.filter(act => act.leadId === lead.id);
        const isSignedUp = isRecentlySignedUp(lead, leadActivities, appliedFilters.dateRange, appliedFilters.dateFilterType);
        const isSigned = isSignedStatus(status);

        if (status === 'Quote Sent') quotesCount++;
        if ((lead.scfAcceptedAt || (lead.scfLinks && lead.scfLinks.some(s => s.status === 'Accepted'))) && !isSigned) scfsCount++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) trialsCount++;
        if (isSignedUp) wonCount++;
        if (status === 'Lost') lostCount++;

        // Lead source
        const src = lead.customerSource || lead.inboundDetails?.utmSource || 'Other / Direct';
        if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0 };
        sourceMap[src].total++;
        if (isSignedUp) sourceMap[src].won++;

        // Bucket & User Assignment
        const b = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const assignedUser = b === 'customer_success' 
          ? (lead.customerSuccessAssigned || 'Unassigned') 
          : (lead.dialerAssigned || lead.salesRepAssigned || lead.accountManagerAssigned || 'Unassigned');
        if (assignmentMap[b]) {
          assignmentMap[b][assignedUser] = (assignmentMap[b][assignedUser] || 0) + 1;
        }

        // Volume over time (based on Date Lead Created/Entered)
        const createdDateVal = lead.dateLeadEntered || (lead as any).createdAt || (lead as any).created_at || (lead as any).dateCreated;
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

        // Pipeline MRR & Signed MRR
        const mrr = calculateMonthlyValue(lead);
        if (mrr > 0) {
          if (isSigned) {
            totalSignedMRR += mrr;
            signedMrrLeadsList.push(lead);
          } else {
            totalPipelineMRR += mrr;
            mrrStatusMap[status] = (mrrStatusMap[status] || 0) + mrr;
            mrrLeadsList.push(lead);
          }

          const bucketLabel = getLeadBucketLabel(lead);
          const leadType = lead.leadType || 'Standard';
          bucketValueMap[bucketLabel] = (bucketValueMap[bucketLabel] || 0) + mrr;
          typeValueMap[leadType] = (typeValueMap[leadType] || 0) + mrr;

          // Weekly MRR Pipeline Breakdown
          const targetDateVal = isSigned 
            ? (lead.signedUpAt || lead.dateLeadEntered || (lead as any).createdAt) 
            : (lead.quoteSentAt || lead.scfAcceptedAt || lead.trialStartedAt || lead.dateLeadEntered || (lead as any).createdAt);
          
          const parsedDate = parseDateString(targetDateVal);
          if (parsedDate) {
            const weekMon = startOfWeek(parsedDate, { weekStartsOn: 1 });
            const sortDate = format(weekMon, 'yyyy-MM-dd');
            const weekLabel = `w/c ${format(weekMon, 'dd MMM')}`;

            if (!weeklyMrrMap[sortDate]) {
              weeklyMrrMap[sortDate] = {
                weekKey: sortDate,
                weekLabel,
                sortDate,
                pipelineMRR: 0,
                signedMRR: 0
              };
            }

            if (isSigned) {
              weeklyMrrMap[sortDate].signedMRR += mrr;
            } else {
              weeklyMrrMap[sortDate].pipelineMRR += mrr;
            }
          }
        }
    });

    const quoteRate = totalLeads > 0 ? (quotesCount / totalLeads) * 100 : 0;
    const winRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
    const sourceData = Object.entries(sourceMap).map(([name, data]) => ({
      name,
      Leads: data.total,
      Wins: data.won,
      ConversionRate: parseFloat(((data.won / data.total) * 100).toFixed(1))
    })).sort((a, b) => b.Leads - a.Leads);

    // Format Volume Over Time Chart data
    const volumeData = Object.entries(volumeMap).map(([date, count]) => ({
      date,
      formattedDate: isValid(parseISO(date)) ? format(parseISO(date), 'dd MMM') : date,
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

    // Format Pipeline Value by Bucket data
    const bucketValueData = Object.entries(bucketValueMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Format Pipeline MRR status distribution
    const mrrStatusData = Object.entries(mrrStatusMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Activity Leaderboard calculation (Excluding Automated Activities & System Logs)
    const actLeaderboardMap: Record<string, { name: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }> = {};
    filteredActivities.forEach(act => {
      if (!isManualActivity(act)) return; // Only count actions manually performed by the user

      const author = act.author || 'Unknown Rep';

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
        const leadActivities = filteredActivities.filter(act => act.leadId === lead.id);
        const isSignedUp = isRecentlySignedUp(lead, leadActivities, appliedFilters.dateRange, appliedFilters.dateFilterType);
        if (isSignedUp) apptWon++;
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
        const leadActivities = filteredActivities.filter(act => act.leadId === lead.id);
        const isSignedUp = isRecentlySignedUp(lead, leadActivities, appliedFilters.dateRange, appliedFilters.dateFilterType);

        if (status === 'Quote Sent') acc[f].quotes++;
        if (lead.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status)) acc[f].trials++;
        if (isSignedUp) acc[f].wins++;
        return acc;
    }, {} as Record<string, { name: string; total: number; quotes: number; trials: number; wins: number }>);

    const franchiseeData = Object.values(franchiseePerf).sort((a, b) => b.total - a.total);

    // Format Weekly MRR Data
    const weeklyMrrData = Object.values(weeklyMrrMap).sort((a, b) => a.sortDate.localeCompare(b.sortDate));

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
        bucketValueData,
        weeklyMrrData,
        totalPipelineMRR,
        totalSignedMRR,
        mrrStatusData,
        mrrLeadsList,
        signedMrrLeadsList,
        activityLeaderboard,
        uniqueLeadsWithAppointments,
        totalAppointments,
        leadApptCounts,
        appointmentEfficiency,
        pipelineStagesData,
        franchiseeData
    };
  }, [filteredLeads, filteredActivities, filteredAppointments, appliedFilters.dateFilterType]);

  const franchiseeLeadsList = useMemo(() => {
    if (!isFranchisee) return [];
    const zeeGeneratedLeads = filteredLeads.filter(l => isFranchiseeGeneratedLead(l, userProfile));
    if (!franchiseeLeadSearch.trim()) return zeeGeneratedLeads;
    const q = franchiseeLeadSearch.toLowerCase();
    return zeeGeneratedLeads.filter(l => 
      (l.companyName || '').toLowerCase().includes(q) ||
      (l.status || '').toLowerCase().includes(q) ||
      (l.customerStatus || '').toLowerCase().includes(q) ||
      (getUserInCharge(l) || '').toLowerCase().includes(q)
    );
  }, [filteredLeads, isFranchisee, franchiseeLeadSearch, userProfile]);

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
    const headers = ['Company Name', 'Status', 'Bucket', 'User in Charge', 'Lead Type', 'MRR Value', 'Dialer Assigned', 'AM Assigned', 'Franchisee'];
    const csvContent = [
      headers.join(','),
      ...data.map(lead => [
        `"${lead.companyName.replace(/"/g, '""')}"`,
        `"${lead.customerStatus || lead.status}"`,
        `"${getLeadBucketLabel(lead)}"`,
        `"${getUserInCharge(lead)}"`,
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Sales Process Snapshot</h1>
              {userProfile?.activeRole === 'Franchisee' && userProfile?.franchisee && (
                <Badge className="bg-teal-700 text-white font-semibold text-xs px-3 py-1">
                  {userProfile.franchisee} Franchise
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5">
              {userProfile?.activeRole === 'Franchisee'
                ? `Unified conversion metrics and pipeline analysis for ${userProfile.franchisee || 'your franchise'}.`
                : 'Unified conversion metrics across Inbound, Outbound, Field Sales, and AM.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusOutcomeGuideButton />
            <Button onClick={triggerPdfExport} variant="outline" size="sm" className="bg-[#095c7b] text-white hover:bg-[#095c7b]/90">
              <Download className="mr-2 h-4 w-4" /> Download PDF Report
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading || isRefreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", (loading || isRefreshing) && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </header>

        <StatusOutcomeBanner className="mt-4" />

        <Collapsible defaultOpen={false} className="no-print">
          <Card className="border-[#095c7b]/20 shadow-sm card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#095c7b]" />
                <CardTitle className="text-lg font-bold leading-none">Report Filters</CardTitle>
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
                      <SelectItem value="activityDate">Activity Date</SelectItem>
                      <SelectItem value="dateLeadEntered">Date Lead Entered</SelectItem>
                      <SelectItem value="quoteSentAt">Date Quote Sent</SelectItem>
                      <SelectItem value="signedUpAt">Date Signed Up</SelectItem>
                      <SelectItem value="scfAcceptedAt">Date SCF Accepted</SelectItem>
                      <SelectItem value="trialStartedAt">Date Trial Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select value={filters.campaign} onValueChange={(val) => setFilters(prev => ({ ...prev, campaign: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Campaigns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {availableCampaigns.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
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
            
            {/* Unified Management & Franchisee Pipeline Stage Breakdown with Embedded Milestones */}
            <Card className="shadow-sm card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-5 w-5 text-[#095c7b]" />
                  <CardTitle className="text-sm font-semibold">Management &amp; Franchisee Pipeline Stage Breakdown</CardTitle>
                </div>
                <SectionHelp content="High-level stages grouping all lead statuses with embedded milestone counts, quoting rates, and MRR financial values." />
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.pipelineStagesData.map((stage, idx) => {
                  const style = STAGE_COLOR_STYLES[stage.name] || {
                    cardBg: 'bg-slate-50/50 hover:bg-slate-100/80',
                    cardBorder: 'border-slate-200 hover:border-[#095c7b]',
                    titleColor: 'text-slate-500',
                    countColor: 'text-slate-800',
                    barBg: 'bg-[#095c7b]',
                    badgeBg: 'bg-slate-100'
                  };

                  return (
                    <div 
                      key={idx} 
                      className={cn("p-3 border rounded-lg flex flex-col justify-between min-h-[220px] cursor-pointer transition-all group shadow-sm hover:shadow-md", style.cardBg, style.cardBorder)}
                      onClick={() => {
                        setDrilldownType('stage');
                        setSelectedStage(stage.name);
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-[10px] font-bold uppercase block leading-none", style.titleColor)}>{stage.name}</span>
                            <SectionHelp content={getStageHelpContent(stage.name, stage.count, metrics.totalLeads, stage.percentage)} />
                          </div>
                          <ExternalLink className={cn("h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity shrink-0", style.titleColor)} />
                        </div>
                        <span className={cn("text-2xl font-extrabold block", style.countColor)}>{stage.count}</span>

                        {/* Stage Specific Embedded Milestones & Financials */}
                        <div className="mt-2 space-y-1">
                          {stage.name === 'New / Prospecting' && (
                            <div className="text-[10px] font-medium text-sky-900 bg-sky-100/70 p-1.5 rounded border border-sky-200/60 flex items-center justify-between">
                              <span><span className="font-semibold">Total Sourced:</span> {metrics.totalLeads}</span>
                              <SectionHelp content={
                                <div className="space-y-1.5">
                                  <p className="font-bold text-slate-900 border-b pb-1">Total Sourced vs. Stage Count</p>
                                  <p><strong className="text-[#095c7b]">{metrics.totalLeads} Total Sourced:</strong> Total volume of leads created in the selected date range across <em>all 6 pipeline stages</em> combined.</p>
                                  <p><strong className="text-sky-700">{stage.count} Stage Count:</strong> Leads currently sitting specifically in the <strong>New / Prospecting</strong> stage (Status: New). This accounts for {stage.percentage}% of the total pipeline.</p>
                                </div>
                              } />
                            </div>
                          )}

                          {stage.name === 'Priority & Hot Leads' && (
                            <div className="text-[10px] font-medium text-amber-900 bg-amber-100/70 p-1.5 rounded border border-amber-200/60">
                              Priority &amp; Field Lead focus
                            </div>
                          )}

                          {stage.name === 'Active Engagement' && !isFranchisee && (
                            <div 
                              className="text-[10px] font-semibold text-indigo-900 bg-indigo-100/70 p-1.5 rounded border border-indigo-200/60 hover:bg-indigo-200/80 flex items-center justify-between transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setDrilldownType('appointments'); }}
                            >
                              <span>Appointments:</span>
                              <span className="font-extrabold flex items-center gap-0.5">{metrics.uniqueLeadsWithAppointments} <ExternalLink className="h-2.5 w-2.5" /></span>
                            </div>
                          )}

                          {stage.name === 'High-Intent / Opportunity' && (
                            <div className="space-y-1 text-[10px]">
                              <div 
                                className="bg-purple-100/80 text-purple-900 p-1.5 rounded border border-purple-200/70 hover:bg-purple-200 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('quotes'); }}
                              >
                                <span>Quotes Sent:</span>
                                <span className="font-extrabold flex items-center gap-0.5">{metrics.quotesCount} ({metrics.quoteRate.toFixed(1)}%) <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                              <div 
                                className="bg-purple-100/80 text-purple-900 p-1.5 rounded border border-purple-200/70 hover:bg-purple-200 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('scfs'); }}
                              >
                                <span>Quotes Accepted:</span>
                                <span className="font-extrabold flex items-center gap-0.5">{metrics.scfsCount} <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                              <div 
                                className="bg-purple-100/80 text-purple-900 p-1.5 rounded border border-purple-200/70 hover:bg-purple-200 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('trials'); }}
                              >
                                <span>Free Trials:</span>
                                <span className="font-extrabold flex items-center gap-0.5">{metrics.trialsCount} <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                              <div 
                                className="bg-purple-200/90 text-purple-950 p-1.5 rounded border border-purple-300 hover:bg-purple-300 flex items-center justify-between font-bold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('mrr'); }}
                              >
                                <span>Pipeline MRR:</span>
                                <span className="text-purple-900 flex items-center gap-0.5">${metrics.totalPipelineMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })} <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                            </div>
                          )}

                          {stage.name === 'Converted' && (
                            <div className="space-y-1 text-[10px]">
                              <div 
                                className="bg-emerald-100/80 text-emerald-900 p-1.5 rounded border border-emerald-200/80 hover:bg-emerald-200 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('signed'); }}
                              >
                                <span>Signed Win Rate:</span>
                                <span className="font-extrabold flex items-center gap-0.5">{metrics.winRate.toFixed(1)}% <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                              <div 
                                className="bg-emerald-200/90 text-emerald-950 p-1.5 rounded border border-emerald-300 hover:bg-emerald-300 flex items-center justify-between font-bold transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDrilldownType('signed_mrr'); }}
                              >
                                <span>Signed MRR:</span>
                                <span className="text-emerald-900 flex items-center gap-0.5">${metrics.totalSignedMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })} <ExternalLink className="h-2.5 w-2.5" /></span>
                              </div>
                            </div>
                          )}

                          {stage.name === 'Closed / Inactive' && (
                            <div className="text-[10px] font-medium text-slate-700 bg-slate-200/60 p-1.5 rounded border border-slate-300/50">
                              Lost or unserviceable leads
                            </div>
                          )}
                        </div>

                        <span className={cn("text-[9px] text-muted-foreground block leading-tight mt-2 p-1.5 rounded border transition-colors", style.badgeBg)}>
                          <strong>Includes:</strong> <br/>
                          {stage.name === 'New / Prospecting' && 'New'}
                          {stage.name === 'Priority & Hot Leads' && 'Priority Lead, Priority Field Lead, Hot Lead'}
                          {stage.name === 'Active Engagement' && 'Contacted, Connected, In Progress, Reschedule...'}
                          {stage.name === 'High-Intent / Opportunity' && 'Qualified, Quote Sent, SCF Accepted, Free Trial...'}
                          {stage.name === 'Converted' && 'Won, Signed, Customer'}
                          {stage.name === 'Closed / Inactive' && 'Lost, Lost Customer, Unqualified...'}
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200/60">
                        <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all", style.barBg)} style={{ width: `${stage.percentage}%` }}></div>
                        </div>
                        <span className={cn("text-[10px] font-medium mt-1 block", style.titleColor)}>{stage.percentage}% of pipeline</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Franchisee Leads & Progress Table (Displayed when user is a Franchisee) */}
            {isFranchisee && (
              <Card className="shadow-sm card border-[#095c7b]/30 bg-white">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-[#095c7b]" />
                        Franchisee Leads &amp; Progress
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Overview of leads generated by {userProfile?.franchisee || 'your franchise'} and their current pipeline progress.
                      </CardDescription>
                    </div>
                    <SectionHelp content="Live list of active leads sourced by your franchisee territory, showing real-time status transitions, assigned sales rep, and MRR value." />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Input
                      placeholder="Search company, status, rep..."
                      value={franchiseeLeadSearch}
                      onChange={(e) => setFranchiseeLeadSearch(e.target.value)}
                      className="h-8 text-xs w-full sm:w-64"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs shrink-0"
                      onClick={() => handleExportDrilldown(franchiseeLeadsList, `${userProfile?.franchisee || 'Franchisee'}_Leads_Progress`)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[380px] rounded-md border">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-semibold text-xs">Company / Business</TableHead>
                          <TableHead className="font-semibold text-xs">Status &amp; Progress</TableHead>
                          <TableHead className="font-semibold text-xs">Pipeline Stage</TableHead>
                          <TableHead className="font-semibold text-xs">Date Entered</TableHead>
                          <TableHead className="font-semibold text-xs">User / Rep in Charge</TableHead>
                          <TableHead className="text-right font-semibold text-xs">MRR Value</TableHead>
                          <TableHead className="text-right font-semibold text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {franchiseeLeadsList.length > 0 ? (
                          franchiseeLeadsList.map((lead) => {
                            const currentStatus = (lead.customerStatus || lead.status || 'New') as LeadStatus;
                            const phase = getPipelinePhase(currentStatus);
                            const mrr = calculateMonthlyValue(lead);
                            const parsedDate = parseDateString(lead.dateLeadEntered);
                            const formattedDate = parsedDate ? format(parsedDate, 'dd MMM yyyy') : '-';
                            const repInCharge = getUserInCharge(lead);

                            return (
                              <TableRow key={lead.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium text-xs py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{lead.companyName}</span>
                                    {(lead.city || lead.address?.city) && <span className="text-[10px] text-muted-foreground">{lead.city || lead.address?.city}{lead.state ? `, ${lead.state}` : ''}</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <LeadStatusBadge status={currentStatus} />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground py-3">
                                  <Badge variant="outline" className="text-[10px] font-normal bg-slate-50">
                                    {phase}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground py-3">
                                  {formattedDate}
                                </TableCell>
                                <TableCell className="text-xs text-slate-700 py-3">
                                  {repInCharge}
                                </TableCell>
                                <TableCell className="text-right text-xs font-semibold text-emerald-700 py-3">
                                  {mrr > 0 ? `$${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo` : '-'}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  <Link href={`/leads?search=${encodeURIComponent(lead.companyName)}`} passHref>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-[#095c7b] hover:text-[#095c7b] hover:bg-[#095c7b]/10">
                                      View Lead <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                              {franchiseeLeadSearch ? 'No leads matching search terms.' : 'No leads entered for this franchisee in the selected date range.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Visualisations Grid 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Leads Volume Over Time */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#095c7b]" /> Leads Volume Over Time
                  </CardTitle>
                  <SectionHelp content="Visual representation of daily lead creation counts based on lead entry date. Tracks top-of-funnel acquisition trends across your selected date window." />
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
                        <XAxis dataKey="formattedDate" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip labelFormatter={(label, items) => {
                          const item = items && items[0] ? items[0].payload : null;
                          return item ? `${item.formattedDate} (${item.date})` : label;
                        }} />
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
                  <SectionHelp content="Volume distribution and won customer conversion counts mapped directly by lead origin source (Inbound, Cold Call, Referral, Marketing, etc.)." />
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
                  <SectionHelp content="Calculates average days spent by leads in each status stage before progressing. Identifies deal stalls and sales cycle velocity." />
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

              {/* Pipeline Value by Bucket & Lead Type */}
              <Card className="shadow-sm card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#095c7b]" />
                    <CardTitle className="text-sm font-semibold">
                      Pipeline Value {pipelineValueGroupBy === 'bucket' ? 'by Bucket' : 'by Lead Type'}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border text-xs">
                      <button
                        type="button"
                        onClick={() => setPipelineValueGroupBy('bucket')}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all",
                          pipelineValueGroupBy === 'bucket' ? "bg-white text-[#095c7b] shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Bucket
                      </button>
                      <button
                        type="button"
                        onClick={() => setPipelineValueGroupBy('leadType')}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all",
                          pipelineValueGroupBy === 'leadType' ? "bg-white text-[#095c7b] shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Lead Type
                      </button>
                    </div>
                    <SectionHelp content="Sum of estimated monthly recurring revenue (MRR) pipeline value split across lead buckets (Outbound, Inbound, Field Sales) or lead types." />
                  </div>
                </CardHeader>
                <CardContent className="h-[260px]">
                  {((pipelineValueGroupBy === 'bucket' ? metrics.bucketValueData : metrics.typeValueData) || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={pipelineValueGroupBy === 'bucket' ? metrics.bucketValueData : metrics.typeValueData}
                        margin={{ top: 22, right: 10, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                        <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Pipeline Value']} />
                        <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            formatter={(val: any) => val ? `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''} 
                            fill="#095c7b" 
                            fontSize={10} 
                            fontWeight={700} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No value data available.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Weekly MRR Pipeline: In-Pipeline vs Signed MRR */}
            <Card className="shadow-sm card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#095c7b]" />
                  <CardTitle className="text-sm font-semibold">
                    Weekly MRR Pipeline: In-Pipeline (Quotes &amp; Trials) vs Signed (Won)
                  </CardTitle>
                </div>
                <SectionHelp content="Weekly breakdown comparing potential In-Pipeline MRR (Quotes, Opportunities, Trials) versus Converted Signed (Won) MRR week-by-week." />
              </CardHeader>
              <CardContent className="h-[280px]">
                {metrics.weeklyMrrData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.weeklyMrrData} margin={{ top: 24, right: 15, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="weekLabel" tickLine={false} style={{ fontSize: '10px' }} />
                      <YAxis tickLine={false} style={{ fontSize: '10px' }} />
                      <Tooltip formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === 'pipelineMRR' ? 'In-Pipeline MRR' : 'Signed MRR']} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Bar dataKey="pipelineMRR" name="In-Pipeline MRR (Quotes &amp; Trials)" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList 
                          dataKey="pipelineMRR" 
                          position="top" 
                          formatter={(val: any) => val ? `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''} 
                          fill="#0284c7" 
                          fontSize={9} 
                          fontWeight={700} 
                        />
                      </Bar>
                      <Bar dataKey="signedMRR" name="Signed (Won) MRR" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList 
                          dataKey="signedMRR" 
                          position="top" 
                          formatter={(val: any) => val ? `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''} 
                          fill="#047857" 
                          fontSize={9} 
                          fontWeight={700} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">No weekly MRR records available in this range.</div>
                )}
              </CardContent>
            </Card>

            {/* Visualisations Grid 3 (Hidden for Franchisees) */}
            {!isFranchisee && (
              <div className="grid grid-cols-1 gap-6">


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
            )}

            {/* Bucket & User Assignment Breakdown Table (Hidden for Franchisees) */}
            {!isFranchisee && (
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
            )}

            {/* Franchisee Process Breakdown (Hidden for Franchisees) */}
            {!isFranchisee && (
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
            )}
          </div>
        )}
      </div>

      {/* Drilldown Dialog Modal */}
      <Dialog open={drilldownType !== null} onOpenChange={(open) => { if (!open) { setDrilldownType(null); setSelectedStage(null); } setDrilldownSearch(''); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-bold text-[#095c7b]">
              {drilldownType === 'mrr' && `Leads Contributing to Pipeline MRR ($${metrics.totalPipelineMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })})`}
              {drilldownType === 'signed_mrr' && `Leads/Companies with Status as Signed MRR ($${metrics.totalSignedMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })})`}
              {drilldownType === 'appointments' && 'Leads with scheduled Appointments'}
              {drilldownType === 'quotes' && 'Leads with Quotes Sent'}
              {drilldownType === 'scfs' && 'Leads with Quotes Accepted'}
              {drilldownType === 'trials' && 'Leads with Free Trials started'}
              {drilldownType === 'signed' && 'Leads Recently Signed (Won)'}
              {drilldownType === 'stage' && selectedStage && `Leads in Stage: ${selectedStage}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Filter and search the detail list below. Use the download button to export to CSV format.
            </DialogDescription>
          </DialogHeader>

          {drilldownType === 'mrr' && (
            <div className="bg-sky-50/80 border border-sky-200 text-sky-900 rounded-md p-3 my-1 flex items-center justify-between text-xs font-semibold shrink-0">
              <span>Total Pipeline MRR: <span className="text-sky-700 font-extrabold text-sm">${metrics.totalPipelineMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              <span className="text-sky-800 font-normal">{metrics.mrrLeadsList.length} lead(s) with configured MRR</span>
            </div>
          )}

          {drilldownType === 'signed_mrr' && (
            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-md p-3 my-1 flex items-center justify-between text-xs font-semibold shrink-0">
              <span>Total Signed MRR: <span className="text-emerald-700 font-extrabold text-sm">${metrics.totalSignedMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              <span className="text-emerald-800 font-normal">{metrics.signedMrrLeadsList.length} signed lead(s)/company(ies)</span>
            </div>
          )}

          {drilldownType === 'stage' && selectedStage && (
            <div className="bg-[#095c7b]/10 border border-[#095c7b]/30 text-[#095c7b] rounded-md p-3 my-1 flex items-center justify-between text-xs font-semibold shrink-0">
              <span>Pipeline Stage Breakdown: <span className="font-extrabold text-sm">{selectedStage}</span></span>
              <span className="font-normal">{filteredLeads.filter(l => getPipelinePhase(l.customerStatus || l.status) === selectedStage).length} lead(s) in this stage</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 my-2 shrink-0">
            <Input 
              placeholder="Search by Company, Bucket, or User..." 
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
                if (drilldownType === 'mrr') {
                  listToExport = [...metrics.mrrLeadsList].sort((a, b) => calculateMonthlyValue(b) - calculateMonthlyValue(a));
                } else if (drilldownType === 'signed_mrr') {
                  listToExport = [...metrics.signedMrrLeadsList].sort((a, b) => calculateMonthlyValue(b) - calculateMonthlyValue(a));
                } else if (drilldownType === 'appointments') {
                  listToExport = filteredLeads.filter(l => metrics.leadApptCounts[l.id] > 0);
                } else if (drilldownType === 'quotes') {
                  listToExport = filteredLeads.filter(l => (l.customerStatus || l.status) === 'Quote Sent');
                } else if (drilldownType === 'scfs') {
                  listToExport = filteredLeads.filter(l => {
                    const status = l.customerStatus || l.status;
                    return !isSignedStatus(status) && (!!l.scfAcceptedAt || status === 'Quote Accepted' || (l.scfLinks && l.scfLinks.some(s => s.status === 'Accepted')));
                  });
                } else if (drilldownType === 'trials') {
                  listToExport = filteredLeads.filter(l => {
                    const status = l.customerStatus || l.status;
                    return !!l.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status);
                  });
                } else if (drilldownType === 'signed') {
                  listToExport = filteredLeads.filter(l => {
                    const leadActs = activities.filter(a => a.leadId === l.id);
                    return isRecentlySignedUp(l, leadActs, appliedFilters.dateRange, appliedFilters.dateFilterType);
                  });
                } else if (drilldownType === 'stage' && selectedStage) {
                  listToExport = filteredLeads.filter(l => getPipelinePhase(l.customerStatus || l.status) === selectedStage);
                }
                const filename = drilldownType === 'stage' && selectedStage 
                  ? `pipeline_stage_${selectedStage.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report` 
                  : `${drilldownType}_report`;
                handleExportDrilldown(listToExport, filename);
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV List
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto max-h-[50vh] sm:max-h-[55vh] border rounded-md relative">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="text-xs font-semibold bg-slate-50">Company Name</TableHead>
                  <TableHead className="text-xs font-semibold bg-slate-50">Status</TableHead>
                  <TableHead className="text-xs font-semibold bg-slate-50">Bucket</TableHead>
                  <TableHead className="text-xs font-semibold bg-slate-50">User in Charge</TableHead>
                  <TableHead className="text-xs font-semibold bg-slate-50">Lead Type</TableHead>
                  <TableHead className="text-right text-xs font-semibold bg-slate-50">MRR Value ($)</TableHead>
                  <TableHead className="text-xs font-semibold bg-slate-50">Franchisee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let filteredList = filteredLeads.filter(l => {
                    const status = l.customerStatus || l.status;
                    const isSigned = isSignedStatus(status);

                    if (drilldownType === 'mrr') return !isSigned && calculateMonthlyValue(l) > 0;
                    if (drilldownType === 'signed_mrr') return isSigned && calculateMonthlyValue(l) > 0;
                    if (drilldownType === 'appointments') return (metrics.leadApptCounts[l.id] || 0) > 0;
                    if (drilldownType === 'quotes') {
                      return status === 'Quote Sent';
                    }
                    if (drilldownType === 'scfs') {
                      return !isSigned && (!!l.scfAcceptedAt || status === 'Quote Accepted' || (l.scfLinks && l.scfLinks.some(s => s.status === 'Accepted')));
                    }
                    if (drilldownType === 'trials') {
                      return !!l.trialStartedAt || ['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial', 'LocalMile Opportunity'].includes(status);
                    }
                    if (drilldownType === 'signed') {
                      const leadActs = activities.filter(a => a.leadId === l.id);
                      return isRecentlySignedUp(l, leadActs, appliedFilters.dateRange, appliedFilters.dateFilterType);
                    }
                    if (drilldownType === 'stage' && selectedStage) {
                      return getPipelinePhase(l.customerStatus || l.status) === selectedStage;
                    }
                    return false;
                  });

                  if (drilldownType === 'mrr' || drilldownType === 'signed_mrr') {
                    filteredList.sort((a, b) => calculateMonthlyValue(b) - calculateMonthlyValue(a));
                  }

                  if (drilldownSearch.trim()) {
                    const q = drilldownSearch.toLowerCase();
                    filteredList = filteredList.filter(l => 
                      l.companyName.toLowerCase().includes(q) ||
                      getLeadBucketLabel(l).toLowerCase().includes(q) ||
                      getUserInCharge(l).toLowerCase().includes(q)
                    );
                  }

                  if (filteredList.length > 0) {
                    return filteredList.map(lead => (
                      <TableRow key={lead.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs py-2 font-medium">
                          <Link 
                            href={(lead as any).isCompany || isSignedStatus(lead.customerStatus || lead.status) ? `/companies/${lead.id}` : `/leads/${lead.id}`} 
                            target="_blank" 
                            className="hover:underline text-primary font-medium"
                          >
                            {lead.companyName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs py-2"><LeadStatusBadge status={(lead.customerStatus || lead.status) as LeadStatus} /></TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-slate-50 font-normal">
                            {getLeadBucketLabel(lead)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-medium text-slate-800">{getUserInCharge(lead)}</TableCell>
                        <TableCell className="text-xs py-2">{lead.leadType || 'Standard'}</TableCell>
                        <TableCell className="text-right text-xs py-2 font-bold">${calculateMonthlyValue(lead).toFixed(0)}</TableCell>
                        <TableCell className="text-xs py-2">{lead.franchisee || '-'}</TableCell>
                      </TableRow>
                    ));
                  } else {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground italic">No matching records found.</TableCell>
                      </TableRow>
                    );
                  }
                })()}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
