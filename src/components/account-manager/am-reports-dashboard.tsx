"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile, Activity, Appointment, LeadStatus } from '@/lib/types';
type ExtendedAppointment = Appointment & { 
    lead?: Lead; 
    leadName?: string; 
    leadStatus?: string; 
    dialerAssigned?: string; 
    discoveryData?: any;
};
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, FileText, Calendar as CalendarIconLucide, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp, ChevronRight, ChevronDown, Filter, X, Download, ExternalLink, Search, Info } from 'lucide-react';
import { MultiSelectCombobox, type Option } from '../ui/multi-select-combobox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';
import { cn, parseDateString } from '@/lib/utils';
import { getAllAppointments, getAllActivities } from '@/services/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '../lead-status-badge';

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4.5 h-4.5 text-muted-foreground hover:text-[#095c7b] hover:bg-[#095c7b]/10 transition-colors focus:outline-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-4 text-xs space-y-2 shadow-lg border bg-popover text-popover-foreground z-50 leading-relaxed font-normal" onClick={(e) => e.stopPropagation()}>
      {content}
    </PopoverContent>
  </Popover>
);

const StatCard = ({ title, value, icon: Icon, description, onClick, helpContent }: { title: string; value: string | number | React.ReactNode; icon: React.ElementType; description?: React.ReactNode; onClick?: () => void; helpContent?: React.ReactNode }) => (
  <Card className={cn("border-[#095c7b]/10 shadow-sm", onClick && "cursor-pointer hover:bg-muted/50 transition-colors")} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
        <span>{title}</span>
        {helpContent && <SectionHelp content={helpContent} />}
      </CardTitle>
      <div className="p-2 bg-[#095c7b]/10 rounded-lg"><Icon className="h-4 w-4 text-[#095c7b]" /></div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-[#095c7b]">{value}</div>
      {description && <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>}
    </CardContent>
  </Card>
);
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, ScatterChart, Scatter, ZAxis, ComposedChart, Line, LineChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface FlatActivity {
    id: string;
    leadId: string;
    leadName: string;
    type: string;
    date: string;
    notes: string;
    author: string;
    durationMinutes: number;
    callId?: string;
}

interface SummaryGroup {
    key: string;
    totalLeads: number;
    totalValue: number;
    totalActivities: number;
    totalDurationMinutes: number;
    leads: { id: string; name: string; value: number; status: string; leadType: string; activityCount: number; durationMinutes: number; lastContacted: string | null }[];
}

interface AmResponsivenessDetail {
    leadId: string;
    companyName: string;
    assignmentDate: Date | null;
    firstActivityDate: Date | null;
    timeToInteractHours: number | null;
    hasActivity: boolean;
}

interface AmResponsivenessMetric {
    amName: string;
    totalLeads: number;
    leadsWithActivity: number;
    leadsWithoutActivity: number;
    avgTimeToInteractHours: number | null;
    leadsDetails: AmResponsivenessDetail[];
}

const parseDurationToMinutes = (durationStr?: string): number => {
    if (!durationStr) return 0;
    let minutes = 0;
    const mMatch = durationStr.match(/(\d+)\s*m/i);
    if (mMatch) minutes += parseInt(mMatch[1], 10);
    const sMatch = durationStr.match(/(\d+)\s*s/i);
    if (sMatch) minutes += parseInt(sMatch[1], 10) / 60;
    
    if (durationStr.includes(':')) {
       const parts = durationStr.split(':').map(Number);
       if (parts.length === 3) {
           minutes += parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
       } else if (parts.length === 2) {
           minutes += parts[0] + (parts[1] || 0) / 60;
       }
    }
    return minutes;
};

export default function AMReportsDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    const [allAppointments, setAllAppointments] = useState<ExtendedAppointment[]>([]);

    const { toast } = useToast();
    const [drillDownData, setDrillDownData] = useState<{ title: string; leads: Lead[] } | null>(null);
    const [drillDownStatusFilter, setDrillDownStatusFilter] = useState<string>("all");
    const [drillDownSearchQuery, setDrillDownSearchQuery] = useState<string>("");

    const [drillDownAppointments, setDrillDownAppointments] = useState<{
        title: string;
        appointments: ExtendedAppointment[];
    } | null>(null);
    const [drillDownAppSearchQuery, setDrillDownAppSearchQuery] = useState<string>("");

    const handleExportAppointments = (appsToExport: ExtendedAppointment[], filename: string) => {
        if (appsToExport.length === 0) {
            toast({ title: 'No Data', description: 'The dataset is empty.' });
            return;
        }
        const exportData = appsToExport.map(app => {
            const primaryContact = app.lead?.contacts?.find(c => c.isPrimary) || app.lead?.contacts?.[0];
            return {
                'Company Name': app.leadName || app.lead?.companyName || '',
                'Contact Name': primaryContact?.name || '',
                'Phone': primaryContact?.phone || app.lead?.customerPhone || '',
                'Email': primaryContact?.email || '',
                'Lead Status': app.leadStatus || app.lead?.status || '',
                'Appointment Status': app.appointmentStatus || 'Pending',
                'Scheduled Date': app.duedate ? app.duedate.split('T')[0] : '',
                'Scheduled Time': app.starttime || '',
                'Assigned AM': app.assignedTo || app.amName || '',
            };
        });
        const headers = Object.keys(exportData[0]);
        const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const csvRows = exportData.map(item => headers.map(h => escapeCsv(item[h as keyof typeof item])).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredDrillDownAppointments = useMemo(() => {
        if (!drillDownAppointments) return [];
        let list = drillDownAppointments.appointments;
        if (drillDownAppSearchQuery.trim() !== "") {
            const queryVal = drillDownAppSearchQuery.toLowerCase();
            list = list.filter(app => {
                const leadName = app.leadName || app.lead?.companyName || '';
                const primaryContact = app.lead?.contacts?.find(c => c.isPrimary) || app.lead?.contacts?.[0];
                const contactName = primaryContact?.name || '';
                return leadName.toLowerCase().includes(queryVal) || contactName.toLowerCase().includes(queryVal);
            });
        }
        return list;
    }, [drillDownAppointments, drillDownAppSearchQuery]);

    const handleExportData = (leadsToExport: Lead[], filename: string) => {
        if (leadsToExport.length === 0) {
            toast({ title: 'No Data', description: 'The dataset is empty.' });
            return;
        }
        const exportData = leadsToExport.map(l => {
            const primaryContact = l.contacts?.find(c => c.isPrimary) || l.contacts?.[0];
            return {
                'Company Name': l.companyName || '',
                'Status': l.customerStatus || l.status || '',
                'Account Manager': l.accountManagerAssigned || '',
                'Franchisee': l.franchisee || '',
                'Lead Type': l.leadType || '',
                'Bucket': l.bucket || '',
                'Date Entered': l.dateLeadEntered || '',
                'Contact Name': primaryContact?.name || '',
                'Email': primaryContact?.email || '',
                'Phone': primaryContact?.phone || l.customerPhone || ''
            };
        });
        const headers = Object.keys(exportData[0]);
        const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const csvRows = exportData.map(item => headers.map(h => escapeCsv(item[h as keyof typeof item])).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredDrillDownLeads = useMemo(() => {
        if (!drillDownData) return [];
        let list = drillDownData.leads;
        if (drillDownStatusFilter !== "all") {
            list = list.filter(l => (l.customerStatus || l.status) === drillDownStatusFilter);
        }
        if (drillDownSearchQuery.trim() !== "") {
            const queryVal = drillDownSearchQuery.toLowerCase();
            list = list.filter(l => {
                const primaryContact = l.contacts?.find(c => c.isPrimary) || l.contacts?.[0];
                return (
                    (l.companyName || '').toLowerCase().includes(queryVal) ||
                    (primaryContact?.name || '').toLowerCase().includes(queryVal) ||
                    (l.prospectPlusId || '').toLowerCase().includes(queryVal)
                );
            });
        }
        return list;
    }, [drillDownData, drillDownStatusFilter, drillDownSearchQuery]);

    const drillDownAvailableStatuses = useMemo(() => {
        if (!drillDownData) return [];
        const statuses = new Set(drillDownData.leads.map(l => l.customerStatus || l.status).filter(Boolean));
        return Array.from(statuses) as string[];
    }, [drillDownData]);

    useEffect(() => {
        if (!drillDownData) {
            setDrillDownStatusFilter("all");
            setDrillDownSearchQuery("");
        }
    }, [drillDownData]);

    
    // New Filters (Pending/Draft States bound to UI controls)
    const [selectedFranchisee, setSelectedFranchisee] = useState<string[]>([]);
    const [selectedBucket, setSelectedBucket] = useState<string[]>([]);
    const [selectedLeadType, setSelectedLeadType] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    const [activityDateRange, setActivityDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });
    const [leadEnteredDateRange, setLeadEnteredDateRange] = useState<DateRange | undefined>(undefined);

    // Applied Filters (Used for calculations and queries)
    const [appliedAm, setAppliedAm] = useState<string>('all');
    const [appliedFranchisee, setAppliedFranchisee] = useState<string[]>([]);
    const [appliedBucket, setAppliedBucket] = useState<string[]>([]);
    const [appliedLeadType, setAppliedLeadType] = useState<string[]>([]);
    const [appliedStatus, setAppliedStatus] = useState<string[]>([]);
    const [appliedActivityDateRange, setAppliedActivityDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });
    const [appliedLeadEnteredDateRange, setAppliedLeadEnteredDateRange] = useState<DateRange | undefined>(undefined);

    const hasUnappliedFilters = useMemo(() => {
        return selectedAm !== appliedAm ||
            JSON.stringify(selectedFranchisee) !== JSON.stringify(appliedFranchisee) ||
            JSON.stringify(selectedBucket) !== JSON.stringify(appliedBucket) ||
            JSON.stringify(selectedLeadType) !== JSON.stringify(appliedLeadType) ||
            JSON.stringify(selectedStatus) !== JSON.stringify(appliedStatus) ||
            activityDateRange?.from?.getTime() !== appliedActivityDateRange?.from?.getTime() ||
            activityDateRange?.to?.getTime() !== appliedActivityDateRange?.to?.getTime() ||
            leadEnteredDateRange?.from?.getTime() !== appliedLeadEnteredDateRange?.from?.getTime() ||
            leadEnteredDateRange?.to?.getTime() !== appliedLeadEnteredDateRange?.to?.getTime();
    }, [
        selectedAm, appliedAm,
        selectedFranchisee, appliedFranchisee,
        selectedBucket, appliedBucket,
        selectedLeadType, appliedLeadType,
        selectedStatus, appliedStatus,
        activityDateRange, appliedActivityDateRange,
        leadEnteredDateRange, appliedLeadEnteredDateRange
    ]);

    const applyFilters = () => {
        setAppliedAm(selectedAm);
        setAppliedFranchisee(selectedFranchisee);
        setAppliedBucket(selectedBucket);
        setAppliedLeadType(selectedLeadType);
        setAppliedStatus(selectedStatus);
        setAppliedActivityDateRange(activityDateRange);
        setAppliedLeadEnteredDateRange(leadEnteredDateRange);
    };
    
    // UI State for Summary Tabs and Expandable Rows
    const [summaryTab, setSummaryTab] = useState<'am' | 'status' | 'franchisee'>('am');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [expandedAuthors, setExpandedAuthors] = useState<Record<string, boolean>>({});
    const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});
    const [expandedAmResponsiveness, setExpandedAmResponsiveness] = useState<Record<string, boolean>>({});
    
    const toggleAuthor = (author: string) => {
        setExpandedAuthors(prev => ({ ...prev, [author]: !prev[author] }));
    };

    const toggleLead = (leadKey: string) => {
        setExpandedLeads(prev => ({ ...prev, [leadKey]: !prev[leadKey] }));
    };

    const toggleAmResponsiveness = (amName: string) => {
        setExpandedAmResponsiveness(prev => ({ ...prev, [amName]: !prev[amName] }));
    };
    
    const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';
    
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
                const q1 = query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'));
                const q2 = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'));
                const q3 = query(usersRef, where('assignedRoles', 'array-contains', 'account managers'));
                
                const [snap1, snap2, snap3] = await Promise.all([
                    getDocs(q1),
                    getDocs(q2),
                    getDocs(q3)
                ]);
                
                const amMap = new Map<string, UserProfile>();
                [snap1, snap2, snap3].forEach(snap => {
                    snap.docs.forEach(doc => {
                        amMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
                    });
                });
                
                setAccountManagers(Array.from(amMap.values()));
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
                
                // Build a date-filtered query for the activity collection group
                let activitiesQuery;
                if (appliedActivityDateRange?.from) {
                    const fromDateStr = startOfDay(appliedActivityDateRange.from).toISOString();
                    if (appliedActivityDateRange.to) {
                        const toDateStr = endOfDay(appliedActivityDateRange.to).toISOString();
                        activitiesQuery = query(
                            collectionGroup(firestore, 'activity'),
                            where('date', '>=', fromDateStr),
                            where('date', '<=', toDateStr)
                        );
                    } else {
                        activitiesQuery = query(
                            collectionGroup(firestore, 'activity'),
                            where('date', '>=', fromDateStr)
                        );
                    }
                } else {
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    activitiesQuery = query(
                        collectionGroup(firestore, 'activity'),
                        where('date', '>=', threeMonthsAgo.toISOString())
                    );
                }

                const [snap, activitiesSnap, fetchedAppointments] = await Promise.all([
                    getDocs(q),
                    getDocs(activitiesQuery),
                    getAllAppointments()
                ]);
                
                const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                
                // Extract and map activities
                const activities = activitiesSnap.docs.map(doc => {
                    const data = doc.data() as Activity;
                    return {
                        ...data,
                        id: doc.id,
                        leadId: doc.ref.parent.parent!.id
                    };
                });
                
                // Map activities to their respective leads
                const activitiesMap: Record<string, Activity[]> = {};
                activities.forEach(act => {
                    if (!activitiesMap[act.leadId]) {
                        activitiesMap[act.leadId] = [];
                    }
                    const { leadId, ...activityData } = act;
                    activitiesMap[act.leadId].push(activityData as Activity);
                });
                
                const leadsWithActivities = fetchedLeads.map(l => ({
                    ...l,
                    activity: activitiesMap[l.id] || []
                }));
                
                const amNames = accountManagers.map(am => getAmName(am));
                
                const filteredLeads = leadsWithActivities.filter(l => {
                    const isDirectlyAm = l.bucket === 'account_manager' || l.bucket === 'inbound';
                    const wasInAm = l.bucketHistory?.some(bh => bh.oldBucket === 'account_manager' || bh.oldBucket === 'inbound');
                    const hasAnyAmActivity = l.activity?.some(act => amNames.includes(act.author || ''));
                    
                    const qualifiesForAmReport = isDirectlyAm || wasInAm || hasAnyAmActivity;
                    
                    if (!qualifiesForAmReport) return false;
                    
                    const targetAm = appliedAm !== 'all' ? appliedAm : null;
                    if (targetAm) {
                        const isAssignedToTargetAm = l.accountManagerAssigned === targetAm;
                        const hasTargetAmActivity = l.activity?.some(act => act.author === targetAm);
                        return isAssignedToTargetAm || hasTargetAmActivity;
                    }
                    
                    return true;
                });
                
                setLeads(filteredLeads);
                setAllAppointments(fetchedAppointments);
            } catch (error) {
                console.error("Error fetching pipeline leads", error);
            } finally {
                setIsLoadingData(false);
            }
        }
        
        fetchPipeline();
    }, [loading, isAm, isAdmin, appliedAm, accountManagers, appliedActivityDateRange]);

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
        if (!appliedActivityDateRange?.from) return true;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const fromDate = startOfDay(appliedActivityDateRange.from);
        const toDate = appliedActivityDateRange.to ? endOfDay(appliedActivityDateRange.to) : endOfDay(appliedActivityDateRange.from);
        return date >= fromDate && date <= toDate;
    };

    const uniqueFranchisees = useMemo(() => Array.from(new Set(leads.map(l => l.franchisee).filter(Boolean))), [leads]);
    const uniqueBuckets = useMemo(() => Array.from(new Set(leads.map(l => l.bucket).filter(Boolean))), [leads]);
    const uniqueLeadTypes = useMemo(() => Array.from(new Set(leads.map(l => l.leadType || 'Unknown'))), [leads]);
    const uniqueStatuses = useMemo(() => Array.from(new Set(leads.map(l => l.customerStatus || l.status).filter(Boolean))), [leads]);

    const displayedLeads = useMemo(() => {
        return leads.filter(lead => {
            if (appliedFranchisee.length > 0 && lead.franchisee && !appliedFranchisee.includes(lead.franchisee)) return false;
            if (appliedBucket.length > 0 && lead.bucket && !appliedBucket.includes(lead.bucket)) return false;
            if (appliedLeadType.length > 0 && (lead.leadType || 'Unknown') && !appliedLeadType.includes(lead.leadType || 'Unknown')) return false;
            
            const status = lead.customerStatus || lead.status;
            if (appliedStatus.length > 0 && status && !appliedStatus.includes(status)) return false;
            
            if (appliedLeadEnteredDateRange?.from) {
                const enteredDate = parseDateString(lead.dateLeadEntered);
                
                if (!enteredDate || isNaN(enteredDate.getTime())) return false;
                
                const fromDate = startOfDay(appliedLeadEnteredDateRange.from);
                const toDate = appliedLeadEnteredDateRange.to ? endOfDay(appliedLeadEnteredDateRange.to) : endOfDay(appliedLeadEnteredDateRange.from);
                if (enteredDate < fromDate || enteredDate > toDate) return false;
            }

            if (appliedActivityDateRange?.from) {
                const amNames = accountManagers.map(am => getAmName(am));
                const targetAm = appliedAm !== 'all' ? appliedAm : null;
                const hasActivityInRange = lead.activity?.some(act => {
                    const author = act.author || '';
                    if (!amNames.includes(author)) return false;
                    if (targetAm && author !== targetAm) return false;
                    return isActivityDateInRange(act.date);
                });
                if (!hasActivityInRange) return false;
            }

            return true;
        });
    }, [leads, appliedFranchisee, appliedBucket, appliedLeadType, appliedStatus, appliedLeadEnteredDateRange, appliedActivityDateRange, appliedAm, accountManagers]);

    const appointmentMetrics = useMemo(() => {
        const baseFilteredLeadIds = new Set(
            leads.filter(lead => {
                if (appliedFranchisee.length > 0 && lead.franchisee && !appliedFranchisee.includes(lead.franchisee)) return false;
                if (appliedBucket.length > 0 && lead.bucket && !appliedBucket.includes(lead.bucket)) return false;
                if (appliedLeadType.length > 0 && (lead.leadType || 'Unknown') && !appliedLeadType.includes(lead.leadType || 'Unknown')) return false;
                
                const status = lead.customerStatus || lead.status;
                if (appliedStatus.length > 0 && status && !appliedStatus.includes(status)) return false;
                
                if (appliedLeadEnteredDateRange?.from) {
                    const enteredDate = parseDateString(lead.dateLeadEntered);
                    if (!enteredDate || isNaN(enteredDate.getTime())) return false;
                    const fromDate = startOfDay(appliedLeadEnteredDateRange.from);
                    const toDate = appliedLeadEnteredDateRange.to ? endOfDay(appliedLeadEnteredDateRange.to) : endOfDay(appliedLeadEnteredDateRange.from);
                    if (enteredDate < fromDate || enteredDate > toDate) return false;
                }
                return true;
            }).map(l => l.id)
        );

        const relevantAppointments = allAppointments.filter(app => {
            if (!baseFilteredLeadIds.has(app.leadId)) return false;

            const targetAm = appliedAm !== 'all' ? appliedAm : null;
            if (targetAm) {
                const appAm = app.assignedTo || app.dialerAssigned || app.amName;
                const lead = leads.find(l => l.id === app.leadId);
                const leadAm = lead?.accountManagerAssigned;
                if (appAm !== targetAm && leadAm !== targetAm) {
                    return false;
                }
            }

            if (appliedActivityDateRange?.from) {
                const appDateStr = app.date || app.duedate || app.appointmentDate;
                if (!appDateStr) return false;
                const appDate = new Date(appDateStr);
                if (isNaN(appDate.getTime())) return false;
                const fromDate = startOfDay(appliedActivityDateRange.from);
                const toDate = appliedActivityDateRange.to ? endOfDay(appliedActivityDateRange.to) : endOfDay(appliedActivityDateRange.from);
                return appDate >= fromDate && appDate <= toDate;
            }

            return true;
        });

        let scheduled = 0;
        let cancelled = 0;
        let rescheduled = 0;
        let completed = 0;
        const perAm: Record<string, number> = {};
        const perLead: Record<string, number> = {};
        const byWeekCreated: Record<string, number> = {};
        const byDateScheduled: Record<string, number> = {};
        const byDateCreated: Record<string, number> = {};

        relevantAppointments.forEach(app => {
            const status = app.appointmentStatus || 'Pending';
            if (status === 'Pending') scheduled++;
            else if (status === 'Cancelled') cancelled++;
            else if (status === 'Rescheduled') rescheduled++;
            else if (status === 'Completed') completed++;

            const am = app.assignedTo || app.dialerAssigned || app.amName || 'Unknown AM';
            perAm[am] = (perAm[am] || 0) + 1;

            const leadName = leads.find(l => l.id === app.leadId)?.companyName || 'Unknown Lead';
            perLead[leadName] = (perLead[leadName] || 0) + 1;

            const rawDateScheduled = app.date || app.duedate || app.appointmentDate;
            const dateScheduled = rawDateScheduled ? rawDateScheduled.split('T')[0] : null;
            if (dateScheduled) {
                byDateScheduled[dateScheduled] = (byDateScheduled[dateScheduled] || 0) + 1;
            }

            if (app.createdAt) {
                const dateCreated = app.createdAt.split('T')[0];
                byDateCreated[dateCreated] = (byDateCreated[dateCreated] || 0) + 1;

                const weekDate = new Date(dateCreated);
                if (!isNaN(weekDate.getTime())) {
                    weekDate.setUTCDate(weekDate.getUTCDate() - weekDate.getUTCDay());
                    const weekStr = weekDate.toISOString().split('T')[0];
                    byWeekCreated[weekStr] = (byWeekCreated[weekStr] || 0) + 1;
                }
            } else {
                const fallbackDate = app.date || app.duedate || app.appointmentDate;
                if (fallbackDate) {
                    const weekDate = new Date(fallbackDate);
                    if (!isNaN(weekDate.getTime())) {
                        weekDate.setUTCDate(weekDate.getUTCDate() - weekDate.getUTCDay());
                        const weekStr = weekDate.toISOString().split('T')[0];
                        byWeekCreated[weekStr] = (byWeekCreated[weekStr] || 0) + 1;
                        byDateCreated[fallbackDate.split('T')[0]] = (byDateCreated[fallbackDate.split('T')[0]] || 0) + 1;
                    }
                }
            }
        });

        return {
            scheduled, cancelled, rescheduled, completed,
            relevantAppointments,
            perAm: Object.entries(perAm).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
            perLead: Object.entries(perLead).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
            byWeekCreated: Object.entries(byWeekCreated).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date)),
            byDateScheduled: Object.entries(byDateScheduled).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date)),
            byDateCreated: Object.entries(byDateCreated).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date)),
        };
    }, [allAppointments, leads, appliedFranchisee, appliedBucket, appliedLeadType, appliedStatus, appliedLeadEnteredDateRange, appliedActivityDateRange, appliedAm, accountManagers]);

    // Process Activities
    const allActivities = useMemo(() => {
        const activities: FlatActivity[] = [];
        const amNames = accountManagers.map(am => getAmName(am));
        const targetAm = appliedAm !== 'all' ? appliedAm : null;
        
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
                            author: author,
                            durationMinutes: parseDurationToMinutes(act.duration),
                            callId: act.callId
                        });
                    }
                });
            }
        });
        return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [displayedLeads, appliedActivityDateRange, appliedAm, accountManagers]);

    const groupedActivities = useMemo(() => {
        const authorGroups: Record<string, Record<string, { leadId: string; leadName: string; activities: FlatActivity[] }>> = {};
        
        allActivities.forEach(act => {
            const author = act.author || 'Unknown Author';
            const leadId = act.leadId;
            const leadName = act.leadName || 'Unknown Lead';
            
            if (!authorGroups[author]) {
                authorGroups[author] = {};
            }
            if (!authorGroups[author][leadId]) {
                authorGroups[author][leadId] = {
                    leadId,
                    leadName,
                    activities: []
                };
            }
            authorGroups[author][leadId].activities.push(act);
        });
        
        return Object.entries(authorGroups).map(([authorName, leadsMap]) => {
            const leads = Object.values(leadsMap).map(leadItem => {
                const sortedActs = [...leadItem.activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return {
                    ...leadItem,
                    activities: sortedActs,
                    latestActivityDate: sortedActs[0]?.date || ''
                };
            }).sort((a, b) => new Date(b.latestActivityDate).getTime() - new Date(a.latestActivityDate).getTime());
            
            const totalCount = leads.reduce((sum, l) => sum + l.activities.length, 0);
            const latestDate = leads[0]?.latestActivityDate || '';
            
            return {
                authorName,
                leads,
                totalCount,
                latestDate
            };
        }).sort((a, b) => b.totalCount - a.totalCount);
    }, [allActivities]);

    const activityTrendData = useMemo(() => {
        const dailyCounts: Record<string, { date: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }> = {};
        
        allActivities.forEach(act => {
            const dateStr = act.date.split('T')[0];
            if (!dailyCounts[dateStr]) {
                dailyCounts[dateStr] = { date: dateStr, Calls: 0, Emails: 0, Meetings: 0, Updates: 0, Total: 0 };
            }
            if (act.type === 'Call') dailyCounts[dateStr].Calls++;
            else if (act.type === 'Email') dailyCounts[dateStr].Emails++;
            else if (act.type === 'Meeting') dailyCounts[dateStr].Meetings++;
            else dailyCounts[dateStr].Updates++;
            
            dailyCounts[dateStr].Total++;
        });
        
        return Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date));
    }, [allActivities]);

    const activityLeaderboardData = useMemo(() => {
        const counts: Record<string, { name: string; Calls: number; Emails: number; Meetings: number; Updates: number; Total: number }> = {};
        
        allActivities.forEach(act => {
            const author = act.author || 'Unknown';
            if (!counts[author]) {
                counts[author] = { name: author, Calls: 0, Emails: 0, Meetings: 0, Updates: 0, Total: 0 };
            }
            if (act.type === 'Call') counts[author].Calls++;
            else if (act.type === 'Email') counts[author].Emails++;
            else if (act.type === 'Meeting') counts[author].Meetings++;
            else counts[author].Updates++;
            
            counts[author].Total++;
        });
        
        return Object.values(counts).sort((a, b) => b.Total - a.Total);
    }, [allActivities]);

    // Metrics Calculations
    const metrics = useMemo(() => {
        let totalCalls = 0;
        let totalEmails = 0;
        let totalMeetings = 0;
        let totalUpdates = 0;
        
        const amCallStats: Record<string, { callCount: number; totalDurationMinutes: number }> = {};
        allActivities.forEach(act => {
            if (act.type === 'Call') totalCalls++;
            else if (act.type === 'Email') totalEmails++;
            else if (act.type === 'Meeting') totalMeetings++;
            else totalUpdates++;

            if (act.type === 'Call' && act.callId) {
                const am = act.author || 'Unknown';
                if (!amCallStats[am]) {
                    amCallStats[am] = { callCount: 0, totalDurationMinutes: 0 };
                }
                amCallStats[am].callCount += 1;
                amCallStats[am].totalDurationMinutes += act.durationMinutes || 0;
            }
        });

        let totalPipelineValue = 0;
        let totalDurationMinutes = 0;
        const valueByStatus: Record<string, number> = {};
        const valueByLeadType: Record<string, number> = {};
        const valueByBucket: Record<string, number> = {};
        const valueByAM: Record<string, number> = {};
        const valueByLead: { id: string; name: string; value: number; status: string; leadType: string; activityCount: number; durationMinutes: number; lastContacted: string | null }[] = [];

        displayedLeads.forEach(lead => {
            const val = calculateMonthlyValue(lead);
            const leadType = lead.leadType || 'Unknown';
            if (val > 0) {
                totalPipelineValue += val;
                const status = lead.customerStatus || lead.status;
                valueByStatus[status] = (valueByStatus[status] || 0) + val;
                valueByLeadType[leadType] = (valueByLeadType[leadType] || 0) + val;

                const bucketRaw = lead.bucket || 'Unassigned';
                const bucket = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                valueByBucket[bucket] = (valueByBucket[bucket] || 0) + val;

                const am = lead.accountManagerAssigned || 'Unassigned';
                valueByAM[am] = (valueByAM[am] || 0) + val;
            }
            
            // For Activity vs Value Matrix
            const leadActivities = allActivities.filter(a => a.leadId === lead.id);
            const leadDuration = leadActivities.reduce((sum, act) => sum + act.durationMinutes, 0);
            totalDurationMinutes += leadDuration;

            if (val > 0 || leadActivities.length > 0) {
                 const lastContactedAct = leadActivities.length > 0 ? leadActivities[0].date : null;
                 valueByLead.push({
                     id: lead.id,
                     name: lead.companyName,
                     value: val,
                     status: lead.customerStatus || lead.status,
                     leadType: leadType,
                     activityCount: leadActivities.length,
                     durationMinutes: leadDuration,
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
                record[key] = { key, totalLeads: 0, totalValue: 0, totalActivities: 0, totalDurationMinutes: 0, leads: [] };
            }
            if (!record[key].leads.find((l: any) => l.id === leadItem.id)) {
                record[key].totalLeads++;
                record[key].totalValue += leadItem.value;
                record[key].totalActivities += leadItem.activityCount;
                record[key].totalDurationMinutes += leadItem.durationMinutes;
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
            totalDurationMinutes,
            valueByStatus,
            valueByLeadType,
            valueByBucket,
            valueByAM,
            valueByLead,
            summaryByAM,
            summaryByStatus,
            summaryByFranchisee,
            amCallStats
        };
    }, [allActivities, displayedLeads]);

    const formatHours = (hours: number | null): string => {
        if (hours === null) return 'No interaction';
        if (hours < 1) {
            const mins = Math.round(hours * 60);
            return `${mins}m`;
        }
        if (hours < 24) {
            return `${hours.toFixed(1)}h`;
        }
        const days = hours / 24;
        return `${days.toFixed(1)}d`;
    };

    const amResponsivenessMetrics = useMemo(() => {
        const amNames = accountManagers.map(am => getAmName(am));
        const metricsMap: Record<string, AmResponsivenessMetric> = {};
        
        amNames.forEach(name => {
            metricsMap[name] = {
                amName: name,
                totalLeads: 0,
                leadsWithActivity: 0,
                leadsWithoutActivity: 0,
                avgTimeToInteractHours: null,
                leadsDetails: []
            };
        });

        displayedLeads.forEach(lead => {
            const assignedAM = lead.accountManagerAssigned;
            if (!assignedAM) return;
            
            if (!metricsMap[assignedAM]) return;
            
            const amMetric = metricsMap[assignedAM];
            
            let assignmentDate: Date | null = null;
            if (lead.bucketHistory && lead.bucketHistory.length > 0) {
                const amHistory = [...lead.bucketHistory]
                    .filter(h => h.newBucket === 'account_manager')
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                if (amHistory.length > 0) {
                    assignmentDate = new Date(amHistory[0].date);
                }
            }
            if (!assignmentDate && lead.dateLeadEntered) {
                const parsed = parseDateString(lead.dateLeadEntered);
                if (parsed && !isNaN(parsed.getTime())) {
                    assignmentDate = parsed;
                }
            }

            // Filter by assignment date if appliedActivityDateRange is set
            if (appliedActivityDateRange?.from && assignmentDate) {
                const fromDate = startOfDay(appliedActivityDateRange.from);
                const toDate = appliedActivityDateRange.to ? endOfDay(appliedActivityDateRange.to) : endOfDay(appliedActivityDateRange.from);
                if (assignmentDate < fromDate || assignmentDate > toDate) {
                    return; // Skip this lead since it wasn't assigned in the selected period
                }
            }

            const amActivities = (lead.activity || [])
                .filter(act => act.author === assignedAM && isActivityDateInRange(act.date))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const firstActivity = amActivities[0];
            const firstActivityDate = firstActivity ? new Date(firstActivity.date) : null;
            const hasActivity = amActivities.length > 0;
            
            let timeToInteractHours: number | null = null;
            if (assignmentDate && firstActivityDate) {
                const diffMs = firstActivityDate.getTime() - assignmentDate.getTime();
                timeToInteractHours = Math.max(0, diffMs / (1000 * 60 * 60));
            }

            amMetric.totalLeads++;
            if (hasActivity) {
                amMetric.leadsWithActivity++;
            } else {
                amMetric.leadsWithoutActivity++;
            }
            
            amMetric.leadsDetails.push({
                leadId: lead.id,
                companyName: lead.companyName,
                assignmentDate,
                firstActivityDate,
                timeToInteractHours,
                hasActivity
            });
        });
        
        Object.values(metricsMap).forEach(metric => {
            const interactedLeads = metric.leadsDetails.filter(d => d.timeToInteractHours !== null);
            if (interactedLeads.length > 0) {
                const sumHours = interactedLeads.reduce((sum, d) => sum + d.timeToInteractHours!, 0);
                metric.avgTimeToInteractHours = sumHours / interactedLeads.length;
            }
            metric.leadsDetails.sort((a, b) => {
                if (!a.assignmentDate) return 1;
                if (!b.assignmentDate) return -1;
                return b.assignmentDate.getTime() - a.assignmentDate.getTime();
            });
        });
        
        const list = Object.values(metricsMap).sort((a, b) => b.totalLeads - a.totalLeads);
        if (appliedAm !== 'all') {
            return list.filter(m => m.amName === appliedAm);
        }
        return list;
    }, [displayedLeads, accountManagers, appliedAm, appliedActivityDateRange]);

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

    const bucketChartData = useMemo(() => {
        return Object.entries(metrics.valueByBucket).map(([bucket, value], idx) => ({
            bucket,
            value,
            fill: `hsl(var(--chart-${(idx % 5) + 1}))`
        })).sort((a,b) => b.value - a.value);
    }, [metrics.valueByBucket]);

    const amChartData = useMemo(() => {
        return Object.entries(metrics.valueByAM).map(([am, value], idx) => ({
            am,
            value,
            fill: `hsl(var(--chart-${(idx % 5) + 1}))`
        })).sort((a,b) => b.value - a.value);
    }, [metrics.valueByAM]);

    const summaryChartData = useMemo(() => {
        const data = summaryTab === 'am' ? metrics.summaryByAM : 
                     summaryTab === 'status' ? metrics.summaryByStatus : 
                     metrics.summaryByFranchisee;
        return data.map((d, idx) => ({
            name: d.key,
            value: d.totalValue,
            fill: `hsl(var(--chart-${(idx % 5) + 1}))`,
            leads: d.leads
        }));
    }, [metrics, summaryTab]);

    const activityBreakdownData = useMemo(() => {
        const topLeads = [...metrics.valueByLead].sort((a,b) => b.activityCount - a.activityCount).slice(0, 20);
        return topLeads.map(lead => {
            const leadActivities = allActivities.filter(a => a.leadId === lead.id);
            let calls = 0, emails = 0, meetings = 0, updates = 0;
            leadActivities.forEach(a => {
                if (a.type === 'Call') calls++;
                else if (a.type === 'Email') emails++;
                else if (a.type === 'Meeting') meetings++;
                else updates++;
            });
            return {
                name: lead.name,
                Calls: calls,
                Emails: emails,
                Meetings: meetings,
                Updates: updates,
                durationMinutes: lead.durationMinutes
            };
        });
    }, [metrics.valueByLead, allActivities]);

    const scatterData = useMemo(() => {
        return metrics.valueByLead.filter(l => l.activityCount > 0 || l.value > 0).map(l => ({
            name: l.name,
            activities: l.activityCount,
            duration: Math.round(l.durationMinutes),
            value: l.value,
            status: l.status || 'Unknown'
        }));
    }, [metrics.valueByLead]);

    const outcomeChartData = useMemo(() => {
        const statusData: Record<string, {status: string, activities: number, duration: number, value: number}> = {};
        metrics.valueByLead.forEach(l => {
            const stat = l.status || 'Unknown';
            if (!statusData[stat]) statusData[stat] = {status: stat, activities: 0, duration: 0, value: 0};
            statusData[stat].activities += l.activityCount;
            statusData[stat].duration += l.durationMinutes;
            statusData[stat].value += l.value;
        });
        return Object.values(statusData).sort((a,b) => b.activities - a.activities);
    }, [metrics.valueByLead]);

    
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

        setAppliedFranchisee([]);
        setAppliedBucket([]);
        setAppliedLeadType([]);
        setAppliedStatus([]);
        setAppliedActivityDateRange(undefined);
        setAppliedLeadEnteredDateRange(undefined);
        setAppliedAm('all');
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
            
            <Card id="step-am-filters" className="mb-6 border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
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
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Activity Date</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9 pl-3 pr-8 py-2 overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIconLucide className="mr-2 h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                                {activityDateRange?.from ? (
                                                    activityDateRange.to ? (
                                                        <>{format(activityDateRange.from, "LLL dd, y")} - {format(activityDateRange.to, "LLL dd, y")}</>
                                                    ) : format(activityDateRange.from, "LLL dd, y")
                                                ) : (
                                                    "All Time"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={activityDateRange} onSelect={setActivityDateRange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {activityDateRange && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActivityDateRange(undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear activity date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Lead Entered Date</Label>
                            <div className="relative w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9 pl-3 pr-8 py-2 overflow-hidden whitespace-nowrap text-ellipsis">
                                            <CalendarIconLucide className="mr-2 h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                                {leadEnteredDateRange?.from ? (
                                                    leadEnteredDateRange.to ? (
                                                        <>{format(leadEnteredDateRange.from, "LLL dd, y")} - {format(leadEnteredDateRange.to, "LLL dd, y")}</>
                                                    ) : format(leadEnteredDateRange.from, "LLL dd, y")
                                                ) : (
                                                    "All Time"
                                                )}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex" align="start">
                                        <Calendar mode="range" selected={leadEnteredDateRange} onSelect={setLeadEnteredDateRange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {leadEnteredDateRange && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLeadEnteredDateRange(undefined);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-100 p-1"
                                        title="Clear lead entered date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
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
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <Button variant="ghost" onClick={clearFilters} className="h-9 text-xs"><X className="mr-2 h-3 w-3"/> Clear Filters</Button>
                        <div className="flex items-center gap-3">
                            {hasUnappliedFilters && (
                                <span className="text-xs text-amber-600 font-medium animate-pulse">
                                    Pending changes...
                                </span>
                            )}
                            <Button 
                                onClick={applyFilters} 
                                className={cn(
                                    "h-9 text-xs font-semibold px-4 transition-all duration-200",
                                    hasUnappliedFilters 
                                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md scale-105" 
                                        : "bg-[#095c7b] hover:bg-[#095c7b]/90 text-white"
                                )}
                            >
                                <Filter className="mr-2 h-3 w-3"/> Apply Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            
            {/* Top KPI Cards */}
            <div id="step-am-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard 
                    title="Total Activities" 
                    value={metrics.totalActivities} 
                    icon={ActivityIcon} 
                    description={metrics.totalActivities > 0 ? `${metrics.totalCalls} Calls · ${metrics.totalEmails} Emails · ${metrics.totalMeetings} Meets` : 'No activities found'}
                    onClick={() => {
                        const activeLeadIds = new Set(allActivities.map(a => a.leadId));
                        const activeLeads = displayedLeads.filter(l => activeLeadIds.has(l.id));
                        setDrillDownData({ title: "Leads with Activities", leads: activeLeads });
                    }}
                    helpContent="Total number of touchpoint activities logged, including Calls, Emails, and Meetings during the selected period."
                />
                <StatCard 
                    title="Pipeline MRR" 
                    value={`$${metrics.totalPipelineValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                    icon={DollarSign} 
                    description="Potential Monthly Recurring Revenue"
                    onClick={() => {
                        const mrrLeads = displayedLeads.filter(l => calculateMonthlyValue(l) > 0);
                        setDrillDownData({ title: "Leads with MRR", leads: mrrLeads });
                    }}
                    helpContent="Potential Monthly Recurring Revenue based on quotes sent or opportunities won for the leads currently assigned."
                />
                <StatCard 
                    title="Leads with MRR" 
                    value={metrics.valueByLead.filter(l => l.value > 0).length} 
                    icon={TrendingUp} 
                    description="Leads quoting or won"
                    onClick={() => {
                        const mrrLeads = displayedLeads.filter(l => calculateMonthlyValue(l) > 0);
                        setDrillDownData({ title: "Leads with MRR", leads: mrrLeads });
                    }}
                    helpContent="Count of assigned leads that have a quoted or won value associated with them."
                />
                <StatCard 
                    title="Filtered Leads" 
                    value={displayedLeads.length} 
                    icon={Users} 
                    description="Matching all selected filters"
                    onClick={() => {
                        setDrillDownData({ title: "Filtered Leads", leads: displayedLeads });
                    }}
                    helpContent="Total number of leads assigned to Account Managers that match the selected filtering criteria."
                />
            </div>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList id="step-am-tabs" className="bg-white/80 border border-white/60 mb-4 inline-flex self-start flex-wrap h-auto p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Summary View</TabsTrigger>
                    <TabsTrigger value="activities" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Activity Log</TabsTrigger>
                    <TabsTrigger value="revenue" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Revenue Analysis</TabsTrigger>
                    <TabsTrigger value="effort" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Effort vs Outcome</TabsTrigger>
                    <TabsTrigger value="breakdown" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Activity Breakdown</TabsTrigger>
                    <TabsTrigger value="outcomes" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Status Outcomes</TabsTrigger>
                    <TabsTrigger value="appointments" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white h-8 text-xs">Appointments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg text-[#095c7b] flex items-center gap-1.5">
                                        <span>Performance Summary</span>
                                        <SectionHelp content="A consolidated table showing the total leads, value of leads, logged activities, total effort time, and last contacted date grouped by Account Manager, Status, or Franchisee." />
                                    </CardTitle>
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
                                                                <p className="text-[10px] text-muted-foreground mt-1">Click bar to view leads</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]} 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const matchedLeads = displayedLeads.filter(l => data.leads.some((gl: any) => gl.id === l.id));
                                                        setDrillDownData({ title: `${summaryTab === 'am' ? 'AM' : summaryTab === 'status' ? 'Status' : 'Franchisee'}: ${data.name}`, leads: matchedLeads });
                                                    }
                                                }}
                                            >
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
                                                
                                                return (
                                                    <TableRow 
                                                        key={groupKey}
                                                        className="cursor-pointer transition-colors bg-white hover:bg-[#095c7b]/5"
                                                        onClick={() => {
                                                            const matchedLeads = displayedLeads.filter(l => group.leads.some(gl => gl.id === l.id));
                                                            setDrillDownData({ title: `${summaryTab === 'am' ? 'AM' : summaryTab === 'status' ? 'Status' : 'Franchisee'}: ${group.key}`, leads: matchedLeads });
                                                        }}
                                                    >
                                                        <TableCell className="font-semibold text-[#095c7b]">
                                                            {group.key}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {group.totalLeads}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-emerald-600">
                                                            {group.totalValue > 0 ? `$${group.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Badge variant="secondary" className={group.totalActivities > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                                                                    {group.totalActivities} Acts
                                                                </Badge>
                                                                {group.totalDurationMinutes > 0 && (
                                                                    <span className="text-[10px] text-slate-500">{Math.round(group.totalDurationMinutes)} min</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
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
                    {/* Management Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card className="border-[#095c7b]/10 shadow-sm bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-[#095c7b] flex items-center gap-1.5">
                                    <span>AM Activity Leaderboard</span>
                                    <SectionHelp content="Ranks Account Managers by their total activity volume (calls, emails, meetings, updates) logged during the period." />
                                </CardTitle>
                                <CardDescription>Total activities logged by each Account Manager in this period</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                {activityLeaderboardData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activityLeaderboardData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(9, 92, 123, 0.03)' }} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar 
                                                dataKey="Calls" 
                                                stackId="a" 
                                                fill="#3b82f6" 
                                                name="Calls" 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const amName = data.name;
                                                        const activeLeads = displayedLeads.filter(l => l.activity && l.activity.some(act => act.author === amName && act.type === 'Call' && isActivityDateInRange(act.date)));
                                                        setDrillDownData({ title: `Calls by ${amName}`, leads: activeLeads });
                                                    }
                                                }}
                                            />
                                            <Bar 
                                                dataKey="Emails" 
                                                stackId="a" 
                                                fill="#10b981" 
                                                name="Emails" 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const amName = data.name;
                                                        const activeLeads = displayedLeads.filter(l => l.activity && l.activity.some(act => act.author === amName && act.type === 'Email' && isActivityDateInRange(act.date)));
                                                        setDrillDownData({ title: `Emails by ${amName}`, leads: activeLeads });
                                                    }
                                                }}
                                            />
                                            <Bar 
                                                dataKey="Meetings" 
                                                stackId="a" 
                                                fill="#f59e0b" 
                                                name="Meetings" 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const amName = data.name;
                                                        const activeLeads = displayedLeads.filter(l => l.activity && l.activity.some(act => act.author === amName && act.type === 'Meeting' && isActivityDateInRange(act.date)));
                                                        setDrillDownData({ title: `Meetings by ${amName}`, leads: activeLeads });
                                                    }
                                                }}
                                            />
                                            <Bar 
                                                dataKey="Updates" 
                                                stackId="a" 
                                                fill="#8b5cf6" 
                                                name="Updates" 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const amName = data.name;
                                                        const activeLeads = displayedLeads.filter(l => l.activity && l.activity.some(act => act.author === amName && !['Call', 'Email', 'Meeting'].includes(act.type) && isActivityDateInRange(act.date)));
                                                        setDrillDownData({ title: `Updates by ${amName}`, leads: activeLeads });
                                                    }
                                                }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No activity data available</div>
                                ) }
                            </CardContent>
                        </Card>

                        <Card className="border-[#095c7b]/10 shadow-sm bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-[#095c7b] flex items-center gap-1.5">
                                    <span>Activity Trend Over Time</span>
                                    <SectionHelp content="Daily volume of logged activities (calls, emails, meetings, and updates) to show AM engagement trends over the period." />
                                </CardTitle>
                                <CardDescription>Daily volume of interactions logged by AMs</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                {activityTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={activityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tickFormatter={(str) => {
                                                try {
                                                    return format(new Date(str), 'MMM d');
                                                } catch (e) {
                                                    return str;
                                                }
                                            }} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Line type="monotone" dataKey="Total" stroke="#095c7b" strokeWidth={2.5} name="Total Activity" activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="Calls" stroke="#3b82f6" strokeWidth={1.5} name="Calls" dot={false} />
                                            <Line type="monotone" dataKey="Emails" stroke="#10b981" strokeWidth={1.5} name="Emails" dot={false} />
                                            <Line type="monotone" dataKey="Meetings" stroke="#f59e0b" strokeWidth={1.5} name="Meetings" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No activity trend available</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-[#095c7b]/10 shadow-sm flex flex-col bg-white mb-6">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b] flex items-center gap-2">
                                <Phone className="h-5 w-5 text-sky-600" />
                                <span>AM Aircall Call Performance</span>
                            </CardTitle>
                            <CardDescription>
                                Analysis of completed calls (synced via Aircall with a valid Call ID) and their average duration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            {Object.keys(metrics.amCallStats).length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    No completed calls with valid Call IDs found in this period.
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead>Account Manager</TableHead>
                                                <TableHead className="text-right">Completed Calls</TableHead>
                                                <TableHead className="text-right">Total Duration</TableHead>
                                                <TableHead className="text-right">Avg Call Duration</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(metrics.amCallStats)
                                                .sort((a, b) => b[1].callCount - a[1].callCount)
                                                .map(([amName, stats]) => {
                                                    const avgMins = stats.callCount > 0 ? stats.totalDurationMinutes / stats.callCount : 0;
                                                    const totalMinutesInt = Math.floor(stats.totalDurationMinutes);
                                                    const totalSecondsInt = Math.round((stats.totalDurationMinutes - totalMinutesInt) * 60);
                                                    const avgMinutesInt = Math.floor(avgMins);
                                                    const avgSecondsInt = Math.round((avgMins - avgMinutesInt) * 60);
                                                    
                                                    return (
                                                        <TableRow key={amName} className="hover:bg-slate-50/50">
                                                            <TableCell className="font-semibold text-slate-800">{amName}</TableCell>
                                                            <TableCell className="text-right font-medium text-blue-600">{stats.callCount}</TableCell>
                                                            <TableCell className="text-right text-slate-600">
                                                                {totalMinutesInt > 0 ? `${totalMinutesInt}m ` : ''}{totalSecondsInt}s
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold text-emerald-600">
                                                                {avgMinutesInt > 0 ? `${avgMinutesInt}m ` : ''}{avgSecondsInt}s
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#095c7b]/10 shadow-sm flex flex-col bg-white">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b]">Grouped Activity Logs</CardTitle>
                            <CardDescription>Activities grouped by Account Manager and Lead for accountability tracking.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            {groupedActivities.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No activities logged in this period.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {groupedActivities.map(group => {
                                        const isAuthorExpanded = !!expandedAuthors[group.authorName];
                                        return (
                                            <Card key={group.authorName} className="border border-slate-200 overflow-hidden shadow-none">
                                                {/* Author Level Header */}
                                                <div 
                                                    onClick={() => toggleAuthor(group.authorName)}
                                                    className="bg-slate-50/80 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors border-b border-slate-200/60"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-[#095c7b]/10 rounded-full text-[#095c7b]">
                                                            <Users className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 text-sm">{group.authorName}</h3>
                                                            <p className="text-xs text-slate-500">{group.leads.length} leads contacted · {group.totalCount} activities recorded</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {group.latestDate && (
                                                            <span className="text-[10px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                                                Active: {format(new Date(group.latestDate), 'MMM d, h:mm a')}
                                                            </span>
                                                        )}
                                                        {isAuthorExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                                    </div>
                                                </div>

                                                {/* Leads Grouped under this Author */}
                                                {isAuthorExpanded && (
                                                    <div className="divide-y divide-slate-100 p-2 bg-slate-50/20">
                                                        {group.leads.map(leadItem => {
                                                            const leadKey = `${group.authorName}-${leadItem.leadId}`;
                                                            const isLeadExpanded = !!expandedLeads[leadKey];
                                                            return (
                                                                <div key={leadItem.leadId} className="p-1">
                                                                    <div 
                                                                        onClick={() => toggleLead(leadKey)}
                                                                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100/50 rounded transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Building className="h-3.5 w-3.5 text-slate-400" />
                                                                            <span className="text-xs font-semibold text-slate-700">{leadItem.leadName}</span>
                                                                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                                                                {leadItem.activities.length} acts
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] text-slate-400">
                                                                                Last activity: {format(new Date(leadItem.latestActivityDate), 'MMM d')}
                                                                            </span>
                                                                            {isLeadExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                                                        </div>
                                                                    </div>

                                                                    {/* Activities under this Lead */}
                                                                    {isLeadExpanded && (
                                                                        <div className="mt-1 ml-6 mr-2 border border-slate-100 rounded-md overflow-hidden bg-white shadow-sm">
                                                                            <Table>
                                                                                <TableHeader className="bg-slate-50/50">
                                                                                    <TableRow>
                                                                                        <TableHead className="w-[120px] py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</TableHead>
                                                                                        <TableHead className="w-[80px] py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</TableHead>
                                                                                        <TableHead className="py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {leadItem.activities.map(act => (
                                                                                        <TableRow key={act.id} className="hover:bg-slate-50/20">
                                                                                            <TableCell className="text-[11px] text-slate-500 py-2 whitespace-nowrap">
                                                                                                {format(new Date(act.date), 'MMM d, yyyy h:mm a')}
                                                                                            </TableCell>
                                                                                            <TableCell className="py-2">
                                                                                                <Badge variant="outline" className={`text-[9px] px-1 py-0.5 ${
                                                                                                    act.type === 'Call' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/50' :
                                                                                                    act.type === 'Email' ? 'bg-blue-50 text-blue-700 border-blue-200/50' :
                                                                                                    act.type === 'Meeting' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                                                                                                    'bg-slate-50 text-slate-700 border-slate-200/50'
                                                                                                }`}>
                                                                                                    {act.type}
                                                                                                </Badge>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-[11px] text-slate-600 py-2">
                                                                                                <div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: act.notes }} />
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#095c7b]/10 shadow-sm flex flex-col bg-white mt-6">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b] flex items-center gap-1.5">
                                <span>AM Responsiveness &amp; Coverage Summary</span>
                                <SectionHelp content="Measures how quickly an Account Manager makes their first contact (activity) on a lead after the lead is assigned to them, and counts leads that haven't been contacted." />
                            </CardTitle>
                            <CardDescription>Number of leads assigned, activity coverage, and average time taken to start interacting.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            {amResponsivenessMetrics.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No assigned AM leads found.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead>Account Manager</TableHead>
                                                <TableHead className="text-right">Leads Assigned</TableHead>
                                                <TableHead className="text-right">Leads with Activity</TableHead>
                                                <TableHead className="text-right">Leads without Activity</TableHead>
                                                <TableHead className="text-right">Avg. Response Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {amResponsivenessMetrics.map(amMetric => {
                                                const coveragePct = amMetric.totalLeads > 0 
                                                    ? Math.round((amMetric.leadsWithActivity / amMetric.totalLeads) * 100)
                                                    : 0;

                                                return (
                                                    <TableRow 
                                                        key={amMetric.amName}
                                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => {
                                                            const matchedLeads = displayedLeads.filter(l => amMetric.leadsDetails.some(ld => ld.leadId === l.id));
                                                            setDrillDownData({ title: `Responsiveness Details: ${amMetric.amName}`, leads: matchedLeads });
                                                        }}
                                                    >
                                                        <TableCell className="font-semibold text-[#095c7b]">
                                                            {amMetric.amName}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{amMetric.totalLeads}</TableCell>
                                                        <TableCell className="text-right text-emerald-600 font-medium">
                                                            {amMetric.leadsWithActivity} ({coveragePct}%)
                                                        </TableCell>
                                                        <TableCell className="text-right text-amber-600 font-medium">
                                                            {amMetric.leadsWithoutActivity} ({100 - coveragePct}%)
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-indigo-600">
                                                            {formatHours(amMetric.avgTimeToInteractHours)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="revenue" className="flex-1 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        <Card className="border-[#095c7b]/10 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg text-[#095c7b] flex items-center gap-1.5">
                                    <span>Pipeline Value by Status</span>
                                    <SectionHelp content="Sum of potential monthly recurring revenue (MRR) grouped by their current lifecycle status." />
                                </CardTitle>
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
                                                }}
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]}
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.status) {
                                                        const matches = displayedLeads.filter(l => (l.customerStatus || l.status) === data.status);
                                                        setDrillDownData({ title: `Leads - Status: ${data.status}`, leads: matches });
                                                    }
                                                }}
                                            >
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
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]}
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.type) {
                                                        const matches = displayedLeads.filter(l => (l.leadType || 'Unknown') === data.type);
                                                        setDrillDownData({ title: `Leads - Type: ${data.type}`, leads: matches });
                                                    }
                                                }}
                                            >
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
 
                        <Card className="border-[#095c7b]/10 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg text-[#095c7b]">Pipeline Value by Lead Bucket</CardTitle>
                                <CardDescription>Distribution of potential MRR across lead buckets.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {bucketChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bucketChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                                <p className="font-medium text-slate-700">{payload[0].payload.bucket}</p>
                                                                <p className="text-emerald-600 font-bold mt-1">
                                                                    ${(payload[0].value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]}
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.bucket) {
                                                        const matches = displayedLeads.filter(l => {
                                                            const bucketRaw = l.bucket || 'Unassigned';
                                                            const bucketName = String(bucketRaw).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                                            return bucketName === data.bucket;
                                                        });
                                                        setDrillDownData({ title: `Leads - Bucket: ${data.bucket}`, leads: matches });
                                                    }
                                                }}
                                            >
                                                {bucketChartData.map((entry, index) => (
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
                                <CardTitle className="text-lg text-[#095c7b]">Pipeline Value by Account Manager</CardTitle>
                                <CardDescription>Distribution of potential MRR across assigned Account Managers.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {amChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={amChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="am" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(9, 92, 123, 0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                                <p className="font-medium text-slate-700">{payload[0].payload.am}</p>
                                                                <p className="text-emerald-600 font-bold mt-1">
                                                                    ${(payload[0].value as number).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]}
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.am) {
                                                        const matches = displayedLeads.filter(l => (l.accountManagerAssigned || 'Unassigned') === data.am);
                                                        setDrillDownData({ title: `Leads - AM: ${data.am}`, leads: matches });
                                                    }
                                                }}
                                            >
                                                {amChartData.map((entry, index) => (
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

                <TabsContent value="effort" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-[600px] flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b] flex items-center gap-1.5">
                                <span>Effort vs Outcome Matrix</span>
                                <SectionHelp content="Scatter chart plotting AM effort (total duration of activities in minutes) on the X-axis against outcomes (total lead value) on the Y-axis." />
                            </CardTitle>
                            <CardDescription>Correlation between AM effort (activities) and resulting Deal Value (MRR).</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            {scatterData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="activities" name="Activities" tick={{ fill: '#64748b' }} label={{ value: 'Total Activities', offset: -10, position: 'insideBottom', fill: '#64748b', fontSize: 12 }} />
                                        <YAxis type="number" dataKey="value" name="Pipeline MRR" tickFormatter={(val) => `$${val}`} tick={{ fill: '#64748b' }} label={{ value: 'Pipeline MRR ($)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                                        <ZAxis type="number" dataKey="duration" range={[50, 400]} name="Duration (Mins)" />
                                        <Tooltip 
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                            <p className="font-bold text-[#095c7b]">{data.name}</p>
                                                            <p className="text-sm text-slate-600 mt-1">Status: {data.status}</p>
                                                            <p className="text-sm text-slate-600">Activities: {data.activities}</p>
                                                            <p className="text-sm text-slate-600">Duration: {data.duration} mins</p>
                                                            <p className="text-emerald-600 font-bold mt-1">MRR: ${data.value.toLocaleString()}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Leads" data={scatterData} fill="#095c7b" opacity={0.6} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">No effort vs outcome data available.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="breakdown" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-[600px] flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b]">Activity Breakdown per Lead</CardTitle>
                            <CardDescription>Top 20 Leads by Activity Volume broken down by interaction type.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            {activityBreakdownData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activityBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                                        <YAxis />
                                        <Tooltip 
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0);
                                                    const duration = payload[0]?.payload?.durationMinutes || 0;
                                                    return (
                                                        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg min-w-[150px]">
                                                            <p className="font-bold text-[#095c7b] mb-2">{label}</p>
                                                            {payload.map((entry: any, index: number) => (
                                                                <div key={index} className="flex justify-between text-sm mb-1">
                                                                    <span style={{color: entry.color}}>{entry.name}:</span>
                                                                    <span className="font-medium">{entry.value}</span>
                                                                </div>
                                                            ))}
                                                            <div className="border-t mt-2 pt-2 flex justify-between text-sm font-bold">
                                                                <span>Total:</span>
                                                                <span>{total}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                                <span>Time spent:</span>
                                                                <span>{Math.round(duration)} mins</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar 
                                            dataKey="Calls" 
                                            stackId="a" 
                                            fill="hsl(var(--chart-1))" 
                                            className="cursor-pointer"
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    const matched = displayedLeads.filter(l => l.companyName === data.name);
                                                    setDrillDownData({ title: `Lead Details: ${data.name}`, leads: matched });
                                                }
                                            }}
                                        />
                                        <Bar 
                                            dataKey="Emails" 
                                            stackId="a" 
                                            fill="hsl(var(--chart-2))" 
                                            className="cursor-pointer"
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    const matched = displayedLeads.filter(l => l.companyName === data.name);
                                                    setDrillDownData({ title: `Lead Details: ${data.name}`, leads: matched });
                                                }
                                            }}
                                        />
                                        <Bar 
                                            dataKey="Meetings" 
                                            stackId="a" 
                                            fill="hsl(var(--chart-3))" 
                                            className="cursor-pointer"
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    const matched = displayedLeads.filter(l => l.companyName === data.name);
                                                    setDrillDownData({ title: `Lead Details: ${data.name}`, leads: matched });
                                                }
                                            }}
                                        />
                                        <Bar 
                                            dataKey="Updates" 
                                            stackId="a" 
                                            fill="hsl(var(--chart-4))" 
                                            className="cursor-pointer"
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    const matched = displayedLeads.filter(l => l.companyName === data.name);
                                                    setDrillDownData({ title: `Lead Details: ${data.name}`, leads: matched });
                                                }
                                            }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">No breakdown data available.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outcomes" className="flex-1 mt-0">
                    <Card className="border-[#095c7b]/10 shadow-sm h-[600px] flex flex-col">
                        <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                            <CardTitle className="text-lg text-[#095c7b]">Activity Outcomes (Customer Status)</CardTitle>
                            <CardDescription>How much effort (activities & duration) is spent in each lead status bucket.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            {outcomeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={outcomeChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="status" angle={-45} textAnchor="end" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                                        <YAxis yAxisId="left" name="Activities" tick={{ fill: '#64748b' }} />
                                        <YAxis yAxisId="right" orientation="right" name="Duration (Mins)" tick={{ fill: '#64748b' }} />
                                        <Tooltip 
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const acts = payload.find((p: any) => p.dataKey === 'activities')?.value || 0;
                                                    const mins = payload.find((p: any) => p.dataKey === 'duration')?.value || 0;
                                                    const val = payload[0].payload.value || 0;
                                                    return (
                                                        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg">
                                                            <p className="font-bold text-[#095c7b] mb-2">{label}</p>
                                                            <p className="text-sm">Activities: <span className="font-medium text-blue-600">{acts}</span></p>
                                                            <p className="text-sm">Time Spent: <span className="font-medium text-orange-500">{Math.round(mins as number)} mins</span></p>
                                                            <p className="text-sm mt-2 pt-2 border-t text-emerald-600">MRR: <strong>${(val as number).toLocaleString()}</strong></p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar yAxisId="left" dataKey="activities" name="Total Activities" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="duration" name="Total Duration (Mins)" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">No outcome data available.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appointments" className="flex-1 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <StatCard 
                            title="Scheduled Appointments" 
                            value={appointmentMetrics.scheduled} 
                            icon={CalendarIconLucide} 
                            description="Appointments in Pending status"
                            helpContent="Active appointments currently in scheduled or pending status."
                            onClick={() => {
                                const list = appointmentMetrics.relevantAppointments.filter(app => (app.appointmentStatus || 'Pending') === 'Pending');
                                const appsWithLeads = list.map(app => ({
                                    ...app,
                                    lead: leads.find(l => l.id === app.leadId)
                                }));
                                setDrillDownAppointments({
                                    title: "Scheduled Appointments",
                                    appointments: appsWithLeads
                                });
                            }}
                        />
                        <StatCard 
                            title="Cancelled Appointments" 
                            value={appointmentMetrics.cancelled} 
                            icon={CalendarIconLucide} 
                            description="Appointments in Cancelled status"
                            helpContent="Appointments that have been explicitly cancelled by the lead or account manager."
                            onClick={() => {
                                const list = appointmentMetrics.relevantAppointments.filter(app => app.appointmentStatus === 'Cancelled');
                                const appsWithLeads = list.map(app => ({
                                    ...app,
                                    lead: leads.find(l => l.id === app.leadId)
                                }));
                                setDrillDownAppointments({
                                    title: "Cancelled Appointments",
                                    appointments: appsWithLeads
                                });
                            }}
                        />
                        <StatCard 
                            title="Rescheduled Appointments" 
                            value={appointmentMetrics.rescheduled} 
                            icon={CalendarIconLucide} 
                            description="Appointments in Rescheduled status"
                            helpContent="Appointments that were rescheduled to a future date."
                            onClick={() => {
                                const list = appointmentMetrics.relevantAppointments.filter(app => app.appointmentStatus === 'Rescheduled');
                                const appsWithLeads = list.map(app => ({
                                    ...app,
                                    lead: leads.find(l => l.id === app.leadId)
                                }));
                                setDrillDownAppointments({
                                    title: "Rescheduled Appointments",
                                    appointments: appsWithLeads
                                });
                            }}
                        />
                        <StatCard 
                            title="Completed Appointments" 
                            value={appointmentMetrics.completed} 
                            icon={CalendarIconLucide} 
                            description="Appointments in Completed status"
                            helpContent="Appointments that have been successfully completed."
                            onClick={() => {
                                const list = appointmentMetrics.relevantAppointments.filter(app => app.appointmentStatus === 'Completed');
                                const appsWithLeads = list.map(app => ({
                                    ...app,
                                    lead: leads.find(l => l.id === app.leadId)
                                }));
                                setDrillDownAppointments({
                                    title: "Completed Appointments",
                                    appointments: appsWithLeads
                                });
                            }}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px] mb-6">
                        <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                            <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                                <CardTitle className="text-lg text-[#095c7b]">Appointments per Account Manager</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-6">
                                {appointmentMetrics.perAm.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={appointmentMetrics.perAm} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar 
                                                dataKey="count" 
                                                fill="hsl(var(--chart-1))" 
                                                name="Appointments" 
                                                radius={[4, 4, 0, 0]} 
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                    if (data && data.name) {
                                                        const amName = data.name;
                                                        const appLeadIds = new Set(allAppointments.filter(app => (app.assignedTo || app.dialerAssigned || app.amName) === amName).map(app => app.leadId));
                                                        const matchedLeads = displayedLeads.filter(l => appLeadIds.has(l.id));
                                                        setDrillDownData({ title: `Leads with Appointments assigned to ${amName}`, leads: matchedLeads });
                                                    }
                                                }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available.</div>
                                )}
                            </CardContent>
                        </Card>
                        
                        <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                            <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                                <CardTitle className="text-lg text-[#095c7b]">Appointments Created by Week</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-6">
                                {appointmentMetrics.byWeekCreated.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={appointmentMetrics.byWeekCreated} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" angle={-45} textAnchor="end" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Appointments" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px] mb-6">
                        <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                            <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                                <CardTitle className="text-lg text-[#095c7b]">Appointments by Date Scheduled</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-6">
                                {appointmentMetrics.byDateScheduled.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={appointmentMetrics.byDateScheduled} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" angle={-45} textAnchor="end" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Appointments" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available.</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-[#095c7b]/10 shadow-sm h-full flex flex-col">
                            <CardHeader className="pb-3 border-b border-[#095c7b]/10">
                                <CardTitle className="text-lg text-[#095c7b]">Appointments per Lead (Top 20)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Lead</TableHead>
                                                <TableHead className="text-right">Appointments</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {appointmentMetrics.perLead.slice(0, 20).map(lead => (
                                                <TableRow key={lead.name}>
                                                    <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                                                    <TableCell className="text-right">{lead.count}</TableCell>
                                                </TableRow>
                                            ))}
                                            {appointmentMetrics.perLead.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No leads with appointments.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={!!drillDownData} onOpenChange={(open) => !open && setDrillDownData(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-white">
                    <DialogHeader>
                        <div className="flex items-center justify-between mr-8">
                            <div>
                                <DialogTitle className="text-xl font-bold text-[#095c7b]">{drillDownData?.title}</DialogTitle>
                                <DialogDescription>Showing {filteredDrillDownLeads.length} leads matching this metric.</DialogDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-[#095c7b]/20 hover:bg-[#095c7b]/5"
                                onClick={() => drillDownData && handleExportData(filteredDrillDownLeads, drillDownData.title.toLowerCase().replace(/\s+/g, '_'))}
                            >
                                <Download className="h-4 w-4 mr-2" /> Export List
                            </Button>
                        </div>
                        {drillDownData && drillDownData.leads.length > 0 && (
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                                    <Input
                                        placeholder="Search by company or contact..."
                                        value={drillDownSearchQuery}
                                        onChange={(e) => setDrillDownSearchQuery(e.target.value)}
                                        className="h-8 text-xs w-full max-w-[300px]"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Status:</span>
                                    <Select value={drillDownStatusFilter} onValueChange={setDrillDownStatusFilter}>
                                        <SelectTrigger className="w-[180px] h-8 text-sm">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            {drillDownAvailableStatuses.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </DialogHeader>
                    <div className="mt-4 overflow-y-auto max-h-[50vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Account Manager</TableHead>
                                    <TableHead>Franchisee</TableHead>
                                    <TableHead>Lead Type</TableHead>
                                    <TableHead>Date Entered</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrillDownLeads.map((lead) => (
                                    <TableRow key={lead.id}>
                                        <TableCell className="font-medium">{lead.companyName}</TableCell>
                                        <TableCell>
                                            <LeadStatusBadge status={(lead.customerStatus || lead.status) as LeadStatus} />
                                        </TableCell>
                                        <TableCell className="text-sm">{lead.accountManagerAssigned || '-'}</TableCell>
                                        <TableCell className="text-sm">{lead.franchisee || '-'}</TableCell>
                                        <TableCell className="text-sm">
                                            {lead.leadType && lead.leadType !== 'Unknown' ? (
                                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px]">{lead.leadType}</Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">{lead.dateLeadEntered || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={`/leads/${lead.id}`} target="_blank" rel="noopener noreferrer">
                                                    View <ExternalLink className="ml-2 h-3 w-3" />
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredDrillDownLeads.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                                            No leads found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!drillDownAppointments} onOpenChange={(open) => !open && setDrillDownAppointments(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-white">
                    <DialogHeader>
                        <div className="flex items-center justify-between mr-8">
                            <div>
                                <DialogTitle className="text-xl font-bold text-[#095c7b]">{drillDownAppointments?.title}</DialogTitle>
                                <DialogDescription>Showing {filteredDrillDownAppointments.length} appointments.</DialogDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-[#095c7b]/20 hover:bg-[#095c7b]/5"
                                onClick={() => drillDownAppointments && handleExportAppointments(filteredDrillDownAppointments, drillDownAppointments.title.toLowerCase().replace(/\s+/g, '_'))}
                            >
                                <Download className="h-4 w-4 mr-2" /> Export List
                            </Button>
                        </div>
                        {drillDownAppointments && drillDownAppointments.appointments.length > 0 && (
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                                    <Input
                                        placeholder="Search by company or contact name..."
                                        value={drillDownAppSearchQuery}
                                        onChange={(e) => setDrillDownAppSearchQuery(e.target.value)}
                                        className="h-8 text-xs w-full max-w-[300px]"
                                    />
                                </div>
                            </div>
                        )}
                    </DialogHeader>
                    <div className="mt-4 overflow-y-auto max-h-[50vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Lead Status</TableHead>
                                    <TableHead>Appointment Status</TableHead>
                                    <TableHead>Scheduled Date</TableHead>
                                    <TableHead>Scheduled Time</TableHead>
                                    <TableHead>Assigned AM</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrillDownAppointments.map((app) => {
                                    const primaryContact = app.lead?.contacts?.find(c => c.isPrimary) || app.lead?.contacts?.[0];
                                    return (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium text-sm">{app.leadName || app.lead?.companyName || 'Unknown'}</TableCell>
                                            <TableCell className="text-sm">
                                                {primaryContact ? (
                                                    <div>
                                                        <div className="font-medium text-xs">{primaryContact.name}</div>
                                                        <div className="text-muted-foreground text-[10px]">{primaryContact.phone || primaryContact.email}</div>
                                                    </div>
                                                ) : app.lead?.customerPhone || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {app.lead ? (
                                                    <LeadStatusBadge status={(app.lead.customerStatus || app.lead.status) as LeadStatus} />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {app.appointmentStatus || 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{(app.date || app.duedate || app.appointmentDate || '').split('T')[0] || '-'}</TableCell>
                                            <TableCell className="text-sm">{app.starttime || (app.date && app.date.includes('T') ? app.date.split('T')[1].substring(0, 5) : '-')}</TableCell>
                                            <TableCell className="text-sm">{app.assignedTo || app.amName || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={`/leads/${app.leadId}`} target="_blank" rel="noopener noreferrer">
                                                        View <ExternalLink className="ml-2 h-3 w-3" />
                                                    </a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredDrillDownAppointments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                                            No appointments found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
