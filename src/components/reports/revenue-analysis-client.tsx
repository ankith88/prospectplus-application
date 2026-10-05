"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile, Activity, LeadStatus } from '@/lib/types';
import { calculateMonthlyValue as calculateMonthlyValueUtil } from '@/lib/mrr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, Filter, X, Download, ExternalLink, Search, Info, CheckCircle, Store, Layers, BarChart3, Users, Building, Activity as ActivityIcon, ArrowUpRight, Calendar as CalendarIcon, FileText, Send } from 'lucide-react';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { DateRange } from 'react-day-picker';
import { cn, parseDateString, isManualActivity, isTestLeadOrCompany, isParentSuffixLeadOrCompany } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { StatusBreakdownBar } from '@/components/status-breakdown-bar';
import { BucketBreakdownBar } from '@/components/bucket-breakdown-bar';
import { AccountTypeBreakdownBar, AccountTypeBadge } from '@/components/account-type-breakdown-bar';
import { StatusOutcomeBanner } from '@/components/status-outcome-guide';
import { getLeadCampaigns, LeadCampaign } from '@/services/lead-campaigns';
import { getLeadInitialBucket } from '@/lib/lead-stage-analytics';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, subWeeks, subDays } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from 'recharts';

export function isLpoLeadOrCompany(lead: Lead | any): boolean {
  if (!lead) return false;

  // 1. Check company name prefixes / markers (e.g. "LPO - Blacktown City Council", "[LPO] ...")
  const name = String(lead.companyName || '').trim();
  if (/^\[?(?:lpo|lpo\.plus|lpo\s*plus)\]?\s*[-:–—\s/]/i.test(name) || /^lpo\b/i.test(name)) {
    return true;
  }
  if (/\bLPO\b/i.test(name) && (name.toLowerCase().includes('lpo -') || name.toLowerCase().includes('lpo-') || name.toLowerCase().includes('lpo :') || name.toLowerCase().includes('lpo plus') || name.toLowerCase().includes('lpo.plus') || name.toLowerCase().startsWith('lpo'))) {
    return true;
  }

  // 2. Check bucket & original bucket & history
  const b = String(lead.bucket || '').toLowerCase().trim();
  if (b === 'lpo' || b === 'lpo_plus' || b === 'lpo_network' || b === 'lpo_opportunities' || b.startsWith('lpo')) {
    return true;
  }
  const origB = String(lead.originalBucket || '').toLowerCase().trim();
  if (origB === 'lpo' || origB === 'lpo_plus' || origB === 'lpo_network' || origB.startsWith('lpo')) {
    return true;
  }
  const initApptB = String(lead.initialAppointmentBucket || '').toLowerCase().trim();
  if (initApptB === 'lpo' || initApptB === 'lpo_plus' || initApptB === 'lpo_network' || initApptB.startsWith('lpo')) {
    return true;
  }
  if (getLeadInitialBucket(lead) === 'LPO') {
    return true;
  }
  if (Array.isArray(lead.bucketHistory)) {
    if (lead.bucketHistory.some((bh: any) => {
      const ob = String(bh.oldBucket || '').toLowerCase();
      const nb = String(bh.newBucket || '').toLowerCase();
      const notes = String(bh.notes || '').toLowerCase();
      return ob.startsWith('lpo') || nb.startsWith('lpo') || notes.includes('lpo');
    })) {
      return true;
    }
  }

  // 3. Check sources and campaigns
  const sources = [
    lead.source,
    lead.leadSource,
    lead.customerSource,
    (lead as any).utmSource,
    lead.campaign,
    (lead as any).customerCampaign
  ];
  for (const s of sources) {
    if (!s) continue;
    const str = String(s).toLowerCase().trim();
    if (str === 'lpo' || str === 'lpo_plus' || str === 'lpo plus' || str === 'lpo.plus' || str.includes('lpo') || str === '491777') {
      return true;
    }
  }

  // 4. Check explicit flags and billing
  if (
    lead.isLpoLead === true ||
    !!lead.lpoLeadId ||
    !!lead.linkedLpoLeadId ||
    !!lead.lpoPlusStatus ||
    !!lead.lpoDocId ||
    !!lead.lpoId ||
    !!lead.lpoName ||
    !!lead.lpoLeadName ||
    lead.billing === 'lpo' ||
    String(lead.serviceType || '').toLowerCase() === 'lpo'
  ) {
    return true;
  }

  return false;
}

export function isSecureCashLead(lead: Lead | any): boolean {
  if (!lead) return false;
  const aType = String(lead.accountType || '').toLowerCase().trim();
  if (aType === 'secure cash' || aType === 'securecash' || aType === 'sc') return true;

  const sources = [
    lead.source,
    lead.leadSource,
    lead.customerSource,
    lead.utmSource,
    lead.campaign,
    lead.customerCampaign
  ];
  for (const s of sources) {
    if (!s) continue;
    const str = String(s).toLowerCase().trim();
    if (str === 'secure cash' || str === 'securecash' || str === 'sc' || str.includes('secure cash') || str.includes('securecash')) {
      return true;
    }
  }

  const name = String(lead.companyName || '').trim();
  if (/^\[?(?:sc|secure\s*cash)\]?\s*[-:–—\s]/i.test(name) || /^sc\b/i.test(name)) {
    return true;
  }

  return false;
}

export function isNeoPostLead(lead: Lead | any): boolean {
  if (!lead) return false;
  const aType = String(lead.accountType || '').toLowerCase().trim();
  if (aType === 'neopost' || aType === 'neo post' || aType === 'np') return true;

  const sources = [
    lead.source,
    lead.leadSource,
    lead.customerSource,
    lead.utmSource,
    lead.campaign,
    lead.customerCampaign
  ];
  for (const s of sources) {
    if (!s) continue;
    const str = String(s).toLowerCase().trim();
    if (str === 'neopost' || str === 'neo post' || str === '207048' || str === 'np' || str.includes('neopost')) {
      return true;
    }
  }

  const name = String(lead.companyName || '').trim();
  if (/^\[?(?:neopost|neo\s*post|np)\]?\s*[-:–—\s]/i.test(name)) {
    return true;
  }

  return false;
}

export function getLeadAccountType(lead: Lead): 'Secure Cash' | 'NeoPost' | 'Corporate / Multisite' | 'J2' | 'BAU' {
  if (isSecureCashLead(lead)) {
    return 'Secure Cash';
  }
  if (isNeoPostLead(lead)) {
    return 'NeoPost';
  }
  if (
    lead.accountType === 'Corporate / Multisite' ||
    lead.accountType === 'Corporate' ||
    lead.accountType === 'Multisite' ||
    lead.selectedServiceOption === 'corporate' ||
    lead.bucket === 'multisite' ||
    lead.isParentLead ||
    lead.isChildLead ||
    !!lead.parentLeadId
  ) {
    return 'Corporate / Multisite';
  }
  if (lead.accountType === 'J2') {
    return 'J2';
  }
  if (lead.accountType === 'BAU' || lead.accountType === 'Standard') {
    return 'BAU';
  }

  const isOutbound = 
    lead.wasOutbound === true || 
    lead.originalBucket?.toLowerCase() === 'outbound' || 
    lead.bucket?.toLowerCase() === 'outbound' || 
    !!lead.dialerAssigned || 
    getLeadInitialBucket(lead) === 'Outbound';

  if (isOutbound) {
    return 'J2';
  }

  return 'BAU';
}

