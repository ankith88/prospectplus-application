"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Phone, Star, TrendingUp, Calendar as CalendarIcon, Inbox, Target, Quote, ArrowUpRight, CheckCircle2, Clock, Calendar as CalendarIconLucide, ClipboardCheck, Scan } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import Link from 'next/link';
import { ScansReportingClient } from '@/components/scans/scans-reporting-client';
import ReportsClientPage from '@/components/reports-client';
import InboundReportsClientPage from '@/components/inbound-reports-client';
import { startOfMonth, endOfMonth, format, startOfDay, endOfDay, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { getStatusColor } from '@/lib/status-colors';
import { Skeleton } from '@/components/ui/skeleton';
import { PercentageLoader } from '@/components/ui/percentage-loader';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string }) => (
  <Card className="shadow-sm">
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
    let cleaned = String(dateStr).trim();
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

export default function ExecutiveDashboardClient() {
  const { userProfile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [fetchProgress, setFetchProgress] = useState(10);
  const [allOutboundData, setAllOutboundData] = useState<any[]>([]);
  const [allFieldData, setAllFieldData] = useState<any[]>([]);
  const [allInboundData, setAllInboundData] = useState<any[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    async function fetchData() {
      if (!userProfile) return;
      setLoading(true);
      setFetchProgress(15);

      try {
        let fieldQ;
        let inboundQ;
        let allLeadsQ;

        if (userProfile.activeRole === 'Franchisee' && userProfile.franchisee) {
          allLeadsQ = query(collection(firestore, 'leads'), where('franchisee', '==', userProfile.franchisee));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'), where('franchisee', '==', userProfile.franchisee));
          fieldQ = query(collection(firestore, 'visitnotes')); 
        } else if (userProfile.activeRole === 'Field Sales') {
          allLeadsQ = query(collection(firestore, 'leads'));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'));
          fieldQ = query(collection(firestore, 'visitnotes'));
        } else {
          allLeadsQ = query(collection(firestore, 'leads'));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'));
          fieldQ = query(collection(firestore, 'visitnotes'));
        }

        setFetchProgress(30);

        const allLeadsP = getDocs(allLeadsQ).then(res => { setFetchProgress(prev => Math.max(prev, 65)); return res; });
        const fieldP = getDocs(fieldQ).then(res => { setFetchProgress(prev => Math.max(prev, 80)); return res; });
        const inboundP = getDocs(inboundQ).then(res => { setFetchProgress(prev => Math.max(prev, 90)); return res; });

        const [allLeadsSnap, fieldSnap, inboundSnap] = await Promise.all([
          allLeadsP,
          fieldP,
          inboundP
        ]);

        setFetchProgress(95);

        const allLeadsData = allLeadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        const outboundLeads = allLeadsData.filter((l: any) => l.fieldSales !== true && l.bucket !== 'inbound');

        // Attach the lead's customerStatus to the field data
        const fieldNotesData = fieldSnap.docs.map(doc => {
            const data = doc.data();
            const associatedLead = allLeadsData.find((l: any) => l.id === data.leadId);
            return {
                id: doc.id,
                ...data,
                leadCustomerStatus: associatedLead?.customerStatus || 'Unknown'
            };
        });

        setAllOutboundData(outboundLeads);
        setAllFieldData(fieldNotesData);
        setAllInboundData(inboundSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setFetchProgress(100);

      } catch (error) {
        console.error("Error fetching executive dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchData();
    }
  }, [userProfile, authLoading]);

  // Apply Date Filtering
  const { outboundData, fieldData, inboundData } = useMemo(() => {
    if (!dateRange?.from) {
      return { outboundData: allOutboundData, fieldData: allFieldData, inboundData: allInboundData };
    }
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    const isWithin = (date: Date | null) => {
      if (!date) return false;
      return date >= from && date <= to;
    };

    return {
      outboundData: allOutboundData.filter(l => isWithin(parseDateString(l.dateLeadEntered))),
      fieldData: allFieldData.filter(v => isWithin(v.createdAt ? parseISO(v.createdAt) : null)),
      inboundData: allInboundData.filter(l => isWithin(parseDateString(l.dateLeadEntered)))
    };
  }, [allOutboundData, allFieldData, allInboundData, dateRange]);


  // Outbound Metrics
  const outboundStats = useMemo(() => {
    const total = outboundData.length;
    const won = outboundData.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Customer').length;
    const appointments = outboundData.reduce((acc, l) => acc + (l.appointments?.length || 0), 0);
    const engagement = outboundData.reduce((acc, l) => acc + (l.activities?.filter((a: any) => a.type === 'Call').length || 0), 0);
    const convRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

    const statusDist = outboundData.reduce((acc, l) => {
      const st = l.customerStatus || 'Unknown';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChart = Object.entries(statusDist)
      .filter(([name]) => name !== 'Unknown' && name !== '') // Exclude Unknown
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);

    return { total, won, appointments, engagement, convRate, statusChart };
  }, [outboundData]);

  // Field Metrics
  const fieldStats = useMemo(() => {
    const total = fieldData.length;
    // Keep pending and converted from visitnotes native status if needed, 
    // or rely on leadCustomerStatus. Based on original field-activity-report:
    const pending = fieldData.filter(v => v.status === 'pending' || v.status === 'New' || v.status === 'In Progress').length;
    const converted = fieldData.filter(v => v.status === 'converted' || v.status === 'Converted').length;
    const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

    const statusDist = fieldData.reduce((acc, v) => {
      const outcomeVal = v.outcome?.type || v.outcome || 'None';
      const st = typeof outcomeVal === 'string' ? outcomeVal : 'None';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const subStatusChart = Object.entries(statusDist)
      .filter(([name]) => name !== 'Unknown' && name !== 'None' && name !== '') 
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { total, pending, converted, convRate, subStatusChart };
  }, [fieldData]);

  // Inbound Metrics
  const inboundStats = useMemo(() => {
    const total = inboundData.length;
    const hot = inboundData.filter(l => l.customerStatus === 'Hot Lead').length;
    const quoteSent = inboundData.filter(l => l.customerStatus === 'Quote Sent').length;
    const won = inboundData.filter(l => l.customerStatus === 'Won' || l.customerStatus === 'Signed').length;

    const franchiseDist = inboundData.reduce((acc, l) => {
      const f = l.franchisee || 'Unassigned';
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const franchiseChart = Object.entries(franchiseDist).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 10);

    return { total, hot, quoteSent, won, franchiseChart };
  }, [inboundData]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-full max-w-lg bg-card p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3.5 bg-primary/10 rounded-full text-primary">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Executive Dashboard</h2>
            <p className="text-sm text-muted-foreground">Gathering Outbound, Field Activity & Inbound leads analytics...</p>
          </div>

          <PercentageLoader 
            value={fetchProgress}
            label="Loading Executive Analytics"
            sublabel="Connecting to Cloud Firestore & aggregating real-time metrics"
            minHeight="min-h-0"
            className="border-none shadow-none bg-transparent p-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Executive Dashboard</h1>
          <p className="text-muted-foreground">High-level overview of Outbound, Field, and Inbound performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
                <Button id="step-primary-action" variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                        ) : format(dateRange.from, "LLL dd, y")
                    ) : (
                        <span>All Time</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex" align="end">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
            </PopoverContent>
          </Popover>
          {dateRange?.from && (
            <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>
          )}
        </div>
      </header>

      {/* Scans Reporting */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scan className="h-6 w-6 text-indigo-500" />
              <h2 className="text-2xl font-semibold">Scan Reporting</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtered by <span className="font-semibold text-foreground">Scan Date</span> for the selected date range.
            </p>
          </div>
          <Link href="/scans">
            <Button variant="outline" size="sm">
              View Scan Reporting <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <ScansReportingClient hideFilters={true} hideExtraCharts={true} externalDateRange={dateRange} />
      </section>

      {/* Section 1: Outbound Performance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Phone className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Outbound Performance</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtered by <span className="font-semibold text-foreground">Dialer Assignment Date</span> for the selected date range.
            </p>
          </div>
          <Link href="/reports">
            <Button variant="outline" size="sm">
              View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <ReportsClientPage 
          externalDateRange={dateRange}
          hideHeaderAndFilters={true}
          visibleSections={['daily-dialer', 'team-performance']}
        />
      </section>

      {/* Section 2: Inbound Leads */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="h-6 w-6 text-amber-500" />
              <h2 className="text-2xl font-semibold">Inbound Leads</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtered by <span className="font-semibold text-foreground">Date Entered</span> (Lead Creation Date) for the selected date range.
            </p>
          </div>
          <Link href="/inbound-reporting">
            <Button variant="outline" size="sm">
              View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <InboundReportsClientPage 
          externalDateRange={dateRange}
          hideHeaderAndFilters={true}
          visibleSections={['leads-volume', 'am-activity', 'team-performance']}
        />
      </section>

      {/* Section 3: Field Activity (Right at the bottom) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              <h2 className="text-2xl font-semibold">Field Activity</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtered by <span className="font-semibold text-foreground">Field Visit Date</span> for the selected date range.
            </p>
          </div>
          <Link href="/field-activity-report">
            <Button variant="outline" size="sm">
              View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Visits" value={fieldStats.total} icon={CalendarIcon} />
          <StatCard title="Pending Processing" value={fieldStats.pending} icon={Clock} />
          <StatCard title="Converted Leads" value={fieldStats.converted} icon={CheckCircle2} />
          <StatCard title="Visit Conversion" value={`${fieldStats.convRate}%`} icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Visit Outcomes</CardTitle>
              <CardDescription>Most common outcomes for field visits.</CardDescription>
            </CardHeader>
            <CardContent>
              {fieldStats.subStatusChart.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fieldStats.subStatusChart} layout="vertical" margin={{ left: 50, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Visits">
                        {fieldStats.subStatusChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, COLORS[index % COLORS.length])} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground italic">No data available.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
