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
import { Phone, Mail, FileText, Calendar as CalendarIconLucide, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp, ChevronRight, ChevronDown, Filter, X } from 'lucide-react';
import { MultiSelectCombobox, type Option } from '../ui/multi-select-combobox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon, description, onClick }: { title: string; value: string | number; icon: React.ElementType; description?: string; onClick?: () => void }) => (
  <Card className={cn("border-[#095c7b]/10 shadow-sm", onClick && "cursor-pointer hover:bg-muted/50 transition-colors")} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      <div className="p-2 bg-[#095c7b]/10 rounded-lg"><Icon className="h-4 w-4 text-[#095c7b]" /></div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-[#095c7b]">{value}</div>
      {description && <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>}
    </CardContent>
  </Card>
);
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
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

    
    // New Filters
    const [selectedFranchisee, setSelectedFranchisee] = useState<string[]>([]);
    const [selectedBucket, setSelectedBucket] = useState<string[]>([]);
    const [selectedLeadType, setSelectedLeadType] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    const [activityDateRange, setActivityDateRange] = useState<DateRange | undefined>(undefined);
    const [leadEnteredDateRange, setLeadEnteredDateRange] = useState<DateRange | undefined>(undefined);
    
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
    const isActivityDateInRange = (dateStr: string) => {
        if (!activityDateRange?.from) return true;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const fromDate = startOfDay(activityDateRange.from);
        const toDate = activityDateRange.to ? endOfDay(activityDateRange.to) : endOfDay(activityDateRange.from);
        return date >= fromDate && date <= toDate;
    };

    const uniqueFranchisees = useMemo(() => Array.from(new Set(leads.map(l => l.franchisee).filter(Boolean))), [leads]);
    const uniqueBuckets = useMemo(() => Array.from(new Set(leads.map(l => l.bucket).filter(Boolean))), [leads]);
    const uniqueLeadTypes = useMemo(() => Array.from(new Set(leads.map(l => l.leadType || 'Unknown'))), [leads]);
    const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.customerStatus || l.status).filter(Boolean))), [leads]);

    const displayedLeads = useMemo(() => {
        return leads.filter(lead => {
            if (selectedFranchisee.length > 0 && lead.franchisee && !selectedFranchisee.includes(lead.franchisee)) return false;
            if (selectedBucket.length > 0 && lead.bucket && !selectedBucket.includes(lead.bucket)) return false;
            if (selectedLeadType.length > 0 && (lead.leadType || 'Unknown') && !selectedLeadType.includes(lead.leadType || 'Unknown')) return false;
            
            const status = lead.customerStatus || lead.status;
            if (selectedStatus.length > 0 && status && !selectedStatus.includes(status)) return false;
            
            if (leadEnteredDateRange?.from) {
                const dateParts = (lead.dateLeadEntered || '').split('/');
                let enteredDate: Date | null = null;
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const fullYear = year < 100 ? 2000 + year : year;
                        enteredDate = new Date(fullYear, month - 1, day);
                    }
                } else if (lead.dateLeadEntered) {
                    enteredDate = new Date(lead.dateLeadEntered);
                }
                
                if (!enteredDate || isNaN(enteredDate.getTime())) return false;
                
                const fromDate = startOfDay(leadEnteredDateRange.from);
                const toDate = leadEnteredDateRange.to ? endOfDay(leadEnteredDateRange.to) : endOfDay(leadEnteredDateRange.from);
                if (enteredDate < fromDate || enteredDate > toDate) return false;
            }
            return true;
        });
    }, [leads, selectedFranchisee, selectedBucket, selectedLeadType, selectedStatus, leadEnteredDateRange]);

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
                    
                    if (isActivityDateInRange(act.date)) {
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
    }, [displayedLeads, activityDateRange, selectedAm, accountManagers]);

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

    
    const franchiseeOptions: Option[] = useMemo(() => uniqueFranchisees.map(f => ({ value: f as string, label: f as string })), [uniqueFranchisees]);
    const bucketOptions: Option[] = useMemo(() => uniqueBuckets.map(b => ({ value: b as string, label: String(b).replace('_', ' ') })), [uniqueBuckets]);
    const leadTypeOptions: Option[] = useMemo(() => uniqueLeadTypes.map(t => ({ value: t as string, label: t as string })), [uniqueLeadTypes]);
    const statusOptions: Option[] = useMemo(() => uniqueStatuses.map(s => ({ value: s as string, label: s as string })), [uniqueStatuses]);
    const clearFilters = () => {
        setSelectedFranchisee([]);
        setSelectedBucket([]);
        setSelectedLeadType([]);
        setSelectedStatus([]);
        setActivityDateRange(undefined);
        setLeadEnteredDateRange(undefined);
        setSelectedAm('all');
    };

    if (loading || isLoadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
    }

    if (!isAdmin && !isAm) {
        return <div className="p-6">You do not have permission to view this page.</div>;
    }
    
    
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen overflow-y-auto">
            <header className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <ActivityIcon className="h-6 w-6 text-[#095c7b]" />
                    <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Account Manager Reports</h1>
                </div>
                <p className="text-[#095c7b]/80">Activity and Pipeline Value Metrics</p>
            </header>
            
            <Card className="mb-6 border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2 text-[#095c7b]"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
                    {(isAdmin || isAm) && (
                        <Select value={selectedAm} onValueChange={setSelectedAm}>
                            <SelectTrigger className="w-[200px] bg-white border-[#095c7b]/20 text-xs">
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
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Activity Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9">
                                        <CalendarIconLucide className="mr-2 h-3 w-3" />
                                        {activityDateRange?.from ? (
                                            activityDateRange.to ? (
                                                <>{format(activityDateRange.from, "LLL dd, y")} - {format(activityDateRange.to, "LLL dd, y")}</>
                                            ) : format(activityDateRange.from, "LLL dd, y")
                                        ) : (
                                            <span>All Time</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={activityDateRange} onSelect={setActivityDateRange} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Lead Entered Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9">
                                        <CalendarIconLucide className="mr-2 h-3 w-3" />
                                        {leadEnteredDateRange?.from ? (
                                            leadEnteredDateRange.to ? (
                                                <>{format(leadEnteredDateRange.from, "LLL dd, y")} - {format(leadEnteredDateRange.to, "LLL dd, y")}</>
                                            ) : format(leadEnteredDateRange.from, "LLL dd, y")
                                        ) : (
                                            <span>All Time</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={leadEnteredDateRange} onSelect={setLeadEnteredDateRange} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Franchisee</Label>
                            <MultiSelectCombobox 
                                options={franchiseeOptions} 
                                selected={selectedFranchisee} 
                                onSelectedChange={setSelectedFranchisee} 
                                placeholder="All Franchisees..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Bucket</Label>
                            <MultiSelectCombobox 
                                options={bucketOptions} 
                                selected={selectedBucket} 
                                onSelectedChange={setSelectedBucket} 
                                placeholder="All Buckets..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Status</Label>
                            <MultiSelectCombobox 
                                options={statusOptions} 
                                selected={selectedStatus} 
                                onSelectedChange={setSelectedStatus} 
                                placeholder="All Statuses..." 
                            />
                        </div>
                        <Button variant="ghost" onClick={clearFilters} className="h-9 text-xs"><X className="mr-2 h-3 w-3"/> Clear Filters</Button>
                    </div>
                </CardContent>
            </Card>

            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard 
                    title="Total Activities" 
                    value={metrics.totalActivities} 
                    icon={ActivityIcon} 
                    description={metrics.totalActivities > 0 ? `${metrics.totalCalls} Calls · ${metrics.totalEmails} Emails · ${metrics.totalMeetings} Meets` : 'No activities found'}
                />
                <StatCard 
                    title="Pipeline MRR" 
                    value={`$${metrics.totalPipelineValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                    icon={DollarSign} 
                    description="Potential Monthly Recurring Revenue"
                />
                <StatCard 
                    title="Leads with MRR" 
                    value={metrics.valueByLead.filter(l => l.value > 0).length} 
                    icon={TrendingUp} 
                    description="Leads quoting or won"
                />
                <StatCard 
                    title="Filtered Leads" 
                    value={displayedLeads.length} 
                    icon={Users} 
                    description="Matching all selected filters"
                />
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
