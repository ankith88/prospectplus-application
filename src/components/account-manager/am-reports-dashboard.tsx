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
import { Phone, Mail, FileText, Calendar, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';
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

interface SummaryGroup {
    key: string;
    totalLeads: number;
    totalValue: number;
    totalActivities: number;
    leads: { id: string; name: string; value: number; status: string; leadType: string; activityCount: number; lastContacted: string | null }[];
}

export default function AMReportsDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'allTime'>('thisMonth');
    
    // New Filters
    const [selectedFranchisee, setSelectedFranchisee] = useState<string>('all');
    const [selectedBucket, setSelectedBucket] = useState<string>('all');
    const [selectedLeadType, setSelectedLeadType] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    
    // UI State for Summary Tabs and Expandable Rows
    const [summaryTab, setSummaryTab] = useState<'am' | 'status' | 'franchisee'>('am');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    
    const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isAm = userProfile?.activeRole === 'Account Managers';
    
    const getAmName = (am: UserProfile) => {
        return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
    };
    
    const loggedInAmName = userProfile ? getAmName(userProfile as UserProfile) : '';

    // Fetch Account Managers for dropdown (for admin and AM)
    useEffect(() => {
        async function fetchAMs() {
            if (!isAdmin && !isAm) return;
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
        if (isAdmin || isAm) fetchAMs();
    }, [isAdmin, isAm]);
    
    useEffect(() => {
        if (loading || accountManagers.length === 0) return;
        if (!isAdmin && !isAm) {
             setIsLoadingData(false);
             return;
        }
        
        async function fetchPipeline() {
            setIsLoadingData(true);
            try {
                const leadsRef = collection(firestore, 'leads');
                const q = query(leadsRef, where('bucket', 'in', ['account_manager', 'inbound', 'customer_success', 'marketing', 'nurture']));
                
                const snap = await getDocs(q);
                const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                
                const amNames = accountManagers.map(am => getAmName(am));
                
                const filteredLeads = fetchedLeads.filter(l => {
                    const isDirectlyAm = l.bucket === 'account_manager' || l.bucket === 'inbound';
                    const wasInAm = l.bucketHistory?.some(bh => bh.oldBucket === 'account_manager' || bh.oldBucket === 'inbound');
                    const hasAnyAmActivity = l.activity?.some(act => amNames.includes(act.author || ''));
                    
                    const qualifiesForAmReport = isDirectlyAm || wasInAm || hasAnyAmActivity;
                    
                    if (!qualifiesForAmReport) return false;
                    
                    const targetAm = selectedAm !== 'all' ? selectedAm : null;
                    if (targetAm) {
                        const hasTargetAmActivity = l.activity?.some(act => act.author === targetAm);
                        return hasTargetAmActivity;
                    }
                    
                    return true;
                });
                
                setLeads(filteredLeads);
            } catch (error) {
                console.error("Error fetching pipeline leads", error);
            } finally {
                setIsLoadingData(false);
            }
        }
        
        fetchPipeline();
    }, [loading, isAm, isAdmin, selectedAm, accountManagers]);

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

    const uniqueFranchisees = useMemo(() => Array.from(new Set(leads.map(l => l.franchisee).filter(Boolean))), [leads]);
    const uniqueBuckets = useMemo(() => Array.from(new Set(leads.map(l => l.bucket).filter(Boolean))), [leads]);
    const uniqueLeadTypes = useMemo(() => Array.from(new Set(leads.map(l => l.leadType || 'Unknown'))), [leads]);
    const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.customerStatus || l.status).filter(Boolean))), [leads]);

    const displayedLeads = useMemo(() => {
        return leads.filter(lead => {
            if (selectedFranchisee !== 'all' && lead.franchisee !== selectedFranchisee) return false;
            if (selectedBucket !== 'all' && lead.bucket !== selectedBucket) return false;
            if (selectedLeadType !== 'all' && (lead.leadType || 'Unknown') !== selectedLeadType) return false;
            
            const status = lead.customerStatus || lead.status;
            if (selectedStatus !== 'all' && status !== selectedStatus) return false;
            
            return true;
        });
    }, [leads, selectedFranchisee, selectedBucket, selectedLeadType, selectedStatus]);

    // Process Activities
    const allActivities = useMemo(() => {
        const activities: FlatActivity[] = [];
        const amNames = accountManagers.map(am => getAmName(am));
        const targetAm = selectedAm !== 'all' ? selectedAm : null;
        
        displayedLeads.forEach(lead => {
            if (lead.activity) {
                lead.activity.forEach(act => {
                    const author = act.author || 'System';
                    
                    // Ensure the activity is authored by an AM
                    if (!amNames.includes(author)) return;
                    
                    // If a specific AM is selected, only include their activities
                    if (targetAm && author !== targetAm) return;
                    
                    if (isDateInRange(act.date)) {
                        activities.push({
                            id: act.id,
                            leadId: lead.id,
                            leadName: lead.companyName,
                            type: act.type,
                            date: act.date,
                            notes: act.notes,
                            author: author
                        });
                    }
                });
            }
        });
        return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [displayedLeads, dateRange, selectedAm, accountManagers]);

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
        const valueByLeadType: Record<string, number> = {};
        const valueByLead: { id: string; name: string; value: number; status: string; leadType: string; activityCount: number; lastContacted: string | null }[] = [];

        displayedLeads.forEach(lead => {
            const val = calculateMonthlyValue(lead);
            const leadType = lead.leadType || 'Unknown';
            if (val > 0) {
                totalPipelineValue += val;
                const status = lead.customerStatus || lead.status;
                valueByStatus[status] = (valueByStatus[status] || 0) + val;
                valueByLeadType[leadType] = (valueByLeadType[leadType] || 0) + val;
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
                     leadType: leadType,
                     activityCount: leadActivities.length,
                     lastContacted: lastContactedAct
                 });
            }
        });
        
        // Sort leads by value desc for matrix
        valueByLead.sort((a, b) => b.value - a.value);

        const groupedByAM: Record<string, SummaryGroup> = {};
        const groupedByStatus: Record<string, SummaryGroup> = {};
        const groupedByFranchisee: Record<string, SummaryGroup> = {};

        const addToGroup = (record: Record<string, SummaryGroup>, key: string, leadItem: any) => {
            if (!record[key]) {
                record[key] = { key, totalLeads: 0, totalValue: 0, totalActivities: 0, leads: [] };
            }
            if (!record[key].leads.find(l => l.id === leadItem.id)) {
                record[key].totalLeads++;
                record[key].totalValue += leadItem.value;
                record[key].totalActivities += leadItem.activityCount;
                record[key].leads.push(leadItem);
            }
        };

        valueByLead.forEach(leadItem => {
            addToGroup(groupedByStatus, leadItem.status || 'Unknown', leadItem);
            
            const originalLead = displayedLeads.find(l => l.id === leadItem.id);
            const franchisee = originalLead?.franchisee || 'Unassigned';
            addToGroup(groupedByFranchisee, franchisee, leadItem);
            
            const leadActivities = allActivities.filter(a => a.leadId === leadItem.id);
            const amAuthors = Array.from(new Set(leadActivities.map(a => a.author)));
            if (amAuthors.length === 0) {
                addToGroup(groupedByAM, 'No AM Activity', leadItem);
            } else {
                amAuthors.forEach(author => {
                    addToGroup(groupedByAM, author, leadItem);
                });
            }
        });

        const summaryByAM = Object.values(groupedByAM).sort((a,b) => b.totalValue - a.totalValue);
        const summaryByStatus = Object.values(groupedByStatus).sort((a,b) => b.totalValue - a.totalValue);
        const summaryByFranchisee = Object.values(groupedByFranchisee).sort((a,b) => b.totalValue - a.totalValue);

        return {
            totalCalls,
            totalEmails,
            totalMeetings,
            totalUpdates,
            totalActivities: allActivities.length,
            totalPipelineValue,
            valueByStatus,
            valueByLeadType,
            valueByLead,
            summaryByAM,
            summaryByStatus,
            summaryByFranchisee
        };
    }, [allActivities, displayedLeads]);

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

    const leadTypeChartData = useMemo(() => {
        return Object.entries(metrics.valueByLeadType).map(([type, value]) => ({
            type,
            value,
            fill: type === 'B2B' ? 'hsl(var(--chart-1))' : 
                  type === 'B2C' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-5))'
        })).sort((a,b) => b.value - a.value);
    }, [metrics.valueByLeadType]);

    const summaryChartData = useMemo(() => {
        const data = summaryTab === 'am' ? metrics.summaryByAM : 
                     summaryTab === 'status' ? metrics.summaryByStatus : 
                     metrics.summaryByFranchisee;
        return data.map((d, idx) => ({
            name: d.key,
            value: d.totalValue,
            fill: `hsl(var(--chart-${(idx % 5) + 1}))`
        }));
    }, [metrics, summaryTab]);

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
                    {(isAdmin || isAm) && (
                        <Select value={selectedAm} onValueChange={setSelectedAm}>
                            <SelectTrigger className="w-[180px] bg-white border-[#095c7b]/20">
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
                    
                    <Select value={selectedFranchisee} onValueChange={setSelectedFranchisee}>
                        <SelectTrigger className="w-[150px] bg-white border-[#095c7b]/20">
                            <SelectValue placeholder="Franchisee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Franchisees</SelectItem>
                            {uniqueFranchisees.map(f => (
                                <SelectItem key={f as string} value={f as string}>{f as string}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                        <SelectTrigger className="w-[140px] bg-white border-[#095c7b]/20">
                            <SelectValue placeholder="Bucket" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Buckets</SelectItem>
                            {uniqueBuckets.map(b => (
                                <SelectItem key={b as string} value={b as string}>{String(b).replace('_', ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedLeadType} onValueChange={setSelectedLeadType}>
                        <SelectTrigger className="w-[130px] bg-white border-[#095c7b]/20">
                            <SelectValue placeholder="Lead Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {uniqueLeadTypes.map(t => (
                                <SelectItem key={t as string} value={t as string}>{t as string}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[140px] bg-white border-[#095c7b]/20">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {uniqueStatuses.map(s => (
                                <SelectItem key={s as string} value={s as string}>{s as string}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
                        <SelectTrigger className="w-[130px] bg-white border-[#095c7b]/20">
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
                                <p className="text-sm font-medium text-slate-500">Filtered Leads</p>
                                <h3 className="text-3xl font-bold text-indigo-600 mt-1">{displayedLeads.length}</h3>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 font-medium">Matching all selected filters</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="bg-white/80 border border-white/60 mb-4 inline-flex self-start">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Summary View</TabsTrigger>
                    <TabsTrigger value="activities" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Activity Log</TabsTrigger>
                    <TabsTrigger value="revenue" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">Revenue Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg text-[#095c7b]">Performance Summary</CardTitle>
                                    <CardDescription>Aggregate view of leads and activities.</CardDescription>
                                </div>
                                <Tabs value={summaryTab} onValueChange={(val: any) => setSummaryTab(val)} className="w-auto">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="am">By AM</TabsTrigger>
                                        <TabsTrigger value="status">By Status</TabsTrigger>
                                        <TabsTrigger value="franchisee">By Franchisee</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            {summaryChartData.length > 0 && summaryChartData.some(d => d.value > 0) && (
                                <div className="h-[250px] p-6 border-b border-[#095c7b]/10 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={summaryChartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
                                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                                <p className="font-medium text-slate-700">{payload[0].payload.name}</p>
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
                                                {summaryChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                                <Table>
                                    <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[300px]">
                                                {summaryTab === 'am' ? 'Account Manager' : summaryTab === 'status' ? 'Status' : 'Franchisee'}
                                            </TableHead>
                                            <TableHead className="text-right">Total Leads</TableHead>
                                            <TableHead className="text-right">Monthly Value (MRR)</TableHead>
                                            <TableHead className="text-right">Activities</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const data = summaryTab === 'am' ? metrics.summaryByAM : 
                                                         summaryTab === 'status' ? metrics.summaryByStatus : 
                                                         metrics.summaryByFranchisee;
                                            
                                            if (data.length === 0) {
                                                return (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data found.</TableCell>
                                                    </TableRow>
                                                );
                                            }
                                            
                                            return data.map((group) => {
                                                const groupKey = `${summaryTab}-${group.key}`;
                                                const isExpanded = !!expandedGroups[groupKey];
                                                
                                                return (
                                                    <React.Fragment key={groupKey}>
                                                        {/* Summary Row */}
                                                        <TableRow 
                                                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#095c7b]/5 hover:bg-[#095c7b]/10' : 'bg-white hover:bg-slate-50'}`}
                                                            onClick={() => setExpandedGroups(prev => ({...prev, [groupKey]: !prev[groupKey]}))}
                                                        >
                                                            <TableCell className="font-semibold text-[#095c7b]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                    </div>
                                                                    {group.key}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {group.totalLeads}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-emerald-600">
                                                                {group.totalValue > 0 ? `$${group.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="secondary" className={group.totalActivities > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                                                                    {group.totalActivities}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                        
                                                        {/* Expanded Details Row */}
                                                        {isExpanded && (
                                                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                                                <TableCell colSpan={4} className="p-0 border-b-2 border-[#095c7b]/20">
                                                                    <div className="p-4 pl-10 pr-6 bg-[#095c7b]/[0.02] shadow-inner">
                                                                        <Table className="bg-white border rounded-md shadow-sm">
                                                                            <TableHeader>
                                                                                <TableRow className="bg-slate-50/80">
                                                                                    <TableHead>Company</TableHead>
                                                                                    <TableHead>Status</TableHead>
                                                                                    <TableHead className="text-right">MRR</TableHead>
                                                                                    <TableHead className="text-right">Activities</TableHead>
                                                                                    <TableHead className="text-right">Last Contacted</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {group.leads.sort((a,b) => b.value - a.value).map(lead => (
                                                                                    <TableRow key={lead.id} className="cursor-pointer hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); window.open(`/leads/${lead.id}`, '_blank'); }}>
                                                                                        <TableCell className="font-medium py-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Building className="h-3 w-3 text-[#095c7b]/50" />
                                                                                                {lead.name}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2">
                                                                                            <div className="flex gap-1 items-center">
                                                                                                <Badge variant="outline" className="text-[10px] font-normal">{lead.status}</Badge>
                                                                                                {lead.leadType && lead.leadType !== 'Unknown' && (
                                                                                                    <Badge variant="secondary" className="text-[9px] bg-indigo-50 text-indigo-700">{lead.leadType}</Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right py-2 text-emerald-600 font-medium text-sm">
                                                                                            {lead.value > 0 ? `$${lead.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right py-2">
                                                                                            <span className="text-xs font-medium text-slate-500">{lead.activityCount}</span>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right py-2 text-xs text-slate-500">
                                                                                            {lead.lastContacted ? format(new Date(lead.lastContacted), 'MMM d, yy') : '-'}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            });
                                        })()}
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
                                <CardTitle className="text-lg text-[#095c7b]">Pipeline Value by Lead Type</CardTitle>
                                <CardDescription>Distribution of potential MRR across lead types (e.g., B2B, B2C).</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {leadTypeChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={leadTypeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                                <p className="font-medium text-slate-700">{payload[0].payload.type}</p>
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
                                                {leadTypeChartData.map((entry, index) => (
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
                        
                        <Card className="border-[#095c7b]/10 shadow-sm lg:col-span-2">
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
