
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, VisitNote, Appointment, UserProfile, DiscoveryData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, Star, DollarSign, Trophy, Briefcase, FileCheck, FileX, Percent, CheckCircle2, PieChart as PieChartIcon, BarChart3, Route, ExternalLink, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getVisitNotes, getAllLeadsForReport, getAllAppointments, getAllUsers, getCompaniesFromFirebase } from '@/services/firebase';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DiscoveryRadarChart } from '@/components/discovery-radar-chart';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function FieldActivityReportPage() {
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCommissionListOpen, setIsCommissionListOpen] = useState(false);
  
  const { userProfile } = useAuth();
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

      const [notes, leads, companies, appointments, users] = await Promise.all([
        notesPromise,
        getAllLeadsForReport(),
        getCompaniesFromFirebase({ skipCoordinateCheck: true }),
        getAllAppointments(),
        getAllUsers(),
      ]);
      setAllVisitNotes(notes);
      setAllLeads([...leads, ...companies]);
      setAllAppointments(appointments);
      setAllFieldSalesUsers(users.filter(u => u.role === 'Field Sales' || u.role === 'admin' || u.role === 'Field Sales Admin'));
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

  const stats = useMemo(() => {
    const totalVisitsCount = filteredVisitNotes.length;
    const convertedNotes = filteredVisitNotes.filter(n => n.status === 'Converted' && n.leadId);
    const rejectedNotes = filteredVisitNotes.filter(n => n.status === 'Rejected');
    
    const conversionRate = totalVisitsCount > 0 ? (convertedNotes.length / totalVisitsCount) * 100 : 0;

    const commissionEligibleLeads = convertedNotes.filter(note => {
        const lead = leadsMap.get(note.leadId!);
        if (!lead) return false;
        const hasCompletedAppointment = allAppointments.some(appt => appt.leadId === lead.id && appt.appointmentStatus === 'Completed');
        const isSignedViaOutbound = lead.fieldSales === false && lead.status === 'Won';
        return hasCompletedAppointment || isSignedViaOutbound;
    }).map(note => {
        const lead = leadsMap.get(note.leadId!)!;
        return { ...lead, visitDate: note.createdAt, capturedBy: note.capturedBy };
    });

    const visitsByOutcomeData = filteredVisitNotes.reduce((acc, note) => {
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

        // Calculate appointment outcomes for leads sourced by this rep via field visits
        const leadIdsSourcedByRep = new Set(userNotes.map(n => n.leadId).filter(Boolean));
        const appointmentsForSourcedLeads = allAppointments.filter(appt => leadIdsSourcedByRep.has(appt.leadId));

        const apptOutcomesCount = appointmentsForSourcedLeads.reduce((acc, appt) => {
            const status = appt.appointmentStatus || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
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
            apptOutcomes: Object.entries(apptOutcomesCount).map(([type, count]) => ({
                type,
                count
            }))
        };
    }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.totalVisits - a.totalVisits);

    const wonCountForRatio = convertedNotes.filter(n => leadsMap.get(n.leadId!)?.status === 'Won').length;
    const qualifiedCountForRatio = convertedNotes.filter(n => ['Qualified', 'Pre Qualified'].includes(leadsMap.get(n.leadId!)?.status || '')).length;
    const quoteCountForRatio = convertedNotes.filter(n => leadsMap.get(n.leadId!)?.status === 'Prospect Opportunity').length;

    return {
      totalVisits: totalVisitsCount,
      totalConverted: convertedNotes.length,
      totalRejected: rejectedNotes.length,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      commissionEligibleCount: commissionEligibleLeads.length,
      commissionEligibleLeads,
      visitsByOutcomeData,
      visitsByUserData,
      repOutcomeEfficiency,
      conversionEfficiency: {
          total: convertedNotes.length,
          won: { percentage: convertedNotes.length > 0 ? (wonCountForRatio / convertedNotes.length) * 100 : 0, count: wonCountForRatio },
          qualified: { percentage: convertedNotes.length > 0 ? (qualifiedCountForRatio / convertedNotes.length) * 100 : 0, count: qualifiedCountForRatio },
          quote: { percentage: convertedNotes.length > 0 ? (quoteCountForRatio / convertedNotes.length) * 100 : 0, count: quoteCountForRatio },
      }
    };
  }, [filteredVisitNotes, leadsMap, allAppointments, allFieldSalesUsers]);

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

  if (loading || isRefreshing) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  const StatCard = ({ title, value, icon: Icon, description, onClick }: { title: string; value: string | number; icon: React.ElementType; description?: string; onClick?: () => void }) => (
    <Card className={cn(onClick && "cursor-pointer hover:bg-muted/50 transition-colors")} onClick={onClick}>
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
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Activity Report</h1>
        <p className="text-muted-foreground">Performance and commission insights for field sales visits.</p>
      </header>

      <Collapsible>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing}><RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh</Button>
              <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4" /><span className="ml-2">Toggle</span></Button></CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {userProfile?.role !== 'Field Sales' && userProfile?.role !== 'Franchisee' && (
                <div className="space-y-2">
                    <Label>Captured By</Label>
                    <MultiSelectCombobox options={userOptions} selected={filters.capturedBy} onSelectedChange={(val) => handleFilterChange('capturedBy', val)} placeholder="Select users..."/>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard title="Total Visits" value={stats.totalVisits} icon={Briefcase} />
        <StatCard title="Converted Leads" value={stats.totalConverted} icon={FileCheck} description="Became Lead/Customer" onClick={() => router.push('/check-ins?status=Converted')} />
        <StatCard title="Rejected Notes" value={stats.totalRejected} icon={FileX} />
        <StatCard title="Visit Conv. %" value={`${stats.conversionRate}%`} icon={Percent} />
        <StatCard title="Commission Eligible" value={stats.commissionEligibleCount} icon={Star} description="Click to view list" onClick={() => setIsCommissionListOpen(true)} />
        <StatCard title="Commission Earned" value={`$${stats.commissionEligibleCount * 50}`} icon={DollarSign} description="Total pending/paid" onClick={() => setIsCommissionListOpen(true)} />
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
                      <div><p className="text-sm font-medium text-blue-800">Qualified Rate</p><p className="text-xs text-blue-600">Converted {"->"} Qualified</p><p className="text-[10px] text-blue-600 font-medium mt-1">({stats.conversionEfficiency.qualified.count} / {stats.conversionEfficiency.total})</p></div>
                      <span className="text-2xl font-bold text-blue-700">{stats.conversionEfficiency.qualified.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100">
                      <div><p className="text-sm font-medium text-amber-800">Quote Rate</p><p className="text-xs text-green-600">Converted {"->"} Opportunity</p><p className="text-[10px] text-amber-600 font-medium mt-1">({stats.conversionEfficiency.quote.count} / {stats.conversionEfficiency.total})</p></div>
                      <span className="text-2xl font-bold text-amber-700">{stats.conversionEfficiency.quote.percentage.toFixed(1)}%</span>
                  </div>
              </CardContent>
          </Card>

          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Rep Outcome Efficiency Table</CardTitle>
                  <CardDescription>Outcome distribution for visits and appointments captured by rep.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-[400px]">
                      <Table>
                          <TableHeader>
                            <TableRow>
                                <TableHead>Rep Name</TableHead>
                                <TableHead className="text-right">Total Visits</TableHead>
                                <TableHead>Visit Distribution</TableHead>
                                <TableHead>Appt Outcomes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                              {stats.repOutcomeEfficiency.length > 0 ? (
                                  stats.repOutcomeEfficiency.map((rep) => (
                                      <TableRow key={rep.id}>
                                          <TableCell className="font-medium">{rep.name}</TableCell>
                                          <TableCell className="text-right font-bold">{rep.totalVisits}</TableCell>
                                          <TableCell className="min-w-[300px]">
                                              <div className="space-y-3">
                                                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                                                      {rep.outcomes.map((o, idx) => (
                                                          <TooltipProvider key={o.type}>
                                                              <UITooltip>
                                                                  <TooltipTrigger asChild>
                                                                      <div style={{ width: `${o.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} className="h-full transition-all hover:brightness-110 cursor-pointer" />
                                                                  </TooltipTrigger>
                                                                  <TooltipContent className="text-xs"><p className="font-bold">{o.type}</p><p>{o.count} / {rep.totalVisits} visits ({o.percentage}%)</p></TooltipContent>
                                                              </UITooltip>
                                                          </TooltipProvider>
                                                      ))}
                                                  </div>
                                                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                      {rep.outcomes.map((o, idx) => (
                                                          <div key={o.type} className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} /><span className="text-[10px] font-medium whitespace-nowrap">{o.type}: {o.percentage}% ({o.count})</span></div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </TableCell>
                                          <TableCell>
                                              <div className="flex flex-wrap gap-2">
                                                  {rep.apptOutcomes.map(o => (
                                                      <Badge key={o.type} variant="secondary" className="text-[10px] whitespace-nowrap">
                                                          {o.type}: {o.count}
                                                      </Badge>
                                                  ))}
                                                  {rep.apptOutcomes.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              ) : <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No activity for filters.</TableCell></TableRow>}
                          </TableBody>
                      </Table>
                  </ScrollArea>
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
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> Visits by Outcome</CardTitle></CardHeader>
              <CardContent>
                  <ChartContainer config={{}} className="h-[300px] w-full">
                      <PieChart><Pie data={stats.visitsByOutcomeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">{stats.visitsByOutcomeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}<LabelList dataKey="value" position="inside" fill="white" /></Pie><Tooltip content={<ChartTooltipContent />} /><Legend /></PieChart>
                  </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <Dialog open={isCommissionListOpen} onOpenChange={setIsCommissionListOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>Commission Eligible Leads</DialogTitle><DialogDescription>Total: {stats.commissionEligibleCount} leads (${stats.commissionEligibleCount * 50}).</DialogDescription></DialogHeader>
              <ScrollArea className="flex-1 mt-4">
                  <Table>
                      <TableHeader><TableRow><TableHead>Company</TableHead> <TableHead>Rep</TableHead><TableHead>Visit Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {stats.commissionEligibleLeads.length > 0 ? stats.commissionEligibleLeads.map((lead) => (
                              <TableRow key={lead.id}><TableCell className="font-medium">{lead.companyName}</TableCell><TableCell>{lead.capturedBy}</TableCell><TableCell>{format(new Date(lead.visitDate!), 'PP')}</TableCell><TableCell><LeadStatusBadge status={lead.status} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" asChild><Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">View Profile <ExternalLink className="ml-2 h-3 w-3" /></Link></Button></TableCell></TableRow>
                          )) : <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No results.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </div>
  );
}
