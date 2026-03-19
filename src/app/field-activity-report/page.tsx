'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, VisitNote, Appointment, UserProfile, DiscoveryData, Upsell, Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, Star, DollarSign, Trophy, Briefcase, FileCheck, FileX, Percent, CheckCircle2, PieChart as PieChartIcon, BarChart3, Route, ExternalLink, TrendingUp, Image as ImageIcon, Clock, CalendarCheck, Download, AlertTriangle, ArrowRight, UserPlus, MapPin, ClipboardCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getVisitNotes, getAllLeadsForReport, getAllAppointments, getAllUsers, getCompaniesFromFirebase, getUpsells, getAllActivities } from '@/services/firebase';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DiscoveryRadarChart } from '@/components/discovery-radar-chart';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

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

export default function FieldActivityReportPage() {
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [allUpsells, setAllUpsells] = useState<Upsell[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [originalCompanyIds, setOriginalCompanyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCommissionListOpen, setIsCommissionListOpen] = useState(false);
  const [isApptVisitsListOpen, setIsApptVisitsListOpen] = useState(false);
  const [isApptLeadsListOpen, setIsApptLeadsListOpen] = useState(false);
  const [isWithApptListOpen, setIsWithApptListOpen] = useState(false);
  const [isWithoutApptListOpen, setIsWithoutApptListOpen] = useState(false);
  const [isProcessedMiscListOpen, setIsProcessedMiscListOpen] = useState(false);
  const [isApptOutcomeListOpen, setIsApptOutcomeListOpen] = useState(false);
  const [isApptSuccessListOpen, setIsApptSuccessListOpen] = useState(false);
  const [isOutboundWinsListOpen, setIsOutboundWinsListOpen] = useState(false);
  const [isUpsellSuccessListOpen, setIsUpsellSuccessListOpen] = useState(false);
  const [isLinkedToExistingListOpen, setIsLinkedToExistingListOpen] = useState(false);
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>('all');
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
    outcome: [] as string[],
    franchisee: [] as string[],
  });

  const hasAccess = userProfile?.role && ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role);

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setIsRefreshing(true);
    setLoading(true);
    try {
      const canSeeAll = ['admin', 'Lead Gen Admin', 'Field Sales Admin', 'Franchisee'].includes(userProfile.role!);
      const notesPromise = canSeeAll ? getVisitNotes() : getVisitNotes(userProfile.uid);

      const [notes, leads, companies, appointments, users, upsells, activities] = await Promise.all([
        notesPromise,
        getAllLeadsForReport(),
        getCompaniesFromFirebase({ skipCoordinateCheck: true }),
        getAllAppointments(),
        getAllUsers(),
        getUpsells(),
        getAllActivities(),
      ]);
      setAllVisitNotes(notes);
      setAllLeads([...leads, ...companies]);
      setOriginalCompanyIds(new Set(companies.map(c => c.id)));
      setAllAppointments(appointments);
      setAllActivities(activities);
      setAllFieldSalesUsers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin'));
      setAllUpsells(upsells);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the latest report data.' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    if (userProfile && hasAccess) {
      fetchData();
    }
  }, [userProfile, hasAccess, fetchData]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ date: undefined, user: [], outcome: [], franchisee: [] });
  };
  
  const leadsMap = useMemo(() => new Map(allLeads.map(l => [l.id, l])), [allLeads]);

  const visibleVisitNotes = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role !== 'Franchisee') return allVisitNotes;

    return allVisitNotes.filter(note => {
        const isCapturedByMe = note.capturedByUid === userProfile.uid;
        let isLinkedToMyFranchise = false;
        if (note.leadId) {
            const linkedRecord = leadsMap.get(note.leadId);
            if (linkedRecord && linkedRecord.franchisee === userProfile.franchisee) {
                isLinkedToMyFranchise = true;
            }
        }
        return isCapturedByMe || isLinkedToMyFranchise;
    });
  }, [allVisitNotes, userProfile, leadsMap]);

  const filteredVisitNotes = useMemo(() => {
    return visibleVisitNotes.filter(note => {
      const capturedByUserMatch = filters.user.length === 0 || filters.user.includes(note.capturedBy);
      const outcomeMatch = filters.outcome.length === 0 || (note.outcome?.type && filters.outcome.includes(note.outcome.type));
      
      const lead = note.leadId ? leadsMap.get(note.leadId) : null;
      const franchiseeMatch = filters.franchisee.length === 0 || (lead?.franchisee && filters.franchisee.includes(lead.franchisee));

      let dateMatch = true;
      if (filters.date?.from) {
        const noteDate = parseISO(note.createdAt);
        const fromDate = startOfDay(filters.date.from);
        const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
        dateMatch = noteDate >= fromDate && noteDate <= toDate;
      }
      
      return capturedByUserMatch && outcomeMatch && franchiseeMatch && dateMatch;
    });
  }, [visibleVisitNotes, filters, leadsMap]);

  const filteredUpsells = useMemo(() => {
      return allUpsells.filter(upsell => {
          const userMatch = filters.user.length === 0 || filters.user.includes(upsell.repName);
          let dateMatch = true;
          if (filters.date?.from) {
              const upsellDate = parseISO(upsell.date);
              const fromDate = startOfDay(filters.date.from);
              const toDate = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
              dateMatch = upsellDate >= fromDate && upsellDate <= toDate;
          }
          return userMatch && dateMatch;
      });
  }, [allUpsells, filters]);

  const stats = useMemo(() => {
    const totalVisitsCount = filteredVisitNotes.length;
    const convertedNotes = filteredVisitNotes.filter(n => n.status === 'Converted' && n.leadId);
    const rejectedNotes = filteredVisitNotes.filter(n => n.status === 'Rejected');
    
    const linkedToExistingNotes = convertedNotes.filter(n => n.leadId && originalCompanyIds.has(n.leadId));
    
    const conversionRate = totalVisitsCount > 0 ? (convertedNotes.length / totalVisitsCount) * 100 : 0;

    const appointmentOutcomes = ['Qualified - Set Appointment', 'Appointment Qualified', 'Schedule Appointment'];
    const miscProcessingOutcomes = ["Qualified - Call Back/Send Info", "Unqualified Opportunity", "Prospect - No Access/No Contact", "Not Interested", "Empty / Closed"];

    const appointmentVisits = filteredVisitNotes.filter(n => 
        n.outcome?.type && appointmentOutcomes.includes(n.outcome.type)
    );
    
    const apptConvertedVisits = appointmentVisits.filter(n => n.status === 'Converted' && n.leadId);
    const apptConvertedLeads = apptConvertedVisits
        .filter(n => leadsMap.has(n.leadId!))
        .map(n => ({
            ...leadsMap.get(n.leadId!)!,
            visitDate: n.createdAt,
            capturedBy: n.capturedBy,
            visitOutcome: n.outcome?.type
        }));

    const leadsWithAnyApptIds = new Set(allAppointments.map(a => a.leadId));
    
    const leadsProcessedWithMisc = apptConvertedVisits
        .filter(n => {
            const leadActivities = allActivities.filter(a => a.leadId === n.leadId);
            return leadActivities.some(a => 
                miscProcessingOutcomes.some(misc => a.notes.includes("Outcome: " + misc))
            );
        })
        .map(n => {
            const lead = leadsMap.get(n.leadId!);
            const activity = allActivities.find(a => 
                a.leadId === n.leadId && miscProcessingOutcomes.some(misc => a.notes.includes("Outcome: " + misc))
            );
            return {
                ...lead!,
                visitDate: n.createdAt,
                capturedBy: n.capturedBy,
                visitOutcome: n.outcome?.type,
                processingOutcome: activity?.notes.match(/Outcome: ([^.]+)\./)?.[1] || 'Misc Processing'
            };
        })
        .filter(l => !!l.id);

    const miscProcessedIds = new Set(leadsProcessedWithMisc.map(l => l.id));

    const leadsConvertedWithAppt = apptConvertedVisits
        .filter(n => leadsWithAnyApptIds.has(n.leadId!))
        .map(n => {
            const lead = leadsMap.get(n.leadId!);
            const appt = allAppointments.find(a => a.leadId === n.leadId);
            return {
                ...lead!,
                visitDate: n.createdAt,
                capturedBy: n.capturedBy,
                visitOutcome: n.outcome?.type,
                apptAssignedTo: appt?.assignedTo || 'N/A',
                apptDate: appt?.duedate || null
            };
        })
        .filter(l => !!l.id);

    const leadsConvertedWithoutAppt = apptConvertedVisits
        .filter(n => !leadsWithAnyApptIds.has(n.leadId!) && !miscProcessedIds.has(n.leadId!))
        .map(n => ({
            ...leadsMap.get(n.leadId!)!,
            visitDate: n.createdAt,
            capturedBy: n.capturedBy,
            visitOutcome: n.outcome?.type
        }))
        .filter(l => !!l.id);

    const callOutcomesData = filteredVisitNotes.reduce((acc, note) => {
        const type = note.outcome?.type || 'Other';
        const existing = acc.find(item => item.name === type);
        if (existing) existing.value++;
        else acc.push({ name: type, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);

    const visitsByUserData = allFieldSalesUsers.map(user => {
        const name = user.displayName!;
        const visits = filteredVisitNotes.filter(n => n.capturedBy === name).length;
        return { name, visits };
    }).filter(u => u.visits > 0).sort((a,b) => b.visits - a.visits);

    const repOutcomeEfficiency = allFieldSalesUsers.map(user => {
        const name = user.displayName!;
        const userNotes = filteredVisitNotes.filter(n => n.capturedBy === name);
        const totalVisits = userNotes.length;
        if (totalVisits === 0) return null;

        const outcomesCount = userNotes.reduce((acc, n) => {
            const type = n.outcome?.type || 'Other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            id: user.uid,
            name,
            totalVisits,
            outcomes: Object.entries(outcomesCount).map(([type, count]) => ({
                type,
                count,
                percentage: ((count / totalVisits) * 100).toFixed(1)
            })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
        };
    }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.totalVisits - a.totalVisits);

    const commissionEligibleEvents: any[] = [];
    const performanceStats = allFieldSalesUsers.map(user => {
        const name = user.displayName!;
        const userNotes = filteredVisitNotes.filter(n => n.capturedBy === name);
        const userConvertedNotes = userNotes.filter(n => n.status === 'Converted' && n.leadId);
        const userUpsells = filteredUpsells.filter(u => u.repUid === user.uid);
        
        let apptSuccessCount = 0;
        let outboundWinsCount = 0;
        let upsellCount = userUpsells.length;

        userConvertedNotes.forEach(note => {
            const lead = leadsMap.get(note.leadId!);
            if (!lead) return;

            const hasCompletedAppt = allAppointments.some(appt => 
                appt.leadId === lead.id && appt.appointmentStatus === 'Completed'
            );
            if (hasCompletedAppt) {
                apptSuccessCount++;
                commissionEligibleEvents.push({
                    ...lead,
                    visitDate: note.createdAt,
                    capturedBy: note.capturedBy,
                    milestone: 'Appointment Completed'
                });
            }

            const isOutboundWin = lead.status === 'Won' && lead.fieldSales === false && !originalCompanyIds.has(lead.id);
            if (isOutboundWin) {
                outboundWinsCount++;
                commissionEligibleEvents.push({
                    ...lead,
                    visitDate: note.createdAt,
                    capturedBy: note.capturedBy,
                    milestone: 'Outbound Win'
                });
            }
        });

        userUpsells.forEach(upsell => {
            commissionEligibleEvents.push({
                id: upsell.companyId,
                companyName: upsell.companyName,
                visitDate: upsell.date,
                capturedBy: upsell.repName,
                milestone: 'Upsell',
                status: 'Won'
            });
        });

        return {
            id: user.uid,
            name,
            apptSuccess: apptSuccessCount,
            outboundWins: outboundWinsCount,
            upsells: upsellCount,
            commission: (apptSuccessCount + outboundWinsCount + upsellCount) * 50
        };
    }).filter(r => r.apptSuccess > 0 || r.outboundWins > 0 || r.upsells > 0);

    const appointmentSuccessByRep = performanceStats
        .map(r => ({ id: r.id, name: r.name, count: r.apptSuccess }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count);

    const outboundWinsByRep = performanceStats
        .map(r => ({ id: r.id, name: r.name, count: r.outboundWins }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count);

    const upsellsByRep = performanceStats
        .map(r => ({ id: r.id, name: r.name, count: r.upsells }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count);

    const commissionEarningsByRep = performanceStats
        .map(r => ({ id: r.id, name: r.name, amount: r.commission }))
        .filter(r => r.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const totalCommissionEligible = performanceStats.reduce((sum, r) => sum + r.apptSuccess + r.outboundWins + r.upsells, 0);

    const wonCountForRatio = convertedNotes.filter(n => leadsMap.get(n.leadId!)?.status === 'Won').length;
    const qualifiedCountForRatio = convertedNotes.filter(n => ['Qualified', 'Pre Qualified'].includes(leadsMap.get(n.leadId!)?.status || '')).length;
    const quoteCountForRatio = convertedNotes.filter(n => leadsMap.get(n.leadId!)?.status === 'Prospect Opportunity').length;

    const convertedLeadStatusDist = convertedNotes.reduce((acc, note) => {
        const lead = leadsMap.get(note.leadId!);
        const status = lead?.status || 'Unknown';
        const existing = acc.find(item => item.name === status);
        if (existing) existing.value++;
        else acc.push({ name: status, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

    const convertedLeadIds = new Set(apptConvertedLeads.map(l => l.id));
    const sourcedAppts = allAppointments.filter(a => convertedLeadIds.has(a.leadId));
    const sourcedApptOutcomeDist = sourcedAppts.reduce((acc, appt) => {
        const status = appt.appointmentStatus || 'Pending';
        const existing = acc.find(item => item.name === status);
        if (existing) existing.value++;
        else acc.push({ name: status, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

    const convertedLeadsByFranchiseeData = Array.from(
        convertedNotes.reduce((acc, note) => {
            const lead = leadsMap.get(note.leadId!);
            const franchisee = lead?.franchisee || 'No Franchisee';
            acc.set(franchisee, (acc.get(franchisee) || 0) + 1);
            return acc;
        }, new Map<string, number>())
    ).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

    return {
      totalVisits: totalVisitsCount,
      totalConverted: convertedNotes.length,
      totalRejected: rejectedNotes.length,
      totalUpsells: filteredUpsells.length,
      totalLinkedToExisting: linkedToExistingNotes.length,
      linkedToExistingNotes,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      commissionEligibleCount: totalCommissionEligible,
      commissionEligibleEvents,
      appointmentVisits,
      apptConvertedLeads,
      leadsConvertedWithAppt,
      leadsConvertedWithoutAppt,
      leadsProcessedWithMisc,
      callOutcomesData,
      visitsByUserData,
      repOutcomeEfficiency,
      convertedLeadStatusDist,
      sourcedAppts,
      sourcedApptOutcomeDist,
      appointmentSuccessByRep,
      outboundWinsByRep,
      upsellsByRep,
      commissionEarningsByRep,
      convertedLeadsByFranchiseeData,
      conversionEfficiency: {
          total: convertedNotes.length,
          won: { percentage: convertedNotes.length > 0 ? (wonCountForRatio / convertedNotes.length) * 100 : 0, count: wonCountForRatio },
          qualified: { percentage: convertedNotes.length > 0 ? (qualifiedCountForRatio / convertedNotes.length) * 100 : 0, count: qualifiedCountForRatio },
          quote: { percentage: convertedNotes.length > 0 ? (quoteCountForRatio / convertedNotes.length) * 100 : 0, count: quoteCountForRatio },
      }
    };
  }, [filteredVisitNotes, leadsMap, allAppointments, allFieldSalesUsers, originalCompanyIds, filteredUpsells, allActivities]);

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(visibleVisitNotes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [visibleVisitNotes]);

  const outcomeOptions: Option[] = useMemo(() => {
    const outcomes = new Set(visibleVisitNotes.map(n => n.outcome?.type).filter(Boolean));
    return Array.from(outcomes as string[]).map(o => ({ value: o, label: o }));
  }, [visibleVisitNotes]);
  
  const franchiseeOptions: Option[] = useMemo(() => {
    const leadIds = visibleVisitNotes.map(n => n.leadId).filter(Boolean);
    const franchisees = new Set(allLeads.filter(l => leadIds.includes(l.id) && l.franchisee).map(l => l.franchisee));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [visibleVisitNotes, allLeads]);

  const escapeCsvCell = (cellData: any) => {
    if (cellData === null || cellData === undefined) return '';
    const stringData = String(cellData);
    if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
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
  };

  if (loading || isRefreshing || authLoading) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  const filteredSourcedAppts = stats.sourcedAppts.filter(appt => 
    selectedOutcomeFilter === 'all' || (appt.appointmentStatus || 'Pending') === selectedOutcomeFilter
  );

  const companyIds = new Set(allLeads.filter(l => l.status === 'Won').map(l => l.id));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Activity Report</h1>
        <p className="text-muted-foreground">Performance and commission insights for field sales visits.</p>
      </header>

      <Collapsible>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Filter className="h-5 w-5" /> <CardTitle>Filters</CardTitle></div>
              <div className="flex items-center gap-2">
                <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing}><RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh</Button>
                <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4" /><span className="ml-2">Toggle</span></Button></CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {userProfile?.role !== 'Field Sales' && userProfile?.role !== 'Franchisee' && (
                <div className="space-y-2">
                    <Label>Captured By</Label>
                    <MultiSelectCombobox options={userOptions} selected={filters.user} onSelectedChange={(val) => handleFilterChange('user', val)} placeholder="Select users..."/>
                </div>
              )}
              {userProfile?.role !== 'Franchisee' && (
                  <div className="space-y-2">
                      <Label>Franchisee</Label>
                      <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..."/>
                  </div>
              )}
              <div className="space-y-2">
                <Label>Outcome</Label>
                <MultiSelectCombobox options={outcomeOptions} selected={filters.outcome} onSelectedChange={(val) => handleFilterChange('outcome', val)} placeholder="Select outcomes..."/>
              </div>
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild><Button id="date" variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0 flex" align="start"><Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} /></PopoverContent>
                </Popover>
              </div>
              {hasActiveFilters && <Button variant="ghost" onClick={clearFilters} className="col-start-1"><X className="mr-2 h-4 w-4" /> Clear Filters</Button>}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard title="Total Visits" value={stats.totalVisits} icon={Briefcase} />
        <StatCard title="Converted Leads" value={stats.totalConverted} icon={FileCheck} description="Became Lead/Customer" onClick={() => router.push('/check-ins?status=Converted')} />
        <StatCard title="Linked to Existing" value={stats.totalLinkedToExisting} icon={LinkIcon} description="Matched customers" onClick={() => setIsLinkedToExistingListOpen(true)} />
        <StatCard title="Total Upsells" value={stats.totalUpsells} icon={TrendingUp} onClick={() => setIsUpsellSuccessListOpen(true)} />
        <StatCard title="Rejected Notes" value={stats.totalRejected} icon={FileX} />
        <StatCard title="Visit Conv. %" value={`${stats.conversionRate}%`} icon={Percent} />
        <StatCard title="Commission Eligible" value={stats.commissionEligibleCount} icon={Star} description="Total milestones met" onClick={() => setIsCommissionListOpen(true)} />
        <StatCard title="Commission Earned" value={`$${stats.commissionEligibleCount * 50}`} icon={DollarSign} description="Click to view list" onClick={() => setIsCommissionListOpen(true)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
          <StatCard 
            title="Appointment Visits" 
            value={stats.appointmentVisits.length} 
            icon={CalendarCheck} 
            description="Appt intent from field" 
            onClick={() => setIsApptVisitsListOpen(true)}
          />
          <StatCard 
            title="Converted (With Appts)" 
            value={stats.leadsConvertedWithAppt.length} 
            icon={CheckCircle2} 
            description="Success: Meeting set" 
            onClick={() => setIsWithApptListOpen(true)}
          />
          <StatCard 
            title="Converted (No Appts)" 
            value={stats.leadsConvertedWithoutAppt.length} 
            icon={AlertTriangle} 
            description="Warning: Silent failure" 
            onClick={() => setIsWithoutApptListOpen(true)}
          />
          <StatCard 
            title="Converted (Misc Outcome)" 
            value={stats.leadsProcessedWithMisc.length} 
            icon={ArrowRight} 
            description="Processed: Non-Appt" 
            onClick={() => setIsProcessedMiscListOpen(true)}
          />
          <StatCard 
            title="Appt. Converted Leads" 
            value={stats.apptConvertedLeads.length} 
            icon={FileCheck} 
            description="Total CRM records from Appt visits" 
            onClick={() => setIsApptLeadsListOpen(true)}
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsApptSuccessListOpen(true)}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-amber-500" /> Appointment Success
                  </CardTitle>
                  <CardDescription>Visits leading to 'Completed' appointments.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Rep</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {stats.appointmentSuccessByRep.length > 0 ? stats.appointmentSuccessByRep.map(r => (
                              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right font-bold">{r.count}</TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground italic">No data.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOutboundWinsListOpen(true)}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                      <Star className="h-5 w-5 text-green-500" /> Outbound Wins
                  </CardTitle>
                  <CardDescription>Visits converted to Outbound 'Signed' customers.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Rep</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {stats.outboundWinsByRep.length > 0 ? stats.outboundWinsByRep.map(r => (
                              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right font-bold">{r.count}</TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground italic">No data.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsUpsellSuccessListOpen(true)}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-blue-500" /> Upsell Success
                  </CardTitle>
                  <CardDescription>Upsells performed by representatives.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Rep</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {stats.upsellsByRep.length > 0 ? stats.upsellsByRep.map(r => (
                              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right font-bold">{r.count}</TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground italic">No data.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-orange-500" /> Commission Earnings
                  </CardTitle>
                  <CardDescription>Total commission value by user.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader><TableRow><TableHead>Rep</TableHead><TableHead className="text-right">Earnings</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {stats.commissionEarningsByRep.length > 0 ? stats.commissionEarningsByRep.map(r => (
                              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right font-bold text-orange-600">${r.amount}</TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={2} className="text-center py-10 text-muted-foreground italic">No data.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" /> Sourced Lead Efficiency</CardTitle>
                  <CardDescription>Ratios of converted leads reaching key statuses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-100">
                      <div><p className="text-sm font-medium text-green-800">Signed Rate</p><p className="text-xs text-green-600">Converted {"->"} Won</p><p className="text-[10px] text-green-600 font-medium mt-1">({stats.conversionEfficiency.won.count} / {stats.conversionEfficiency.total})</p></div>
                      <span className="text-2xl font-bold text-green-700">{stats.conversionEfficiency.won.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 border border-blue-100">
                      <div><p className="text-sm font-medium text-blue-800">Qualified Rate</p><p className="text-xs text-green-600">Converted {"->"} Qualified</p><p className="text-[10px] text-green-600 font-medium mt-1">({stats.conversionEfficiency.qualified.count} / {stats.conversionEfficiency.total})</p></div>
                      <span className="text-2xl font-bold text-blue-700">{stats.conversionEfficiency.qualified.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100">
                      <div><p className="text-sm font-medium text-amber-800">Quote Rate</p><p className="text-xs text-green-600">Converted {"->"} Opportunity</p><p className="text-[10px] text-green-600 font-medium mt-1">({stats.conversionEfficiency.quote.count} / {stats.conversionEfficiency.total})</p></div>
                      <span className="text-2xl font-bold text-amber-700">{stats.conversionEfficiency.quote.percentage.toFixed(1)}%</span>
                  </div>
              </CardContent>
          </Card>

          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Rep Outcome Efficiency Table</CardTitle>
                  <CardDescription>Outcome distribution for visits captured by rep.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-[400px]">
                      <Table>
                          <TableHeader>
                            <TableRow>
                                <TableHead>Rep Name</TableHead>
                                <TableHead className="text-right">Total Visits</TableHead>
                                <TableHead>Outcome Distribution</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                              {stats.repOutcomeEfficiency.length > 0 ? (
                                  stats.repOutcomeEfficiency.map((rep) => (
                                      <TableRow key={rep.id}>
                                          <TableCell className="font-medium">{rep.name}</TableCell>
                                          <TableCell className="text-right font-bold">{rep.totalVisits}</TableCell>
                                          <TableCell className="min-w-[400px]">
                                              <div className="space-y-3">
                                                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                                                      {rep.outcomes.map((o, idx) => (
                                                          <UITooltip key={o.type}>
                                                              <TooltipTrigger asChild>
                                                                  <div style={{ width: `${o.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} className="h-full transition-all hover:brightness-110 cursor-pointer" />
                                                              </TooltipTrigger>
                                                              <TooltipContent className="text-xs bg-popover text-popover-foreground border shadow-md">
                                                                  <p className="font-bold">{o.type}</p>
                                                                  <p>{o.count} / {rep.totalVisits} visits ({o.percentage}%)</p>
                                                              </TooltipContent>
                                                          </UITooltip>
                                                      ))}
                                                  </div>
                                                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                      {rep.outcomes.map((o, idx) => (
                                                          <div key={o.type} className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} /><span className="text-[10px] font-medium whitespace-nowrap">{o.type}: {o.percentage}% ({o.count})</span></div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              ) : <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No activity for filters.</TableCell></TableRow>}
                          </TableBody>
                      </Table>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsApptOutcomeListOpen(true)}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-blue-500" /> Appointment Outcomes (Sourced Leads)</CardTitle>
                  <CardDescription>Distribution of statuses for appointments linked to converted visits. Click to view list.</CardDescription>
              </CardHeader>
              <CardContent>
                  {stats.sourcedApptOutcomeDist.length > 0 ? (
                      <ChartContainer config={{}} className="h-[300px] w-full">
                          <PieChart>
                              <Pie 
                                data={stats.sourcedApptOutcomeDist} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={5} 
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                  {stats.sourcedApptOutcomeDist.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                              <Legend />
                          </PieChart>
                      </ChartContainer>
                  ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No appointments for these visits.</div>}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-green-500" /> Status of Converted Leads</CardTitle>
                  <CardDescription>Current status breakdown of leads generated from field visits.</CardDescription>
              </CardHeader>
              <CardContent>
                  {stats.convertedLeadStatusDist.length > 0 ? (
                      <ChartContainer config={{}} className="h-[300px] w-full">
                          <PieChart>
                              <Pie 
                                data={stats.convertedLeadStatusDist} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false} 
                                outerRadius={80} 
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                  {stats.convertedLeadStatusDist.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend />
                          </PieChart>
                      </ChartContainer>
                  ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No converted leads for these visits.</div>}
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Total Visits by Rep</CardTitle></CardHeader>
              <CardContent>
                  <ChartContainer config={{}} className="h-[300px] w-full">
                      <BarChart data={stats.visitsByUserData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} fontSize={12} /><Tooltip /><Bar dataKey="visits" fill="hsl(var(--primary))" name="Visits"><LabelList dataKey="visits" position="right" style={{ fontSize: '12px', fontWeight: 'bold' }} /></Bar></BarChart>
                  </ChartContainer>
              </CardContent>
          </Card>
          <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> All Visit Outcomes</CardTitle></CardHeader>
              <CardContent>
                  <ChartContainer config={{}} className="h-[300px] w-full">
                      <PieChart><Pie data={stats.callOutcomesData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{stats.callOutcomesData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<ChartTooltipContent />} /><Legend /></PieChart>
                  </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Converted Leads by Franchisee
              </CardTitle>
              <CardDescription>Volume of field visits converted to records per franchise.</CardDescription>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{}} className="h-[400px] w-full">
                  <BarChart data={stats.convertedLeadsByFranchiseeData} layout="vertical" margin={{ left: 20, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" name="Converted Leads">
                          <LabelList dataKey="count" position="right" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </Bar>
                  </BarChart>
              </ChartContainer>
          </CardContent>
      </Card>

      <Dialog open={isCommissionListOpen} onOpenChange={setIsCommissionListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Commission Eligible Milestones</DialogTitle>
                        <p className="text-sm text-muted-foreground">Total Milestones: {stats.commissionEligibleCount} (${stats.commissionEligibleCount * 50}).</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.commissionEligibleEvents,
                        ['Company', 'Rep', 'Date', 'Milestone', 'Current Status'],
                        'commission_milestones',
                        (l) => [l.companyName, l.capturedBy, l.visitDate && isValid(new Date(l.visitDate)) ? format(new Date(l.visitDate), 'PP') : 'N/A', l.milestone, l.status]
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead> <TableHead>Rep</TableHead><TableHead>Date</TableHead><TableHead>Milestone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {stats.commissionEligibleEvents.length > 0 ? stats.commissionEligibleEvents.map((event, idx) => (
                                <TableRow key={`${event.id}-${idx}`}><TableCell className="font-medium">{event.companyName}</TableCell><TableCell>{event.capturedBy}</TableCell><TableCell>{event.visitDate && isValid(new Date(event.visitDate)) ? format(new Date(event.visitDate), 'PP') : 'N/A'}</TableCell><TableCell><Badge variant="secondary">{event.milestone}</Badge></TableCell><TableCell><LeadStatusBadge status={event.status} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" asChild><Link href={event.status === 'Won' ? `/companies/${event.id}` : `/leads/${event.id}`} target="_blank">View Profile <ExternalLink className="ml-2 h-3 w-3" /></Link></Button></TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No results.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isApptVisitsListOpen} onOpenChange={setIsApptVisitsListOpen}>
          <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Appointment Visits</DialogTitle>
                        <p className="text-sm text-muted-foreground">Visits with high-intent outcome variations.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.appointmentVisits,
                        ['Company', 'Rep', 'Date', 'Outcome', 'Status', 'Linked Record'],
                        'appointment_visits',
                        (n) => [
                            n.companyName || 'N/A', 
                            n.capturedBy, 
                            isValid(new Date(n.createdAt)) ? format(new Date(n.createdAt), 'PP') : 'N/A', 
                            n.outcome?.type || 'N/A', 
                            n.status,
                            n.leadId && leadsMap.has(n.leadId) ? leadsMap.get(n.leadId)?.companyName || '' : 'Not Linked'
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
                                <TableHead>Rep</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Linked Record</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.appointmentVisits.length > 0 ? stats.appointmentVisits.map((note) => {
                                const linkedRecord = note.leadId ? leadsMap.get(note.leadId) : null;
                                return (
                                <TableRow key={note.id}>
                                    <TableCell className="font-medium">{note.companyName || 'N/A'}</TableCell>
                                    <TableCell>{note.capturedBy}</TableCell>
                                    <TableCell>{isValid(new Date(note.createdAt)) ? format(new Date(note.createdAt), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline">{note.outcome?.type}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={note.status === 'Converted' ? 'default' : 'secondary'}>{note.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {note.leadId && linkedRecord ? (
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <Link href={linkedRecord.status === 'Won' ? `/companies/${note.leadId}` : `/leads/${note.leadId}`} target="_blank">
                                                    {linkedRecord.companyName} <ExternalLink className="ml-1 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">Not Linked</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No results found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isApptLeadsListOpen} onOpenChange={setIsApptLeadsListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Appointment Converted Leads</DialogTitle>
                        <p className="text-sm text-muted-foreground">CRM records sourced from high-intent appointment visits.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.apptConvertedLeads,
                        ['Company', 'Field Rep', 'Visit Date', 'Current Status'],
                        'appt_converted_leads',
                        (l) => [l.companyName, (l as any).capturedBy, (l as any).visitDate && isValid(new Date((l as any).visitDate)) ? format(new Date((l as any).visitDate), 'PP') : 'N/A', l.status]
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Field Rep</TableHead><TableHead>Visit Date</TableHead><TableHead>Current Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {stats.apptConvertedLeads.length > 0 ? stats.apptConvertedLeads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{(lead as any).capturedBy}</TableCell>
                                    <TableCell>{(lead as any).visitDate && isValid(new Date((lead as any).visitDate)) ? format(new Date((lead as any).visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View Profile <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No converted leads found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isWithApptListOpen} onOpenChange={setIsWithApptListOpen}>
          <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Converted (With Appointments)</DialogTitle>
                        <p className="text-sm text-muted-foreground">Appt-related visits that have a scheduled appointment.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.leadsConvertedWithAppt,
                        ['Company', 'Field Rep', 'Visit Date', 'Status', 'Appt Assigned To', 'Appt Date'],
                        'converted_with_appts',
                        (l) => [
                            l.companyName, 
                            (l as any).capturedBy, 
                            (l as any).visitDate && isValid(new Date((l as any).visitDate)) ? format(new Date((l as any).visitDate), 'PP') : 'N/A', 
                            l.status,
                            (l as any).apptAssignedTo,
                            (l as any).apptDate && isValid(new Date((l as any).apptDate)) ? format(new Date((l as any).apptDate), 'PP') : 'N/A'
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
                                <TableHead>Visit Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Appt Assigned To</TableHead>
                                <TableHead>Appt Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.leadsConvertedWithAppt.length > 0 ? stats.leadsConvertedWithAppt.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{(lead as any).capturedBy}</TableCell>
                                    <TableCell>{(lead as any).visitDate && isValid(new Date((lead as any).visitDate)) ? format(new Date((lead as any).visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell>{(lead as any).apptAssignedTo}</TableCell>
                                    <TableCell>{(lead as any).apptDate && isValid(new Date((lead as any).apptDate)) ? format(new Date((lead as any).apptDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={companyIds.has(lead.id) ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">No results found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isWithoutApptListOpen} onOpenChange={setIsWithoutApptListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Converted (No Appointments) - Silent Failures</DialogTitle>
                        <p className="text-sm text-muted-foreground">Appt-related visits with no appointment record and no misc outcome processing.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.leadsConvertedWithoutAppt,
                        ['Company', 'Field Rep', 'Visit Date', 'Status'],
                        'converted_no_appts',
                        (l) => [l.companyName, (l as any).capturedBy, (l as any).visitDate && isValid(new Date((l as any).visitDate)) ? format(new Date((l as any).visitDate), 'PP') : 'N/A', l.status]
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
                                <TableHead>Visit Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.leadsConvertedWithoutAppt.length > 0 ? stats.leadsConvertedWithoutAppt.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{(lead as any).capturedBy}</TableCell>
                                    <TableCell>{(lead as any).visitDate && isValid(new Date((lead as any).visitDate)) ? format(new Date((lead as any).visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={companyIds.has(lead.id) ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No results found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isProcessedMiscListOpen} onOpenChange={setIsProcessedMiscListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Converted (Misc Outcome) - Qualified Rejections</DialogTitle>
                        <p className="text-sm text-muted-foreground">Appt-related visits that were later processed with non-appointment outcomes.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.leadsProcessedWithMisc,
                        ['Company', 'Field Rep', 'Visit Date', 'Processing Outcome', 'Status'],
                        'converted_misc_outcomes',
                        (l) => [l.companyName, (l as any).capturedBy, (l as any).visitDate && isValid(new Date((l as any).visitDate)) ? format(new Date((l as any).visitDate), 'PP') : 'N/A', (l as any).processingOutcome, l.status]
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
                                <TableHead>Visit Date</TableHead>
                                <TableHead>Processing Outcome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.leadsProcessedWithMisc.length > 0 ? stats.leadsProcessedWithMisc.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>{(lead as any).capturedBy}</TableCell>
                                    <TableCell>{(lead as any).visitDate && isValid(new Date((lead as any).visitDate)) ? format(new Date((lead as any).visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{(lead as any).processingOutcome}</Badge>
                                    </TableCell>
                                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={companyIds.has(lead.id) ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No results found.</TableCell></TableRow>}
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
                            (a) => [a.leadName, a.leadStatus, a.appointmentStatus || 'Pending', a.dialerAssigned || 'N/A', a.assignedTo || 'N/A', a.duedate && isValid(new Date(a.duedate)) ? format(new Date(a.duedate), 'PP') : 'N/A']
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
                                    <TableCell>{appt.duedate && isValid(new Date(appt.duedate)) ? format(new Date(appt.duedate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={appt.leadStatus === 'Won' ? `/companies/${appt.leadId}` : `/leads/${appt.leadId}`} target="_blank">
                                                View Record <ExternalLink className="ml-2 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                                        No appointments found for this status in the cohort.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isApptSuccessListOpen} onOpenChange={setIsApptSuccessListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Appointment Success Records</DialogTitle>
                        <p className="text-sm text-muted-foreground">Successful appointments sourced from field visits.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.commissionEligibleEvents.filter(e => e.milestone === 'Appointment Completed'),
                        ['Company', 'Field Rep', 'Visit Date', 'Current Status'],
                        'appointment_success_records',
                        (l) => [l.companyName, l.capturedBy, l.visitDate && isValid(new Date(l.visitDate)) ? format(new Date(l.visitDate), 'PP') : 'N/A', l.status]
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Field Rep</TableHead><TableHead>Visit Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {stats.commissionEligibleEvents.filter(e => e.milestone === 'Appointment Completed').map((event, idx) => (
                                <TableRow key={`${event.id}-${idx}`}>
                                    <TableCell className="font-medium">{event.companyName}</TableCell>
                                    <TableCell>{event.capturedBy}</TableCell>
                                    <TableCell>{event.visitDate && isValid(new Date(event.visitDate)) ? format(new Date(event.visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={event.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={event.status === 'Won' ? `/companies/${event.id}` : `/leads/${event.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isOutboundWinsListOpen} onOpenChange={setIsOutboundWinsListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Outbound Wins Records</DialogTitle>
                        <p className="text-sm text-muted-foreground">Leads from the field that were signed via Outbound sales.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.commissionEligibleEvents.filter(e => e.milestone === 'Outbound Win'),
                        ['Company', 'Field Rep', 'Visit Date', 'Status'],
                        'outbound_wins_records',
                        (l) => [l.companyName, l.capturedBy, l.visitDate && isValid(new Date(l.visitDate)) ? format(new Date(l.visitDate), 'PP') : 'N/A', l.status]
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Field Rep</TableHead><TableHead>Visit Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {stats.commissionEligibleEvents.filter(e => e.milestone === 'Outbound Win').map((event, idx) => (
                                <TableRow key={`${event.id}-${idx}`}>
                                    <TableCell className="font-medium">{event.companyName}</TableCell>
                                    <TableCell>{event.capturedBy}</TableCell>
                                    <TableCell>{event.visitDate && isValid(new Date(event.visitDate)) ? format(new Date(event.visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><LeadStatusBadge status={event.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/companies/${event.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isUpsellSuccessListOpen} onOpenChange={setIsUpsellSuccessListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Upsell Success Records</DialogTitle>
                        <p className="text-sm text-muted-foreground">Recorded upsells for existing signed customers.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.commissionEligibleEvents.filter(e => e.milestone === 'Upsell'),
                        ['Company', 'Rep', 'Date'],
                        'upsell_success_records',
                        (l) => [l.companyName, l.capturedBy, l.visitDate && isValid(new Date(l.visitDate)) ? format(new Date(l.visitDate), 'PP') : 'N/A']
                    )}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Representative</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {stats.commissionEligibleEvents.filter(e => e.milestone === 'Upsell').map((event, idx) => (
                                <TableRow key={`${event.id}-${idx}`}>
                                    <TableCell className="font-medium">{event.companyName}</TableCell>
                                    <TableCell>{event.capturedBy}</TableCell>
                                    <TableCell>{event.visitDate && isValid(new Date(event.visitDate)) ? format(new Date(event.visitDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/companies/${event.id}`} target="_blank">View <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isLinkedToExistingListOpen} onOpenChange={setIsLinkedToExistingListOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center pr-8">
                    <div>
                        <DialogTitle>Linked to Existing Customers</DialogTitle>
                        <p className="text-sm text-muted-foreground">Field visits that were matched and linked to signed customer records.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportList(
                        stats.linkedToExistingNotes,
                        ['Company', 'Rep', 'Visit Date', 'Outcome'],
                        'linked_to_existing_visits',
                        (n) => [n.companyName || 'N/A', n.capturedBy, isValid(new Date(n.createdAt)) ? format(new Date(n.createdAt), 'PP') : 'N/A', n.outcome?.type || 'N/A']
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
                                <TableHead>Rep</TableHead>
                                <TableHead>Visit Date</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.linkedToExistingNotes.length > 0 ? stats.linkedToExistingNotes.map((note) => (
                                <TableRow key={note.id}>
                                    <TableCell className="font-medium">{note.companyName || 'N/A'}</TableCell>
                                    <TableCell>{note.capturedBy}</TableCell>
                                    <TableCell>{isValid(new Date(note.createdAt)) ? format(new Date(note.createdAt), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{note.outcome?.type}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/companies/${note.leadId}`} target="_blank">View Profile <ExternalLink className="ml-2 h-3 w-3" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No linked visits found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
