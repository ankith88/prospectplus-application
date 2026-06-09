"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Phone, Building, User as UserIcon, AlertCircle, Mail, FileText, Filter, MapPin, Store, Search, Kanban, List, LayoutGrid, ArrowUpDown, TableProperties as TableIcon } from 'lucide-react';
import { parseISO, startOfDay } from 'date-fns';
import { logActivity, logCallActivity, updateLeadDetails } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


// Dialogs
import { LeadEmailDialog } from '../account-manager/lead-email-dialog';
import { LeadNotesDialog } from '../account-manager/lead-notes-dialog';
import { SmsDialog } from '@/components/sms-dialog';

export default function CustomerSuccessDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedCs, setSelectedCs] = useState<string>('all');
    
    const [viewMode, setViewMode] = useState<'board' | 'accordion' | 'grid' | 'table'>('table');
    const [sortBy, setSortBy] = useState<'franchisee' | 'companyName' | 'dateLeadEntered'>('franchisee');
    
    const [filters, setFilters] = useState({
        status: 'all',
        campaign: 'all',
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
    const [calledDialogOpen, setCalledDialogOpen] = useState(false);
    const [calledLead, setCalledLead] = useState<Lead | null>(null);
    const [lostDialogOpen, setLostDialogOpen] = useState(false);
    const [lostLead, setLostLead] = useState<Lead | null>(null);
    const [smsDialogOpen, setSmsDialogOpen] = useState(false);
    const [smsTargetPhone, setSmsTargetPhone] = useState('');
    const [smsTargetName, setSmsTargetName] = useState('');

    // Journeys & States
    const [journeys, setJourneys] = useState<any[]>([]);
    const [journeyStates, setJourneyStates] = useState<Record<string, any[]>>({});
    
    const [submittingCall, setSubmittingCall] = useState(false);
    const [callOutcome, setCallOutcome] = useState('Call Back/Follow-up');
    const [callNotes, setCallNotes] = useState('');

    const [submittingLost, setSubmittingLost] = useState(false);
    const [lostNotes, setLostNotes] = useState('');
    const [lostAction, setLostAction] = useState('none'); // 'none', 'email', 'sms'

    const handleSaveCallOutcome = async () => {
        if (!calledLead || !calledLead.id) return;
        setSubmittingCall(true);
        try {
            await logCallActivity(calledLead.id, {
                outcome: callOutcome,
                notes: callNotes,
                author: loggedInCsName || 'System',
                salesRecordInternalId: calledLead.salesRecordInternalId
            });

            const nowStr = new Date().toISOString();
            const newCallCount = (calledLead.csCallCount || 0) + 1;
            
            await updateLeadDetails(calledLead.id, calledLead, {
                csCalled: true,
                lastContactedDate: nowStr,
                customerStatus: STATUS_MAP[callOutcome] || calledLead.customerStatus || calledLead.status,
                csCallCount: newCallCount
            });

            setLeads(prevLeads => prevLeads.map(l => {
                if (l.id === calledLead.id) {
                    return {
                        ...l,
                        csCalled: true,
                        lastContactedDate: nowStr,
                        customerStatus: STATUS_MAP[callOutcome] || l.customerStatus || l.status,
                        csCallCount: newCallCount
                    };
                }
                return l;
            }));

            setCalledDialogOpen(false);
            setCallNotes('');
            setCallOutcome('Call Back/Follow-up');
        } catch (error) {
            console.error("Failed to log call outcome", error);
        } finally {
            setSubmittingCall(false);
        }
    };

    const handleSaveLost = async () => {
        if (!lostLead || !lostLead.id) return;
        setSubmittingLost(true);
        try {
            await logActivity(lostLead.id, {
                type: 'Update',
                notes: `Marked as Lost. Notes: ${lostNotes}`,
                author: loggedInCsName || 'System'
            });

            const nowStr = new Date().toISOString();
            
            await updateLeadDetails(lostLead.id, lostLead, {
                customerStatus: 'Lost',
                status: 'Lost',
                lastContactedDate: nowStr
            });

            // Call LocalMile.Plus API to deactivate the user account if they have access
            const localMileContact = lostLead.contacts?.find(c => c.accessToLocalMile === 'yes');
            if (localMileContact && localMileContact.email) {
                try {
                    const response = await fetch("https://us-central1-localmile-plus.cloudfunctions.net/deactivateExternalUserAccount", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123"
                        },
                        body: JSON.stringify({
                            email: localMileContact.email,
                            customer_id: lostLead.id
                        })
                    });
                    if (!response.ok) {
                        console.error("Failed to deactivate LocalMile user account", await response.text());
                    }
                } catch (apiError) {
                    console.error("Error calling deactivateExternalUserAccount", apiError);
                }
            }

            setLeads(prevLeads => prevLeads.map(l => {
                if (l.id === lostLead.id) {
                    return {
                        ...l,
                        customerStatus: 'Lost',
                        status: 'Lost',
                        lastContactedDate: nowStr
                    };
                }
                return l;
            }));

            setLostDialogOpen(false);
            setLostNotes('');
            
            if (lostAction === 'email') {
                setActiveLead(lostLead);
                setEmailDialogOpen(true);
            } else if (lostAction === 'sms') {
                const phone = lostLead.customerPhone || (lostLead.contacts && lostLead.contacts.length > 0 ? lostLead.contacts[0].phone : '');
                const name = lostLead.companyName || '';
                if (phone) {
                    setSmsTargetPhone(phone);
                    setSmsTargetName(name);
                    setSmsDialogOpen(true);
                } else {
                    console.log('No phone number found to send SMS.');
                }
            }
            setLostAction('none');
        } catch (error) {
            console.error("Failed to mark as lost", error);
        } finally {
            setSubmittingLost(false);
        }
    };

    const isAdmin = userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isCs = userProfile?.activeRole === 'Customer Success';
    
    const getCsName = (am: UserProfile) => {
        return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
    };
    
    const loggedInCsName = userProfile ? getCsName(userProfile as UserProfile) : '';

    // Fetch Customer Success for dropdown (only if admin)
    useEffect(() => {
        async function fetchAMs() {
            if (!isAdmin) return;
            try {
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('assignedRoles', 'array-contains', 'Customer Success'));
                const snap = await getDocs(q);
                const ams = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                setAccountManagers(ams);
            } catch (error) {
                console.error("Failed to fetch account managers", error);
            }
        }
        if (isAdmin) fetchAMs();
    }, [isAdmin]);

    // Fetch Journeys definitions once
    useEffect(() => {
        async function fetchJourneys() {
            try {
                const snap = await getDocs(collection(firestore, 'Journeys'));
                setJourneys(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Failed to fetch journeys", error);
            }
        }
        fetchJourneys();
    }, []);

    // Fetch Journey States for active leads to determine nurture stage
    useEffect(() => {
        if (leads.length === 0) return;
        async function fetchAllJourneyStates() {
            try {
                const statesMap: Record<string, any[]> = {};
                await Promise.all(leads.map(async (lead) => {
                    if (!lead.id) return;
                    if (!lead.activeJourneys || lead.activeJourneys.length === 0) {
                        statesMap[lead.id] = [];
                        return;
                    }
                    const snap = await getDocs(collection(firestore, 'leads', lead.id, 'journey_states'));
                    statesMap[lead.id] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }));
                setJourneyStates(statesMap);
            } catch (error) {
                console.error("Failed to fetch journey states", error);
            }
        }
        fetchAllJourneyStates();
    }, [leads]);
    
    useEffect(() => {
        if (loading) return;
        if (!isAdmin && !isCs) {
             setIsLoadingData(false);
             return;
        }
        
        async function fetchPipeline() {
            setIsLoadingData(true);
            try {
                const leadsRef = collection(firestore, 'leads');
                let q;
                
                if (isCs) {
                    q = query(leadsRef, where('customerSuccessAssigned', '==', loggedInCsName));
                } else if (isAdmin) {
                    if (selectedCs !== 'all') {
                        q = query(leadsRef, where('customerSuccessAssigned', '==', selectedCs));
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
                        isCs ? l.customerSuccessAssigned === loggedInCsName : 
                        (selectedCs !== 'all' ? l.customerSuccessAssigned === selectedCs : true)
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
    }, [loading, isCs, isAdmin, loggedInCsName, selectedCs]);
    
    // Apply Advanced Filters and Search
    const filteredLeads = useMemo(() => {
        const amNames = new Set(accountManagers.map(getCsName));
        return leads.filter(lead => {
            // Must have customerStatus OR be assigned to the customer_success bucket
            if (!lead.customerStatus && lead.bucket !== 'customer_success') return false;

            const currentStatus = lead.customerStatus || lead.status;
            if (currentStatus === 'Lost') return false;

            // Only show leads assigned to existing users with "Customer Success" role
            if (isAdmin && selectedCs === 'all') {
                if (!lead.customerSuccessAssigned || !amNames.has(lead.customerSuccessAssigned)) {
                    return false;
                }
            }

            if (searchQuery && !lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filters.status !== 'all' && currentStatus !== filters.status) return false;
            if (filters.campaign !== 'all' && lead.campaign !== filters.campaign) return false;
            if (filters.franchisee && !lead.franchisee?.toLowerCase().includes(filters.franchisee.toLowerCase())) return false;
            if (filters.state && !lead.address?.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
            if (filters.suburb && !lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase())) return false;
            if (filters.postcode && !lead.address?.zip?.toLowerCase().includes(filters.postcode.toLowerCase())) return false;
            return true;
        });
    }, [leads, filters, searchQuery, accountManagers, isAdmin, selectedCs]);

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
            
            return isPriorityStatus || hasAppointmentToday || hasTaskToday;
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
            notes: `Initiated call to ${phone} via AirCall from Customer Success Pipeline.`,
            author: loggedInCsName || 'System'
        });
    };

    const openLead = (leadId: string) => {
        window.open(`/leads/${leadId}`, '_blank');
    };

    if (loading || isLoadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
    }

    if (!isAdmin && !isCs) {
        return <div className="p-6">You do not have permission to view this page.</div>;
    }
    
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#095c7b] tracking-tight">Customer Success Pipeline</h1>
                    <p className="text-[#095c7b]/80 mt-1">Manage your pipeline and daily focus</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <>
                            <span className="text-[#095c7b] font-medium text-sm hidden md:inline">View Pipeline For:</span>
                            <Select value={selectedCs} onValueChange={setSelectedCs}>
                                <SelectTrigger className="w-[220px] bg-white border-[#095c7b]/20">
                                    <SelectValue placeholder="All Customer Success" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Customer Success</SelectItem>
                                    {accountManagers.map(am => {
                                        const name = getCsName(am);
                                        return <SelectItem key={am.uid || am.email || name} value={name}>{name}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    <div className="relative hidden md:block w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search company..."
                            className="w-full bg-white pl-8 border-[#095c7b]/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="bg-white border-[#095c7b]/20 text-[#095c7b] gap-2">
                                <Filter className="h-4 w-4" /> Filters
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Advanced Filters</h4>
                                    <p className="text-sm text-muted-foreground">Filter your pipeline leads.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Lead Status</Label>
                                    <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                                        <SelectTrigger id="status"><SelectValue placeholder="All" /></SelectTrigger>
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
                                <div className="grid gap-2">
                                    <Label htmlFor="campaign">Campaign</Label>
                                    <Input id="campaign" placeholder="e.g. MultiSite" value={filters.campaign === 'all' ? '' : filters.campaign} onChange={(e) => setFilters({...filters, campaign: e.target.value || 'all'})} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="franchisee">Franchisee</Label>
                                    <Input id="franchisee" placeholder="Filter by Franchisee" value={filters.franchisee} onChange={(e) => setFilters({...filters, franchisee: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input id="state" placeholder="State" value={filters.state} onChange={(e) => setFilters({...filters, state: e.target.value})} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="suburb">Suburb</Label>
                                        <Input id="suburb" placeholder="Suburb" value={filters.suburb} onChange={(e) => setFilters({...filters, suburb: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="postcode">Postcode</Label>
                                    <Input id="postcode" placeholder="Postcode" value={filters.postcode} onChange={(e) => setFilters({...filters, postcode: e.target.value})} />
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setFilters({ status: 'all', campaign: 'all', franchisee: '', state: '', suburb: '', postcode: '' })}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
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
                    {viewMode === 'table' ? (
                        <div className="hidden lg:block w-full lg:w-auto flex-1"></div>
                    ) : (
                        <TabsList className="bg-transparent overflow-x-auto flex w-full lg:w-auto justify-start lg:justify-start">
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
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto px-2 pb-1.5 lg:pb-0 shrink-0">
                        <div className="flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/10 p-0.5 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                            <span className="text-[10px] font-bold text-[#095c7b] uppercase tracking-wider px-2 hidden sm:inline">View</span>
                            <Button
                                size="sm"
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                className={`h-7 px-2.5 rounded-md gap-1.5 text-xs ${
                                    viewMode === 'table' 
                                        ? 'bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm' 
                                        : 'text-[#095c7b] hover:bg-[#095c7b]/10'
                                }`}
                                onClick={() => setViewMode('table')}
                                title="Table Tracker View"
                            >
                                <TableIcon className="h-3.5 w-3.5" />
                                <span className="inline">Table</span>
                            </Button>
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

                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
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
                    {viewMode === 'table' ? (
                        <LeadGrid leads={filteredLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                    ) : (
                        <>
                            <TabsContent value="priority" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                                <LeadGrid leads={priorityLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                            </TabsContent>
                            <TabsContent value="wip" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                                <LeadGrid leads={wipLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                            </TabsContent>
                            <TabsContent value="quotes-out" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                                <LeadGrid leads={quotesOut} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                            </TabsContent>
                            <TabsContent value="product-pending" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                                <LeadGrid leads={productPending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                            </TabsContent>
                            <TabsContent value="localmile" className={`m-0 h-full ${viewMode === 'board' ? 'flex flex-col overflow-hidden' : ''}`}>
                                <LeadGrid leads={localMilePending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} journeys={journeys} journeyStates={journeyStates} onMarkCalled={(l) => { setCalledLead(l); setCalledDialogOpen(true); }} onMarkLost={(l) => { setLostLead(l); setLostDialogOpen(true); }} />
                            </TabsContent>
                        </>
                    )}
                </div>
            </Tabs>

            <LeadEmailDialog isOpen={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} lead={activeLead} />
            <LeadNotesDialog isOpen={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} lead={activeLead} />

            <Dialog open={calledDialogOpen} onOpenChange={setCalledDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#095c7b] font-bold">Mark Lead as Called</DialogTitle>
                        <DialogDescription>
                            Log call details for {calledLead?.companyName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-slate-700">Call Outcome</label>
                            <Select value={callOutcome} onValueChange={setCallOutcome}>
                                <SelectTrigger className="w-full bg-white border-slate-200">
                                    <SelectValue placeholder="Select outcome..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Appointment Booked">Appointment Booked</SelectItem>
                                    <SelectItem value="Busy">Busy</SelectItem>
                                    <SelectItem value="Call Back/Follow-up">Call Back/Follow-up</SelectItem>
                                    <SelectItem value="Disconnected">Disconnected</SelectItem>
                                    <SelectItem value="DNC - Stop List">DNC - Stop List</SelectItem>
                                    <SelectItem value="Email Interested">Email Interested</SelectItem>
                                    <SelectItem value="Empty / Closed">Empty / Closed</SelectItem>
                                    <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                                    <SelectItem value="LOST - No Contact">LOST - No Contact</SelectItem>
                                    <SelectItem value="LOST - No Response">LOST - No Response</SelectItem>
                                    <SelectItem value="No Answer">No Answer</SelectItem>
                                    <SelectItem value="Not a Fit">Not a Fit</SelectItem>
                                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                                    <SelectItem value="Prospect - No Access/No Contact">Prospect - No Access/No Contact</SelectItem>
                                    <SelectItem value="Qualified - Call Back/Send Info">Qualified - Call Back/Send Info</SelectItem>
                                    <SelectItem value="Reschedule">Reschedule</SelectItem>
                                    <SelectItem value="Unqualified Opportunity">Unqualified Opportunity</SelectItem>
                                    <SelectItem value="Upsell">Upsell</SelectItem>
                                    <SelectItem value="Voicemail">Voicemail</SelectItem>
                                    <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-slate-700">Call Notes</label>
                            <Textarea
                                placeholder="Enter details of the call..."
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCalledDialogOpen(false)} disabled={submittingCall}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveCallOutcome} 
                            disabled={submittingCall}
                            className="bg-[#095c7b] text-white hover:bg-[#084c66]"
                        >
                            {submittingCall ? 'Saving...' : 'Save Notes & Complete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-700 font-bold">Mark Lead as Lost</DialogTitle>
                        <DialogDescription>
                            Mark {lostLead?.companyName} as Lost and log reasons.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-slate-700">Lost Notes / Reason</label>
                            <Textarea
                                placeholder="Why is this lead lost?"
                                value={lostNotes}
                                onChange={(e) => setLostNotes(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-slate-700">Follow-up Action</label>
                            <Select value={lostAction} onValueChange={setLostAction}>
                                <SelectTrigger className="w-full bg-white border-slate-200">
                                    <SelectValue placeholder="Select action..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Action Required</SelectItem>
                                    <SelectItem value="email">Send Email</SelectItem>
                                    <SelectItem value="sms">Send SMS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLostDialogOpen(false)} disabled={submittingLost}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveLost} 
                            disabled={submittingLost}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {submittingLost ? 'Saving...' : 'Mark Lost'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SmsDialog
                isOpen={smsDialogOpen}
                onClose={() => setSmsDialogOpen(false)}
                phoneNumber={smsTargetPhone}
                recipientName={smsTargetName}
            />
        </div>
    );
}

const STATUS_MAP: Record<string, string> = {
    'Appointment Booked': 'Qualified',
    'Busy': 'In Progress',
    'Call Back/Follow-up': 'High Touch',
    'Disconnected': 'Lost',
    'DNC - Stop List': 'Lost',
    'Email Interested': 'Pre Qualified',
    'Empty / Closed': 'Lost',
    'Gatekeeper': 'Connected',
    'LOST - No Contact': 'Lost',
    'LOST - No Response': 'Lost',
    'No Answer': 'In Progress',
    'Not a Fit': 'Lost',
    'Not Interested': 'Lost',
    'Prospect - No Access/No Contact': 'New',
    'Qualified - Call Back/Send Info': 'In Qualification',
    'Reschedule': 'Reschedule',
    'Unqualified Opportunity': 'Priority Field Lead',
    'Upsell': 'Won',
    'Voicemail': 'In Progress',
    'Wrong Number': 'Lost',
};

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
    journeys = [],
    journeyStates = {},
    onMarkCalled,
    onMarkLost
}: { 
    leads: Lead[], 
    viewMode: 'board' | 'accordion' | 'grid' | 'table', 
    sortBy: 'franchisee' | 'companyName' | 'dateLeadEntered', 
    onCall: (id: string, phone: string) => void, 
    onClick: (id: string) => void, 
    onEmail: (lead: Lead) => void, 
    onNotes: (lead: Lead) => void,
    journeys?: any[],
    journeyStates?: Record<string, any[]>,
    onMarkCalled: (lead: Lead) => void,
    onMarkLost: (lead: Lead) => void
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
                const dateA = a.dateLeadEntered ? new Date(a.dateLeadEntered).getTime() : 0;
                const dateB = b.dateLeadEntered ? new Date(b.dateLeadEntered).getTime() : 0;
                return dateB - dateA;
            }
            return 0;
        });
    }, [leads, sortBy]);

    // 2. Group leads by status if not in grid mode
    const groupedLeads = useMemo(() => {
        if (viewMode === 'grid' || viewMode === 'table') return {};
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
        if (viewMode === 'grid' || viewMode === 'table') return [];
        return Object.keys(groupedLeads).sort((a, b) => getStatusOrder(a) - getStatusOrder(b));
    }, [groupedLeads, viewMode]);

    // 4. Render based on view mode
    if (viewMode === 'table') {
        return (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-[#095c7b]">Company & Status</TableHead>
                            <TableHead className="font-bold text-[#095c7b]">Franchisee</TableHead>
                            <TableHead className="font-bold text-[#095c7b]">Contact Details</TableHead>
                            <TableHead className="font-bold text-[#095c7b]">Address</TableHead>
                            <TableHead className="font-bold text-[#095c7b]">Nurture Journey Stage</TableHead>
                            <TableHead className="font-bold text-[#095c7b]">Call Tracker</TableHead>
                            <TableHead className="font-bold text-[#095c7b] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedLeads.map((lead) => {
                            const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
                            const contactName = primaryContact?.name || lead.discoveryData?.personSpokenWithName || 'No Contact';
                            const phone = lead.customerPhone || primaryContact?.phone || '';
                            const email = lead.customerServiceEmail || primaryContact?.email || '';
                            const address = [lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ');
                            
                            // Find active nurture journeys and their states
                            const activeJStates = journeyStates[lead.id!] || [];
                            const activeJourneyStages = activeJStates
                                .filter((s: any) => s.status === 'active')
                                .map((s: any) => {
                                    const jDef = journeys.find((j: any) => j.id === s.journeyId);
                                    const jName = jDef?.name || 'Campaign';
                                    
                                    // Try to find the currentNode name
                                    const currentNode = jDef?.nodes?.find((n: any) => n.id === s.currentNodeId);
                                    const nodeName = currentNode?.config?.label || currentNode?.config?.subject || currentNode?.type || s.currentNodeId;
                                    return `${jName} (${nodeName})`;
                                });
                                
                            const isCalled = lead.csCalled || false;
                            
                            return (
                                <TableRow key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col gap-1">
                                            <span 
                                                className="font-bold text-[#095c7b] hover:underline cursor-pointer"
                                                onClick={() => onClick(lead.id!)}
                                            >
                                                {lead.companyName}
                                            </span>
                                            <div className="flex gap-1.5 items-center">
                                                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 uppercase font-semibold">
                                                    {lead.customerStatus || lead.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {lead.franchisee || <span className="text-slate-400 italic text-xs">Unassigned</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs gap-0.5 text-slate-600">
                                            <span className="font-semibold text-slate-800">{contactName}</span>
                                            {phone && <span>📞 {phone}</span>}
                                            {email && <span className="truncate max-w-[200px]" title={email}>✉️ {email}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-600 max-w-[220px]">
                                        <div className="line-clamp-2" title={address}>
                                            {address || <span className="text-slate-400 italic">No Address</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {activeJourneyStages.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {activeJourneyStages.map((stageText, idx) => (
                                                    <Badge key={idx} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0.5 font-medium">
                                                        ⏳ {stageText}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">Not in nurture</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {isCalled ? (
                                                <Badge className="bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1">
                                                    ✓ Called {lead.csCallCount ? `(${lead.csCallCount}x)` : ''}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold">
                                                    Pending Call
                                                </Badge>
                                            )}
                                            {lead.lastContactedDate && (
                                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                                    {new Date(lead.lastContactedDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                size="sm"
                                                className="bg-[#095c7b] hover:bg-[#084c66] text-white text-xs h-8 px-2.5 font-semibold"
                                                onClick={() => onMarkCalled(lead)}
                                            >
                                                Mark Called
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8 px-2.5 font-semibold"
                                                onClick={() => onMarkLost(lead)}
                                            >
                                                Mark Lost
                                            </Button>
                                            {phone && (
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                                    onClick={() => onCall(lead.id!, phone)}
                                                    title="Call Lead"
                                                >
                                                    <Phone className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {email && (
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                                    onClick={() => onEmail(lead)}
                                                    title="Send Email"
                                                >
                                                    <Mail className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                                onClick={() => onNotes(lead)}
                                                title="View Notes & Activities"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} />
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
                                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} />
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
                                <LeadCard lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function LeadCard({ lead, onCall, onClick, onEmail, onNotes }: { lead: Lead, onCall: (id: string, phone: string) => void, onClick: () => void, onEmail: () => void, onNotes: () => void }) {
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
                    {lead.customerSuccessAssigned && (
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-slate-400 shrink-0">CS:</span>
                            <span className="line-clamp-1 font-medium">{lead.customerSuccessAssigned}</span>
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
                </div>
            </CardContent>
        </Card>
    );
}
