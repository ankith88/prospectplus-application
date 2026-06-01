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
import { Phone, Building, User as UserIcon, AlertCircle, Mail, FileText, Filter, MapPin, Store, Search } from 'lucide-react';
import { parseISO, startOfDay } from 'date-fns';
import { logActivity } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dialogs
import { LeadEmailDialog } from './lead-email-dialog';
import { LeadNotesDialog } from './lead-notes-dialog';

export default function PipelineDashboard() {
    const { userProfile, loading } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    
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
    
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'Sales Manager';
    const isAm = userProfile?.role === 'Account Managers';
    
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
                const q = query(usersRef, where('role', '==', 'Account Managers'));
                const snap = await getDocs(q);
                const ams = snap.docs.map(doc => doc.data() as UserProfile);
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
    
    // Apply Advanced Filters and Search
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            if (searchQuery && !lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filters.status !== 'all' && (lead.customerStatus || lead.status) !== filters.status) return false;
            if (filters.campaign !== 'all' && lead.campaign !== filters.campaign) return false;
            if (filters.franchisee && !lead.franchisee?.toLowerCase().includes(filters.franchisee.toLowerCase())) return false;
            if (filters.state && !lead.address?.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
            if (filters.suburb && !lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase())) return false;
            if (filters.postcode && !lead.address?.zip?.toLowerCase().includes(filters.postcode.toLowerCase())) return false;
            return true;
        });
    }, [leads, filters]);

    // Segmentation Logic
    const priorityLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            const currentStatus = lead.customerStatus || lead.status;
            const isPriorityStatus = ['Priority Lead', 'High Touch', 'Reschedule'].includes(currentStatus);
            
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
    
    const newlyAssigned = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            
            if (currentStatus === 'New') return true;
            
            const hasNoActivity = !lead.activity || lead.activity.length === 0;
            const isRecent = lead.dateLeadEntered ? (new Date().getTime() - new Date(lead.dateLeadEntered).getTime() < 48 * 60 * 60 * 1000) : false;
            
            return isRecent && hasNoActivity;
        });
    }, [filteredLeads, priorityLeads]);
    
    const quotesOut = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || newlyAssigned.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return currentStatus === 'Quote Sent';
        });
    }, [filteredLeads, priorityLeads, newlyAssigned]);

    const productPending = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || newlyAssigned.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return ['ShipMate Pending', 'Trialing ShipMate'].includes(currentStatus);
        });
    }, [filteredLeads, priorityLeads, newlyAssigned]);

    const localMilePending = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || newlyAssigned.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return ['LocalMile Opportunity', 'LocalMile Pending'].includes(currentStatus);
        });
    }, [filteredLeads, priorityLeads, newlyAssigned]);

    const wipLeads = useMemo(() => {
        const wipStatuses = ['In Progress', 'Connected', 'In Qualification'];
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || newlyAssigned.includes(lead) || quotesOut.includes(lead) || productPending.includes(lead) || localMilePending.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return wipStatuses.includes(currentStatus);
        });
    }, [filteredLeads, priorityLeads, newlyAssigned, quotesOut, productPending, localMilePending]);
    
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
                                        return <SelectItem key={am.uid} value={name}>{name}</SelectItem>
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
                <div className="bg-white/80 p-1 rounded-t-xl border border-white/60 shrink-0">
                    <TabsList className="bg-transparent overflow-x-auto flex w-full justify-start md:justify-center">
                        <TabsTrigger value="priority" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Priority <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b]">{priorityLeads.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="newly-assigned" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                            Newly Assigned <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{newlyAssigned.length}</Badge>
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
                </div>

                <div className="flex-1 bg-white/50 rounded-b-xl border border-t-0 border-white/60 p-4 overflow-y-auto">
                    <TabsContent value="priority" className="m-0 h-full">
                        <LeadGrid leads={priorityLeads} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="newly-assigned" className="m-0 h-full">
                        <LeadGrid leads={newlyAssigned} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="wip" className="m-0 h-full">
                        <LeadGrid leads={wipLeads} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="quotes-out" className="m-0 h-full">
                        <LeadGrid leads={quotesOut} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="product-pending" className="m-0 h-full">
                        <LeadGrid leads={productPending} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="localmile" className="m-0 h-full">
                        <LeadGrid leads={localMilePending} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} />
                    </TabsContent>
                </div>
            </Tabs>

            <LeadEmailDialog isOpen={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} lead={activeLead} />
            <LeadNotesDialog isOpen={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} lead={activeLead} />
        </div>
    );
}

function LeadGrid({ leads, onCall, onClick, onEmail, onNotes }: { leads: Lead[], onCall: (id: string, phone: string) => void, onClick: (id: string) => void, onEmail: (lead: Lead) => void, onNotes: (lead: Lead) => void }) {
    if (leads.length === 0) {
        return <div className="text-center p-12 text-muted-foreground">No leads in this bucket.</div>;
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onCall={handleCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} />
            ))}
        </div>
    );

    function handleCall(id: string, phone: string) {
        onCall(id, phone);
    }
}

function LeadCard({ lead, onCall, onClick, onEmail, onNotes }: { lead: Lead, onCall: (id: string, phone: string) => void, onClick: () => void, onEmail: () => void, onNotes: () => void }) {
    const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
    const contactName = primaryContact?.name || 'No Contact Info';
    const phone = primaryContact?.phone || lead.customerPhone;
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
                        <Badge variant="outline" className="mt-1 text-[10px] bg-slate-50 border-slate-200 uppercase">
                            {currentStatus}
                        </Badge>
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
                        {phone && (
                            <Button 
                                size="icon" 
                                variant="default"
                                className="h-8 w-8 rounded-full bg-[#eaf143] text-[#095c7b] hover:bg-[#d4dd33]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCall(lead.id!, phone);
                                }}
                                title={`Call ${phone} with AirCall`}
                            >
                                <Phone className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 flex-1">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{contactName}</span>
                    </div>
                    {lead.accountManagerAssigned && (
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-slate-400 shrink-0">AM:</span>
                            <span className="line-clamp-1 font-medium">{lead.accountManagerAssigned}</span>
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
