'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, VisitNote, Appointment, UserProfile, DiscoveryData, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Filter, SlidersHorizontal, X, RefreshCw, Calendar as CalendarIcon, User, Users, Percent, TrendingUp, Briefcase, FileCheck, FileX, MapIcon, Star, DollarSign, Trophy, ArrowRight, ExternalLink, Coins, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { getVisitNotes, getAllLeadsForReport, getAllAppointments, getAllUsers } from '@/services/firebase';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const STATUS_COLORS: Record<string, string> = {
  'New': '#A0A0A0',
  'Contacted': '#FFBB28',
  'Qualified': '#00C49F',
  'Pre Qualified': '#F59E0B',
  'Won': '#22C55E',
  'Lost': '#EF4444',
  'In Progress': '#0088FE',
  'Trialing ShipMate': '#EC4899',
};

export default function FieldActivityReportPage() {
  const [allVisitNotes, setAllVisitNotes] = useState<VisitNote[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allFieldSalesUsers, setAllFieldSalesUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCommissionListOpen, setIsCommissionListOpen] = useState(false);
  
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    date: undefined as DateRange | undefined,
    user: [] as string[],
    outcome: [] as string[],
    franchisee: [] as string[],
  });

  const hasAccess = userProfile?.role && ['admin', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin'].includes(userProfile.role);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace('/leads');
    }
  }, [userProfile, authLoading, router, hasAccess]);

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setIsRefreshing(true);
    setLoading(true);
    try {
      const notesPromise = userProfile.role === 'Field Sales'
          ? getVisitNotes(userProfile.uid)
          : getVisitNotes();

      const [notes, leads, appointments, users] = await Promise.all([
        notesPromise,
        getAllLeadsForReport(),
        getAllAppointments(),
        getAllUsers(),
      ]);
      setAllVisitNotes(notes);
      setAllLeads(leads);
      setAllAppointments(appointments);
      setAllFieldSalesUsers(users.filter(u => u.role === 'Field Sales'));
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

  const filteredVisitNotes = useMemo(() => {
    return allVisitNotes.filter(note => {
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
  }, [allVisitNotes, filters, leadsMap]);

  const stats = useMemo(() => {
    const totalVisits = filteredVisitNotes.length;
    const convertedNotes = filteredVisitNotes.filter(n => n.status === 'Converted' && n.leadId);
    const rejectedNotes = filteredVisitNotes.filter(n => n.status === 'Rejected');
    
    const conversionRate = totalVisits > 0 ? (convertedNotes.length / totalVisits) * 100 : 0;

    const commissionEligibleLeads = convertedNotes.filter(note => {
        const lead = leadsMap.get(note.leadId!);
        if (!lead) return false;
        
        const hasCompletedAppointment = allAppointments.some(appt => appt.leadId === lead.id && appt.appointmentStatus === 'Completed');
        const isSignedViaOutbound = lead.fieldSales === false && lead.status === 'Won';
        
        return hasCompletedAppointment || isSignedViaOutbound;
    }).map(note => {
        const lead = leadsMap.get(note.leadId!)!;
        return {
            ...lead,
            visitDate: note.createdAt,
            capturedBy: note.capturedBy
        };
    });

    const appointmentLeaderboard = allFieldSalesUsers.map(user => {
        const userName = user.displayName!;
        const count = convertedNotes.filter(n => 
            n.capturedBy === userName && 
            allAppointments.some(appt => appt.leadId === n.leadId && appt.appointmentStatus === 'Completed')
        ).length;
        return { name: userName, value: count };
    }).filter(u => u.value > 0).sort((a,b) => b.value - a.value);

    const outboundSuccessLeaderboard = allFieldSalesUsers.map(user => {
        const userName = user.displayName!;
        const count = convertedNotes.filter(n => {
            if (n.capturedBy !== userName) return false;
            const lead = leadsMap.get(n.leadId!);
            return lead && lead.fieldSales === false && lead.status === 'Won';
        }).length;
        return { name: userName, value: count };
    }).filter(u => u.value > 0).sort((a,b) => b.value - a.value);

    const commissionLeaderboard = allFieldSalesUsers.map(user => {
        const userName = user.displayName!;
        const count = commissionEligibleLeads.filter(l => l.capturedBy === userName).length;
        return { name: userName, value: count * 50 };
    }).filter(u => u.value > 0).sort((a,b) => b.value - a.value);

    const visitsByOutcomeData = filteredVisitNotes.reduce((acc, note) => {
        const type = note.outcome?.type || 'Other';
        const existing = acc.find(item => item.name === type);
        if (existing) existing.value++;
        else acc.push({ name: type, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);

    const statusOfConvertedLeadsData = convertedNotes.reduce((acc, note) => {
        const lead = leadsMap.get(note.leadId!);
        const status = lead?.status || 'Unknown';
        const existing = acc.find(item => item.name === status);
        if (existing) existing.value++;
        else acc.push({ name: status, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);

    const visitsByFranchiseeData = filteredVisitNotes.reduce((acc, note) => {
        const lead = note.leadId ? leadsMap.get(note.leadId) : null;
        const franchisee = lead?.franchisee || 'No Franchisee';
        const existing = acc.find(item => item.name === franchisee);
        if (existing) existing.value++;
        else acc.push({ name: franchisee, value: 1 });
        return acc;
    }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value).slice(0, 10);

    const visitsByUserData = allFieldSalesUsers.map(user => {
        const name = user.displayName!;
        const visits = filteredVisitNotes.filter(n => n.capturedBy === name).length;
        return { name, visits };
    }).filter(u => u.visits > 0).sort((a,b) => b.visits - a.visits);

    return {
      totalVisits,
      totalConverted: convertedNotes.length,
      totalRejected: rejectedNotes.length,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      commissionEligibleCount: commissionEligibleLeads.length,
      commissionEligibleLeads,
      appointmentLeaderboard,
      outboundSuccessLeaderboard,
      commissionLeaderboard,
      visitsByOutcomeData,
      statusOfConvertedLeadsData,
      visitsByFranchiseeData,
      visitsByUserData,
    };
  }, [filteredVisitNotes, leadsMap, allAppointments, allFieldSalesUsers]);

  const handleRedirectToConvertedLeads = () => {
    const params = new URLSearchParams();
    if (filters.user.length > 0) params.set('user', filters.user.join(','));
    if (filters.franchisee.length > 0) params.set('franchisee', filters.franchisee.join(','));
    if (filters.date?.from) params.set('dateFrom', filters.date.from.toISOString());
    if (filters.date?.to) params.set('dateTo', filters.date.to.toISOString());
    params.set('status', 'Converted');
    router.push(`/check-ins?${params.toString()}`);
  };

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

  const userOptions: Option[] = useMemo(() => {
    const users = new Set(allVisitNotes.map(n => n.capturedBy));
    return Array.from(users).map(u => ({ value: u, label: u }));
  }, [allVisitNotes]);

  const outcomeOptions: Option[] = useMemo(() => {
    const outcomes = new Set(allVisitNotes.map(n => n.outcome?.type).filter(Boolean));
    return Array.from(outcomes as string[]).map(o => ({ value: o, label: o }));
  }, [allVisitNotes]);
  
  const franchiseeOptions: Option[] = useMemo(() => {
    const leadIds = allVisitNotes.map(n => n.leadId).filter(Boolean);
    const franchisees = new Set(allLeads.filter(l => leadIds.includes(l.id) && l.franchisee).map(l => l.franchisee));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f }));
  }, [allVisitNotes, allLeads]);


  if (authLoading || loading || !hasAccess) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
  }
  
  const hasActiveFilters = Object.values(filters).some(val => (Array.isArray(val) ? val.length > 0 : !!val));

  return (
    <>
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
                <Button onClick={fetchData} variant="outline" disabled={isRefreshing}><RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh</Button>
                <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><SlidersHorizontal className="h-4 w-4" /><span className="ml-2">Toggle</span></Button></CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {userProfile?.role !== 'Field Sales' && (
                  <div className="space-y-2">
                      <Label>Captured By</Label>
                      <MultiSelectCombobox options={userOptions} selected={filters.user} onSelectedChange={(val) => handleFilterChange('user', val)} placeholder="Select users..."/>
                  </div>
                )}
                 <div className="space-y-2">
                  <Label>Franchisee</Label>
                  <MultiSelectCombobox options={franchiseeOptions} selected={filters.franchisee} onSelectedChange={(val) => handleFilterChange('franchisee', val)} placeholder="Select franchisees..."/>
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <MultiSelectCombobox options={outcomeOptions} selected={filters.outcome} onSelectedChange={(val) => handleFilterChange('outcome', val)} placeholder="Select outcomes..."/>
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                      <PopoverTrigger asChild><Button id="date" variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filters.date?.from ? (filters.date.to ? <>{format(filters.date.from, "LLL dd, y")} - {format(filters.date.to, "LLL dd, y")}</> : format(filters.date.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0 flex" align="start">
                          <Calendar mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} />
                      </PopoverContent>
                  </Popover>
                </div>
                {hasActiveFilters && <Button variant="ghost" onClick={clearFilters}><X className="mr-2 h-4 w-4" /> Clear Filters</Button>}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Visits" value={stats.totalVisits} icon={Briefcase} />
          <StatCard title="Converted Leads" value={stats.totalConverted} icon={FileCheck} onClick={handleRedirectToConvertedLeads} description="Click to view sourced leads" />
          <StatCard title="Rejected Notes" value={stats.totalRejected} icon={FileX} />
          <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} />
          <StatCard title="Commission Eligible" value={stats.commissionEligibleCount} icon={Star} description="Click to view list" onClick={() => setIsCommissionListOpen(true)} />
          <StatCard title="Commission Earned" value={`$${stats.commissionEligibleCount * 50}`} icon={DollarSign} description="Total pending/paid" onClick={() => setIsCommissionListOpen(true)} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Appointment Success
                    </CardTitle>
                    <CardDescription>Visits leading to 'Completed' appointments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.appointmentLeaderboard.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Field Sales Rep</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.appointmentLeaderboard.map((item, idx) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-bold">{item.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">No data.</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-green-500" />
                        Outbound Wins
                    </CardTitle>
                    <CardDescription>Visits converted to Outbound 'Signed' customers.</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.outboundSuccessLeaderboard.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Field Sales Rep</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.outboundSuccessLeaderboard.map((item, idx) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">{item.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">No data.</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        Commission Earnings
                    </CardTitle>
                    <CardDescription>Total commission value by user.</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.commissionLeaderboard.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Field Sales Rep</TableHead>
                                    <TableHead className="text-right">Earnings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.commissionLeaderboard.map((item, idx) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-bold text-amber-600">${item.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">No data.</div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> Visits by Outcome</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.visitsByOutcomeData.length > 0 ? (
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <PieChart>
                                <Pie
                                    data={stats.visitsByOutcomeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {stats.visitsByOutcomeData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No outcome data available</div>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> Status of Converted Leads</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.statusOfConvertedLeadsData.length > 0 ? (
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <PieChart>
                                <Pie
                                    data={stats.statusOfConvertedLeadsData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {stats.statusOfConvertedLeadsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No converted lead status data available</div>}
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Total Visits by Rep</CardTitle></CardHeader>
                <CardContent>
                {stats.visitsByUserData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] w-full">
                    <BarChart data={stats.visitsByUserData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="visits" fill="hsl(var(--primary))" name="Visits" />
                    </BarChart>
                    </ChartContainer>
                ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data to display</div>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Visits by Franchisee</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.visitsByFranchiseeData.length > 0 ? (
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <BarChart data={stats.visitsByFranchiseeData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" name="Visits" />
                            </BarChart>
                        </ChartContainer>
                    ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No franchisee data available</div>}
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isCommissionListOpen} onOpenChange={setIsCommissionListOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Commission Eligible Leads</DialogTitle>
                  <DialogDescription>
                      List of leads converted from field visits that met the commission criteria. Total: {stats.commissionEligibleCount} leads (${stats.commissionEligibleCount * 50}).
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 mt-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Company</TableHead>
                              <TableHead>Rep</TableHead>
                              <TableHead>Visit Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {stats.commissionEligibleLeads.length > 0 ? (
                              stats.commissionEligibleLeads.map((lead) => (
                                  <TableRow key={lead.id}>
                                      <TableCell className="font-medium">{lead.companyName}</TableCell>
                                      <TableCell>{lead.capturedBy}</TableCell>
                                      <TableCell>{format(new Date(lead.visitDate!), 'PP')}</TableCell>
                                      <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                                      <TableCell className="text-right">
                                          <Button variant="ghost" size="sm" asChild>
                                              <Link href={lead.status === 'Won' ? `/companies/${lead.id}` : `/leads/${lead.id}`} target="_blank">
                                                  View Profile <ExternalLink className="ml-2 h-3 w-3" />
                                              </Link>
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No commission eligible leads for the current filters.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </>
  );
}
