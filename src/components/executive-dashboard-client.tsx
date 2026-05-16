"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Phone, Star, TrendingUp, Calendar as CalendarIcon, Inbox, Target, Quote, ArrowUpRight, CheckCircle2, Clock, Calendar as CalendarIconLucide, ClipboardCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import Link from 'next/link';
import { startOfMonth, endOfMonth, format, startOfDay, endOfDay, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const getStatusColor = (status: string, defaultColor: string) => {
  const s = status.toLowerCase();
  
  const positive = ['won', 'customer', 'converted', 'appointment', 'appointment set', 'quote', 'proposal', 'sale', 'hot', 'hot lead'];
  const negative = ['lost', 'rejected', 'do not contact', 'not interested', 'no pitch', 'cold', 'bad contact', 'not qualified', 'no contact', 'junk'];

  if (positive.some(p => s.includes(p))) return '#22c55e'; // tailwind green-500
  if (negative.some(n => s.includes(n))) return '#ef4444'; // tailwind red-500
  
  return defaultColor;
};

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

export default function ExecutiveDashboardClient() {
  const { userProfile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
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

      try {
        let fieldQ;
        let inboundQ;
        let allLeadsQ;

        if (userProfile.role === 'Franchisee' && userProfile.franchisee) {
          allLeadsQ = query(collection(firestore, 'leads'), where('franchisee', '==', userProfile.franchisee));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'), where('franchisee', '==', userProfile.franchisee));
          fieldQ = query(collection(firestore, 'visitnotes')); 
        } else if (userProfile.role === 'Field Rep') {
          allLeadsQ = query(collection(firestore, 'leads'));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'));
          fieldQ = query(collection(firestore, 'visitnotes'));
        } else {
          allLeadsQ = query(collection(firestore, 'leads'));
          inboundQ = query(collection(firestore, 'leads'), where('bucket', '==', 'inbound'));
          fieldQ = query(collection(firestore, 'visitnotes'));
        }

        const [allLeadsSnap, fieldSnap, inboundSnap] = await Promise.all([
          getDocs(allLeadsQ),
          getDocs(fieldQ),
          getDocs(inboundQ)
        ]);

        const allLeadsData = allLeadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
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
      .map(([name, value]) => ({ name, value }))
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
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { total, pending, converted, convRate, subStatusChart };
  }, [fieldData]);

  // Dashback Metrics
  const dashbackStats = useMemo(() => {
    const dashbackData = fieldData.filter(v => !!v.discoveryData?.lostPropertyProcess);
    const total = dashbackData.length;

    const outcomesDist = dashbackData.reduce((acc, v) => {
      const outcomeVal = v.outcome?.type || v.outcome || 'Other';
      const st = typeof outcomeVal === 'string' ? outcomeVal : 'Other';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const outcomesChart = Object.entries(outcomesDist)
      .filter(([name]) => name !== 'Unknown' && name !== 'None' && name !== '') 
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, outcomesChart };
  }, [fieldData]);

  // Inbound Metrics
  const inboundStats = useMemo(() => {
    const total = inboundData.length;
    const hot = inboundData.filter(l => l.customerStatus === 'Hot Lead').length;
    const quoteSent = inboundData.filter(l => l.customerStatus === 'Quote Sent' && l.netsuiteLeadStatus === 'PROSPECT-Quote Sent').length;
    const won = inboundData.filter(l => l.status === 'Won' || l.netsuiteLeadStatus?.includes('Won') || l.netsuiteLeadStatus?.includes('Customer')).length;

    const franchiseDist = inboundData.reduce((acc, l) => {
      const f = l.franchisee || 'Unassigned';
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const franchiseChart = Object.entries(franchiseDist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    return { total, hot, quoteSent, won, franchiseChart };
  }, [inboundData]);

  if (loading || authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader /></div>;
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
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
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

      {/* Section 1: Outbound Performance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-semibold">Outbound Performance</h2>
          </div>
          <Link href="/reports">
            <Button variant="outline" size="sm">
              View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Leads" value={outboundStats.total} icon={Inbox} />
          <StatCard title="Won Customers" value={outboundStats.won} icon={Star} />
          <StatCard title="Appointments" value={outboundStats.appointments} icon={CalendarIcon} />
          <StatCard title="Total Engagement" value={outboundStats.engagement} icon={Phone} description="Calls logged" />
          <StatCard title="Conversion Rate" value={`${outboundStats.convRate}%`} icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Overview</CardTitle>
              <CardDescription>Current state of all outbound leads.</CardDescription>
            </CardHeader>
            <CardContent>
              {outboundStats.statusChart.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={outboundStats.statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                      {outboundStats.statusChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, COLORS[index % COLORS.length])} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground italic">No data available.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2: Field Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-500" />
            <h2 className="text-2xl font-semibold">Field Activity</h2>
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

      {/* Dashback Visit Reporting */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-purple-500" />
            <h2 className="text-2xl font-semibold">Dashback Visit Reporting</h2>
          </div>
          <Link href="/field-activity-report">
            <Button variant="outline" size="sm">
              View Field Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Hotels Visited" value={dashbackStats.total} icon={ClipboardCheck} description="Dashback visit notes" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashback Outcomes</CardTitle>
              <CardDescription>Outcome distribution for Dashback visits.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashbackStats.outcomesChart.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashbackStats.outcomesChart} layout="vertical" margin={{ left: 50, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} name="Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground italic">No Dashback outcomes captured.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: Inbound Leads */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-semibold">Inbound Leads</h2>
          </div>
          <Link href="/inbound-reporting">
            <Button variant="outline" size="sm">
              View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Inbound" value={inboundStats.total} icon={Inbox} />
          <StatCard title="Hot Leads" value={inboundStats.hot} icon={Target} description="Requires ASAP action" />
          <StatCard title="Quotes Sent" value={inboundStats.quoteSent} icon={Quote} />
          <StatCard title="Won Customers" value={inboundStats.won} icon={Star} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Franchisees</CardTitle>
              <CardDescription>Inbound leads distributed by franchisee.</CardDescription>
            </CardHeader>
            <CardContent>
              {inboundStats.franchiseChart.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inboundStats.franchiseChart} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={60} />
                      <YAxis fontSize={12} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Leads" />
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
