"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Phone, Building, User as UserIcon, AlertCircle, Mail, FileText, Filter, MapPin, Store, Search, Kanban, List, LayoutGrid, ArrowUpDown, X, SlidersHorizontal, Calendar } from 'lucide-react';
import { parseISO, startOfDay, format } from 'date-fns';
import { logActivity, updateLeadDetails } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseDateString } from '@/lib/utils';


// Dialogs
import { LeadEmailDialog } from './lead-email-dialog';
import { LeadNotesDialog } from './lead-notes-dialog';

export default function PipelineDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    
    const [viewMode, setViewMode] = useState<'board' | 'accordion' | 'grid'>('accordion');
    const [sortBy, setSortBy] = useState<'franchisee' | 'companyName' | 'dateLeadEntered'>('franchisee');
    
    const [filters, setFilters] = useState({
        status: 'all',
        campaign: 'all',
        appointmentStatus: 'all',
        franchisee: '',
        state: '',
        suburb: '',
        postcode: ''
    });
    
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    
    const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';
    
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
                    const filteredLeads = fetchedLeads.filter(l => 
                        isAm ? l.accountManagerAssigned === loggedInAmName : 
                        (selectedAm !== 'all' ? l.accountManagerAssigned === selectedAm : true)
                    );
                    
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
    
    const uniqueCampaigns = useMemo(() => {
        const campaigns = new Set<string>();
        leads.forEach(lead => {
            if (lead.campaign) {
                if (lead.campaign === 'Door-to-Door Field Sales' || lead.campaign === 'Door-to-door Field Sales') {
                    campaigns.add('D2D');
                } else {
                    campaigns.add(lead.campaign);
                }
            }
        });
        campaigns.add('Franchisee');
        return Array.from(campaigns).map(c => ({ value: c, label: c })).sort((a, b) => a.label.localeCompare(b.label));
    }, [leads]);

    const uniqueFranchisees = useMemo(() => {
        const franchisees = new Set<string>();
        leads.forEach(lead => {
            if (lead.franchisee && isNaN(Number(lead.franchisee))) {
                franchisees.add(lead.franchisee);
            }
        });
        return Array.from(franchisees).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
    }, [leads]);

    // Apply Advanced Filters and Search
    const filteredLeads = useMemo(() => {
        const amNames = new Set(accountManagers.map(getAmName));
        return leads.filter(lead => {
            // Must be assigned to the account_manager or inbound bucket
            if (lead.bucket !== 'account_manager' && lead.bucket !== 'inbound') return false;

            const currentStatus = lead.customerStatus || lead.status;
            if (currentStatus === 'Lost') return false;

            // Only show leads assigned to existing users with "Account Managers" role
            if (isAdmin && selectedAm === 'all') {
                if (!lead.accountManagerAssigned || !amNames.has(lead.accountManagerAssigned)) {
                    return false;
                }
            }

            if (searchQuery && !lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filters.status !== 'all' && currentStatus !== filters.status) return false;
            if (filters.campaign !== 'all' && lead.campaign !== filters.campaign) return false;
            if (filters.appointmentStatus !== 'all') {
                const hasMatchingAppt = lead.appointments?.some(a => {
                    const status = a.appointmentStatus || 'Pending';
                    return status === filters.appointmentStatus;
                });
                if (!hasMatchingAppt) return false;
            }
            if (filters.franchisee && !lead.franchisee?.toLowerCase().includes(filters.franchisee.toLowerCase())) return false;
            if (filters.state && !lead.address?.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
            if (filters.suburb && !lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase())) return false;
            if (filters.postcode && !lead.address?.zip?.toLowerCase().includes(filters.postcode.toLowerCase())) return false;
            return true;
        });
    }, [leads, filters, searchQuery, accountManagers, isAdmin, selectedAm]);

    // Segmentation Logic
    const priorityLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            const currentStatus = lead.customerStatus || lead.status;
            const isPriorityStatus = ['Priority Lead', 'High Touch', 'Reschedule', 'Hot Lead'].includes(currentStatus);
            
            const hasAppointmentToday = lead.appointments?.some(app => {
                if (!app.appointmentDate) return false;
                try { return startOfDay(parseISO(app.appointmentDate)).getTime() === today; } catch(e) { return false; }
            });
            
            const hasTaskToday = lead.tasks?.some(task => {
                if (!task.dueDate) return false;
                try { return startOfDay(parseISO(task.dueDate)).getTime() === today; } catch(e) { return false; }
            });
            
            const isLowOnLocalMileTrials = lead.localMileTrialsRemaining !== undefined && lead.localMileTrialsRemaining <= 1;
            
            return isPriorityStatus || hasAppointmentToday || hasTaskToday || isLowOnLocalMileTrials;
        });
    }, [filteredLeads]);
    
    const quotesOut = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return currentStatus === 'Quote Sent';
        });
    }, [filteredLeads, priorityLeads]);

    const productPending = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return ['ShipMate Pending', 'Trialing ShipMate'].includes(currentStatus);
        });
    }, [filteredLeads, priorityLeads]);

    const localMilePending = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return ['LocalMile Opportunity', 'LocalMile Pending'].includes(currentStatus);
        });
    }, [filteredLeads, priorityLeads]);

    const wipLeads = useMemo(() => {
        const wipStatuses = ['New', 'In Progress', 'Connected', 'In Qualification'];
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || quotesOut.includes(lead) || productPending.includes(lead) || localMilePending.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return wipStatuses.includes(currentStatus) || !currentStatus;
        });
    }, [filteredLeads, priorityLeads, quotesOut, productPending, localMilePending]);
    
    const handleCall = async (leadId: string, phone: string) => {
        window.open(`aircall:${phone}`, '_self');
        await logActivity(leadId, {
            type: 'Call',
            notes: `Initiated call to ${phone} via AirCall from AM Pipeline.`,
            author: loggedInAmName || 'System'
        });
    };

    const openLead = (leadId: string) => {
        window.open(`/leads/${leadId}`, '_blank');
    };

    const handleAmReassign = async (leadId: string, amName: string) => {
        try {
            const finalAmName = amName === 'unassigned' ? '' : amName;
            await updateLeadDetails(leadId, {} as any, { accountManagerAssigned: finalAmName });
            await logActivity(leadId, {
                type: 'Update',
                notes: `Reassigned Account Manager to ${finalAmName || 'Unassigned'} from Pipeline Dashboard.`,
                author: loggedInAmName || 'System'
            });
            // Optimistically update local state
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, accountManagerAssigned: finalAmName } : l));
        } catch (error) {
            console.error("Failed to reassign AM", error);
        }
    };

    if (loading || isLoadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
    }

    if (!isAdmin && !isAm) {
        return <div className="p-6">You do not have permission to view this page.</div>;
    }
    
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#095c7b] tracking-tight">AM Pipeline</h1>
                    <p className="text-[#095c7b]/80 mt-1">Manage your pipeline and daily focus</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <>
                            <span className="text-[#095c7b] font-medium text-sm hidden md:inline">View Pipeline For:</span>
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
                        </>
                    )}

                    <div className="relative hidden md:block w-64" id="step-pipeline-search">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search company..."
                            className="w-full bg-white pl-8 border-[#095c7b]/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Collapsible className="mb-6" id="step-pipeline-filters">
                <Card className="border-[#095c7b]/20 bg-white/70 shadow-sm">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-[#095c7b]" />
                            <h4 className="font-bold text-[#095c7b] text-lg">Filters</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-[#095c7b] hover:bg-[#095c7b]/10">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    <span className="ml-2">Toggle Filters</span>
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                    </div>
                    <CollapsibleContent>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end pb-4 pt-0">
                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-xs font-semibold text-[#095c7b]">Lead Status</Label>
                                <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                                    <SelectTrigger id="status" className="bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="New">New</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Quote Sent">Quote Sent</SelectItem>
                                        <SelectItem value="ShipMate Pending">ShipMate Pending</SelectItem>
                                        <SelectItem value="Trialing ShipMate">Trialing ShipMate</SelectItem>
                                        <SelectItem value="LocalMile Opportunity">LocalMile Opportunity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="campaign" className="text-xs font-semibold text-[#095c7b]">Campaign</Label>
                                <Select value={filters.campaign} onValueChange={(val) => setFilters({...filters, campaign: val})}>
                                    <SelectTrigger id="campaign" className="bg-white"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Campaigns</SelectItem>
                                        {uniqueCampaigns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointmentStatus" className="text-xs font-semibold text-[#095c7b]">Appointment</Label>
                                <Select value={filters.appointmentStatus} onValueChange={(val) => setFilters({...filters, appointmentStatus: val})}>
                                    <SelectTrigger id="appointmentStatus" className="bg-white"><SelectValue placeholder="All Appointments" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Appointments</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="franchisee" className="text-xs font-semibold text-[#095c7b]">Franchisee</Label>
                                <Select value={filters.franchisee || 'all'} onValueChange={(val) => setFilters({...filters, franchisee: val === 'all' ? '' : val})}>
                                    <SelectTrigger id="franchisee" className="bg-white"><SelectValue placeholder="All Franchisees" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Franchisees</SelectItem>
                                        {uniqueFranchisees.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state" className="text-xs font-semibold text-[#095c7b]">State</Label>
                                <Input id="state" placeholder="State" className="bg-white" value={filters.state} onChange={(e) => setFilters({...filters, state: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="suburb" className="text-xs font-semibold text-[#095c7b]">Suburb</Label>
                                <Input id="suburb" placeholder="Suburb" className="bg-white" value={filters.suburb} onChange={(e) => setFilters({...filters, suburb: e.target.value})} />
                            </div>
                            <div className="space-y-2 flex gap-2 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="postcode" className="text-xs font-semibold text-[#095c7b]">Postcode</Label>
                                    <Input id="postcode" placeholder="Postcode" className="bg-white" value={filters.postcode} onChange={(e) => setFilters({...filters, postcode: e.target.value})} />
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/10 shrink-0"
                                    onClick={() => setFilters({ status: 'all', campaign: 'all', appointmentStatus: 'all', franchisee: '', state: '', suburb: '', postcode: '' })}
                                    title="Clear Filters"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
            
            <div className="md:hidden mb-4 relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search company..."
                    className="w-full bg-white pl-8 border-[#095c7b]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <Tabs defaultValue="priority" className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-white/80 p-1.5 rounded-t-xl border border-white/60 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-3">
                    <TabsList id="step-retention-segments" className="bg-transparent overflow-x-auto flex w-full lg:w-auto justify-start lg:justify-start">
                        <TabsTrigger value="priority" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Priority <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b]">{priorityLeads.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="wip" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Work in Progress <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{wipLeads.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="quotes-out" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Quotes Out <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{quotesOut.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="product-pending" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Product Pending <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{productPending.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="localmile" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            LocalMile <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{localMilePending.length}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto px-2 pb-1.5 lg:pb-0 shrink-0">
                        <div id="step-pipeline-views" className="flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/10 p-0.5 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                            <span className="text-[10px] font-bold text-[#095c7b] uppercase tracking-wider px-2 hidden sm:inline">View</span>
                            <Button
                                size="sm"
                                variant={viewMode === 'board' ? 'default' : 'ghost'}
                                className={`h-7 px-2.5 rounded-md gap-1.5 text-xs ${
                                    viewMode === 'board' 
                                        ? 'bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm' 
                                        : 'text-[#095c7b] hover:bg-[#095c7b]/10'
                                }`}
                                onClick={() => setViewMode('board')}
                                title="Kanban Board View"
                            >
                                <Kanban className="h-3.5 w-3.5" />
                                <span className="inline">Board</span>
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                                className={`h-7 px-2.5 rounded-md gap-1.5 text-xs ${
                                    viewMode === 'accordion' 
                                        ? 'bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm' 
                                        : 'text-[#095c7b] hover:bg-[#095c7b]/10'
                                }`}
                                onClick={() => setViewMode('accordion')}
                                title="Accordion Groups View"
                            >
                                <List className="h-3.5 w-3.5" />
                                <span className="inline">Groups</span>
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                className={`h-7 px-2.5 rounded-md gap-1.5 text-xs ${
                                    viewMode === 'grid' 
                                        ? 'bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm' 
                                        : 'text-[#095c7b] hover:bg-[#095c7b]/10'
                                }`}
                                onClick={() => setViewMode('grid')}
                                title="Flat Grid View"
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span className="inline">Grid</span>
                            </Button>
                        </div>

                        <div id="step-pipeline-sort" className="flex items-center gap-1.5 w-full sm:w-auto">
                            <ArrowUpDown className="h-3.5 w-3.5 text-[#095c7b]/60 shrink-0" />
                            <span className="text-[10px] font-bold text-[#095c7b]/75 uppercase tracking-wider shrink-0 hidden sm:inline">Sort</span>
                            <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
                                <SelectTrigger className="h-8 w-full sm:w-[150px] text-xs bg-white border-[#095c7b]/20 text-[#095c7b] focus:ring-0">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="franchisee" className="text-xs">Franchisee</SelectItem>
                                    <SelectItem value="companyName" className="text-xs">Company Name</SelectItem>
                                    <SelectItem value="dateLeadEntered" className="text-xs">Date Assigned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className={`flex-1 bg-white/50 rounded-b-xl border border-t-0 border-white/60 p-4 ${viewMode === 'board' ? 'overflow-hidden flex flex-col h-full' : 'overflow-y-auto'}`}>
                    <TabsContent value="priority" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                        <LeadGrid leads={priorityLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin || isAm} />
                    </TabsContent>
                    <TabsContent value="wip" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                        <LeadGrid leads={wipLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin || isAm} />
                    </TabsContent>
                    <TabsContent value="quotes-out" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                        <LeadGrid leads={quotesOut} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin || isAm} />
                    </TabsContent>
                    <TabsContent value="product-pending" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                        <LeadGrid leads={productPending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin || isAm} />
                    </TabsContent>
                    <TabsContent value="localmile" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                        <LeadGrid leads={localMilePending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin || isAm} />
                    </TabsContent>
                </div>
            </Tabs>

            <LeadEmailDialog isOpen={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} lead={activeLead} />
            <LeadNotesDialog isOpen={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} lead={activeLead} />
        </div>
    );
}

interface GroupedLeads {
    [status: string]: Lead[];
}

const STATUS_ORDER: { [status: string]: number } = {
    'New': 10,
    'Priority Lead': 20,
    'Hot Lead': 21,
    'High Touch': 22,
    'Reschedule': 23,
    'In Progress': 30,
    'Connected': 31,
    'In Qualification': 32,
    'Quote Sent': 40,
    'ShipMate Pending': 50,
    'Trialing ShipMate': 51,
    'LocalMile Opportunity': 60,
    'LocalMile Pending': 61,
};

const getStatusOrder = (status: string) => {
    return STATUS_ORDER[status] !== undefined ? STATUS_ORDER[status] : 999;
};

function LeadGrid({ 
    leads, 
    viewMode, 
    sortBy, 
    onCall, 
    onClick, 
    onEmail, 
    onNotes,
    onAmReassign,
    accountManagers,
    canReassign
}: { 
    leads: Lead[], 
    viewMode: 'board' | 'accordion' | 'grid', 
    sortBy: 'franchisee' | 'companyName' | 'dateLeadEntered', 
    onCall: (id: string, phone: string) => void, 
    onClick: (id: string) => void, 
    onEmail: (lead: Lead) => void, 
    onNotes: (lead: Lead) => void,
    onAmReassign?: (leadId: string, amName: string) => void,
    accountManagers?: UserProfile[],
    canReassign?: boolean
}) {
    if (leads.length === 0) {
        return <div className="text-center p-12 text-muted-foreground">No leads in this bucket.</div>;
    }

    // 1. Sort leads
    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            if (sortBy === 'franchisee') {
                const valA = a.franchisee || '';
                const valB = b.franchisee || '';
                if (!valA && valB) return 1;
                if (valA && !valB) return -1;
                if (!valA && !valB) return (a.companyName || '').localeCompare(b.companyName || '');
                const cmp = valA.localeCompare(valB);
                return cmp !== 0 ? cmp : (a.companyName || '').localeCompare(b.companyName || '');
            } else if (sortBy === 'companyName') {
                return (a.companyName || '').localeCompare(b.companyName || '');
            } else if (sortBy === 'dateLeadEntered') {
                const dateA = parseDateString(a.dateLeadEntered)?.getTime() || 0;
                const dateB = parseDateString(b.dateLeadEntered)?.getTime() || 0;
                return dateB - dateA;
            }
            return 0;
        });
    }, [leads, sortBy]);

    // 2. Group leads by status if not in grid mode
    const groupedLeads = useMemo(() => {
        if (viewMode === 'grid') return {};
        const groups: GroupedLeads = {};
        sortedLeads.forEach(lead => {
            const status = lead.customerStatus || lead.status || 'No Status';
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(lead);
        });
        return groups;
    }, [sortedLeads, viewMode]);

    // 3. Get sorted status headers
    const sortedStatuses = useMemo(() => {
        if (viewMode === 'grid') return [];
        return Object.keys(groupedLeads).sort((a, b) => getStatusOrder(a) - getStatusOrder(b));
    }, [groupedLeads, viewMode]);

    // 4. Render based on view mode
    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} onAmReassign={onAmReassign} accountManagers={accountManagers} canReassign={canReassign} />
                ))}
            </div>
        );
    }

    if (viewMode === 'accordion') {
        return (
            <Accordion type="multiple" className="space-y-4">
                {sortedStatuses.map(status => (
                    <AccordionItem key={status} value={status} className="border border-[#095c7b]/10 bg-white/70 rounded-lg px-4 shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-[#095c7b]">{status}</span>
                                <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none">{groupedLeads[status].length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {groupedLeads[status].map(lead => (
                                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} onAmReassign={onAmReassign} accountManagers={accountManagers} canReassign={canReassign} />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    // Default: 'board' (Kanban layout)
    return (
        <div className="flex gap-4 overflow-x-auto pb-2 flex-1 h-full select-none">
            {sortedStatuses.map(status => (
                <div key={status} className="flex flex-col bg-white/40 border border-[#095c7b]/10 rounded-xl p-3 w-80 md:w-96 shrink-0 h-full max-h-full">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#095c7b]/10 shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#095c7b]">{status}</h3>
                            <Badge className="bg-[#095c7b] text-white text-[10px]">{groupedLeads[status].length}</Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                        {groupedLeads[status].map(lead => (
                            <div key={lead.id} className="transform hover:-translate-y-0.5 transition-transform duration-200">
                                <LeadCard lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} onAmReassign={onAmReassign} accountManagers={accountManagers} canReassign={canReassign} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function LeadCard({ lead, onCall, onClick, onEmail, onNotes, onAmReassign, accountManagers, canReassign }: { lead: Lead, onCall: (id: string, phone: string) => void, onClick: () => void, onEmail: () => void, onNotes: () => void, onAmReassign?: (leadId: string, amName: string) => void, accountManagers?: UserProfile[], canReassign?: boolean }) {
    const [subAppointments, setSubAppointments] = useState<any[]>([]);

    useEffect(() => {
        if (!lead.id) return;
        const q = query(collection(firestore, 'leads', lead.id, 'appointments'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setSubAppointments(appts);
        });
        return () => unsubscribe();
    }, [lead.id]);

    const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
    const contactName = primaryContact?.name || lead.discoveryData?.personSpokenWithName || lead.customerPhone || 'No Contact Info';
    
    // Gather unique phone numbers
    const phoneNumbers: { label: string; phone: string }[] = [];
    if (lead.customerPhone) {
        phoneNumbers.push({ label: 'Main', phone: lead.customerPhone });
    }
    if (lead.contacts && lead.contacts.length > 0) {
        lead.contacts.forEach((c) => {
            if (c.phone) {
                phoneNumbers.push({ label: c.name || 'Contact', phone: c.phone });
            }
        });
    }
    const uniquePhones = Array.from(new Map(phoneNumbers.map(item => [item.phone, item])).values());
    
    const email = lead.customerServiceEmail || primaryContact?.email;
    const currentStatus = lead.customerStatus || lead.status;
    const fullAddress = [lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ');
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const allAppointmentsMap = new Map();
    lead.appointments?.forEach(a => allAppointmentsMap.set(a.id, a));
    subAppointments.forEach(a => allAppointmentsMap.set(a.id, a));
    const allAppointments = Array.from(allAppointmentsMap.values());

    const upcomingAppointment = allAppointments
        .filter(a => {
            const d = a.date || a.appointmentDate;
            const status = a.appointmentStatus || 'Pending';
            return d && new Date(d) >= now && status === 'Pending';
        })
        .sort((a, b) => {
            const dA = a.date || a.appointmentDate;
            const dB = b.date || b.appointmentDate;
            return new Date(dA!).getTime() - new Date(dB!).getTime();
        })[0];
        
    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-[#095c7b]/10 group flex flex-col justify-between" onClick={onClick}>
            <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                    <div className="pr-2">
                        <h3 className="font-bold text-[#095c7b] line-clamp-1 group-hover:underline" title={lead.companyName}>
                            {lead.companyName}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 uppercase shrink-0">
                                {currentStatus}
                            </Badge>
                            {lead.bucket && (
                                <Badge 
                                    variant="outline" 
                                    className={`text-[10px] uppercase shrink-0 border ${
                                        lead.bucket === 'outbound' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        lead.bucket === 'field_sales' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        lead.bucket === 'inbound' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    {lead.bucket === 'field_sales' ? 'Field Sales' : lead.bucket}
                                </Badge>
                            )}
                            {lead.localMileTrialsRemaining !== undefined && lead.localMileTrialsRemaining <= 1 && (
                                <Badge 
                                    variant="outline" 
                                    className="text-[10px] uppercase shrink-0 border bg-red-50 text-red-700 border-red-200 animate-pulse"
                                >
                                    ⚠️ {lead.localMileTrialsRemaining === 0 ? 'Out of Trials' : '1 Trial Left'}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 z-10">
                        {email && (
                            <Button 
                                size="icon" 
                                variant="outline"
                                className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEmail();
                                }}
                                title="Send Email"
                            >
                                <Mail className="h-4 w-4" />
                            </Button>
                        )}
                        <Button 
                            size="icon" 
                            variant="outline"
                            className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNotes();
                            }}
                            title="View Notes & Activities"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                        {uniquePhones.length === 1 && (
                            <Button 
                                size="icon" 
                                variant="default"
                                className="h-8 w-8 rounded-full bg-[#eaf143] text-[#095c7b] hover:bg-[#d4dd33]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCall(lead.id!, uniquePhones[0].phone);
                                }}
                                title={`Call ${uniquePhones[0].phone} with AirCall`}
                            >
                                <Phone className="h-4 w-4" />
                            </Button>
                        )}
                        {uniquePhones.length > 1 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        size="icon" 
                                        variant="default"
                                        className="h-8 w-8 rounded-full bg-[#eaf143] text-[#095c7b] hover:bg-[#d4dd33]"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Select number to call"
                                    >
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    {uniquePhones.map((p, idx) => (
                                        <DropdownMenuItem key={idx} onClick={() => onCall(lead.id!, p.phone)}>
                                            <Phone className="mr-2 h-4 w-4 text-[#095c7b]" />
                                            <span className="font-medium mr-1">{p.label}:</span> {p.phone}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 flex-1">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{contactName}</span>
                    </div>
                    {lead.accountManagerAssigned && !canReassign && (
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-slate-400 shrink-0">AM:</span>
                            <span className="line-clamp-1 font-medium">{lead.accountManagerAssigned}</span>
                        </div>
                    )}
                    {canReassign && accountManagers && onAmReassign && (
                         <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="font-medium text-xs text-slate-400 shrink-0">AM:</span>
                            <Select 
                                value={lead.accountManagerAssigned || 'unassigned'} 
                                onValueChange={(val) => onAmReassign(lead.id!, val)}
                            >
                                <SelectTrigger className="h-6 px-2 text-xs w-full bg-white border-[#095c7b]/20">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {accountManagers.map(am => {
                                        const name = am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email;
                                        return <SelectItem key={am.uid} value={name}>{name}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {lead.franchisee && (
                        <div className="flex items-center gap-2">
                            <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1 font-medium text-[#095c7b]">{lead.franchisee}</span>
                        </div>
                    )}
                    {fullAddress && (
                        <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 text-xs">{fullAddress}</span>
                        </div>
                    )}
                    {upcomingAppointment && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#095c7b]/10">
                            <Calendar className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                            <span className="text-xs font-semibold text-[#095c7b]">
                                Appt: {format(new Date(upcomingAppointment.date || upcomingAppointment.appointmentDate!), 'MMM d, h:mm a')}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
