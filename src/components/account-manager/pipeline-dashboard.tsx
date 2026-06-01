"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Phone, Building, User as UserIcon, AlertCircle } from 'lucide-react';
import { isToday, parseISO, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { logActivity } from '@/services/firebase';

export default function PipelineDashboard() {
    const { userProfile, loading } = useAuth();
    const router = useRouter();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'Sales Manager';
    const isAm = userProfile?.role === 'Account Managers';
    
    useEffect(() => {
        if (!loading && !isAdmin && !isAm) {
            router.push('/signin');
        }
    }, [loading, isAdmin, isAm, router]);
    
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
        if (!isAdmin && !isAm) return;
        
        async function fetchPipeline() {
            setIsLoadingData(true);
            try {
                const leadsRef = collection(firestore, 'leads');
                let q;
                
                if (isAm) {
                    q = query(leadsRef, where('accountManagerAssigned', '==', userProfile?.displayName));
                } else if (isAdmin) {
                    if (selectedAm !== 'all') {
                        q = query(leadsRef, where('accountManagerAssigned', '==', selectedAm));
                    } else {
                        // For 'all', we might just fetch all MultiSite leads to avoid index issues with != ''
                        q = query(leadsRef, where('campaign', 'in', ['MultiSite', 'Multisite']));
                    }
                } else {
                     setIsLoadingData(false);
                     return;
                }
                
                if (q) {
                    const snap = await getDocs(q);
                    const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                    
                    // Client-side filtering in case 'campaign' query brings in unassigned leads
                    const filteredLeads = fetchedLeads.filter(l => 
                        isAm ? l.accountManagerAssigned === userProfile?.displayName : 
                        (selectedAm !== 'all' ? l.accountManagerAssigned === selectedAm : !!l.accountManagerAssigned)
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
    }, [loading, isAm, isAdmin, userProfile?.displayName, selectedAm]);
    
    // Segmentation Logic
    const priorityLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return leads.filter(lead => {
            const isPriorityStatus = ['Priority Lead', 'High Touch', 'Reschedule'].includes(lead.status);
            
            // Check if there is an appointment scheduled for today
            const hasAppointmentToday = lead.appointments?.some(app => {
                if (!app.appointmentDate) return false;
                try {
                   return startOfDay(parseISO(app.appointmentDate)).getTime() === today;
                } catch(e) {
                   return false;
                }
            });
            
            // Check if task scheduled for today
            const hasTaskToday = lead.tasks?.some(task => {
                if (!task.dueDate) return false;
                try {
                   return startOfDay(parseISO(task.dueDate)).getTime() === today;
                } catch(e) {
                   return false;
                }
            });
            
            return isPriorityStatus || hasAppointmentToday || hasTaskToday;
        });
    }, [leads]);
    
    const newlyAssigned = useMemo(() => {
        // Leads where status is strictly 'New' or those appended recently with 0 calls/visits
        // Since we don't have exact 'assignedAt', we use 'dateLeadEntered' or just 'New'
        return leads.filter(lead => {
            if (priorityLeads.includes(lead)) return false; // mutually exclusive? The prompt said "Dynamic Lifecycle Buckets"
            
            if (lead.status === 'New') return true;
            
            // check for zero activity
            const hasNoActivity = !lead.activity || lead.activity.length === 0;
            const isRecent = lead.dateLeadEntered ? (new Date().getTime() - new Date(lead.dateLeadEntered).getTime() < 48 * 60 * 60 * 1000) : false;
            
            return isRecent && hasNoActivity;
        });
    }, [leads, priorityLeads]);
    
    const wipLeads = useMemo(() => {
        const wipStatuses = ['In Progress', 'Connected', 'In Qualification', 'Trialing ShipMate'];
        return leads.filter(lead => {
            if (priorityLeads.includes(lead) || newlyAssigned.includes(lead)) return false;
            return wipStatuses.includes(lead.status);
        });
    }, [leads, priorityLeads, newlyAssigned]);
    
    const handleCall = async (leadId: string, phone: string) => {
        window.open(`aircall:${phone}`, '_self');
        await logActivity(leadId, {
            type: 'Call',
            notes: `Initiated call to ${phone} via AirCall from AM Pipeline.`,
            author: userProfile?.displayName || 'System'
        });
    };

    if (loading || isLoadingData) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Loader /></div>;
    }
    
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#095c7b] tracking-tight">AM Pipeline</h1>
                    <p className="text-[#095c7b]/80 mt-1">Manage your pipeline and daily focus</p>
                </div>
                
                {isAdmin && (
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        <span className="text-[#095c7b] font-medium text-sm">View Pipeline For:</span>
                        <Select value={selectedAm} onValueChange={setSelectedAm}>
                            <SelectTrigger className="w-[220px] bg-white border-[#095c7b]/20">
                                <SelectValue placeholder="All Account Managers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Account Managers</SelectItem>
                                {accountManagers.map(am => (
                                    <SelectItem key={am.uid} value={am.displayName || am.uid}>{am.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {/* Bucket 1: Priority Contacts */}
                <div className="flex flex-col h-full bg-white/50 rounded-xl border border-white/60 shadow-sm overflow-hidden">
                    <div className="p-4 bg-[#095c7b] text-white flex justify-between items-center">
                        <h2 className="font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-[#eaf143]" />
                            Priority Contacts
                        </h2>
                        <Badge variant="secondary" className="bg-[#eaf143] text-[#095c7b] font-bold border-none">
                            {priorityLeads.length}
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {priorityLeads.map(lead => (
                            <LeadCard key={lead.id} lead={lead} onCall={handleCall} onClick={() => router.push(`/leads/${lead.id}`)} />
                        ))}
                        {priorityLeads.length === 0 && (
                            <div className="text-center p-6 text-muted-foreground text-sm">No priority leads for today.</div>
                        )}
                    </div>
                </div>
                
                {/* Bucket 2: Newly Assigned Queue */}
                <div className="flex flex-col h-full bg-white/50 rounded-xl border border-white/60 shadow-sm overflow-hidden">
                    <div className="p-4 bg-white border-b flex justify-between items-center">
                        <h2 className="font-semibold text-[#095c7b]">Newly Assigned</h2>
                        <Badge className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white">
                            {newlyAssigned.length}
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {newlyAssigned.map(lead => (
                            <LeadCard key={lead.id} lead={lead} onCall={handleCall} onClick={() => router.push(`/leads/${lead.id}`)} />
                        ))}
                         {newlyAssigned.length === 0 && (
                            <div className="text-center p-6 text-muted-foreground text-sm">No new leads in queue.</div>
                        )}
                    </div>
                </div>
                
                {/* Bucket 3: Active Work-in-Progress */}
                <div className="flex flex-col h-full bg-white/50 rounded-xl border border-white/60 shadow-sm overflow-hidden">
                    <div className="p-4 bg-white border-b flex justify-between items-center">
                        <h2 className="font-semibold text-[#095c7b]">Work in Progress (WIP)</h2>
                        <Badge variant="outline" className="text-[#095c7b] border-[#095c7b]/30">
                            {wipLeads.length}
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {wipLeads.map(lead => (
                            <LeadCard key={lead.id} lead={lead} onCall={handleCall} onClick={() => router.push(`/leads/${lead.id}`)} />
                        ))}
                         {wipLeads.length === 0 && (
                            <div className="text-center p-6 text-muted-foreground text-sm">No WIP leads currently.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LeadCard({ lead, onCall, onClick }: { lead: Lead, onCall: (id: string, phone: string) => void, onClick: () => void }) {
    // Attempt to extract the primary contact's details
    const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
    const contactName = primaryContact?.name || lead.customerServiceEmail || 'No Contact Info';
    const phone = primaryContact?.phone || lead.customerPhone;
    
    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-[#095c7b]/10 group" onClick={onClick}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-[#095c7b] line-clamp-1 group-hover:underline" title={lead.companyName}>
                            {lead.companyName}
                        </h3>
                        <Badge variant="outline" className="mt-1 text-[10px] bg-slate-50 border-slate-200 uppercase">
                            {lead.status}
                        </Badge>
                    </div>
                    {phone && (
                        <Button 
                            size="icon" 
                            variant="default"
                            className="h-8 w-8 rounded-full bg-[#eaf143] text-[#095c7b] hover:bg-[#d4dd33] shrink-0 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCall(lead.id, phone);
                            }}
                            title={`Call ${phone} with AirCall`}
                        >
                            <Phone className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                
                <div className="space-y-1.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="line-clamp-1">{contactName}</span>
                    </div>
                    {lead.address?.city && (
                        <div className="flex items-center gap-2">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span className="line-clamp-1">{lead.address.city}{lead.address.state ? `, ${lead.address.state}` : ''}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