export function normalizeCustomerKey(name?: string | null): string {
  if (!name) return '';
  let cleaned = name.trim();
  // Strip prefixes like "SC - ", "SC- ", "SC : ", "[SC] ", "(SC) ", "Secure Cash - ", "NeoPost - ", "Neopost - ", "NP - ", "NP- "
  cleaned = cleaned.replace(/^\[?(?:sc|secure\s*cash|neopost|neo\s*post|np)\]?\s*[-:–—/]\s*/i, '');
  cleaned = cleaned.replace(/^\[?(?:sc|secure\s*cash|neopost|neo\s*post|np)\]?\s+/i, '');

  return cleaned
    .toLowerCase()
    .replace(/\b(pty\s+ltd|pty\s+limited|pty|ltd|limited|inc|llc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function deduplicateRevenueLeads(leads: Lead[]): Lead[] {
  const isSignedStatus = (status?: string): boolean => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return s === 'signed' || s === 'won' || s === 'customer' || s === 'signed customer';
  };

  const isLostStatus = (status?: string): boolean => {
    if (!status) return false;
    const st = status.trim().toLowerCase();
    const lostStatuses = ['lost', 'lost customer', 'unqualified', 'email brush off', 'out of territory', 'localmile trial stopped', 'shipmate trial stopped'];
    return lostStatuses.includes(st) || st.includes('lost');
  };

  const groups = new Map<string, Lead[]>();

  leads.forEach(lead => {
    if (isLpoLeadOrCompany(lead) || isParentSuffixLeadOrCompany(lead)) return;
    const customerKey = normalizeCustomerKey(lead.companyName);
    const pId = lead.prospectPlusId ? lead.prospectPlusId.trim().toLowerCase() : '';
    const key = customerKey.length >= 3 ? `name:${customerKey}` : (pId ? `pid:${pId}` : `id:${lead.id}`);

    const list = groups.get(key) || [];
    list.push(lead);
    groups.set(key, list);
  });

  const deduplicated: Lead[] = [];

  groups.forEach((groupLeads) => {
    if (groupLeads.some(l => isLpoLeadOrCompany(l) || isParentSuffixLeadOrCompany(l))) {
      return;
    }
    if (groupLeads.length === 1) {
      deduplicated.push(groupLeads[0]);
      return;
    }

    // Sort to prioritize the best canonical record
    groupLeads.sort((a, b) => {
      const aIsSigned = isSignedStatus(a.customerStatus || a.status) || !!a.signedUpAt || !!(a as any).isCompany;
      const bIsSigned = isSignedStatus(b.customerStatus || b.status) || !!b.signedUpAt || !!(b as any).isCompany;
      if (aIsSigned !== bIsSigned) return aIsSigned ? -1 : 1;

      const aIsLost = isLostStatus(a.customerStatus || a.status);
      const bIsLost = isLostStatus(b.customerStatus || b.status);
      if (aIsLost !== bIsLost) return aIsLost ? 1 : -1;

      const aVal = calculateMonthlyValueUtil(a, true);
      const bVal = calculateMonthlyValueUtil(b, true);
      if (aVal !== bVal) return bVal - aVal;

      const aHasAm = Boolean(a.accountManagerAssigned);
      const bHasAm = Boolean(b.accountManagerAssigned);
      if (aHasAm !== bHasAm) return aHasAm ? -1 : 1;

      const aActs = a.activity?.length || 0;
      const bActs = b.activity?.length || 0;
      if (aActs !== bActs) return bActs - aActs;

      const aPref = /^\[?(?:sc|secure\s*cash|neopost|neo\s*post|np)\]?\s*[-:–—]/i.test(a.companyName || '');
      const bPref = /^\[?(?:sc|secure\s*cash|neopost|neo\s*post|np)\]?\s*[-:–—]/i.test(b.companyName || '');
      if (aPref !== bPref) return aPref ? 1 : -1;

      return 0;
    });

    const primary = { ...groupLeads[0] };

    const hasSecureCash = groupLeads.some(l => isSecureCashLead(l));
    const hasNeoPost = !hasSecureCash && groupLeads.some(l => isNeoPostLead(l));
    const hasMultisite = groupLeads.some(l =>
      l.accountType === 'Corporate / Multisite' ||
      l.accountType === 'Corporate' ||
      l.accountType === 'Multisite' ||
      l.bucket === 'multisite'
    );

    if (hasSecureCash) {
      primary.accountType = 'Secure Cash';
      if (!primary.source && !primary.leadSource) primary.leadSource = 'Secure Cash';
    } else if (hasNeoPost) {
      primary.accountType = 'NeoPost';
      if (!primary.source && !primary.leadSource) primary.leadSource = 'NeoPost';
    } else if (hasMultisite) {
      primary.accountType = 'Corporate / Multisite';
    }

    // Prefer clean company name without SC / NeoPost prefix if available
    const cleanNamedLead = groupLeads.find(l => l.companyName && !/^\[?(?:sc|secure\s*cash|neopost|neo\s*post|np)\]?\s*[-:–—]/i.test(l.companyName));
    if (cleanNamedLead?.companyName) {
      primary.companyName = cleanNamedLead.companyName;
    }

    // Merge activities
    const allActivities = groupLeads.flatMap(l => l.activity || []);
    if (allActivities.length > 0) {
      const seenActs = new Set<string>();
      const mergedActs: Activity[] = [];
      allActivities.forEach(act => {
        const actKey = act.id || `${act.date}_${act.type}_${act.author}_${act.notes}`;
        if (!seenActs.has(actKey)) {
          seenActs.add(actKey);
          mergedActs.push(act);
        }
      });
      primary.activity = mergedActs;
    }

    // Merge SCFs
    const allScfs = groupLeads.flatMap(l => (l as any).scfs || []);
    if (allScfs.length > 0) {
      const seenScfs = new Set<string>();
      const mergedScfs: any[] = [];
      allScfs.forEach(scf => {
        const scfId = scf.id || scf.scfId || `${scf.status}_${scf.totalAmount}`;
        if (!seenScfs.has(scfId)) {
          seenScfs.add(scfId);
          mergedScfs.push(scf);
        }
      });
      (primary as any).scfs = mergedScfs;
    }

    // Merge dates if missing
    if (!primary.signedUpAt) {
      const withSigned = groupLeads.find(l => l.signedUpAt || (l as any).signedDate || (l as any).signedAt);
      if (withSigned) primary.signedUpAt = withSigned.signedUpAt || (withSigned as any).signedDate || (withSigned as any).signedAt;
    }
    if (!primary.scfAcceptedAt) {
      const withScf = groupLeads.find(l => (l as any).scfAcceptedAt || (l as any).acceptedAt);
      if (withScf) (primary as any).scfAcceptedAt = (withScf as any).scfAcceptedAt || (withScf as any).acceptedAt;
    }
    if (!primary.quoteSentAt) {
      const withQuote = groupLeads.find(l => l.quoteSentAt || (l as any).dateQuoteSent);
      if (withQuote) primary.quoteSentAt = withQuote.quoteSentAt || (withQuote as any).dateQuoteSent;
    }

    // Transfer value/rates if primary has 0 value
    const primaryVal = calculateMonthlyValueUtil(primary, true);
    if (primaryVal === 0) {
      const leadWithVal = groupLeads.find(l => calculateMonthlyValueUtil(l, true) > 0);
      if (leadWithVal) {
        primary.rate = leadWithVal.rate;
        primary.ampoRate = leadWithVal.ampoRate;
        primary.pmpoRate = leadWithVal.pmpoRate;
        primary.packageRate = leadWithVal.packageRate;
        primary.additionalBagRate = leadWithVal.additionalBagRate;
        primary.servicesAndRates = leadWithVal.servicesAndRates;
      }
    }

    if (groupLeads.some(l => (l as any).isCompany)) {
      (primary as any).isCompany = true;
    }

    deduplicated.push(primary);
  });

  return deduplicated;
}

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4.5 h-4.5 text-muted-foreground hover:text-[#095c7b] hover:bg-[#095c7b]/10 transition-colors focus:outline-none shrink-0"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-64 p-3 text-xs bg-popover text-popover-foreground border border-border shadow-md rounded-lg z-50">
      {content}
    </PopoverContent>
  </Popover>
);

type StatCardVariant = 'default' | 'positive' | 'negative' | 'in-progress' | 'primary' | 'metric' | 'ratio';

const variantStyles: Record<StatCardVariant, {
  card: string;
  topBar: string;
  title: string;
  value: string;
  iconBg: string;
  iconHover: string;
  description: string;
}> = {
  primary: {
    card: "border-[#095c7b]/30 bg-gradient-to-b from-white via-[#095c7b]/5 to-[#095c7b]/10 hover:border-[#095c7b]/50 hover:shadow-[#095c7b]/15",
    topBar: "bg-gradient-to-r from-[#095c7b] via-cyan-600 to-[#095c7b]",
    title: "text-[#095c7b] font-semibold",
    value: "text-[#095c7b] dark:text-sky-400",
    iconBg: "bg-[#095c7b]/10 text-[#095c7b]",
    iconHover: "group-hover:bg-[#095c7b] group-hover:text-white",
    description: "text-slate-600 font-medium"
  },
  positive: {
    card: "border-emerald-300 bg-gradient-to-b from-white via-emerald-50/30 to-emerald-50/60 hover:border-emerald-400 hover:shadow-emerald-200/50",
    topBar: "bg-gradient-to-r from-emerald-500 to-teal-500",
    title: "text-emerald-950 font-semibold",
    value: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 text-emerald-700",
    iconHover: "group-hover:bg-emerald-600 group-hover:text-white",
    description: "text-emerald-700 font-semibold"
  },
  'in-progress': {
    card: "border-sky-300 bg-gradient-to-b from-white via-sky-50/30 to-sky-50/60 hover:border-sky-400 hover:shadow-sky-200/50",
    topBar: "bg-gradient-to-r from-sky-500 to-blue-600",
    title: "text-sky-950 font-semibold",
    value: "text-sky-700 dark:text-sky-400",
    iconBg: "bg-sky-100 text-sky-700",
    iconHover: "group-hover:bg-sky-600 group-hover:text-white",
    description: "text-sky-700 font-semibold"
  },
  negative: {
    card: "border-rose-300 bg-gradient-to-b from-white via-rose-50/30 to-rose-50/60 hover:border-rose-400 hover:shadow-rose-200/50",
    topBar: "bg-gradient-to-r from-rose-500 to-red-600",
    title: "text-rose-950 font-semibold",
    value: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 text-rose-700",
    iconHover: "group-hover:bg-rose-600 group-hover:text-white",
    description: "text-rose-700 font-semibold"
  },
  metric: {
    card: "border-indigo-200 bg-gradient-to-b from-white via-indigo-50/20 to-indigo-50/40 hover:border-indigo-300 hover:shadow-indigo-100/50",
    topBar: "bg-gradient-to-r from-indigo-500 to-violet-500",
    title: "text-indigo-950 font-semibold",
    value: "text-indigo-700 dark:text-indigo-400",
    iconBg: "bg-indigo-100 text-indigo-700",
    iconHover: "group-hover:bg-indigo-600 group-hover:text-white",
    description: "text-indigo-700 font-medium"
  },
  ratio: {
    card: "border-teal-200 bg-gradient-to-b from-white via-teal-50/20 to-teal-50/40 hover:border-teal-300 hover:shadow-teal-100/50",
    topBar: "bg-gradient-to-r from-teal-500 to-emerald-500",
    title: "text-teal-950 font-semibold",
    value: "text-teal-700 dark:text-teal-400",
    iconBg: "bg-teal-100 text-teal-700",
    iconHover: "group-hover:bg-teal-600 group-hover:text-white",
    description: "text-teal-700 font-medium"
  },
  default: {
    card: "border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-xs hover:border-slate-300",
    topBar: "bg-gradient-to-r from-[#095c7b] via-sky-500 to-[#103d39]",
    title: "text-slate-500 font-medium",
    value: "text-[#095c7b] dark:text-sky-400",
    iconBg: "bg-[#095c7b]/10 text-[#095c7b]",
    iconHover: "group-hover:bg-[#095c7b] group-hover:text-white",
    description: "text-slate-500 font-medium"
  }
};

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  onClick, 
  helpContent, 
  variant = 'default',
  className 
}: { 
  title: string; 
  value: string | number | React.ReactNode; 
  icon: React.ElementType; 
  description?: React.ReactNode; 
  onClick?: () => void; 
  helpContent?: React.ReactNode; 
  variant?: StatCardVariant;
  className?: string; 
}) => {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
        styles.card,
        onClick && "cursor-pointer active:scale-[0.99]", 
        className
      )} 
      onClick={onClick}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 group-hover:h-2 opacity-95 group-hover:opacity-100", styles.topBar)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
        <CardTitle className={cn("text-xs flex items-center gap-1.5", styles.title)}>
          <span>{title}</span>
          {helpContent && <SectionHelp content={helpContent} />}
        </CardTitle>
        <div className={cn("p-2 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", styles.iconBg, styles.iconHover)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className={cn("text-2xl font-bold tracking-tight", styles.value)}>
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} />
          ) : typeof value === 'string' && !isNaN(Number(value)) ? (
            <AnimatedNumber value={Number(value)} />
          ) : (
            value
          )}
        </div>
        {description && <p className={cn("text-xs mt-1", styles.description)}>{description}</p>}
      </CardContent>
    </Card>
  );
};

