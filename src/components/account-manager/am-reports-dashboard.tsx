"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile, Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, FileText, Calendar, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface FlatActivity {
    id: string;
    leadId: string;
    leadName: string;
    type: string;
    date: string;
    notes: string;
    author: string;
}

export default function AMReportsDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'allTime'>('thisMonth');
    
    const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isAm = userProfile?.activeRole === 'Account Managers';
    
    const getAmName = (am: UserProfile) => {
        return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
    };
    
    const loggedInAmName = userProfile ? getAmName(userProfile as UserProfile) : '';

    // Fetch Account Managers for dropdown (only if admin)
    useEffect(() => {
        async function fetchAMs() {
            if (!isAdmin) return;
            try {
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'));
                const snap = await getDocs(q);
                const ams = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                setAccountManagers(ams);
            } catch (error) {
                console.error("Failed to fetch account managers", error);
            }
        }
        if (isAdmin) fetchAMs();
    }, [isAdmin]);
    
    useEffect(() => {
        if (loading) return;
        if (!isAdmin && !isAm) {
             setIsLoadingData(false);
             return;
        }
        
        async function fetchPipeline() {
            setIsLoadingData(true);
            try {
                const leadsRef = collection(firestore, 'leads');
                let q;
                
                if (isAm) {
                    q = query(leadsRef, where('accountManagerAssigned', '==', loggedInAmName));
                } else if (isAdmin) {
                    if (selectedAm !== 'all') {
                        q = query(leadsRef, where('accountManagerAssigned', '==', selectedAm));
                    } else {
                        q = query(leadsRef);
                    }
                } else {
                     setIsLoadingData(false);
                     return;
                }
                
                if (q) {
                    const snap = await getDocs(q);
                    const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                    
                    // Client-side filtering in case query doesn't match perfectly
                    const filteredLeads = fetchedLeads.filter(l => {
                        // Filter by AM assignment if necessary
                        const amMatch = isAm ? l.accountManagerAssigned === loggedInAmName : 
                                      (selectedAm !== 'all' ? l.accountManagerAssigned === selectedAm : true);
                        
                        // For admins viewing all, we might want to only show leads assigned to an AM
                        const hasAm = isAdmin && selectedAm === 'all' ? !!l.accountManagerAssigned : true;
                        
                        return amMatch && hasAm;
                    });
                    
                    setLeads(filteredLeads);
                }
            } catch (error) {
                console.error("Error fetching pipeline leads", error);
            } finally {
                setIsLoadingData(false);
            }
        }
        
        fetchPipeline();
    }, [loading, isAm, isAdmin, loggedInAmName, selectedAm]);

    // Value Calculation Logic
    const calculateMonthlyValue = (lead: Lead) => {
        const applicableStatuses = ['Quote Sent', 'Won', 'LocalMile Opportunity', 'LocalMile Pending', 'Trialing LocalMile'];
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
                 // Baseline 1x / month for Adhoc
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

    // Filter activities by date range
    const isDateInRange = (dateStr: string) => {
        if (dateRange === 'allTime') return true;
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false; // Skip invalid dates
        
        const now = new Date();
        if (dateRange === 'thisMonth') {
            return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
        } else if (dateRange === 'lastMonth') {
            const lastMonth = subMonths(now, 1);
            return isWithinInterval(date, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
        }
        return true;
    };

    // Process Activities
    const allActivities = useMemo(() => {
        const activities: FlatActivity[] = [];
        leads.forEach(lead => {
            if (lead.activity) {
                lead.activity.forEach(act => {
                    // Only include activities by the filtered AMs, or all if none selected
                    // Since activities don't strictly bind to an AM assigned field, we check the author or just assume 
                    // activities on their assigned leads are theirs for now.
                    if (isDateInRange(act.date)) {
                        activities.push({
                            id: act.id,
                            leadId: lead.id,
                            leadName: lead.companyName,
                            type: act.type,
                            date: act.date,
                            notes: act.notes,
                            author: act.author || 'System'
                        });
                    }
                });
            }
        });
        return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [leads, dateRange]);

    // Metrics Calculations
    const metrics = useMemo(() => {
        let totalCalls = 0;
        let totalEmails = 0;
        let totalMeetings = 0;
        let totalUpdates = 0;
        
        allActivities.forEach(act => {
            if (act.type === 'Call') totalCalls++;
            else if (act.type === 'Email') totalEmails++;
            else if (act.type === 'Meeting') totalMeetings++;
            else totalUpdates++;
        });

        let totalPipelineValue = 0;
        const valueByStatus: Record<string, number> = {};
        const valueByLead: { id: string; name: string; value: number; status: string; activityCount: number; lastContacted: string | null }[] = [];

        leads.forEach(lead => {
            const val = calculateMonthlyValue(lead);
            if (val > 0) {
                totalPipelineValue += val;
                const status = lead.customerStatus || lead.status;
                valueByStatus[status] = (valueByStatus[status] || 0) + val;
            }
            
            // For Activity vs Value Matrix
            const leadActivities = allActivities.filter(a => a.leadId === lead.id);
            if (val > 0 || leadActivities.length > 0) {
                 const lastContactedAct = leadActivities.length > 0 ? leadActivities[0].date : null;
                 valueByLead.push({
                     id: lead.id,
                     name: lead.companyName,
                     value: val,
                     status: lead.customerStatus || lead.status,
                     activityCount: leadActivities.length,
                     lastContacted: lastContactedAct
                 });
            }
        });
        
        // Sort leads by value desc for matrix
        valueByLead.sort((a, b) => b.value - a.value);

        return {
            totalCalls,
            totalEmails,
            totalMeetings,
            totalUpdates,
            totalActivities: allActivities.length,
            totalPipelineValue,
            valueByStatus,
            valueByLead
        };
    }, [allActivities, leads]);

    // Chart Data
    const statusChartData = useMemo(() => {
        return Object.entries(metrics.valueByStatus).map(([status, value]) => ({
            status,
            value,
            fill: status === 'Won' ? 'hsl(var(--chart-2))' : 
                  status === 'Quote Sent' ? 'hsl(var(--chart-1))' : 
                  status.includes('LocalMile') ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'
        })).sort((a,b) => b.value - a.value);
    }, [metrics.valueByStatus]);

    if (loading || isLoadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
    }

    if (!isAdmin && !isAm) {
        return <div className="p-6">You do not have permission to view this page.</div>;
    }
    
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#095c7b] tracking-tight">Account Manager Reports</h1>
                    <p className="text-[#095c7b]/80 mt-1">Activity and Pipeline Value Metrics</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && (
                        <Select value={selectedAm} onValueChange={setSelectedAm}>
                            <SelectTrigger className="w-[220px] bg-white border-[#095c7b]/20">
                                <SelectValue placeholder="All Account Managers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Account Managers</SelectItem>
                                {accountManagers.map(am => {
                                    const name = getAmName(am);
                                    return <SelectItem key={am.uid || am.email || name} value={name}>{name}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    )}
                    
                    <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
                        <SelectTrigger className="w-[180px] bg-white border-[#095c7b]/20">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="lastMonth">Last Month</SelectItem>
                            <SelectItem value="allTime">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-[#095c7b]/10 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Activities</p>
                                <h3 className="text-3xl font-bold text-[#095c7b] mt-1">{metrics.totalActivities}</h3>
                            </div>
                            <div className="p-2 bg-[#095c7b]/10 rounded-lg">
                                <ActivityIcon className="h-5 w-5 text-[#095c7b]" />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {metrics.totalCalls} Calls</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {metrics.totalEmails} Emails</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {metrics.totalMeetings} Meets</span>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-[#095c7b]/10 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Pipeline MRR</p>
                                <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                                    ${metrics.totalPipelineValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </h3>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 font-medium">Potential Monthly Recurring Revenue</p>
                    </CardContent>
                </Card>
                
                <Card className="border-[#095c7b]/10 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Leads with MRR</p>
                                <h3 className="text-3xl font-bold text-blue-600 mt-1">
                                    {metrics.valueByLead.filter(l => l.value > 0).length}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 font-medium">Leads quoting or won</p>
                    </CardContent>
                </Card>
                
                <Card className="border-[#095c7b]/10 shadow-sm">
                    <CardContent className="p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Leads Assigned</p>
                                <h3 className="text-3xl font-bold text-indigo-600 mt-1">{leads.length}</h3>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 font-medium">Across all statuses</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="bg-white/80 border border-white/60 mb-4 inline-flex self-start">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Overview Matrix</TabsTrigger>
                    <TabsTrigger value="activities" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Activity Log</TabsTrigger>
                    <TabsTrigger value="revenue" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Revenue Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b]">Activity vs. Value Matrix</CardTitle>
                            <CardDescription>Correlate AM activity effort against potential Monthly Recurring Revenue.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <div className="max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[300px]">Company Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Monthly Value (MRR)</TableHead>
                                            <TableHead className="text-right">Activities ({dateRange === 'allTime' ? 'All Time' : 'Period'})</TableHead>
                                            <TableHead className="text-right">Last Contacted</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {metrics.valueByLead.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leads found.</TableCell>
                                            </TableRow>
                                        ) : metrics.valueByLead.map((lead) => (
                                            <TableRow key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Building className="h-4 w-4 text-[#095c7b]/60" />
                                                        {lead.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] font-normal">{lead.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">
                                                    {lead.value > 0 ? `$${lead.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className={lead.activityCount > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                                                        {lead.activityCount}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-slate-500">
                                                    {lead.lastContacted ? format(new Date(lead.lastContacted), 'MMM d, yyyy') : 'Never'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="activities" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b]">Detailed Activity Log</CardTitle>
                            <CardDescription>Chronological list of all sales activities.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <div className="max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[150px]">Date</TableHead>
                                            <TableHead className="w-[100px]">Type</TableHead>
                                            <TableHead className="w-[200px]">Company</TableHead>
                                            <TableHead>Notes</TableHead>
                                            <TableHead className="w-[150px]">Author</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allActivities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activities found in this period.</TableCell>
                                            </TableRow>
                                        ) : allActivities.map((act) => (
                                            <TableRow key={act.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {format(new Date(act.date), 'MMM d, yyyy h:mm a')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] ${
                                                        act.type === 'Call' ? 'bg-indigo-50 text-indigo-700' :
                                                        act.type === 'Email' ? 'bg-blue-50 text-blue-700' :
                                                        act.type === 'Meeting' ? 'bg-emerald-50 text-emerald-700' :
                                                        'bg-slate-50 text-slate-700'
                                                    }`}>
                                                        {act.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    <a href={`/leads/${act.leadId}`} target="_blank" rel="noreferrer" className="hover:underline text-[#095c7b]">
                                                        {act.leadName}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600">
                                                    {/* Replace html tags if any from notes */}
                                                    <div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: act.notes }} />
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{act.author}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="revenue" className="flex-1 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        <Card className="border-[#095c7b]/10 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg text-[#095c7b]">Pipeline Value by Status</CardTitle>
                                <CardDescription>Distribution of potential MRR across lead statuses.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {statusChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                                <p className="font-medium text-slate-700">{payload[0].payload.status}</p>
                                                                <p className="text-emerald-600 font-bold mt-1">
                                                                    ${(payload[0].value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {statusChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        No value data available.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        <Card className="border-[#095c7b]/10 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg text-[#095c7b]">High Value Opportunities</CardTitle>
                                <CardDescription>Top leads by Monthly Recurring Revenue.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[400px] overflow-y-auto px-6 pb-6">
                                    <div className="space-y-4 mt-2">
                                        {metrics.valueByLead.filter(l => l.value > 0).slice(0, 10).map((lead, idx) => (
                                            <div key={lead.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-[#095c7b]/10 flex items-center justify-center text-[#095c7b] font-bold text-xs">
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-[#095c7b]">{lead.name}</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">{lead.status}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-600">
                                                        ${lead.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{lead.activityCount} Activities</p>
                                                </div>
                                            </div>
                                        ))}
                                        {metrics.valueByLead.filter(l => l.value > 0).length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">No leads with calculated value.</div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
