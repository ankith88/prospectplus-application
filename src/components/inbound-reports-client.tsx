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
  TrendingUp, 
  RefreshCw, 
  Download, 
  Inbox,
  User,
  ArrowUpRight,
  Target,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isValid, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartTooltipContent, ChartContainer } from './ui/chart';
import { MultiSelectCombobox, type Option } from './ui/multi-select-combobox';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { LeadStatusBadge } from './lead-status-badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#f97316'];

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

export default function InboundReportsClientPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    netsuiteStatus: [] as string[],
    dateEntered: undefined as DateRange | undefined,
    salesRepAssigned: [] as string[],
    source: [] as string[],
  });

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
        // Fetch all leads in the inbound bucket
        let leadsQuery;
        if (userProfile.role === 'Franchisee' && userProfile.franchisee) {
          leadsQuery = query(
            collection(firestore, 'leads'),
            where('bucket', '==', 'inbound'),
            where('franchisee', '==', userProfile.franchisee)
          );
        } else {
          leadsQuery = query(
            collection(firestore, 'leads'),
            where('bucket', '==', 'inbound')
          );
        }
        const leadsSnap = await getDocs(leadsQuery);
        
        const leads = leadsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Lead));

        setAllLeads(leads);

    } catch (error: any) {
        console.error("Failed to refresh inbound reporting data:", error);
        setError(`Error: ${error.message || "An unexpected error occurred."}`);
        toast({ variant: 'destructive', title: 'Loading Failed', description: 'Could not load inbound reporting data.' });
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
      netsuiteStatus: [],
      dateEntered: undefined,
      salesRepAssigned: [],
      source: [],
    });
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        const statusMatch = filters.netsuiteStatus.length === 0 || (lead.netsuiteLeadStatus && filters.netsuiteStatus.includes(lead.netsuiteLeadStatus));
        const repMatch = filters.salesRepAssigned.length === 0 || (lead.salesRepAssigned && filters.salesRepAssigned.includes(lead.salesRepAssigned));
        const sourceMatch = filters.source.length === 0 || (lead.customerSource && filters.source.includes(lead.customerSource));

        let dateMatch = true;
        if (filters.dateEntered?.from) {
            const enteredDate = parseDateString(lead.dateLeadEntered);
            if (!enteredDate) return false;
            const fromDate = startOfDay(filters.dateEntered.from);
            const toDate = filters.dateEntered.to ? endOfDay(filters.dateEntered.to) : endOfDay(filters.dateEntered.from);
            dateMatch = enteredDate >= fromDate && enteredDate <= toDate;
        }

        return statusMatch && repMatch && sourceMatch && dateMatch;
    });
  }, [allLeads, filters]);

  const stats = useMemo(() => {
    const totalInbound = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === 'Won' || l.netsuiteLeadStatus?.includes('Won') || l.netsuiteLeadStatus?.includes('Customer'));
    const qualifiedLeads = filteredLeads.filter(l => l.status === 'Qualified' || l.netsuiteLeadStatus?.includes('Qualified'));
    
    const wonCount = wonLeads.length;
    const qualifiedCount = qualifiedLeads.length;
    const conversionRate = totalInbound > 0 ? (wonCount / totalInbound) * 100 : 0;
    const qualificationRate = totalInbound > 0 ? (qualifiedCount / totalInbound) * 100 : 0;

    const netsuiteStatusDist = filteredLeads.reduce((acc, l) => {
        const status = l.netsuiteLeadStatus || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const netsuiteStatusData = Object.entries(netsuiteStatusDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const repDist = filteredLeads.reduce((acc, l) => {
        const rep = l.salesRepAssigned || 'Unassigned';
        acc[rep] = (acc[rep] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const repPerformanceData = Object.entries(repDist)
        .map(([name, total]) => {
            const repLeads = filteredLeads.filter(l => (l.salesRepAssigned || 'Unassigned') === name);
            const repWon = repLeads.filter(l => l.status === 'Won' || l.netsuiteLeadStatus?.includes('Won') || l.netsuiteLeadStatus?.includes('Customer')).length;
            return { name, 'Total Leads': total, 'Won': repWon };
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

    return {
        totalInbound,
        wonCount,
        qualifiedCount,
        conversionRate,
        qualificationRate,
        netsuiteStatusData,
        repPerformanceData,
        sourceData
    };
  }, [filteredLeads]);

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

  const netsuiteStatusOptions: Option[] = useMemo(() => {
    const statuses = new Set(allLeads.map(l => l.netsuiteLeadStatus).filter(Boolean));
    return Array.from(statuses).map(s => ({ value: s as string, label: s as string }));
  }, [allLeads]);

  const repOptions: Option[] = useMemo(() => {
    const reps = new Set(allLeads.map(l => l.salesRepAssigned).filter(Boolean));
    return Array.from(reps).map(r => ({ value: r as string, label: r as string }));
  }, [allLeads]);

  const sourceOptions: Option[] = useMemo(() => {
    const sources = new Set(allLeads.map(l => l.customerSource).filter(Boolean));
    return Array.from(sources).map(s => ({ value: s as string, label: s as string }));
  }, [allLeads]);

  if (loading || authLoading || !userProfile) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header>
          <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Inbound Reporting</h1>
          </div>
          <p className="text-muted-foreground">Lead performance and status tracking for NetSuite Inbound leads.</p>
      </header>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
            <div className="flex items-center gap-2">
                <Button onClick={fetchData} variant="outline" size="sm" disabled={isRefreshing || loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Date Entered</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIconLucide className="mr-2 h-4 w-4" />
                                {filters.dateEntered?.from ? (
                                    filters.dateEntered.to ? (
                                        <>{format(filters.dateEntered.from, "LLL dd, y")} - {format(filters.dateEntered.to, "LLL dd, y")}</>
                                    ) : format(filters.dateEntered.from, "LLL dd, y")
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 flex" align="start">
                            <Calendar mode="range" selected={filters.dateEntered} onSelect={(date) => handleFilterChange('dateEntered', date)} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>Sales Rep Assigned</Label>
                    <MultiSelectCombobox 
                        options={repOptions} 
                        selected={filters.salesRepAssigned} 
                        onSelectedChange={(val) => handleFilterChange('salesRepAssigned', val)} 
                        placeholder="Select reps..." 
                    />
                </div>
                <div className="space-y-2">
                    <Label>NetSuite Status</Label>
                    <MultiSelectCombobox 
                        options={netsuiteStatusOptions} 
                        selected={filters.netsuiteStatus} 
                        onSelectedChange={(val) => handleFilterChange('netsuiteStatus', val)} 
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
                <Button variant="ghost" onClick={clearFilters} className="col-start-1"><X className="mr-2 h-4 w-4"/> Clear Filters</Button>
            </div>
        </CardContent>
      </Card>

      {!error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Inbound" value={stats.totalInbound} icon={Inbox} description="Total in period" />
                <StatCard title="Qualified Leads" value={stats.qualifiedCount} icon={Target} description="Ready for Sales" />
                <StatCard title="Won Customers" value={stats.wonCount} icon={Star} description="Successfully signed" />
                <StatCard title="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} icon={TrendingUp} description="Won / Total" />
                <StatCard title="Qualification Rate" value={`${stats.qualificationRate.toFixed(1)}%`} icon={Percent} description="Qualified / Total" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>NetSuite Status Distribution</CardTitle>
                                <CardDescription>Lifecycle stages based on NetSuite sync.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.netsuiteStatusData, 'netsuite_status_dist')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.netsuiteStatusData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <PieChart>
                                    <Pie 
                                        data={stats.netsuiteStatusData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={70} 
                                        outerRadius={100} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.netsuiteStatusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
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
                                <CardTitle>Sales Rep Performance</CardTitle>
                                <CardDescription>Inbound leads handled and converted by rep.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleExportData(stats.repPerformanceData, 'rep_performance')}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.repPerformanceData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <BarChart data={stats.repPerformanceData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="Total Leads" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="Won" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground italic">No rep data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Lead Sources</CardTitle>
                        <CardDescription>Where inbound leads are coming from.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                        <TableHead className="text-right">%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.sourceData.map((source, index) => (
                                        <TableRow key={source.name}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                {source.name}
                                            </TableCell>
                                            <TableCell className="text-right">{source.value}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {((source.value / stats.totalInbound) * 100).toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.sourceData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No source data found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Inbound Leads</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/inbound-leads">View All <ExternalLink className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                        <CardDescription>Latest {Math.min(filteredLeads.length, 10)} leads received.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Rep</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date Entered</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.slice(0, 10).map((lead) => (
                                        <TableRow key={lead.id}>
                                            <TableCell className="font-medium">{lead.companyName}</TableCell>
                                            <TableCell>{lead.salesRepAssigned || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="whitespace-nowrap">
                                                    {lead.netsuiteLeadStatus || 'New'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{lead.dateLeadEntered || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/leads/${lead.id}`} target="_blank">View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredLeads.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No leads found in period.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
          </div>
      )}
    </div>
  );
}