export default function RevenueAnalysisClient() {
  const { userProfile, loading } = useAuth();
  const { setLoadTime } = usePerformance();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);

  // Filter States
  const [selectedAm, setSelectedAm] = useState<string[]>([]);
  const [appliedAm, setAppliedAm] = useState<string[]>([]);

  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [appliedCompanyName, setAppliedCompanyName] = useState<string>('');

  // Main Date Filters: Date Signed Up (Default: Current Month), Date Quote Sent, Date SCF Accepted
  const [signedUpDateRange, setSignedUpDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [appliedSignedUpDateRange, setAppliedSignedUpDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [quoteSentDateRange, setQuoteSentDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [appliedQuoteSentDateRange, setAppliedQuoteSentDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [scfAcceptedDateRange, setScfAcceptedDateRange] = useState<DateRange | undefined>(undefined);
  const [appliedScfAcceptedDateRange, setAppliedScfAcceptedDateRange] = useState<DateRange | undefined>(undefined);

  const [dateMatchMode, setDateMatchMode] = useState<'OR' | 'AND'>('OR');
  const [appliedDateMatchMode, setAppliedDateMatchMode] = useState<'OR' | 'AND'>('OR');

  const [selectedFranchisee, setSelectedFranchisee] = useState<string[]>([]);
  const [appliedFranchisee, setAppliedFranchisee] = useState<string[]>([]);

  const [selectedBucket, setSelectedBucket] = useState<string[]>([]);
  const [appliedBucket, setAppliedBucket] = useState<string[]>([]);

  const [selectedLeadType, setSelectedLeadType] = useState<string[]>([]);
  const [appliedLeadType, setAppliedLeadType] = useState<string[]>([]);

  const [selectedAccountType, setSelectedAccountType] = useState<string[]>([]);
  const [appliedAccountType, setAppliedAccountType] = useState<string[]>([]);

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [appliedStatus, setAppliedStatus] = useState<string[]>([]);

  const [availableCampaigns, setAvailableCampaigns] = useState<LeadCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [appliedCampaign, setAppliedCampaign] = useState<string>('all');

  // Drilldown modal state
  const [drillDownData, setDrillDownData] = useState<{ title: string; leads: Lead[] } | null>(null);
  const [drillDownSearchQuery, setDrillDownSearchQuery] = useState('');
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState('all');
  const [drillDownBucketFilter, setDrillDownBucketFilter] = useState('all');

  // Date Preset helper (updates primary Date Signed Up filter)
  const setDatePreset = (preset: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all') => {
    const now = new Date();
    let range: DateRange | undefined;
    if (preset === 'today') {
      range = { from: startOfDay(now), to: endOfDay(now) };
    } else if (preset === 'yesterday') {
      const yesterday = subDays(now, 1);
      range = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    } else if (preset === 'this_week') {
      range = { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    } else if (preset === 'last_week') {
      const prevWeek = subWeeks(now, 1);
      range = { from: startOfWeek(prevWeek, { weekStartsOn: 1 }), to: endOfWeek(prevWeek, { weekStartsOn: 1 }) };
    } else if (preset === 'this_month') {
      range = { from: startOfMonth(now), to: endOfMonth(now) };
    } else if (preset === 'last_month') {
      const prevMonth = subMonths(now, 1);
      range = { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    } else if (preset === 'this_year') {
      range = { from: startOfYear(now), to: endOfYear(now) };
    } else {
      range = undefined;
    }
    setSignedUpDateRange(range);
    setQuoteSentDateRange(range);
  };

  const hasUnappliedFilters = useMemo(() => {
    return (
      selectedCompanyName !== appliedCompanyName ||
      JSON.stringify(selectedAm) !== JSON.stringify(appliedAm) ||
      JSON.stringify(selectedFranchisee) !== JSON.stringify(appliedFranchisee) ||
      JSON.stringify(selectedBucket) !== JSON.stringify(appliedBucket) ||
      JSON.stringify(selectedLeadType) !== JSON.stringify(appliedLeadType) ||
      JSON.stringify(selectedAccountType) !== JSON.stringify(appliedAccountType) ||
      JSON.stringify(selectedStatus) !== JSON.stringify(appliedStatus) ||
      selectedCampaign !== appliedCampaign ||
      dateMatchMode !== appliedDateMatchMode ||
      signedUpDateRange?.from?.getTime() !== appliedSignedUpDateRange?.from?.getTime() ||
      signedUpDateRange?.to?.getTime() !== appliedSignedUpDateRange?.to?.getTime() ||
      quoteSentDateRange?.from?.getTime() !== appliedQuoteSentDateRange?.from?.getTime() ||
      quoteSentDateRange?.to?.getTime() !== appliedQuoteSentDateRange?.to?.getTime() ||
      scfAcceptedDateRange?.from?.getTime() !== appliedScfAcceptedDateRange?.from?.getTime() ||
      scfAcceptedDateRange?.to?.getTime() !== appliedScfAcceptedDateRange?.to?.getTime()
    );
  }, [
    selectedCompanyName, appliedCompanyName,
    selectedAm, appliedAm,
    selectedFranchisee, appliedFranchisee,
    selectedBucket, appliedBucket,
    selectedLeadType, appliedLeadType,
    selectedAccountType, appliedAccountType,
    selectedStatus, appliedStatus,
    selectedCampaign, appliedCampaign,
    dateMatchMode, appliedDateMatchMode,
    signedUpDateRange, appliedSignedUpDateRange,
    quoteSentDateRange, appliedQuoteSentDateRange,
    scfAcceptedDateRange, appliedScfAcceptedDateRange
  ]);

  const applyFilters = () => {
    setAppliedAm(selectedAm);
    setAppliedCompanyName(selectedCompanyName);
    setAppliedSignedUpDateRange(signedUpDateRange);
    setAppliedQuoteSentDateRange(quoteSentDateRange);
    setAppliedScfAcceptedDateRange(scfAcceptedDateRange);
    setAppliedDateMatchMode(dateMatchMode);
    setAppliedFranchisee(selectedFranchisee);
    setAppliedBucket(selectedBucket);
    setAppliedLeadType(selectedLeadType);
    setAppliedAccountType(selectedAccountType);
    setAppliedStatus(selectedStatus);
    setAppliedCampaign(selectedCampaign);
  };

  const clearFilters = () => {
    setSelectedAm([]);
    setAppliedAm([]);
    setSelectedCompanyName('');
    setAppliedCompanyName('');
    setDateMatchMode('OR');
    setAppliedDateMatchMode('OR');
    setSignedUpDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setAppliedSignedUpDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setQuoteSentDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setAppliedQuoteSentDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setScfAcceptedDateRange(undefined);
    setAppliedScfAcceptedDateRange(undefined);
    setSelectedFranchisee([]);
    setAppliedFranchisee([]);
    setSelectedBucket([]);
    setAppliedBucket([]);
    setSelectedLeadType([]);
    setAppliedLeadType([]);
    setSelectedAccountType([]);
    setAppliedAccountType([]);
    setSelectedStatus([]);
    setAppliedStatus([]);
    setSelectedCampaign('all');
    setAppliedCampaign('all');
  };

  const getAmName = (am: UserProfile) => {
    return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
  };

  // Fetch campaigns
  useEffect(() => {
    getLeadCampaigns().then(campaigns => {
      setAvailableCampaigns(campaigns.filter(c => c.isActive));
    });
  }, []);

  // Fetch Account Managers, Leads, Companies, and SCFs in a single coordinated fast load
  useEffect(() => {
    if (loading) return;

    async function fetchRevenueData() {
      setIsLoadingData(true);
      const startTimePerf = performance.now();
      try {
        const usersRef = collection(firestore, 'users');
        const q1 = query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'));
        const q2 = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'));
        const q3 = query(usersRef, where('assignedRoles', 'array-contains', 'account managers'));
        
        const leadsRef = collection(firestore, 'leads');
        const companiesRef = collection(firestore, 'companies');
        const buckets = ['account_manager', 'inbound', 'customer_success', 'marketing', 'nurture', 'multisite'];
        
        const qLeads = query(leadsRef, where('bucket', 'in', buckets));
        const qCompanies = query(companiesRef);

        const [snap1, snap2, snap3, snapLeads, snapCompanies, scfsSnap] = await Promise.all([
          getDocs(q1),
          getDocs(q2),
          getDocs(q3),
          getDocs(qLeads),
          getDocs(qCompanies),
          getDocs(collectionGroup(firestore, 'scfs')).catch(() => ({ docs: [] }))
        ]);
        
        const amMap = new Map<string, UserProfile>();
        [snap1, snap2, snap3].forEach(snap => {
          snap.docs.forEach(doc => {
            amMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
          });
        });
        const amsList = Array.from(amMap.values());
        setAccountManagers(amsList);

        const rawCompanies = snapCompanies.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              isCompany: true,
              customerStatus: data.customerStatus || data.status || 'Signed',
              status: data.status || data.customerStatus || 'Signed'
            } as unknown as Lead;
          })
          .filter(c => !isTestLeadOrCompany(c) && !isParentSuffixLeadOrCompany(c));

        const companyIds = new Set(rawCompanies.map(c => c.id));

        const rawLeads = snapLeads.docs
          .filter(doc => !companyIds.has(doc.id))
          .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
          .filter(l => !isTestLeadOrCompany(l) && !isParentSuffixLeadOrCompany(l));

        const fetchedLeads = [...rawLeads, ...rawCompanies];

        if (scfsSnap && scfsSnap.docs && scfsSnap.docs.length > 0) {
          const scfsByParentMap = new Map<string, any[]>();
          scfsSnap.docs.forEach(doc => {
            const parentId = doc.ref.parent?.parent?.id;
            if (parentId) {
              const existing = scfsByParentMap.get(parentId) || [];
              existing.push({ id: doc.id, ...doc.data() });
              scfsByParentMap.set(parentId, existing);
            }
          });

          fetchedLeads.forEach(lead => {
            const parentScfs = scfsByParentMap.get(lead.id);
            if (parentScfs && parentScfs.length > 0) {
              (lead as any).scfs = parentScfs;
            }
          });
        }

        const filteredLeads = fetchedLeads.filter(l => {
          if (isTestLeadOrCompany(l)) return false;
          if (isLpoLeadOrCompany(l)) return false;
          if (isParentSuffixLeadOrCompany(l)) return false;
          const isDirectlyAm = l.bucket === 'account_manager' || l.bucket === 'inbound' || l.bucket === 'multisite';
          const wasInAm = l.bucketHistory?.some(bh => bh.oldBucket === 'account_manager' || bh.oldBucket === 'inbound' || bh.oldBucket === 'multisite');
          return isDirectlyAm || wasInAm || !!l.accountManagerAssigned || (l as any).isCompany;
        });

        const deduplicatedLeads = deduplicateRevenueLeads(filteredLeads);

        setLeads(deduplicatedLeads);
      } catch (error) {
        console.error("Error fetching revenue analysis leads", error);
      } finally {
        setIsLoadingData(false);
        setLoadTime(Math.round(performance.now() - startTimePerf));
      }
    }

    fetchRevenueData();
  }, [loading, setLoadTime]);

  const isSignedStatus = (status?: string): boolean => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return s === 'signed' || s === 'won' || s === 'customer' || s === 'signed customer';
  };

  const isSignedLead = (lead: Lead): boolean => {
    if (isParentSuffixLeadOrCompany(lead)) return false;
    if ((lead as any).isCompany) return true;
    if (lead.signedUpAt || (lead as any).signedDate || (lead as any).signedAt) return true;
    const status = lead.customerStatus || lead.status;
    return isSignedStatus(status);
  };

  const isLostLead = (l: Lead) => {
    const st = l.customerStatus || l.status || '';
    const lostStatuses = ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off', 'Out of Territory', 'LocalMile Trial Stopped', 'ShipMate Trial Stopped'];
    return lostStatuses.includes(st) || st.toLowerCase().includes('lost');
  };

  // Helper to extract Date Signed Up
  const getLeadSignedDate = (lead: Lead): Date | null => {
    const rawDate = lead.signedUpAt || (lead as any).signedDate || (lead as any).signedAt;
    if (rawDate) {
      const d = parseDateString(rawDate);
      if (d && !isNaN(d.getTime())) return d;
    }

    const scfRaw = (lead as any).scfAcceptedAt || (lead as any).acceptedAt;
    if (scfRaw) {
      const d = parseDateString(scfRaw);
      if (d && !isNaN(d.getTime())) return d;
    }

    if (Array.isArray(lead.scfLinks)) {
      const acceptedLink = lead.scfLinks.find(s => (s.status as string) === 'Accepted' || (s.status as string) === 'Signed' || !!s.acceptedAt);
      if (acceptedLink?.acceptedAt) {
        const d = parseDateString(acceptedLink.acceptedAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if (Array.isArray((lead as any).scfs)) {
      const acceptedScf = (lead as any).scfs.find((s: any) => s.status === 'Accepted' || s.status === 'Signed' || s.status === 'Quote Accepted' || !!s.acceptedAt || !!s.signedAt);
      if (acceptedScf?.acceptedAt || acceptedScf?.signedAt) {
        const d = parseDateString(acceptedScf.acceptedAt || acceptedScf.signedAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if (lead.activity && lead.activity.length > 0) {
      const signedAct = lead.activity.find(act => {
        const notes = act.notes || '';
        return /Status changed to (Won|Signed)/i.test(notes) ||
               /Signed customer|Converted to Signed|Contract Signed|SCF Signed|SCF Accepted/i.test(notes);
      });
      if (signedAct?.date) {
        const d = parseDateString(signedAct.date);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if ((lead as any).isCompany) {
      const rawCreated = lead.dateLeadEntered || (lead as any).createdAt || (lead as any).created;
      if (rawCreated) {
        const d = parseDateString(rawCreated);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    return null;
  };

  // Helper to extract Date Quote Sent
  const getLeadQuoteSentDate = (lead: Lead): Date | null => {
    const rawDate = lead.quoteSentAt || (lead as any).dateQuoteSent || (lead as any).quoteSentDate || (lead as any).quoteDate || (lead as any).scfSentAt || (lead as any).dateQuoteCreated || (lead as any).lastQuoteDate;
    if (rawDate) {
      const d = parseDateString(rawDate);
      if (d && !isNaN(d.getTime())) return d;
    }

    if (Array.isArray(lead.scfLinks) && lead.scfLinks.length > 0) {
      const sentLink = lead.scfLinks.find(s => (s as any).sentAt || s.createdAt);
      if (sentLink) {
        const d = parseDateString((sentLink as any).sentAt || sentLink.createdAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if (Array.isArray((lead as any).scfs) && (lead as any).scfs.length > 0) {
      const sentScf = (lead as any).scfs.find((s: any) => s.sentAt || s.createdAt);
      if (sentScf) {
        const d = parseDateString(sentScf.sentAt || sentScf.createdAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    // Fallback for leads with Quote Sent status
    if ((lead.customerStatus || lead.status) === 'Quote Sent') {
      const fallbackDate = (lead as any).dateLeadEntered || (lead as any).updatedAt || (lead as any).createdAt;
      if (fallbackDate) {
        const d = parseDateString(fallbackDate);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    return null;
  };

  // Helper to extract Date SCF Accepted
  const getLeadScfAcceptedDate = (lead: Lead): Date | null => {
    const rawDate = lead.scfAcceptedAt || (lead as any).dateScfAccepted || (lead as any).acceptedAt;
    if (rawDate) {
      const d = parseDateString(rawDate);
      if (d && !isNaN(d.getTime())) return d;
    }

    if (Array.isArray(lead.scfLinks)) {
      const acceptedLink = lead.scfLinks.find(s => (s.status as string) === 'Accepted' || (s.status as string) === 'Signed' || !!s.acceptedAt);
      if (acceptedLink?.acceptedAt) {
        const d = parseDateString(acceptedLink.acceptedAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if (Array.isArray((lead as any).scfs)) {
      const acceptedScf = (lead as any).scfs.find((s: any) => s.status === 'Accepted' || s.status === 'Signed' || s.status === 'Quote Accepted' || !!s.acceptedAt || !!s.signedAt);
      if (acceptedScf?.acceptedAt || acceptedScf?.signedAt) {
        const d = parseDateString(acceptedScf.acceptedAt || acceptedScf.signedAt);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    if (lead.activity && lead.activity.length > 0) {
      const scfAct = lead.activity.find(act => {
        const notes = act.notes || '';
        return /SCF Accepted|SCF Signed|Quote Accepted|Status changed to (Quote Accepted|SCF Accepted)/i.test(notes);
      });
      if (scfAct?.date) {
        const d = parseDateString(scfAct.date);
        if (d && !isNaN(d.getTime())) return d;
      }
    }

    return null;
  };

  const isDateInRange = (d: Date | null, range?: DateRange): boolean => {
    if (!range?.from) return true;
    if (!d) return false;
    const fromDate = startOfDay(range.from);
    const toDate = range.to ? endOfDay(range.to) : endOfDay(range.from);
    return d >= fromDate && d <= toDate;
  };

  const isSignedLeadInPeriod = (lead: Lead): boolean => {
    if (isLostLead(lead)) return false;
    if (!isSignedLead(lead)) return false;
    if (!appliedSignedUpDateRange?.from) return true;
    const signedDate = getLeadSignedDate(lead);
    return isDateInRange(signedDate, appliedSignedUpDateRange);
  };

  const getLeadStatusForAnalysis = (lead: Lead): string => {
    if (isLostLead(lead)) {
      return lead.customerStatus || lead.status || 'Lost';
    }
    if (isSignedLead(lead)) {
      if (isSignedLeadInPeriod(lead)) {
        return 'Signed';
      }
      // If signed historically, but brought into this period via Quote Sent or SCF Accepted
      const quoteSentDate = getLeadQuoteSentDate(lead);
      if (appliedQuoteSentDateRange?.from && isDateInRange(quoteSentDate, appliedQuoteSentDateRange)) {
        return 'Quote Sent';
      }
      const scfDate = getLeadScfAcceptedDate(lead);
      if (appliedScfAcceptedDateRange?.from && isDateInRange(scfDate, appliedScfAcceptedDateRange)) {
        return 'Quote Accepted';
      }
      return lead.customerStatus || lead.status || 'Signed';
    }
    return lead.customerStatus || lead.status || 'New';
  };

  const calculateRawLeadValue = (lead: Lead): number => {
    return calculateMonthlyValueUtil(lead, true);
  };

  const calculateMonthlyValue = (lead: Lead) => {
    if (isSignedLead(lead)) {
      return 0;
    }
    const applicableStatuses = ['Quote Sent', 'LocalMile Opportunity', 'LocalMile Pending', 'Trialing LocalMile', 'Free Trial', 'Trialing ShipMate'];
    const currentStatus = lead.customerStatus || lead.status;
    if (!applicableStatuses.includes(currentStatus || '')) {
      return 0;
    }
    return calculateRawLeadValue(lead);
  };

  const uniqueFranchisees: string[] = useMemo(() => Array.from(new Set(leads.map(l => l.franchisee).filter(Boolean))) as string[], [leads]);
  const STANDARD_AM_BUCKETS = ['account_manager', 'inbound', 'multisite', 'customer_success', 'marketing', 'nurture'];
  const uniqueBuckets: string[] = useMemo(() => Array.from(new Set([...STANDARD_AM_BUCKETS, ...leads.map(l => l.bucket).filter(Boolean)])) as string[], [leads]);
  const uniqueLeadTypes: string[] = useMemo(() => Array.from(new Set(leads.map(l => l.leadType || 'Unknown'))), [leads]);
  const uniqueStatuses: string[] = useMemo(() => Array.from(new Set(leads.map(l => l.customerStatus || l.status).filter(Boolean))) as string[], [leads]);

  const displayedLeads = useMemo(() => {
    const query = appliedCompanyName.trim().toLowerCase();
    return leads.filter(lead => {
      if (isTestLeadOrCompany(lead)) return false;
      if (isLpoLeadOrCompany(lead)) return false;
      if (isParentSuffixLeadOrCompany(lead)) return false;

      if (query) {
        const compName = (lead.companyName || '').toLowerCase();
        const pId = (lead.prospectPlusId || '').toLowerCase();
        const leadId = (lead.id || '').toLowerCase();
        if (!compName.includes(query) && !pId.includes(query) && !leadId.includes(query)) {
          return false;
        }
      }

      if (appliedAm.length > 0) {
        const rep = (lead as any).assignedUser || lead.accountManagerAssigned || (lead as any).amAssigned || (lead as any).userInCharge || lead.dialerAssigned || '';
        const matchRep = appliedAm.some(target => target.toLowerCase() === rep.toLowerCase());
        const matchAct = lead.activity?.some(act => appliedAm.some(target => target.toLowerCase() === (act.author || '').toLowerCase()));
        if (!matchRep && !matchAct) return false;
      }

      if (appliedFranchisee.length > 0 && lead.franchisee && !appliedFranchisee.includes(lead.franchisee)) return false;
      if (appliedBucket.length > 0) {
        const currentB = (lead.bucket || '').toLowerCase();
        const initialB = (getLeadInitialBucket(lead) || '').toLowerCase();
        const origB = ((lead as any).originalBucket || '').toLowerCase();
        const match = appliedBucket.some(target => {
          const t = target.toLowerCase().replace(/_/g, ' ');
          return currentB === target.toLowerCase() || 
                 currentB.replace(/_/g, ' ') === t || 
                 initialB === target.toLowerCase() || 
                 initialB.replace(/_/g, ' ') === t || 
                 origB === target.toLowerCase() || 
                 origB.replace(/_/g, ' ') === t;
        });
        if (!match) return false;
      }
      if (appliedLeadType.length > 0 && (lead.leadType || 'Unknown') && !appliedLeadType.includes(lead.leadType || 'Unknown')) return false;
      if (appliedAccountType.length > 0 && !appliedAccountType.includes(getLeadAccountType(lead))) return false;
      
      if (appliedCampaign !== 'all' && (lead.campaign || (lead as any).customerCampaign) !== appliedCampaign) return false;
      
      const status = getLeadStatusForAnalysis(lead);
      if (appliedStatus.length > 0 && status && !appliedStatus.includes(status)) return false;
      
      // Main Date Filters with OR / AND Matching Mode
      const hasSignedFilter = !!appliedSignedUpDateRange?.from;
      const hasQuoteFilter = !!appliedQuoteSentDateRange?.from;
      const hasScfFilter = !!appliedScfAcceptedDateRange?.from;

      if (hasSignedFilter || hasQuoteFilter || hasScfFilter) {
        const matchesSigned = hasSignedFilter && isDateInRange(getLeadSignedDate(lead), appliedSignedUpDateRange);
        const matchesQuote = hasQuoteFilter && isDateInRange(getLeadQuoteSentDate(lead), appliedQuoteSentDateRange);
        const matchesScf = hasScfFilter && isDateInRange(getLeadScfAcceptedDate(lead), appliedScfAcceptedDateRange);

        if (appliedDateMatchMode === 'OR') {
          if (!matchesSigned && !matchesQuote && !matchesScf) {
            return false;
          }
        } else {
          // AND mode: must match all specified date filters
          if (hasSignedFilter && !matchesSigned) return false;
          if (hasQuoteFilter && !matchesQuote) return false;
          if (hasScfFilter && !matchesScf) return false;
        }
      }

      return true;
    });
  }, [
    leads,
    appliedCompanyName,
    appliedAm,
    appliedFranchisee,
    appliedBucket,
    appliedLeadType,
    appliedAccountType,
    appliedStatus,
    appliedCampaign,
    appliedDateMatchMode,
    appliedSignedUpDateRange,
    appliedQuoteSentDateRange,
    appliedScfAcceptedDateRange
  ]);

  // Aggregate Metrics & Revenue Calculations
  const metrics = useMemo(() => {
    let totalPipelineValue = 0;
    let totalActivePipelineLeadsCount = 0;
    let activeLeadsWithMrrCount = 0;
    let totalSignedMrr = 0;
    let totalSignedLeadsCount = 0;
    let totalLostMrr = 0;
    let totalLostCount = 0;
    let highValueOpportunitiesCount = 0;

    const valueByStatus: Record<string, { value: number; leadCount: number }> = {};
    const valueByLeadType: Record<string, { value: number; leadCount: number }> = {};
    const valueByBucket: Record<string, { value: number; leadCount: number }> = {};
    const valueByAM: Record<string, { value: number; leadCount: number }> = {};
    const valueByLead: { id: string; name: string; am: string; value: number; status: string; leadType: string; accountType: string; originBucket: string; activityCount: number; durationMinutes: number; lead: Lead }[] = [];

    displayedLeads.forEach(lead => {
      const isLost = isLostLead(lead);
      const isSigned = !isLost && isSignedLead(lead);
      const signedDate = getLeadSignedDate(lead);
      const signedDateMatches = !appliedSignedUpDateRange?.from || isDateInRange(signedDate, appliedSignedUpDateRange);
      const rawVal = calculateRawLeadValue(lead);
      const leadType = lead.leadType || 'Unknown';
      const status = isLost ? (lead.customerStatus || lead.status || 'Lost') : (isSigned ? 'Signed' : (lead.customerStatus || lead.status || 'New'));

      if (isLost) {
        totalLostCount += 1;
        totalLostMrr += rawVal;
      } else if (isSigned) {
        if (signedDateMatches) {
          totalSignedLeadsCount += 1;
          if (rawVal > 0) {
            totalSignedMrr += rawVal;
          }
        }
      } else {
        // Active Open Pipeline lead
        totalActivePipelineLeadsCount += 1;
        const val = calculateRawLeadValue(lead);
        if (val > 0) {
          totalPipelineValue += val;
          activeLeadsWithMrrCount += 1;

          if (val >= 500) {
            highValueOpportunitiesCount += 1;
          }
        }

        // Populate breakdown charts (Pipeline Value by Status, Lead Type, Bucket, AM)
        // Populated for all active open pipeline leads (excludes Signed and Lost)
        if (!valueByStatus[status]) valueByStatus[status] = { value: 0, leadCount: 0 };
        valueByStatus[status].value += val;
        valueByStatus[status].leadCount += 1;

        if (!valueByLeadType[leadType]) valueByLeadType[leadType] = { value: 0, leadCount: 0 };
        valueByLeadType[leadType].value += val;
        valueByLeadType[leadType].leadCount += 1;

        const bucketRaw = lead.bucket || 'Unassigned';
        const bucket = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!valueByBucket[bucket]) valueByBucket[bucket] = { value: 0, leadCount: 0 };
        valueByBucket[bucket].value += val;
        valueByBucket[bucket].leadCount += 1;

        const am = lead.accountManagerAssigned || 'Unassigned';
        if (!valueByAM[am]) valueByAM[am] = { value: 0, leadCount: 0 };
        valueByAM[am].value += val;
        valueByAM[am].leadCount += 1;
      }

      const leadActivities = lead.activity || [];
      const leadDuration = leadActivities.reduce((sum, act: any) => sum + (act.durationMinutes || 0), 0);

      // Top High Value Opportunities: strictly active open pipeline deals with potential MRR > 0 (excluding Won/Signed and Lost)
      if (!isLost && !isSigned && rawVal > 0) {
        valueByLead.push({
          id: lead.id,
          name: lead.companyName || 'Unnamed Lead',
          am: lead.accountManagerAssigned || 'Unassigned',
          value: rawVal,
          status: status,
          leadType: leadType,
          accountType: getLeadAccountType(lead),
          originBucket: getLeadInitialBucket(lead),
          activityCount: leadActivities.length,
          durationMinutes: leadDuration,
          lead
        });
      }
    });

    valueByLead.sort((a, b) => b.value - a.value);

    const totalDealsCount = totalSignedLeadsCount + activeLeadsWithMrrCount;
    const totalRevenueMrr = totalSignedMrr + totalPipelineValue;
    const avgDealSize = totalDealsCount > 0 ? totalRevenueMrr / totalDealsCount : 0;
    const totalClosedMrr = totalSignedMrr + totalLostMrr;
    const winRatio = totalClosedMrr > 0 ? (totalSignedMrr / totalClosedMrr) * 100 : 0;

    return {
      totalPipelineValue,
      totalActivePipelineLeadsCount,
      activeLeadsWithMrrCount,
      avgDealSize,
      totalSignedMrr,
      totalSignedLeadsCount,
      totalLostMrr,
      totalLostCount,
      winRatio,
      highValueOpportunitiesCount,
      valueByStatus,
      valueByLeadType,
      valueByBucket,
      valueByAM,
      valueByLead
    };
  }, [displayedLeads, appliedSignedUpDateRange]);

  // Chart Data
  const statusChartData = useMemo(() => {
    return Object.entries(metrics.valueByStatus).map(([status, item]) => ({
      status,
      value: item.value,
      leadCount: item.leadCount,
      fill: status === 'Won' || status === 'Signed' ? '#10b981' : 
            status === 'Quote Sent' ? '#095c7b' : 
            status.includes('LocalMile') ? '#0284c7' : '#64748b'
    })).sort((a, b) => b.value - a.value);
  }, [metrics.valueByStatus]);

  const leadTypeChartData = useMemo(() => {
    return Object.entries(metrics.valueByLeadType).map(([type, item]) => ({
      type,
      value: item.value,
      leadCount: item.leadCount,
      fill: type === 'B2B' ? '#095c7b' : 
            type === 'B2C' ? '#0284c7' : '#0d9488'
    })).sort((a, b) => b.value - a.value);
  }, [metrics.valueByLeadType]);

  const bucketChartData = useMemo(() => {
    const palette = ['#095c7b', '#0284c7', '#059669', '#d97706', '#8b5cf6', '#ec4899'];
    return Object.entries(metrics.valueByBucket).map(([bucket, item], idx) => ({
      bucket,
      value: item.value,
      leadCount: item.leadCount,
      fill: palette[idx % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [metrics.valueByBucket]);

  const amChartData = useMemo(() => {
    const palette = ['#095c7b', '#0284c7', '#059669', '#d97706', '#8b5cf6', '#ec4899'];
    return Object.entries(metrics.valueByAM).map(([am, item], idx) => ({
      am,
      value: item.value,
      leadCount: item.leadCount,
      fill: palette[idx % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [metrics.valueByAM]);

  // Quote Sent Revenue & Opportunities Analysis
  const quotesSentLeadsData = useMemo(() => {
    const quoteList: {
      id: string;
      companyName: string;
      accountManager: string;
      bucket: string;
      originBucket: string;
      accountType: string;
      leadType: string;
      status: string;
      quotedMrr: number;
      dateQuoteSent: string;
      lead: Lead;
    }[] = [];

    displayedLeads.forEach(l => {
      const isLost = isLostLead(l);
      const isSigned = !isLost && isSignedLead(l);
      // Strictly exclude leads that are marked as Lost or have converted to Signed
      if (isLost || isSigned) return;

      const isQuoteSentStatus = (l.customerStatus || l.status) === 'Quote Sent';
      const quoteSentDate = getLeadQuoteSentDate(l);
      const quoteDateMatches = !appliedQuoteSentDateRange?.from || isDateInRange(quoteSentDate, appliedQuoteSentDateRange);
      const hasQuoteSent = isQuoteSentStatus || !!quoteSentDate || !!l.quoteSentAt || !!(l as any).dateQuoteSent;
      
      if (hasQuoteSent && quoteDateMatches) {
        const quotedMrr = calculateRawLeadValue(l);
        const bucketRaw = l.bucket || 'Unassigned';
        const bucket = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const leadType = l.leadType || 'Unknown';
        const am = l.accountManagerAssigned || 'Unassigned';
        const status = l.customerStatus || l.status || 'Quote Sent';

        let dateStr = '';
        if (quoteSentDate) {
          try {
            dateStr = format(quoteSentDate, 'dd MMM yyyy');
          } catch {
            dateStr = l.dateLeadEntered || '';
          }
        } else {
          dateStr = l.dateLeadEntered || (l as any).createdAt || '';
        }

        quoteList.push({
          id: l.id,
          companyName: l.companyName || 'Unnamed Lead',
          accountManager: am,
          bucket,
          originBucket: getLeadInitialBucket(l),
          accountType: getLeadAccountType(l),
          leadType,
          status,
          quotedMrr,
          dateQuoteSent: dateStr,
          lead: l
        });
      }
    });

    let totalQuotedMrr = 0;
    const byBucketMap: Record<string, { bucket: string; count: number; quotedMrr: number; leads: Lead[] }> = {};
    const byLeadTypeMap: Record<string, { type: string; count: number; quotedMrr: number; leads: Lead[] }> = {};
    const byAmMap: Record<string, { am: string; count: number; quotedMrr: number; leads: Lead[] }> = {};

    quoteList.forEach(item => {
      totalQuotedMrr += item.quotedMrr;

      // Bucket
      if (!byBucketMap[item.bucket]) {
        byBucketMap[item.bucket] = { bucket: item.bucket, count: 0, quotedMrr: 0, leads: [] };
      }
      byBucketMap[item.bucket].count += 1;
      byBucketMap[item.bucket].quotedMrr += item.quotedMrr;
      byBucketMap[item.bucket].leads.push(item.lead);

      // Lead Type
      if (!byLeadTypeMap[item.leadType]) {
        byLeadTypeMap[item.leadType] = { type: item.leadType, count: 0, quotedMrr: 0, leads: [] };
      }
      byLeadTypeMap[item.leadType].count += 1;
      byLeadTypeMap[item.leadType].quotedMrr += item.quotedMrr;
      byLeadTypeMap[item.leadType].leads.push(item.lead);

      // AM
      if (!byAmMap[item.accountManager]) {
        byAmMap[item.accountManager] = { am: item.accountManager, count: 0, quotedMrr: 0, leads: [] };
      }
      byAmMap[item.accountManager].count += 1;
      byAmMap[item.accountManager].quotedMrr += item.quotedMrr;
      byAmMap[item.accountManager].leads.push(item.lead);
    });

    const byBucket = Object.values(byBucketMap).map((b) => ({ ...b, fill: '#095c7b' })).sort((a, b) => b.quotedMrr - a.quotedMrr);
    const byLeadType = Object.values(byLeadTypeMap).map((t) => ({ ...t, fill: '#0284c7' })).sort((a, b) => b.quotedMrr - a.quotedMrr);
    const byAm = Object.values(byAmMap).map((a) => ({ ...a, fill: '#0369a1' })).sort((a, b) => b.quotedMrr - a.quotedMrr);

    return {
      quoteList: quoteList.sort((a, b) => b.quotedMrr - a.quotedMrr),
      totalQuoteCount: quoteList.length,
      totalQuotedMrr,
      byBucket,
      byLeadType,
      byAm
    };
  }, [displayedLeads, appliedQuoteSentDateRange]);

  // Signed Revenue & Customers Analysis
  const signedLeadsData = useMemo(() => {
    const signedList: {
      id: string;
      companyName: string;
      accountManager: string;
      bucket: string;
      originBucket: string;
      accountType: string;
      leadType: string;
      status: string;
      signedMrr: number;
      dateScfAccepted: string;
      dateSignedUp: string;
      dateEntered: string;
      isScfAccepted: boolean;
      lead: Lead;
    }[] = [];

    displayedLeads.forEach(l => {
      const signedDate = getLeadSignedDate(l);
      const signedDateMatches = !appliedSignedUpDateRange?.from || isDateInRange(signedDate, appliedSignedUpDateRange);

      if (!isLostLead(l) && isSignedLead(l) && signedDateMatches) {
        const signedMrr = calculateRawLeadValue(l);
        const bucketRaw = l.bucket || 'Unassigned';
        const bucket = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const leadType = l.leadType || 'Unknown';
        const am = l.accountManagerAssigned || 'Unassigned';
        const status = 'Signed';

        let dateSignedStr = '-';
        if (signedDate) {
          try {
            dateSignedStr = format(signedDate, 'dd MMM yyyy');
          } catch {
            dateSignedStr = l.signedUpAt || l.dateLeadEntered || '-';
          }
        } else if (l.signedUpAt) {
          dateSignedStr = l.signedUpAt;
        }

        const scfAcceptedDate = getLeadScfAcceptedDate(l);
        const isScfAccepted = !!(scfAcceptedDate && !isNaN(scfAcceptedDate.getTime()));
        let dateScfAcceptedStr = '-';
        if (scfAcceptedDate) {
          try {
            dateScfAcceptedStr = format(scfAcceptedDate, 'dd MMM yyyy');
          } catch {
            dateScfAcceptedStr = l.scfAcceptedAt || '-';
          }
        } else if (l.scfAcceptedAt) {
          dateScfAcceptedStr = l.scfAcceptedAt;
        }

        signedList.push({
          id: l.id,
          companyName: l.companyName || 'Unnamed Lead',
          accountManager: am,
          bucket,
          originBucket: getLeadInitialBucket(l),
          accountType: getLeadAccountType(l),
          leadType,
          status,
          signedMrr,
          dateScfAccepted: dateScfAcceptedStr,
          dateSignedUp: dateSignedStr,
          dateEntered: l.dateLeadEntered || (l as any).createdAt || '',
          isScfAccepted,
          lead: l
        });
      }
    });

    let totalSignedMrr = 0;
    const byBucketMap: Record<string, { bucket: string; count: number; signedMrr: number; leads: Lead[] }> = {};
    const byLeadTypeMap: Record<string, { type: string; count: number; signedMrr: number; leads: Lead[] }> = {};
    const byAmMap: Record<string, { am: string; count: number; signedMrr: number; leads: Lead[] }> = {};

    signedList.forEach(item => {
      totalSignedMrr += item.signedMrr;

      // Bucket
      if (!byBucketMap[item.bucket]) {
        byBucketMap[item.bucket] = { bucket: item.bucket, count: 0, signedMrr: 0, leads: [] };
      }
      byBucketMap[item.bucket].count += 1;
      byBucketMap[item.bucket].signedMrr += item.signedMrr;
      byBucketMap[item.bucket].leads.push(item.lead);

      // Lead Type
      if (!byLeadTypeMap[item.leadType]) {
        byLeadTypeMap[item.leadType] = { type: item.leadType, count: 0, signedMrr: 0, leads: [] };
      }
      byLeadTypeMap[item.leadType].count += 1;
      byLeadTypeMap[item.leadType].signedMrr += item.signedMrr;
      byLeadTypeMap[item.leadType].leads.push(item.lead);

      // AM
      if (!byAmMap[item.accountManager]) {
        byAmMap[item.accountManager] = { am: item.accountManager, count: 0, signedMrr: 0, leads: [] };
      }
      byAmMap[item.accountManager].count += 1;
      byAmMap[item.accountManager].signedMrr += item.signedMrr;
      byAmMap[item.accountManager].leads.push(item.lead);
    });

    const byBucket = Object.values(byBucketMap).map((b, idx) => ({ ...b, fill: '#059669' })).sort((a, b) => b.signedMrr - a.signedMrr);
    const byLeadType = Object.values(byLeadTypeMap).map((t, idx) => ({ ...t, fill: '#10b981' })).sort((a, b) => b.signedMrr - a.signedMrr);
    const byAm = Object.values(byAmMap).map((a, idx) => ({ ...a, fill: '#047857' })).sort((a, b) => b.signedMrr - a.signedMrr);

    return {
      signedList: signedList.sort((a, b) => b.signedMrr - a.signedMrr),
      totalSignedCount: signedList.length,
      totalSignedMrr,
      byBucket,
      byLeadType,
      byAm
    };
  }, [displayedLeads, appliedSignedUpDateRange]);

  // Lost Leads & Lost MRR Analysis
  const lostLeadsData = useMemo(() => {
    const lostList: {
      id: string;
      companyName: string;
      accountManager: string;
      bucket: string;
      originBucket: string;
      accountType: string;
      leadType: string;
      status: string;
      lostMrr: number;
      dateEntered: string;
      lead: Lead;
    }[] = [];

    displayedLeads.forEach(l => {
      if (isLostLead(l)) {
        const lostMrr = calculateRawLeadValue(l);
        const bucketRaw = l.bucket || 'Unassigned';
        const bucket = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const leadType = l.leadType || 'Unknown';
        const am = l.accountManagerAssigned || 'Unassigned';
        const status = l.customerStatus || l.status || 'Lost';

        lostList.push({
          id: l.id,
          companyName: l.companyName || 'Unnamed Lead',
          accountManager: am,
          bucket,
          originBucket: getLeadInitialBucket(l),
          accountType: getLeadAccountType(l),
          leadType,
          status,
          lostMrr,
          dateEntered: l.dateLeadEntered || '',
          lead: l
        });
      }
    });

    let totalLostMrr = 0;
    const byBucketMap: Record<string, { bucket: string; count: number; lostMrr: number; leads: Lead[] }> = {};
    const byLeadTypeMap: Record<string, { type: string; count: number; lostMrr: number; leads: Lead[] }> = {};
    const byAmMap: Record<string, { am: string; count: number; lostMrr: number; leads: Lead[] }> = {};

    lostList.forEach(item => {
      totalLostMrr += item.lostMrr;

      // Bucket
      if (!byBucketMap[item.bucket]) {
        byBucketMap[item.bucket] = { bucket: item.bucket, count: 0, lostMrr: 0, leads: [] };
      }
      byBucketMap[item.bucket].count += 1;
      byBucketMap[item.bucket].lostMrr += item.lostMrr;
      byBucketMap[item.bucket].leads.push(item.lead);

      // Lead Type
      if (!byLeadTypeMap[item.leadType]) {
        byLeadTypeMap[item.leadType] = { type: item.leadType, count: 0, lostMrr: 0, leads: [] };
      }
      byLeadTypeMap[item.leadType].count += 1;
      byLeadTypeMap[item.leadType].lostMrr += item.lostMrr;
      byLeadTypeMap[item.leadType].leads.push(item.lead);

      // AM
      if (!byAmMap[item.accountManager]) {
        byAmMap[item.accountManager] = { am: item.accountManager, count: 0, lostMrr: 0, leads: [] };
      }
      byAmMap[item.accountManager].count += 1;
      byAmMap[item.accountManager].lostMrr += item.lostMrr;
      byAmMap[item.accountManager].leads.push(item.lead);
    });

    const byBucket = Object.values(byBucketMap).map((b, idx) => ({ ...b, fill: '#e11d48' })).sort((a, b) => b.lostMrr - a.lostMrr);
    const byLeadType = Object.values(byLeadTypeMap).map((t, idx) => ({ ...t, fill: '#f43f5e' })).sort((a, b) => b.lostMrr - a.lostMrr);
    const byAm = Object.values(byAmMap).map((a, idx) => ({ ...a, fill: '#be123c' })).sort((a, b) => b.lostMrr - a.lostMrr);

    return {
      lostList: lostList.sort((a, b) => b.lostMrr - a.lostMrr),
      totalLostCount: lostList.length,
      totalLostMrr,
      byBucket,
      byLeadType,
      byAm
    };
  }, [displayedLeads]);

  // CSV Export Handlers
  const handleExportRevenueAnalysisCSV = () => {
    const csvParts: string[] = [];
    const dateStr = new Date().toISOString().split('T')[0];
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const addSection = (title: string, headers: string[], rows: any[][]) => {
      csvParts.push(`=== ${title.toUpperCase()} ===`);
      csvParts.push(headers.map(h => escapeCsv(h)).join(','));
      rows.forEach(row => {
        csvParts.push(row.map(cell => escapeCsv(cell)).join(','));
      });
      csvParts.push('');
    };

    addSection('REVENUE VALUE BY STATUS', ['Status', 'Lead Count', 'Revenue MRR ($)'], statusChartData.map(d => [d.status, d.leadCount, d.value.toFixed(2)]));
    addSection('REVENUE VALUE BY LEAD TYPE', ['Lead Type', 'Lead Count', 'Revenue MRR ($)'], leadTypeChartData.map(d => [d.type, d.leadCount, d.value.toFixed(2)]));
    addSection('REVENUE VALUE BY BUCKET', ['Bucket', 'Lead Count', 'Revenue MRR ($)'], bucketChartData.map(d => [d.bucket, d.leadCount, d.value.toFixed(2)]));
    addSection('REVENUE VALUE BY ACCOUNT MANAGER', ['Account Manager', 'Lead Count', 'Revenue MRR ($)'], amChartData.map(d => [d.am, d.leadCount, d.value.toFixed(2)]));
    addSection('SIGNED REVENUE & CUSTOMERS', ['Company Name', 'Status', 'Account Type', 'Origin Bucket', 'Account Manager', 'Lead Type', 'Date SCF Accepted', 'Date Signed Up', 'Signed MRR ($)'], signedLeadsData.signedList.map(s => [s.companyName, s.status, s.accountType, s.originBucket, s.accountManager, s.leadType, s.dateScfAccepted, s.dateSignedUp, s.signedMrr.toFixed(2)]));
    addSection('LOST REVENUE & LEADS', ['Company Name', 'Account Manager', 'Bucket', 'Lead Type', 'Status', 'Lost MRR ($)'], lostLeadsData.lostList.map(l => [l.companyName, l.accountManager, l.bucket, l.leadType, l.status, l.lostMrr.toFixed(2)]));

    const csvContent = csvParts.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `revenue_analysis_complete_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Complete',
      description: 'Revenue Analysis report exported to CSV successfully.'
    });
  };

  const exportCustomDataToCsv = (data: Record<string, any>[], filename: string) => {
    if (!data || data.length === 0) {
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
    toast({ title: 'Export Complete', description: `${filename}.csv exported successfully.` });
  };

  // Drilldown Modal Filters & Data
  const filteredDrillDownLeads = useMemo(() => {
    if (!drillDownData) return [];
    let list = drillDownData.leads;
    if (drillDownStatusFilter !== 'all') {
      list = list.filter(l => (l.customerStatus || l.status) === drillDownStatusFilter);
    }
    if (drillDownBucketFilter !== 'all') {
      list = list.filter(l => (l.bucket || 'Unassigned') === drillDownBucketFilter);
    }
    if (drillDownSearchQuery.trim()) {
      const q = drillDownSearchQuery.trim().toLowerCase();
      list = list.filter(l => 
        (l.companyName || '').toLowerCase().includes(q) ||
        (l.contacts?.[0]?.name || (l as any).contactPerson || '').toLowerCase().includes(q) ||
        (l.prospectPlusId || '').toLowerCase().includes(q) ||
        (l.id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [drillDownData, drillDownStatusFilter, drillDownBucketFilter, drillDownSearchQuery]);

  const drillDownStatuses = useMemo(() => {
    if (!drillDownData) return [];
    const statuses = new Set(drillDownData.leads.map(l => l.customerStatus || l.status).filter(Boolean));
    return Array.from(statuses) as string[];
  }, [drillDownData]);

  const drillDownBuckets = useMemo(() => {
    if (!drillDownData) return [];
    const buckets = new Set(drillDownData.leads.map(l => l.bucket || 'Unassigned').filter(Boolean));
    return Array.from(buckets) as string[];
  }, [drillDownData]);

  // Options for comboboxes
  const amOptions: Option[] = useMemo(() => {
    return accountManagers.map(am => {
      const name = getAmName(am);
      return { label: name, value: name };
    });
  }, [accountManagers]);

  const franchiseeOptions: Option[] = useMemo(() => {
    return uniqueFranchisees.map(f => ({ label: f, value: f }));
  }, [uniqueFranchisees]);

  const bucketOptions: Option[] = useMemo(() => {
    return uniqueBuckets.map(b => ({ 
      label: b.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
      value: b 
    }));
  }, [uniqueBuckets]);

  const leadTypeOptions: Option[] = useMemo(() => {
    return uniqueLeadTypes.map(t => ({ label: t, value: t }));
  }, [uniqueLeadTypes]);

  const accountTypeOptions: Option[] = useMemo(() => {
    return [
      { label: 'BAU', value: 'BAU' },
      { label: 'J2', value: 'J2' },
      { label: 'Corporate / Multisite', value: 'Corporate / Multisite' },
      { label: 'Secure Cash', value: 'Secure Cash' },
      { label: 'NeoPost', value: 'NeoPost' }
    ];
  }, []);

  const statusOptions: Option[] = useMemo(() => {
    return uniqueStatuses.map(s => ({ label: s, value: s }));
  }, [uniqueStatuses]);

  if (isLoadingData) {
    return <FullScreenLoader message="Loading Revenue Analysis Dashboard..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#095c7b]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#095c7b]/10 rounded-lg text-[#095c7b]">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#095c7b]">Revenue Analysis</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Comprehensive pipeline MRR distributions, high-value deals, signed customer realizations, and lost revenue diagnostics.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white text-xs h-9 font-medium shadow-sm">
                <Download className="mr-2 h-4 w-4" /> Export CSV Reports <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={handleExportRevenueAnalysisCSV} className="font-semibold text-[#095c7b]">
                <Download className="mr-2 h-4 w-4 text-[#095c7b]" /> Export Complete Revenue Analysis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(statusChartData.map(d => ({ 'Status': d.status, 'Lead Count': d.leadCount, 'Revenue MRR ($)': d.value.toFixed(2) })), 'revenue_value_by_status')}>
                Revenue Value by Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(leadTypeChartData.map(d => ({ 'Lead Type': d.type, 'Lead Count': d.leadCount, 'Revenue MRR ($)': d.value.toFixed(2) })), 'revenue_value_by_lead_type')}>
                Revenue Value by Lead Type
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(bucketChartData.map(d => ({ 'Bucket': d.bucket, 'Lead Count': d.leadCount, 'Revenue MRR ($)': d.value.toFixed(2) })), 'revenue_value_by_bucket')}>
                Revenue Value by Bucket
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(amChartData.map(d => ({ 'Account Manager': d.am, 'Lead Count': d.leadCount, 'Revenue MRR ($)': d.value.toFixed(2) })), 'revenue_value_by_am')}>
                Revenue Value by AM
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(quotesSentLeadsData.quoteList.map(q => ({ 'Company': q.companyName, 'Status': q.status, 'Account Type': q.accountType, 'Origin Bucket': q.originBucket, 'AM': q.accountManager, 'Lead Type': q.leadType, 'Quoted MRR ($)': q.quotedMrr.toFixed(2), 'Date Quote Sent': q.dateQuoteSent })), 'quote_sent_opportunities')}>
                Quote Sent Revenue &amp; Opportunities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(signedLeadsData.signedList.map(s => ({ 'Company': s.companyName, 'Status': s.status, 'Account Type': s.accountType, 'Origin Bucket': s.originBucket, 'AM': s.accountManager, 'Lead Type': s.leadType, 'Date SCF Accepted': s.dateScfAccepted, 'Date Signed Up': s.dateSignedUp, 'Signed MRR ($)': s.signedMrr.toFixed(2) })), 'signed_revenue_customers')}>
                Signed Revenue &amp; Customers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCustomDataToCsv(lostLeadsData.lostList.map(l => ({ 'Company': l.companyName, 'AM': l.accountManager, 'Bucket': l.bucket, 'Lead Type': l.leadType, 'Status': l.status, 'Lost MRR ($)': l.lostMrr.toFixed(2), 'Date Entered': l.dateEntered })), 'lost_revenue_churned_leads')}>
                Lost Revenue &amp; Churned Leads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <StatusOutcomeBanner className="mb-4" />

      {/* Filter Bar */}
      <Card className="border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2 text-[#095c7b]">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">Filtering &amp; Date Parameters</CardTitle>
          </div>
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('today')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">Today</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('yesterday')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">Yesterday</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">This Week</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('last_week')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">Last Week</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">This Month</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('last_month')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">Last Month</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">This Year</Button>
            <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')} className="h-7 text-[11px] px-2 text-slate-600 hover:text-[#095c7b]">All Time</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Search Company / ID</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search company or ID..." 
                  value={selectedCompanyName}
                  onChange={(e) => setSelectedCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters();
                  }}
                  className="h-9 pl-8 pr-8 text-xs bg-white"
                />
                {selectedCompanyName && (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* AM User Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Account Manager</Label>
              <MultiSelectCombobox 
                options={amOptions} 
                selected={selectedAm} 
                onSelectedChange={setSelectedAm} 
                placeholder="All Account Managers..." 
              />
            </div>

            {/* Bucket Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Bucket</Label>
              <MultiSelectCombobox 
                options={bucketOptions} 
                selected={selectedBucket} 
                onSelectedChange={setSelectedBucket} 
                placeholder="All Buckets..." 
              />
            </div>

            {/* Status Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Status</Label>
              <MultiSelectCombobox 
                options={statusOptions} 
                selected={selectedStatus} 
                onSelectedChange={setSelectedStatus} 
                placeholder="All Statuses..." 
              />
            </div>

            {/* Date Signed Up (Default: Current Month) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Date Signed Up</span>
                {signedUpDateRange?.from && (
                  <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
                )}
              </Label>
              <div className="relative w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9 pl-3 pr-8 py-2 overflow-hidden whitespace-nowrap text-ellipsis">
                      <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {signedUpDateRange?.from ? (
                          signedUpDateRange.to ? (
                            <>{format(signedUpDateRange.from, "LLL dd, y")} - {format(signedUpDateRange.to, "LLL dd, y")}</>
                          ) : format(signedUpDateRange.from, "LLL dd, y")
                        ) : (
                          "All Time"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 flex" align="start">
                    <Calendar mode="range" selected={signedUpDateRange} onSelect={setSignedUpDateRange} initialFocus />
                  </PopoverContent>
                </Popover>
                {signedUpDateRange && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSignedUpDateRange(undefined);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                    title="Clear Date Signed Up filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Match Logic Toggle (OR / AND) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Date Match Logic</span>
                  <SectionHelp content="OR: Includes leads matching ANY active date filter (e.g. Signed this month OR Quote Sent this month). AND: Includes leads matching ALL active date filters." />
                </span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded", dateMatchMode === 'OR' ? "bg-amber-100 text-amber-800" : "bg-[#095c7b]/10 text-[#095c7b]")}>
                  {dateMatchMode}
                </span>
              </Label>
              <div className="flex items-center h-9 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDateMatchMode('OR')}
                  className={cn(
                    "flex-1 h-full text-xs font-semibold rounded flex items-center justify-center transition-all",
                    dateMatchMode === 'OR' 
                      ? "bg-[#095c7b] text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Match ANY (OR)
                </button>
                <button
                  type="button"
                  onClick={() => setDateMatchMode('AND')}
                  className={cn(
                    "flex-1 h-full text-xs font-semibold rounded flex items-center justify-center transition-all",
                    dateMatchMode === 'AND' 
                      ? "bg-[#095c7b] text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Match ALL (AND)
                </button>
              </div>
            </div>

            {/* Date Quote Sent */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Date Quote Sent</span>
                {quoteSentDateRange?.from && (
                  <span className="text-[10px] text-[#095c7b] font-semibold">Active</span>
                )}
              </Label>
              <div className="relative w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9 pl-3 pr-8 py-2 overflow-hidden whitespace-nowrap text-ellipsis">
                      <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {quoteSentDateRange?.from ? (
                          quoteSentDateRange.to ? (
                            <>{format(quoteSentDateRange.from, "LLL dd, y")} - {format(quoteSentDateRange.to, "LLL dd, y")}</>
                          ) : format(quoteSentDateRange.from, "LLL dd, y")
                        ) : (
                          "All Time"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 flex" align="start">
                    <Calendar mode="range" selected={quoteSentDateRange} onSelect={setQuoteSentDateRange} initialFocus />
                  </PopoverContent>
                </Popover>
                {quoteSentDateRange && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuoteSentDateRange(undefined);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                    title="Clear Date Quote Sent filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Date SCF Accepted */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Date SCF Accepted</span>
                {scfAcceptedDateRange?.from && (
                  <span className="text-[10px] text-[#0284c7] font-semibold">Active</span>
                )}
              </Label>
              <div className="relative w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9 pl-3 pr-8 py-2 overflow-hidden whitespace-nowrap text-ellipsis">
                      <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {scfAcceptedDateRange?.from ? (
                          scfAcceptedDateRange.to ? (
                            <>{format(scfAcceptedDateRange.from, "LLL dd, y")} - {format(scfAcceptedDateRange.to, "LLL dd, y")}</>
                          ) : format(scfAcceptedDateRange.from, "LLL dd, y")
                        ) : (
                          "All Time"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 flex" align="start">
                    <Calendar mode="range" selected={scfAcceptedDateRange} onSelect={setScfAcceptedDateRange} initialFocus />
                  </PopoverContent>
                </Popover>
                {scfAcceptedDateRange && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setScfAcceptedDateRange(undefined);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                    title="Clear Date SCF Accepted filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lead Type Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Lead Type</Label>
              <MultiSelectCombobox 
                options={leadTypeOptions} 
                selected={selectedLeadType} 
                onSelectedChange={setSelectedLeadType} 
                placeholder="All Lead Types..." 
              />
            </div>

            {/* Account Type Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Account Type</Label>
              <MultiSelectCombobox 
                options={accountTypeOptions} 
                selected={selectedAccountType} 
                onSelectedChange={setSelectedAccountType} 
                placeholder="All Account Types..." 
              />
            </div>

            {/* Franchisee Multi-select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Franchisee</Label>
              <MultiSelectCombobox 
                options={franchiseeOptions} 
                selected={selectedFranchisee} 
                onSelectedChange={setSelectedFranchisee} 
                placeholder="All Franchisees..." 
              />
            </div>

            {/* Campaign Select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="h-9 bg-white text-xs">
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
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={clearFilters} className="h-9 text-xs text-slate-500 hover:text-slate-800">
              <X className="mr-2 h-3.5 w-3.5" /> Clear Filters
            </Button>
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
                <Filter className="mr-2 h-3.5 w-3.5" /> Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Analyzed MRR (Signed + Pipeline) */}
        <StatCard 
          variant="primary"
          title="Total Revenue & Pipeline" 
          value={`$${(metrics.totalSignedMrr + metrics.totalPipelineValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign} 
          description={`${metrics.totalSignedLeadsCount + metrics.activeLeadsWithMrrCount} revenue deal${(metrics.totalSignedLeadsCount + metrics.activeLeadsWithMrrCount) === 1 ? '' : 's'}`}
          onClick={() => {
            const mrrLeads = displayedLeads.filter(l => !isLostLead(l) && calculateRawLeadValue(l) > 0);
            setDrillDownData({ title: "All Revenue & Pipeline Deals", leads: mrrLeads });
          }}
          helpContent="Total Monthly Recurring Revenue (MRR) across all signed customers and active in-flight pipeline opportunities in this filtered period."
        />

        {/* Total Signed MRR (Positive / Won) */}
        <StatCard 
          variant="positive"
          title="Total Signed MRR" 
          value={`$${metrics.totalSignedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={CheckCircle} 
          description={`${metrics.totalSignedLeadsCount} signed customer${metrics.totalSignedLeadsCount === 1 ? '' : 's'}`}
          onClick={() => {
            const signedLeads = displayedLeads.filter(l => isSignedLeadInPeriod(l));
            setDrillDownData({ title: "Signed Leads & Customers", leads: signedLeads });
          }}
          helpContent="Total Monthly Recurring Revenue generated by active Signed customers and won leads in this period."
        />

        {/* Open Pipeline MRR (In Progress / Active Pipeline) */}
        <StatCard 
          variant="in-progress"
          title="Open Pipeline MRR" 
          value={`$${metrics.totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Layers} 
          description={`${metrics.totalActivePipelineLeadsCount} active in-progress lead${metrics.totalActivePipelineLeadsCount === 1 ? '' : 's'}`}
          onClick={() => {
            const openLeads = displayedLeads.filter(l => !isLostLead(l) && !isSignedLeadInPeriod(l));
            setDrillDownData({ title: "Active Open Pipeline Leads", leads: openLeads });
          }}
          helpContent="Sum of potential monthly recurring revenue (MRR) for active open leads in progress (excluding Signed and Lost)."
        />

        {/* Total Lost MRR (Negative / Lost) */}
        <StatCard 
          variant="negative"
          title="Total Lost MRR" 
          value={`$${metrics.totalLostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingDown} 
          description={`${metrics.totalLostCount} lost lead${metrics.totalLostCount === 1 ? '' : 's'}`}
          onClick={() => {
            const lostLeads = displayedLeads.filter(isLostLead);
            setDrillDownData({ title: "Lost Leads & Churned Accounts", leads: lostLeads });
          }}
          helpContent="Total potential MRR associated with leads and customers marked as Lost, Unqualified, or stopped trials."
        />

        {/* Average Deal MRR */}
        <StatCard 
          variant="metric"
          title="Average Deal Size" 
          value={`$${metrics.avgDealSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ActivityIcon} 
          description="Avg MRR per active opportunity"
          helpContent="Average potential monthly recurring revenue across all active pipeline opportunities with MRR > $0."
        />

        {/* Win / Realization Ratio */}
        <StatCard 
          variant="ratio"
          title="Win / Closed Ratio" 
          value={`${metrics.winRatio.toFixed(1)}%`}
          icon={TrendingUp} 
          description="Signed vs total closed MRR"
          helpContent="Percentage of closed revenue that converted to Signed (Signed MRR / [Signed MRR + Lost MRR])."
        />
      </div>

      {/* Visual Breakdown Bars */}
      <div className="space-y-2 bg-white/60 p-4 rounded-xl border border-[#095c7b]/10 backdrop-blur-sm shadow-xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-[#095c7b] uppercase tracking-wider">Pipeline Distribution</span>
          <span className="text-xs text-slate-500 font-medium">{displayedLeads.length} total leads</span>
        </div>
        {/* Status Breakdown */}
        <StatusBreakdownBar 
          items={displayedLeads} 
          selectedStatus={appliedStatus.length === 1 ? appliedStatus[0] : null}
          onSelectStatus={(st) => {
            if (st) {
              setSelectedStatus([st]);
              setAppliedStatus([st]);
            } else {
              setSelectedStatus([]);
              setAppliedStatus([]);
            }
          }}
          getStatus={(l) => getLeadStatusForAnalysis(l)}
          getOriginBucket={(l) => getLeadInitialBucket(l)}
        />
        {/* Origin Bucket Breakdown (where the lead came from) */}
        <BucketBreakdownBar 
          items={displayedLeads} 
          selectedBucket={appliedBucket.length === 1 ? appliedBucket[0] : null}
          onSelectBucket={(b) => {
            if (b) {
              setSelectedBucket([b]);
              setAppliedBucket([b]);
            } else {
              setSelectedBucket([]);
              setAppliedBucket([]);
            }
          }}
          getBucket={(l) => getLeadInitialBucket(l)}
          title="Origin Bucket Breakdown"
        />

        {/* Account Type Breakdown */}
        <AccountTypeBreakdownBar
          items={displayedLeads}
          selectedAccountType={appliedAccountType.length === 1 ? appliedAccountType[0] : null}
          onSelectAccountType={(at) => {
            if (at) {
              setSelectedAccountType([at]);
              setAppliedAccountType([at]);
            } else {
              setSelectedAccountType([]);
              setAppliedAccountType([]);
            }
          }}
          getAccountType={(l) => getLeadAccountType(l)}
          title="Account Type Breakdown"
        />
      </div>

      {/* Main 4 Core Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Pipeline Value by Status */}
        <Card className="border-[#095c7b]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-[#095c7b] flex items-center gap-1.5">
                <span>Pipeline Value by Status</span>
                <SectionHelp content="Sum of monthly recurring revenue (MRR) grouped by current pipeline status for active open leads (excludes Signed and Lost)." />
              </CardTitle>
              <CardDescription className="text-xs">Distribution of active pipeline MRR across lead statuses.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 h-8"
              onClick={() => exportCustomDataToCsv(statusChartData.map(d => ({ 'Status': d.status, 'Lead Count': d.leadCount, 'Pipeline MRR ($)': d.value.toFixed(2) })), 'pipeline_value_by_status')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-[360px]">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 25, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                  <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
                            <p className="font-semibold text-slate-800">{item.status}</p>
                            <p className="text-emerald-600 font-bold mt-1 text-sm">
                              ${(item.value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-slate-500 mt-1 font-medium">
                              {item.leadCount} lead{item.leadCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (data && data.status) {
                        const matches = displayedLeads.filter(l => {
                          if (isLostLead(l) || isSignedLead(l)) return false;
                          const leadSt = l.customerStatus || l.status || 'New';
                          return leadSt === data.status;
                        });
                        setDrillDownData({ title: `Pipeline Leads - Status: ${data.status}`, leads: matches });
                      }
                    }}
                  >
                    <LabelList dataKey="leadCount" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#475569' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No status pipeline data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Pipeline Value by Lead Type */}
        <Card className="border-[#095c7b]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-[#095c7b] flex items-center gap-1.5">
                <span>Pipeline Value by Lead Type</span>
                <SectionHelp content="Distribution of monthly recurring revenue (MRR) across lead types for active open leads (excludes Signed and Lost)." />
              </CardTitle>
              <CardDescription className="text-xs">Distribution of active pipeline MRR across lead types.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 h-8"
              onClick={() => exportCustomDataToCsv(leadTypeChartData.map(d => ({ 'Lead Type': d.type, 'Lead Count': d.leadCount, 'Pipeline MRR ($)': d.value.toFixed(2) })), 'pipeline_value_by_lead_type')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-[360px]">
            {leadTypeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTypeChartData} margin={{ top: 25, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                  <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
                            <p className="font-semibold text-slate-800">{item.type}</p>
                            <p className="text-emerald-600 font-bold mt-1 text-sm">
                              ${(item.value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-slate-500 mt-1 font-medium">
                              {item.leadCount} lead{item.leadCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (data && data.type) {
                        const matches = displayedLeads.filter(l => !isLostLead(l) && !isSignedLead(l) && (l.leadType || 'Unknown') === data.type);
                        setDrillDownData({ title: `Pipeline Leads - Type: ${data.type}`, leads: matches });
                      }
                    }}
                  >
                    <LabelList dataKey="leadCount" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#475569' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                    {leadTypeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No lead type pipeline data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Pipeline Value by Lead Bucket */}
        <Card className="border-[#095c7b]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-[#095c7b] flex items-center gap-1.5">
                <span>Pipeline Value by Lead Bucket</span>
                <SectionHelp content="Distribution of monthly recurring revenue across pipeline buckets for active open leads (excludes Signed and Lost)." />
              </CardTitle>
              <CardDescription className="text-xs">Distribution of active pipeline MRR across lead buckets.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 h-8"
              onClick={() => exportCustomDataToCsv(bucketChartData.map(d => ({ 'Bucket': d.bucket, 'Lead Count': d.leadCount, 'Pipeline MRR ($)': d.value.toFixed(2) })), 'pipeline_value_by_bucket')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-[360px]">
            {bucketChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucketChartData} margin={{ top: 25, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                  <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
                            <p className="font-semibold text-slate-800">{item.bucket}</p>
                            <p className="text-emerald-600 font-bold mt-1 text-sm">
                              ${(item.value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-slate-500 mt-1 font-medium">
                              {item.leadCount} lead{item.leadCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (data && data.bucket) {
                        const matches = displayedLeads.filter(l => {
                          if (isLostLead(l) || isSignedLead(l)) return false;
                          const bucketRaw = l.bucket || 'Unassigned';
                          const bucketName = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return bucketName === data.bucket;
                        });
                        setDrillDownData({ title: `Pipeline Leads - Bucket: ${data.bucket}`, leads: matches });
                      }
                    }}
                  >
                    <LabelList dataKey="leadCount" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#475569' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                    {bucketChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No bucket pipeline data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Pipeline Value by Account Manager */}
        <Card className="border-[#095c7b]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base text-[#095c7b] flex items-center gap-1.5">
                <span>Pipeline Value by Account Manager</span>
                <SectionHelp content="Distribution of monthly recurring revenue across assigned Account Managers for active open leads (excludes Signed and Lost)." />
              </CardTitle>
              <CardDescription className="text-xs">Distribution of active pipeline MRR across assigned Account Managers.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 h-8"
              onClick={() => exportCustomDataToCsv(amChartData.map(d => ({ 'Account Manager': d.am, 'Lead Count': d.leadCount, 'Pipeline MRR ($)': d.value.toFixed(2) })), 'pipeline_value_by_am')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-[360px]">
            {amChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amChartData} margin={{ top: 25, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="am" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                  <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
                            <p className="font-semibold text-slate-800">{item.am}</p>
                            <p className="text-emerald-600 font-bold mt-1 text-sm">
                              ${(item.value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-slate-500 mt-1 font-medium">
                              {item.leadCount} lead{item.leadCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (data && data.am) {
                        const matches = displayedLeads.filter(l => !isLostLead(l) && !isSignedLead(l) && (l.accountManagerAssigned || 'Unassigned') === data.am);
                        setDrillDownData({ title: `Pipeline Leads - AM: ${data.am}`, leads: matches });
                      }
                    }}
                  >
                    <LabelList dataKey="leadCount" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#475569' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                    {amChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No account manager pipeline data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Quote Sent Revenue & Opportunities Analysis Section (Blue / Sky) */}
      <Card className="border border-[#095c7b]/30 shadow-sm bg-gradient-to-b from-white to-sky-50/20">
        <CardHeader className="border-b border-[#095c7b]/15 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-[#095c7b] flex items-center gap-2 font-bold">
                <Send className="h-5 w-5 text-[#095c7b]" />
                <span>Quote Sent Revenue &amp; Opportunities Analysis</span>
              </CardTitle>
              <CardDescription className="text-slate-600 mt-0.5 text-xs">
                Breakdown of active pipeline leads with quotes sent out and quoted potential MRR (excluding leads converted to Signed or marked as Lost).
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs text-[#095c7b] border-[#095c7b]/30 hover:bg-[#095c7b]/10 h-8"
                onClick={() => exportCustomDataToCsv(quotesSentLeadsData.quoteList.map(q => ({ 'Company': q.companyName, 'Status': q.status, 'Account Type': q.accountType, 'Origin Bucket': q.originBucket, 'AM': q.accountManager, 'Lead Type': q.leadType, 'Quoted MRR ($)': q.quotedMrr.toFixed(2), 'Date Quote Sent': q.dateQuoteSent })), 'quote_sent_revenue_analysis')}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export Quoted CSV
              </Button>
              <div className="bg-[#095c7b]/10 px-3 py-1.5 rounded-lg border border-[#095c7b]/20 text-right">
                <div className="text-[10px] uppercase font-bold text-[#095c7b] tracking-wider">Quotes Sent</div>
                <div className="text-base font-extrabold text-[#095c7b]">{quotesSentLeadsData.totalQuoteCount}</div>
              </div>
              <div className="bg-[#095c7b]/10 px-3 py-1.5 rounded-lg border border-[#095c7b]/20 text-right">
                <div className="text-[10px] uppercase font-bold text-[#095c7b] tracking-wider">Total Quoted MRR</div>
                <div className="text-base font-extrabold text-[#095c7b]">
                  ${quotesSentLeadsData.totalQuotedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* 3 Breakdown Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Bucket */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Quoted MRR by Bucket</h4>
              <div className="h-[220px]">
                {quotesSentLeadsData.byBucket.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotesSentLeadsData.byBucket} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.bucket}</p>
                                <p className="text-[#095c7b] font-semibold mt-1">Quoted MRR: ${item.quotedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Quoted Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="quotedMrr" 
                        fill="#095c7b" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.bucket) {
                            const item = quotesSentLeadsData.byBucket.find(b => b.bucket === data.bucket);
                            if (item) setDrillDownData({ title: `Quoted Leads - Bucket: ${data.bucket}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No quote sent leads data</div>
                )}
              </div>
            </div>

            {/* By Lead Type */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Quoted MRR by Lead Type</h4>
              <div className="h-[220px]">
                {quotesSentLeadsData.byLeadType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotesSentLeadsData.byLeadType} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.type}</p>
                                <p className="text-[#095c7b] font-semibold mt-1">Quoted MRR: ${item.quotedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Quoted Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="quotedMrr" 
                        fill="#0284c7" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.type) {
                            const item = quotesSentLeadsData.byLeadType.find(t => t.type === data.type);
                            if (item) setDrillDownData({ title: `Quoted Leads - Type: ${data.type}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No quote sent leads data</div>
                )}
              </div>
            </div>

            {/* By Account Manager */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Quoted MRR by AM</h4>
              <div className="h-[220px]">
                {quotesSentLeadsData.byAm.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotesSentLeadsData.byAm} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="am" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.am}</p>
                                <p className="text-[#095c7b] font-semibold mt-1">Quoted MRR: ${item.quotedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Quoted Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="quotedMrr" 
                        fill="#0369a1" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.am) {
                            const item = quotesSentLeadsData.byAm.find(a => a.am === data.am);
                            if (item) setDrillDownData({ title: `Quoted Leads - AM: ${data.am}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No quote sent leads data</div>
                )}
              </div>
            </div>
          </div>

          {/* Table of Quote Sent Leads */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-sky-50/50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#095c7b] uppercase tracking-wide">List of Quote Sent Leads &amp; Opportunities</h4>
              <span className="text-xs text-slate-500 font-medium">{quotesSentLeadsData.quoteList.length} leads</span>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {quotesSentLeadsData.quoteList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">No quote sent leads found in this period.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-600">Company Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Origin Bucket</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Manager</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Lead Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Date Quote Sent</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right">Quoted MRR</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotesSentLeadsData.quoteList.map((item) => (
                      <TableRow key={item.id} className="hover:bg-sky-50/20 text-xs">
                        <TableCell className="font-semibold text-slate-800">{item.companyName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-normal">{item.status}</Badge></TableCell>
                        <TableCell><AccountTypeBadge type={item.accountType} className="text-[10px] py-0 px-1.5" /></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-normal">{item.originBucket}</Badge></TableCell>
                        <TableCell className="text-slate-600">{item.accountManager}</TableCell>
                        <TableCell className="text-slate-600">{item.leadType}</TableCell>
                        <TableCell className="text-slate-500 font-medium">{item.dateQuoteSent || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-[#095c7b]">
                          ${item.quotedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                            onClick={() => window.open((item.lead as any).isCompany ? `/companies/${item.id}` : `/leads/${item.id}`, '_blank')}
                          >
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signed Revenue & Customers Analysis Section (Emerald) */}
      <Card className="border border-emerald-200/70 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
        <CardHeader className="border-b border-emerald-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-emerald-950 flex items-center gap-2 font-bold">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>Signed Revenue &amp; Customers Analysis</span>
              </CardTitle>
              <CardDescription className="text-slate-600 mt-0.5 text-xs">
                Breakdown of won leads, signed customers, and realized MRR, categorized by Bucket, Lead Type, and Account Manager.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-100/50 h-8"
                onClick={() => exportCustomDataToCsv(signedLeadsData.signedList.map(s => ({ 'Company': s.companyName, 'Status': s.status, 'Account Type': s.accountType, 'Origin Bucket': s.originBucket, 'AM': s.accountManager, 'Lead Type': s.leadType, 'Date SCF Accepted': s.dateScfAccepted, 'Date Signed Up': s.dateSignedUp, 'Signed MRR ($)': s.signedMrr.toFixed(2) })), 'signed_revenue_analysis')}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export Signed CSV
              </Button>
              <div className="bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 text-right">
                <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Signed Customers</div>
                <div className="text-base font-extrabold text-emerald-950">{signedLeadsData.totalSignedCount}</div>
              </div>
              <div className="bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 text-right">
                <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Signed MRR</div>
                <div className="text-base font-extrabold text-emerald-700">
                  ${signedLeadsData.totalSignedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* 3 Breakdown Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Bucket */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Signed MRR by Bucket</h4>
              <div className="h-[220px]">
                {signedLeadsData.byBucket.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signedLeadsData.byBucket} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.bucket}</p>
                                <p className="text-emerald-600 font-semibold mt-1">Signed MRR: ${item.signedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Signed Customer{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="signedMrr" 
                        fill="#059669" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.bucket) {
                            const item = signedLeadsData.byBucket.find(b => b.bucket === data.bucket);
                            if (item) setDrillDownData({ title: `Signed Customers - Bucket: ${data.bucket}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No signed customers data</div>
                )}
              </div>
            </div>

            {/* By Lead Type */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Signed MRR by Lead Type</h4>
              <div className="h-[220px]">
                {signedLeadsData.byLeadType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signedLeadsData.byLeadType} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.type}</p>
                                <p className="text-emerald-600 font-semibold mt-1">Signed MRR: ${item.signedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Signed Customer{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="signedMrr" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.type) {
                            const item = signedLeadsData.byLeadType.find(t => t.type === data.type);
                            if (item) setDrillDownData({ title: `Signed Customers - Type: ${data.type}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No signed customers data</div>
                )}
              </div>
            </div>

            {/* By Account Manager */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Signed MRR by AM</h4>
              <div className="h-[220px]">
                {signedLeadsData.byAm.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signedLeadsData.byAm} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="am" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.am}</p>
                                <p className="text-emerald-600 font-semibold mt-1">Signed MRR: ${item.signedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Signed Customer{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="signedMrr" 
                        fill="#047857" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.am) {
                            const item = signedLeadsData.byAm.find(a => a.am === data.am);
                            if (item) setDrillDownData({ title: `Signed Customers - AM: ${data.am}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No signed customers data</div>
                )}
              </div>
            </div>
          </div>

          {/* Table of Signed Leads */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-emerald-50/40 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">List of Signed Leads &amp; Customers</h4>
              <span className="text-xs text-slate-500 font-medium">{signedLeadsData.signedList.length} leads</span>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {signedLeadsData.signedList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">No signed leads found in this period.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-600">Company Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Origin Bucket</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Manager</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Lead Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">SCF Accepted</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Date Signed Up</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right">Signed MRR</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signedLeadsData.signedList.map((item) => {
                      const isScfPending = !item.isScfAccepted;
                      return (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "text-xs transition-colors",
                            isScfPending 
                              ? "bg-rose-50/50 hover:bg-rose-100/60" 
                              : "hover:bg-emerald-50/20"
                          )}
                        >
                          <TableCell className="font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span>{item.companyName}</span>
                              {isScfPending && (
                                <span className="text-[9px] font-bold text-rose-700 uppercase tracking-tight bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 shadow-2xs" title="SCF is not accepted - needs investigation">
                                  Needs Investigation
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">{item.status}</Badge></TableCell>
                          <TableCell><AccountTypeBadge type={item.accountType} className="text-[10px] py-0 px-1.5" /></TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] font-normal">{item.originBucket}</Badge></TableCell>
                          <TableCell className="text-slate-600">{item.accountManager}</TableCell>
                          <TableCell className="text-slate-600">{item.leadType}</TableCell>
                          <TableCell className="font-medium">
                            {item.isScfAccepted ? (
                              <span className="text-slate-700">{item.dateScfAccepted}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300">
                                Not Accepted
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 font-medium">{item.dateSignedUp || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            ${item.signedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                              onClick={() => window.open((item.lead as any).isCompany ? `/companies/${item.id}` : `/leads/${item.id}`, '_blank')}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lost Revenue & Churned Leads Analysis Section (Rose) */}
      <Card className="border border-rose-200/70 shadow-sm bg-gradient-to-b from-white to-rose-50/20">
        <CardHeader className="border-b border-rose-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-rose-950 flex items-center gap-2 font-bold">
                <TrendingUp className="h-5 w-5 text-rose-600 rotate-180" />
                <span>Lost Revenue &amp; Churned Leads Analysis</span>
              </CardTitle>
              <CardDescription className="text-slate-600 mt-0.5 text-xs">
                Breakdown of leads marked Lost and lost MRR, categorized by Bucket, Lead Type, and Account Manager.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs text-rose-800 border-rose-300 hover:bg-rose-100/50 h-8"
                onClick={() => exportCustomDataToCsv(lostLeadsData.lostList.map(l => ({ 'Company': l.companyName, 'AM': l.accountManager, 'Bucket': l.bucket, 'Lead Type': l.leadType, 'Status': l.status, 'Lost MRR ($)': l.lostMrr.toFixed(2), 'Date Entered': l.dateEntered })), 'lost_revenue_analysis')}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export Lost CSV
              </Button>
              <div className="bg-rose-100/80 px-3 py-1.5 rounded-lg border border-rose-200 text-right">
                <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Total Lost Leads</div>
                <div className="text-base font-extrabold text-rose-950">{lostLeadsData.totalLostCount}</div>
              </div>
              <div className="bg-rose-100/80 px-3 py-1.5 rounded-lg border border-rose-200 text-right">
                <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Total Lost MRR</div>
                <div className="text-base font-extrabold text-rose-700">
                  ${lostLeadsData.totalLostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* 3 Breakdown Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Bucket */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Lost MRR by Bucket</h4>
              <div className="h-[220px]">
                {lostLeadsData.byBucket.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lostLeadsData.byBucket} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.bucket}</p>
                                <p className="text-rose-600 font-semibold mt-1">Lost MRR: ${item.lostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Lost Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="lostMrr" 
                        fill="#e11d48" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.bucket) {
                            const item = lostLeadsData.byBucket.find(b => b.bucket === data.bucket);
                            if (item) setDrillDownData({ title: `Lost Leads - Bucket: ${data.bucket}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No lost leads data</div>
                )}
              </div>
            </div>

            {/* By Lead Type */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Lost MRR by Lead Type</h4>
              <div className="h-[220px]">
                {lostLeadsData.byLeadType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lostLeadsData.byLeadType} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.type}</p>
                                <p className="text-rose-600 font-semibold mt-1">Lost MRR: ${item.lostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Lost Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="lostMrr" 
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.type) {
                            const item = lostLeadsData.byLeadType.find(t => t.type === data.type);
                            if (item) setDrillDownData({ title: `Lost Leads - Type: ${data.type}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No lost leads data</div>
                )}
              </div>
            </div>

            {/* By Account Manager */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Lost MRR by AM</h4>
              <div className="h-[220px]">
                {lostLeadsData.byAm.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lostLeadsData.byAm} margin={{ top: 25, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="am" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 p-2.5 rounded shadow-md text-xs">
                                <p className="font-bold text-slate-800">{item.am}</p>
                                <p className="text-rose-600 font-semibold mt-1">Lost MRR: ${item.lostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-slate-500">{item.count} Lost Lead{item.count === 1 ? '' : 's'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="lostMrr" 
                        fill="#be123c" 
                        radius={[4, 4, 0, 0]} 
                        className="cursor-pointer"
                        onClick={(data) => {
                          if (data && data.am) {
                            const item = lostLeadsData.byAm.find(a => a.am === data.am);
                            if (item) setDrillDownData({ title: `Lost Leads - AM: ${data.am}`, leads: item.leads });
                          }
                        }}
                      >
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#64748b' }} formatter={(val: any) => `${val} lead${val === 1 ? '' : 's'}`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No lost leads data</div>
                )}
              </div>
            </div>
          </div>

          {/* Table of Lost Leads */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-rose-50/40 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">List of Lost Leads &amp; Churned Accounts</h4>
              <span className="text-xs text-slate-500 font-medium">{lostLeadsData.lostList.length} leads</span>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {lostLeadsData.lostList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">No lost leads found in this period.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-600">Company Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Status / Outcome</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Origin Bucket</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Account Manager</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Lead Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right">Lost MRR</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lostLeadsData.lostList.map((item) => (
                      <TableRow key={item.id} className="hover:bg-rose-50/20 text-xs">
                        <TableCell className="font-semibold text-slate-800">{item.companyName}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-rose-100 text-rose-700 text-[10px]">{item.status}</Badge></TableCell>
                        <TableCell><AccountTypeBadge type={item.accountType} className="text-[10px] py-0 px-1.5" /></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-normal">{item.originBucket}</Badge></TableCell>
                        <TableCell className="text-slate-600">{item.accountManager}</TableCell>
                        <TableCell className="text-slate-600">{item.leadType}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          ${item.lostMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                            onClick={() => window.open((item.lead as any).isCompany ? `/companies/${item.id}` : `/leads/${item.id}`, '_blank')}
                          >
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Drilldown Modal Dialog */}
      <Dialog open={!!drillDownData} onOpenChange={(open) => {
        if (!open) {
          setDrillDownData(null);
          setDrillDownSearchQuery('');
          setDrillDownStatusFilter('all');
          setDrillDownBucketFilter('all');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-[#095c7b] font-bold text-lg">{drillDownData?.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Showing {filteredDrillDownLeads.length} matching leads &amp; opportunities.
                </DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/10"
                onClick={() => exportCustomDataToCsv(filteredDrillDownLeads.map(l => ({
                  'Company Name': l.companyName,
                  'Account Manager': l.accountManagerAssigned || 'Unassigned',
                  'Bucket': l.bucket,
                  'Status': l.customerStatus || l.status,
                  'Calculated MRR ($)': calculateRawLeadValue(l).toFixed(2),
                  'Lead Type': l.leadType || 'Unknown',
                  'Franchisee': l.franchisee || 'Unassigned'
                })), `drilldown_${drillDownData?.title.toLowerCase().replace(/\s+/g, '_')}`)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export List CSV
              </Button>
            </div>
            {drillDownData && drillDownData.leads.length > 0 && (
              <div className="flex items-center gap-3 pt-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search in drilldown..." 
                    value={drillDownSearchQuery}
                    onChange={(e) => setDrillDownSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
                {drillDownStatuses.length > 1 && (
                  <Select value={drillDownStatusFilter} onValueChange={setDrillDownStatusFilter}>
                    <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {drillDownStatuses.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {drillDownBuckets.length > 1 && (
                  <Select value={drillDownBucketFilter} onValueChange={setDrillDownBucketFilter}>
                    <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
                      <SelectValue placeholder="All Buckets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buckets</SelectItem>
                      {drillDownBuckets.map(b => (
                        <SelectItem key={b} value={b}>{b.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg mt-2">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead className="text-xs font-bold">Company Name</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Account Type</TableHead>
                  <TableHead className="text-xs font-bold">Origin Bucket</TableHead>
                  <TableHead className="text-xs font-bold">Account Manager</TableHead>
                  <TableHead className="text-xs font-bold text-right">Potential MRR</TableHead>
                  <TableHead className="text-xs font-bold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrillDownLeads.map(lead => {
                  const leadMrr = calculateRawLeadValue(lead);
                  const isWon = isSignedLead(lead);
                  return (
                    <TableRow key={lead.id} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-800">
                        {lead.companyName || 'Unnamed Lead'}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={(isWon ? 'Won' : (lead.customerStatus || lead.status)) as LeadStatus} />
                      </TableCell>
                      <TableCell>
                        <AccountTypeBadge type={getLeadAccountType(lead)} className="text-[10px] py-0 px-1.5" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {getLeadInitialBucket(lead)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {lead.accountManagerAssigned || 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${leadMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                          onClick={() => window.open((lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`, '_blank')}
                        >
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDrillDownLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                      No leads match the drilldown filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
