"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
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
  Quote
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

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#818cf8', '#2dd4bf', '#fb7185', '#fb923c'];

const getStatusColor = (statusName: string, fallbackColor: string) => {
    if (!statusName) return fallbackColor;
    const normalized = statusName.toLowerCase();
    
    // Negative statuses (Red)
    if (normalized.includes('lost') || normalized.includes('dead') || normalized.includes('unqualified') || normalized.includes('rejected') || normalized.includes('not interested') || normalized.includes('disqualified')) {
        return '#f87171'; // red-400 (medium soft red)
    }
    
    // Positive statuses (Green)
    if (normalized.includes('won') || normalized.includes('sign up') || normalized.includes('customer') || normalized.includes('signed')) {
        return '#34d399'; // emerald-400 (medium soft green)
    }
    
    // Quote sent (Cyan)
    if (normalized.includes('quote sent')) {
        return '#22d3ee'; // cyan-400 (medium soft cyan)
    }
    
    // Hot leads (Orange)
    if (normalized.includes('hot lead')) {
        return '#fb923c'; // orange-400 (medium soft orange)
    }
    
    return fallbackColor;
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
    franchisee: [] as string[],
  });

  const [activeNetsuiteIndex, setActiveNetsuiteIndex] = useState<number | null>(null);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState<number | null>(null);
  const [drillDownData, setDrillDownData] = useState<{ title: string; leads: Lead[] } | null>(null);
  const [showFranchiseeTable, setShowFranchiseeTable] = useState(false);



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
      franchisee: [],
    });
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
        const statusMatch = filters.netsuiteStatus.length === 0 || (lead.netsuiteLeadStatus && filters.netsuiteStatus.includes(lead.netsuiteLeadStatus));
        const repMatch = filters.salesRepAssigned.length === 0 || (lead.salesRepAssigned && filters.salesRepAssigned.includes(lead.salesRepAssigned));
        const sourceMatch = filters.source.length === 0 || (lead.customerSource && filters.source.includes(lead.customerSource));
        const franchiseeMatch = filters.franchisee.length === 0 || (lead.franchisee && filters.franchisee.includes(lead.franchisee));

        let dateMatch = true;
        if (filters.dateEntered?.from) {
            const enteredDate = parseDateString(lead.dateLeadEntered);
            if (!enteredDate) return false;
            const fromDate = startOfDay(filters.dateEntered.from);
            const toDate = filters.dateEntered.to ? endOfDay(filters.dateEntered.to) : endOfDay(filters.dateEntered.from);
            dateMatch = enteredDate >= fromDate && enteredDate <= toDate;
        }

        return statusMatch && repMatch && sourceMatch && franchiseeMatch && dateMatch;
    });
  }, [allLeads, filters]);

  const stats = useMemo(() => {
    const totalInbound = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === 'Won' || l.netsuiteLeadStatus?.includes('Won') || l.netsuiteLeadStatus?.includes('Customer'));
    const hotLeadsCount = filteredLeads.filter(l => l.customerStatus === 'Hot Lead').length;
    
    const wonCount = wonLeads.length;
    const quoteSentCount = filteredLeads.filter(l => l.customerStatus === 'Quote Sent' && l.netsuiteLeadStatus === 'PROSPECT-Quote Sent').length;
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

    return {
        totalInbound,
        wonCount,
        hotLeadsCount,
        quoteSentCount,
        conversionRate,
        hotLeadsRate,
        netsuiteStatusData,
        customerStatusData,
        franchiseeData,
        topFranchiseeData,
        repPerformanceData,
        sourceData,
        leadsOverTimeData,
        franchiseeStatuses
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

  const franchiseeOptions: Option[] = useMemo(() => {
    const franchisees = new Set(allLeads.map(l => l.franchisee).filter(Boolean));
    return Array.from(franchisees).map(f => ({ value: f as string, label: f as string }));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
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
                <div className="space-y-2">
                    <Label>Franchisee</Label>
                    <MultiSelectCombobox 
                        options={franchiseeOptions} 
                        selected={filters.franchisee} 
                        onSelectedChange={(val) => handleFilterChange('franchisee', val)} 
                        placeholder="Select franchisees..." 
                    />
                </div>
                <Button variant="ghost" onClick={clearFilters} className="col-start-1"><X className="mr-2 h-4 w-4"/> Clear Filters</Button>
            </div>
        </CardContent>
      </Card>

      {!error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                <StatCard 
                    title="Total Inbound" 
                    value={stats.totalInbound} 
                    icon={Inbox} 
                    description="Total in period" 
                    onClick={() => setDrillDownData({ title: "Total Inbound Leads", leads: filteredLeads })}
                />
                <StatCard 
                    title="Hot Leads" 
                    value={stats.hotLeadsCount} 
                    icon={Target} 
                    description="Requires ASAP action" 
                    onClick={() => setDrillDownData({ 
                        title: "Hot Leads", 
                        leads: filteredLeads.filter(l => l.customerStatus === 'Hot Lead') 
                    })}
                />
                <StatCard 
                    title="Quote Sent" 
                    value={stats.quoteSentCount} 
                    icon={Quote} 
                    description="Waiting for acceptance" 
                    onClick={() => setDrillDownData({ 
                        title: "Quote Sent Leads", 
                        leads: filteredLeads.filter(l => l.customerStatus === 'Quote Sent' && l.netsuiteLeadStatus === 'PROSPECT-Quote Sent') 
                    })}
                />
                <StatCard 
                    title="Won Customers" 
                    value={stats.wonCount} 
                    icon={Star} 
                    description="Successfully signed" 
                    onClick={() => setDrillDownData({ 
                        title: "Won Customers", 
                        leads: filteredLeads.filter(l => l.status === 'Won' || l.netsuiteLeadStatus?.includes('Won') || l.netsuiteLeadStatus?.includes('Customer')) 
                    })}
                />
                <StatCard title="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} icon={TrendingUp} description="Won / Total" />
                <StatCard title="Hot Leads Rate" value={`${stats.hotLeadsRate.toFixed(1)}%`} icon={Percent} description="Hot Leads / Total" />
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
                                        onMouseEnter={(_, index) => setActiveNetsuiteIndex(index)}
                                        onMouseLeave={() => setActiveNetsuiteIndex(null)}
                                        label={({ percent, value }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {stats.netsuiteStatusData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={getStatusColor(entry.name, COLORS[index % COLORS.length])} 
                                                style={{ 
                                                    opacity: activeNetsuiteIndex === null || activeNetsuiteIndex === index ? 1 : 0.3,
                                                    transition: 'opacity 0.2s ease'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend 
                                        onClick={(e: any) => {
                                            const index = stats.netsuiteStatusData.findIndex(d => d.name === e.value);
                                            setActiveNetsuiteIndex(index === activeNetsuiteIndex ? null : index);
                                        }}
                                        formatter={(value, entry: any) => (
                                            <span style={{ color: activeNetsuiteIndex !== null && stats.netsuiteStatusData.findIndex(d => d.name === value) !== activeNetsuiteIndex ? '#94a3b8' : 'inherit' }}>
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
                                <CardTitle>Customer Status Distribution</CardTitle>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-1 gap-6">
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Leads Volume Over Time</CardTitle>
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
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Leads by Franchisee (Top 10)</CardTitle>
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
            <div className="mt-4">
                <ScrollArea className="max-h-[50vh] border rounded-md">
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
                </ScrollArea>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
                <div className="flex items-center justify-between mr-8">
                    <div>
                        <DialogTitle>{drillDownData?.title}</DialogTitle>
                        <DialogDescription>Showing {drillDownData?.leads.length} leads matching this metric.</DialogDescription>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => drillDownData && handleExportData(drillDownData.leads, drillDownData.title.toLowerCase().replace(/\s+/g, '_'))}
                    >
                        <Download className="h-4 w-4 mr-2" /> Export List
                    </Button>
                </div>
            </DialogHeader>
            <div className="mt-4">
                <ScrollArea className="max-h-[50vh] border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>NetSuite Status</TableHead>
                                <TableHead>Rep</TableHead>
                                <TableHead>Franchisee</TableHead>
                                <TableHead>Date Entered</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drillDownData?.leads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                                    <TableCell>
                                        <LeadStatusBadge status={lead.status} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{lead.netsuiteLeadStatus || '-'}</TableCell>
                                    <TableCell className="text-sm">{lead.salesRepAssigned || '-'}</TableCell>
                                    <TableCell className="text-sm">{lead.franchisee || '-'}</TableCell>
                                    <TableCell className="text-sm">{lead.dateLeadEntered || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/leads/${lead.id}`} target="_blank">
                                                View <ExternalLink className="ml-2 h-3 w-3" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {drillDownData?.leads.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                                        No leads found for this metric.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

