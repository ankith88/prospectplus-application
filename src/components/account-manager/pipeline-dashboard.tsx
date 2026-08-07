"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, onSnapshot, collectionGroup, documentId } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Phone, Building, User as UserIcon, AlertCircle, Mail, FileText, Filter, MapPin, Store, Search, Table as TableIcon, List, LayoutGrid, ArrowUpDown, X, SlidersHorizontal, Calendar, ListChecks, ListTodo, CheckCircle2 } from 'lucide-react';
import { parseISO, startOfDay, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logActivity, updateLeadDetails } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseDateString, getLeadDisplayDateValue, getLeadDisplayDateLabel } from '@/lib/utils';
import { AmQueueView } from './am-queue-view';
import { StatusOutcomeBanner } from '@/components/status-outcome-guide';


// Dialogs
import { LeadEmailDialog } from './lead-email-dialog';
import { LeadNotesDialog } from './lead-notes-dialog';

export const parseApptDate = (app: any): Date | null => {
    const raw = app?.date || app?.appointmentDate || app?.duedate;
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'object' && typeof raw.toDate === 'function') return raw.toDate();
    if (typeof raw === 'object' && 'seconds' in raw) return new Date(raw.seconds * 1000 + (raw.nanoseconds || 0) / 1000000);
    try {
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

export const parseTaskDate = (task: any): Date | null => {
    const raw = task?.dueDate || task?.duedate || task?.createdAt;
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'object' && typeof raw.toDate === 'function') return raw.toDate();
    if (typeof raw === 'object' && 'seconds' in raw) return new Date(raw.seconds * 1000 + (raw.nanoseconds || 0) / 1000000);
    try {
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const isFranchiseeGeneratedLead = (lead: Lead): boolean => {
    if (!lead) return false;
    if (lead.isZeeCreated || lead.franchiseeReviewPending) return true;
    if (
        lead.customerSource === 'Franchisee Generated' || 
        lead.leadSource === 'Franchisee Generated' || 
        lead.campaign === 'Franchisee Generated' || 
        lead.leadSource === '-4'
    ) return true;
    if (lead.createdByRole && (lead.createdByRole === 'Franchisee' || lead.createdByRole.toLowerCase() === 'franchisee')) return true;
    return false;
};

export default function PipelineDashboard() {
    const { userProfile, loading, isSuperAdmin } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>('all');
    
    const [viewMode, setViewMode] = useState<'table' | 'accordion' | 'grid' | 'queue'>('table');
    const [sortBy, setSortBy] = useState<'franchisee' | 'companyName' | 'dateLeadEntered' | 'weeklyParcels'>('dateLeadEntered');
    
    const [filters, setFilters] = useState({
        status: 'all',
        campaign: 'all',
        appointmentStatus: 'all',
        franchisee: '',
        state: '',
        suburb: '',
        postcode: '',
        appointmentDateFrom: '',
        appointmentDateTo: '',
        dateEnteredFrom: '',
        dateEnteredTo: '',
        weeklyParcels: '',
        selectedServiceOption: 'all'
    });
    
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const { setLoadTime, setPageName, setIsCustom } = usePerformance();

    useEffect(() => {
        setIsCustom(true);
        setPageName("AM Pipeline");
    }, [setIsCustom, setPageName]);
    
    const isAdmin = isSuperAdmin || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';
    const isAm = userProfile?.activeRole === 'Account Managers' || userProfile?.activeRole === 'Account Manager' || userProfile?.activeRole === 'account managers';
    
    const getAmName = (am: UserProfile) => {
        return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
    };
    
    const loggedInAmName = userProfile ? getAmName(userProfile as UserProfile) : '';

    // Default to table/list view when an AM loads their dashboard
    useEffect(() => {
        if (!loading && isAm) {
            setViewMode('table');
        }
    }, [loading, isAm]);

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
            console.time("AM Pipeline - Load Time");
            const startTimePerf = performance.now();
            try {
                const leadsRef = collection(firestore, 'leads');
                let q;
                
                q = query(leadsRef, where('bucket', 'in', ['account_manager', 'inbound']));
                
                if (q) {
                    const snap = await getDocs(q);
                    const rawLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                    
                    // Client-side filtering in case query doesn't match perfectly
                    const filteredLeads = rawLeads.filter(l => 
                        isAm ? l.accountManagerAssigned === loggedInAmName : 
                        (selectedAm !== 'all' ? l.accountManagerAssigned === selectedAm : true)
                    );
                    
                    // Fetch matching company documents to exclude signed customers
                    const leadIds = filteredLeads.map(l => l.id);
                    const signedCompanyIds = new Set<string>();
                    
                    if (leadIds.length > 0) {
                        const chunks: string[][] = [];
                        for (let i = 0; i < leadIds.length; i += 30) {
                            chunks.push(leadIds.slice(i, i + 30));
                        }
                        
                        const companyQueries = chunks.map(chunk => 
                            getDocs(query(collection(firestore, 'companies'), where(documentId(), 'in', chunk)))
                        );
                        
                        const companySnaps = await Promise.all(companyQueries);
                        companySnaps.forEach(snap => {
                            snap.docs.forEach(doc => {
                                signedCompanyIds.add(doc.id);
                            });
                        });
                    }

                    const filteredLeadsWithoutCompanies = filteredLeads.filter(l => !signedCompanyIds.has(l.id));
                    
                    // Fetch appointments and tasks in parallel
                    const appointmentsByLead: Record<string, any[]> = {};
                    const tasksByLead: Record<string, any[]> = {};
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const startISO = thirtyDaysAgo.toISOString();
                    
                    const apptQuery = query(
                        collectionGroup(firestore, 'appointments'),
                        where('duedate', '>=', startISO)
                    );
                    const taskQuery = query(collectionGroup(firestore, 'tasks'));
                    
                    const [apptSnap, taskSnap] = await Promise.all([
                        getDocs(apptQuery).catch(err => {
                            console.error("Error fetching appointments:", err);
                            return { docs: [] } as any;
                        }),
                        getDocs(taskQuery).catch(err => {
                            console.error("Error fetching tasks:", err);
                            return { docs: [] } as any;
                        })
                    ]);

                    apptSnap.docs.forEach((doc: any) => {
                        const parentId = doc.ref.parent.parent?.id;
                        if (parentId) {
                            if (!appointmentsByLead[parentId]) {
                                appointmentsByLead[parentId] = [];
                            }
                            appointmentsByLead[parentId].push({ ...doc.data(), id: doc.id });
                        }
                    });

                    taskSnap.docs.forEach((doc: any) => {
                        const parentId = doc.ref.parent.parent?.id;
                        if (parentId) {
                            if (!tasksByLead[parentId]) {
                                tasksByLead[parentId] = [];
                            }
                            tasksByLead[parentId].push({ ...doc.data(), id: doc.id });
                        }
                    });

                    const fetchedLeads = filteredLeadsWithoutCompanies.map((l) => {
                        const appts = appointmentsByLead[l.id] || [];
                        const existingAppts = l.appointments || [];
                        const combinedAppts = [...existingAppts];
                        appts.forEach(appt => {
                            if (!combinedAppts.some(ex => ex.id === appt.id)) {
                                combinedAppts.push(appt);
                            }
                        });

                        const tsks = tasksByLead[l.id] || [];
                        const existingTsks = l.tasks || [];
                        const combinedTsks = [...existingTsks];
                        tsks.forEach(tsk => {
                            if (!combinedTsks.some(ex => ex.id === tsk.id)) {
                                combinedTsks.push(tsk);
                            }
                        });

                        return { ...l, appointments: combinedAppts, tasks: combinedTsks };
                    });
                    
                    setLeads(fetchedLeads);
                }
            } catch (error) {
                console.error("Error fetching pipeline leads", error);
            } finally {
                setIsLoadingData(false);
                console.timeEnd("AM Pipeline - Load Time");
                setLoadTime(Math.round(performance.now() - startTimePerf));
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
            // Must be assigned to the account_manager or inbound bucket (where source is Website)
            if (lead.bucket === 'inbound') {
                const isWebsite = lead.customerSource === 'Website' || (lead as any).source === 'Website';
                if (!isWebsite) return false;
            } else if (lead.bucket !== 'account_manager') {
                return false;
            }

            const currentStatus = lead.customerStatus || lead.status;
            if (currentStatus === 'Lost' || currentStatus === 'LPO Opportunity') return false;

            // Only show leads assigned to existing users with "Account Managers" role
            if (isAdmin && selectedAm === 'all') {
                if (!lead.accountManagerAssigned || !amNames.has(lead.accountManagerAssigned)) {
                    return false;
                }
            }

            if (searchQuery && !lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) && !(lead.prospectPlusId && lead.prospectPlusId.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
            if (filters.status !== 'all' && currentStatus !== filters.status) return false;
            if (filters.campaign !== 'all' && lead.campaign !== filters.campaign) return false;
            if (filters.appointmentStatus !== 'all') {
                const hasMatchingAppt = lead.appointments?.some(a => {
                    const status = a.appointmentStatus || 'Pending';
                    return status === filters.appointmentStatus;
                });
                if (!hasMatchingAppt) return false;
            }
            if (filters.appointmentDateFrom || filters.appointmentDateTo) {
                const hasMatchingApptDate = lead.appointments?.some(a => {
                    const d = a.date || a.appointmentDate;
                    if (!d) return false;
                    try {
                        const apptDate = startOfDay(new Date(d)).getTime();
                        if (filters.appointmentDateFrom) {
                            const fromDate = startOfDay(new Date(filters.appointmentDateFrom)).getTime();
                            if (apptDate < fromDate) return false;
                        }
                        if (filters.appointmentDateTo) {
                            const toDate = startOfDay(new Date(filters.appointmentDateTo)).getTime();
                            if (apptDate > toDate) return false;
                        }
                        return true;
                    } catch (e) {
                        return false;
                    }
                });
                if (!hasMatchingApptDate) return false;
            }
            
            if (filters.dateEnteredFrom || filters.dateEnteredTo) {
                if (!lead.dateLeadEntered) return false;
                const parsedDate = parseDateString(lead.dateLeadEntered);
                if (!parsedDate) return false;
                
                try {
                    const enteredDate = startOfDay(parsedDate).getTime();
                    if (filters.dateEnteredFrom) {
                        const fromDate = startOfDay(new Date(filters.dateEnteredFrom)).getTime();
                        if (enteredDate < fromDate) return false;
                    }
                    if (filters.dateEnteredTo) {
                        const toDate = startOfDay(new Date(filters.dateEnteredTo)).getTime();
                        if (enteredDate > toDate) return false;
                    }
                } catch (e) {
                    return false;
                }
            }
            
            if (filters.franchisee && !lead.franchisee?.toLowerCase().includes(filters.franchisee.toLowerCase())) return false;
            if (filters.state && !lead.address?.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
            if (filters.suburb && !lead.address?.city?.toLowerCase().includes(filters.suburb.toLowerCase())) return false;
            if (filters.postcode && !lead.address?.zip?.toLowerCase().includes(filters.postcode.toLowerCase())) return false;
            
            if (filters.weeklyParcels) {
                const leadVal = lead.weeklyParcels || lead.discoveryData?.weeklyParcels;
                if (!leadVal) return false;
                
                const filterNum = parseInt(filters.weeklyParcels, 10);
                if (!isNaN(filterNum)) {
                    const leadNum = parseInt(leadVal.replace(/[^0-9]/g, ''), 10);
                    if (isNaN(leadNum) || leadNum < filterNum) {
                        if (!leadVal.toLowerCase().includes(filters.weeklyParcels.toLowerCase())) {
                            return false;
                        }
                    }
                } else {
                    if (!leadVal.toLowerCase().includes(filters.weeklyParcels.toLowerCase())) {
                        return false;
                    }
                }
            }

            if (filters.selectedServiceOption && filters.selectedServiceOption !== 'all') {
                if (filters.selectedServiceOption === 'none') {
                    if (lead.selectedServiceOption) return false;
                } else if (lead.selectedServiceOption !== filters.selectedServiceOption) {
                    return false;
                }
            }
            return true;
        });
    }, [leads, filters, searchQuery, accountManagers, isAdmin, selectedAm]);

    // Segmentation Logic

    const pastPendingAppointmentsLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.appointments?.some(app => {
                const apptDate = parseApptDate(app);
                if (!apptDate) return false;
                const apptStatus = app.appointmentStatus || 'Pending';
                return startOfDay(apptDate).getTime() < today && apptStatus === 'Pending';
            });
        });
    }, [filteredLeads]);

    const todayAppointmentsLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.appointments?.some(app => {
                const apptDate = parseApptDate(app);
                if (!apptDate) return false;
                const apptStatus = app.appointmentStatus || 'Pending';
                return startOfDay(apptDate).getTime() === today && apptStatus === 'Pending';
            });
        });
    }, [filteredLeads]);

    const futureAppointmentsLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.appointments?.some(app => {
                const apptDate = parseApptDate(app);
                if (!apptDate) return false;
                const apptStatus = app.appointmentStatus || 'Pending';
                return startOfDay(apptDate).getTime() > today && apptStatus === 'Pending';
            });
        });
    }, [filteredLeads]);

    const noShowAppointmentsLeads = useMemo(() => {
        return filteredLeads.filter(lead => {
            return lead.appointments?.some(app => {
                const apptStatus = app.appointmentStatus;
                return apptStatus === 'No Show';
            });
        });
    }, [filteredLeads]);

    const pastPendingTasksLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.tasks?.some(t => {
                if (t.isCompleted) return false;
                const taskDate = parseTaskDate(t);
                if (!taskDate) return false;
                return startOfDay(taskDate).getTime() < today;
            });
        });
    }, [filteredLeads]);

    const todayTasksLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.tasks?.some(t => {
                if (t.isCompleted) return false;
                const taskDate = parseTaskDate(t);
                if (!taskDate) return false;
                return startOfDay(taskDate).getTime() === today;
            });
        });
    }, [filteredLeads]);

    const futureTasksLeads = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        return filteredLeads.filter(lead => {
            return lead.tasks?.some(t => {
                if (t.isCompleted) return false;
                const taskDate = parseTaskDate(t);
                if (!taskDate) return false;
                return startOfDay(taskDate).getTime() > today;
            });
        });
    }, [filteredLeads]);

    const completedTasksLeads = useMemo(() => {
        return filteredLeads.filter(lead => {
            return lead.tasks?.some(t => t.isCompleted);
        });
    }, [filteredLeads]);

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

    const quotesAccepted = useMemo(() => {
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return currentStatus === 'Quote Accepted';
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

    const outOfTerritoryLeads = useMemo(() => {
        return filteredLeads.filter(lead => {
            const currentStatus = lead.customerStatus || lead.status;
            return currentStatus === 'Out of Territory';
        });
    }, [filteredLeads]);

    const newLeads = useMemo(() => {
        return filteredLeads.filter(lead => {
            const currentStatus = lead.customerStatus || lead.status;
            return ['New', 'Suspect - Unqualified', 'SUSPECT-Unqualified'].includes(currentStatus);
        });
    }, [filteredLeads]);

    const futureFollowUpLeads = useMemo(() => {
        return filteredLeads.filter(lead => {
            const currentStatus = lead.customerStatus || lead.status;
            return currentStatus === 'Future Follow-up';
        });
    }, [filteredLeads]);

    const wipLeads = useMemo(() => {
        const wipStatuses = ['In Progress', 'Connected', 'In Qualification', 'Email Brush Off'];
        return filteredLeads.filter(lead => {
            if (priorityLeads.includes(lead) || newLeads.includes(lead) || quotesOut.includes(lead) || quotesAccepted.includes(lead) || productPending.includes(lead) || localMilePending.includes(lead) || outOfTerritoryLeads.includes(lead) || futureFollowUpLeads.includes(lead)) return false;
            const currentStatus = lead.customerStatus || lead.status;
            return wipStatuses.includes(currentStatus) || !currentStatus;
        });
    }, [filteredLeads, priorityLeads, newLeads, quotesOut, quotesAccepted, productPending, localMilePending, outOfTerritoryLeads, futureFollowUpLeads]);
    
    const handleCall = async (leadId: string, phone: string) => {
        window.open(`aircall:${phone}`, '_self');
        await logActivity(leadId, {
            type: 'Call',
            notes: `Initiated call to ${phone} via AirCall from AM Pipeline.`,
            author: loggedInAmName || 'System'
        });
    };

    const openLead = (leadId: string) => {
        window.location.href = `/leads/${leadId}?from=am-pipeline`;
    };

    const handleAmReassign = async (leadId: string, amName: string) => {
        try {
            if (!isAdmin) {
                console.error("Unauthorized: Account Managers are not allowed to reassign leads.");
                return;
            }
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

            <StatusOutcomeBanner className="mb-6" />

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
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-12 gap-4 items-end pb-4 pt-0">
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
                                <Label htmlFor="appointmentStatus" className="text-xs font-semibold text-[#095c7b]">Appointment Status</Label>
                                <Select value={filters.appointmentStatus} onValueChange={(val) => setFilters({...filters, appointmentStatus: val})}>
                                    <SelectTrigger id="appointmentStatus" className="bg-white"><SelectValue placeholder="All Appointments" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Appointments</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="No Show">No Show</SelectItem>
                                        <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="apptDateFrom" className="text-xs font-semibold text-[#095c7b]">Appt Date From</Label>
                                <Input id="apptDateFrom" type="date" className="bg-white" value={filters.appointmentDateFrom} onChange={(e) => setFilters({...filters, appointmentDateFrom: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="apptDateTo" className="text-xs font-semibold text-[#095c7b]">Appt Date To</Label>
                                <Input id="apptDateTo" type="date" className="bg-white" value={filters.appointmentDateTo} onChange={(e) => setFilters({...filters, appointmentDateTo: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateEnteredFrom" className="text-xs font-semibold text-[#095c7b]">Date Entered From</Label>
                                <Input id="dateEnteredFrom" type="date" className="bg-white" value={filters.dateEnteredFrom} onChange={(e) => setFilters({...filters, dateEnteredFrom: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateEnteredTo" className="text-xs font-semibold text-[#095c7b]">Date Entered To</Label>
                                <Input id="dateEnteredTo" type="date" className="bg-white" value={filters.dateEnteredTo} onChange={(e) => setFilters({...filters, dateEnteredTo: e.target.value})} />
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
                             <div className="space-y-2">
                                 <Label htmlFor="weeklyParcelsFilter" className="text-xs font-semibold text-[#095c7b]">Weekly Parcels</Label>
                                 <Input id="weeklyParcelsFilter" placeholder="e.g. 50" className="bg-white" value={filters.weeklyParcels} onChange={(e) => setFilters({...filters, weeklyParcels: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                 <Label htmlFor="serviceOptionFilter" className="text-xs font-semibold text-[#095c7b]">Service Option</Label>
                                 <Select value={filters.selectedServiceOption} onValueChange={(val) => setFilters({...filters, selectedServiceOption: val})}>
                                     <SelectTrigger id="serviceOptionFilter" className="bg-white"><SelectValue placeholder="All Options" /></SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="all">All Options</SelectItem>
                                         <SelectItem value="none">None / No Option</SelectItem>
                                         <SelectItem value="five-free">Five Free</SelectItem>
                                         <SelectItem value="express">Express</SelectItem>
                                         <SelectItem value="corporate">Corporate</SelectItem>
                                     </SelectContent>
                                 </Select>
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
                                     onClick={() => setFilters({ status: 'all', campaign: 'all', appointmentStatus: 'all', franchisee: '', state: '', suburb: '', postcode: '', appointmentDateFrom: '', appointmentDateTo: '', dateEnteredFrom: '', dateEnteredTo: '', weeklyParcels: '', selectedServiceOption: 'all' })}
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
            
            {viewMode === 'queue' ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="bg-white/80 p-1.5 rounded-t-xl border border-white/60 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-3">
                        <div className="text-sm font-bold text-[#095c7b] px-3 flex items-center gap-2">
                            <ListChecks className="h-5 w-5" />
                            <span>AM Priority Queue</span>
                            <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none ml-1">
                                {filteredLeads.length} active leads
                            </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto px-2 pb-1.5 lg:pb-0 shrink-0">
                            <div className="flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/10 p-0.5 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                                <span className="text-[10px] font-bold text-[#095c7b] uppercase tracking-wider px-2 hidden sm:inline">View</span>
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 px-2.5 rounded-md gap-1.5 text-xs bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm"
                                    onClick={() => setViewMode('queue')}
                                    title="Priority Queue View"
                                >
                                    <ListChecks className="h-3.5 w-3.5" />
                                    <span className="inline">Queue</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-md gap-1.5 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                                    onClick={() => setViewMode('table')}
                                    title="List Tracker View"
                                >
                                    <TableIcon className="h-3.5 w-3.5" />
                                    <span className="inline">List</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-md gap-1.5 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                                    onClick={() => setViewMode('accordion')}
                                    title="Accordion Groups View"
                                >
                                    <List className="h-3.5 w-3.5" />
                                    <span className="inline">Groups</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-md gap-1.5 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                                    onClick={() => setViewMode('grid')}
                                    title="Flat Grid View"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    <span className="inline">Grid</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white/50 rounded-b-xl border border-t-0 border-white/60 p-4 overflow-y-auto">
                        <AmQueueView 
                            leads={filteredLeads}
                            appointments={leads.flatMap(l => l.appointments || [])}
                            onCall={handleCall}
                            onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }}
                            onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }}
                            onClickLead={openLead}
                            setLeads={setLeads}
                        />
                    </div>
                </div>
            ) : (
                <Tabs defaultValue="appointments" className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="bg-white/80 p-1.5 rounded-t-xl border border-white/60 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-3">
                        <TabsList id="step-retention-segments" className="bg-transparent overflow-x-auto flex w-full lg:w-auto justify-start lg:justify-start">
                            <TabsTrigger value="appointments" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Appointments <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b]">{pastPendingAppointmentsLeads.length + todayAppointmentsLeads.length + futureAppointmentsLeads.length + noShowAppointmentsLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Tasks & Reminders <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b]">{pastPendingTasksLeads.length + todayTasksLeads.length + futureTasksLeads.length + completedTasksLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="priority" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Priority <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{priorityLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="new" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                New <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{newLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="wip" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Work in Progress <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{wipLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="quotes-out" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Quotes Out <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{quotesOut.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="quotes-accepted" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Quote Accepted <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">{quotesAccepted.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="product-pending" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Product Pending <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{productPending.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="localmile" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                LocalMile <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{localMilePending.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="out-of-territory" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Out of Territory <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{outOfTerritoryLeads.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="future-follow-up" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
                                Future Follow-up <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{futureFollowUpLeads.length}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto px-2 pb-1.5 lg:pb-0 shrink-0">
                            <div id="step-pipeline-views" className="flex items-center gap-1 bg-[#095c7b]/5 border border-[#095c7b]/10 p-0.5 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                                <span className="text-[10px] font-bold text-[#095c7b] uppercase tracking-wider px-2 hidden sm:inline">View</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-md gap-1.5 text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
                                    onClick={() => setViewMode('queue')}
                                    title="Priority Queue View"
                                >
                                    <ListChecks className="h-3.5 w-3.5" />
                                    <span className="inline">Queue</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                                    className={`h-7 px-2.5 rounded-md gap-1.5 text-xs ${
                                        viewMode === 'table' 
                                            ? 'bg-[#095c7b] text-white hover:bg-[#084c66] shadow-sm' 
                                            : 'text-[#095c7b] hover:bg-[#095c7b]/10'
                                    }`}
                                    onClick={() => setViewMode('table')}
                                    title="List Tracker View"
                                >
                                    <TableIcon className="h-3.5 w-3.5" />
                                    <span className="inline">List</span>
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
                                        <SelectItem value="dateLeadEntered" className="text-xs">Date Lead Entered</SelectItem>
                                        <SelectItem value="companyName" className="text-xs">Company</SelectItem>
                                        <SelectItem value="franchisee" className="text-xs">Franchisee</SelectItem>
                                        <SelectItem value="weeklyParcels" className="text-xs">Weekly Parcels</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white/50 rounded-b-xl border border-t-0 border-white/60 p-4 overflow-y-auto">
                        <TabsContent value="appointments" className="m-0 h-full space-y-6">
                            {pastPendingAppointmentsLeads.length > 0 && (
                                <div className="space-y-3 pb-4 border-b border-rose-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Past Pending Appointments (Action Required)</h3>
                                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs">
                                            {pastPendingAppointmentsLeads.length}
                                        </Badge>
                                    </div>
                                    <LeadGrid leads={pastPendingAppointmentsLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} isPastSection={true} emptyMessage="No past pending appointments." />
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Calendar className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Today's Appointments</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {todayAppointmentsLeads.length}
                                    </Badge>
                                </div>
                                <LeadGrid leads={todayAppointmentsLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} emptyMessage="No appointments scheduled for today." />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-200/80">
                                <div className="flex items-center gap-2 px-1">
                                    <Calendar className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Future Appointments</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {futureAppointmentsLeads.length}
                                    </Badge>
                                </div>
                                <LeadGrid leads={futureAppointmentsLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} emptyMessage="No future appointments scheduled." />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-amber-200/80">
                                <div className="flex items-center gap-2 px-1">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">No Show Appointments</h3>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs">
                                        {noShowAppointmentsLeads.length}
                                    </Badge>
                                </div>
                                <LeadGrid leads={noShowAppointmentsLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} appointmentColumnHeader="No Show Appointment" isNoShowSection={true} emptyMessage="No appointments marked as No Show." />
                            </div>
                        </TabsContent>
                        <TabsContent value="tasks" className="m-0 h-full space-y-6">
                            {pastPendingTasksLeads.length > 0 && (
                                <div className="space-y-3 pb-4 border-b border-rose-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Overdue Tasks & Reminders (Action Required)</h3>
                                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs">
                                            {pastPendingTasksLeads.length}
                                        </Badge>
                                    </div>
                                    <LeadGrid leads={pastPendingTasksLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} isPastTaskSection={true} taskColumnHeader="Overdue Task / Reminder" emptyMessage="No overdue tasks." />
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <ListTodo className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Today's Tasks & Reminders</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {todayTasksLeads.length}
                                    </Badge>
                                </div>
                                <LeadGrid leads={todayTasksLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} isTodayTaskSection={true} taskColumnHeader="Today's Task / Reminder" emptyMessage="No tasks scheduled for today." />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-200/80">
                                <div className="flex items-center gap-2 px-1">
                                    <ListTodo className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Future Tasks & Reminders</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {futureTasksLeads.length}
                                    </Badge>
                                </div>
                                <LeadGrid leads={futureTasksLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} isFutureTaskSection={true} taskColumnHeader="Upcoming Task / Reminder" emptyMessage="No future tasks scheduled." />
                            </div>

                            {completedTasksLeads.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-emerald-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Completed Tasks & Reminders</h3>
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                                            {completedTasksLeads.length}
                                        </Badge>
                                    </div>
                                    <LeadGrid leads={completedTasksLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} isCompletedTaskSection={true} taskColumnHeader="Completed Task / Reminder" emptyMessage="No completed tasks." />
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="priority" className="m-0 h-full">
                            <LeadGrid leads={priorityLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="new" className="m-0 h-full">
                            <LeadGrid leads={newLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="wip" className="m-0 h-full">
                            <LeadGrid leads={wipLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="quotes-out" className="m-0 h-full">
                            <LeadGrid leads={quotesOut} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="quotes-accepted" className="m-0 h-full">
                            <LeadGrid leads={quotesAccepted} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="product-pending" className="m-0 h-full">
                            <LeadGrid leads={productPending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="localmile" className="m-0 h-full">
                            <LeadGrid leads={localMilePending} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="out-of-territory" className="m-0 h-full">
                            <LeadGrid leads={outOfTerritoryLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                        <TabsContent value="future-follow-up" className="m-0 h-full">
                            <LeadGrid leads={futureFollowUpLeads} viewMode={viewMode} sortBy={sortBy} onCall={handleCall} onClick={openLead} onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }} onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }} onAmReassign={handleAmReassign} accountManagers={accountManagers} canReassign={isAdmin} canUnassign={isAdmin} />
                        </TabsContent>
                    </div>
                </Tabs>
            )}

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
    canReassign,
    canUnassign,
    appointmentColumnHeader,
    taskColumnHeader,
    isPastSection = false,
    isNoShowSection = false,
    isPastTaskSection = false,
    isTodayTaskSection = false,
    isFutureTaskSection = false,
    isCompletedTaskSection = false,
    emptyMessage = "No leads in this bucket.",
    statusFilter
}: { 
    leads: Lead[], 
    viewMode: 'table' | 'accordion' | 'grid' | 'queue', 
    sortBy: 'franchisee' | 'companyName' | 'dateLeadEntered' | 'weeklyParcels', 
    onCall: (id: string, phone: string) => void, 
    onClick: (id: string) => void, 
    onEmail: (lead: Lead) => void, 
    onNotes: (lead: Lead) => void,
    onAmReassign?: (leadId: string, amName: string) => void,
    accountManagers?: UserProfile[],
    canReassign?: boolean,
    canUnassign?: boolean,
    appointmentColumnHeader?: string,
    taskColumnHeader?: string,
    isPastSection?: boolean,
    isNoShowSection?: boolean,
    isPastTaskSection?: boolean,
    isTodayTaskSection?: boolean,
    isFutureTaskSection?: boolean,
    isCompletedTaskSection?: boolean,
    emptyMessage?: string,
    statusFilter?: string
}) {
    if (leads.length === 0) {
        return <div className="text-center p-8 text-muted-foreground bg-white/40 rounded-lg border border-dashed border-slate-200">{emptyMessage}</div>;
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
            } else if (sortBy === 'weeklyParcels') {
                const valA = parseInt(a.weeklyParcels || a.discoveryData?.weeklyParcels || '0', 10) || 0;
                const valB = parseInt(b.weeklyParcels || b.discoveryData?.weeklyParcels || '0', 10) || 0;
                return valB - valA;
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
                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} onAmReassign={onAmReassign} accountManagers={accountManagers} canReassign={canReassign} canUnassign={canUnassign} isPastSection={isPastSection} isNoShowSection={isNoShowSection} isPastTaskSection={isPastTaskSection} isTodayTaskSection={isTodayTaskSection} isFutureTaskSection={isFutureTaskSection} isCompletedTaskSection={isCompletedTaskSection} />
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
                                    <LeadCard key={lead.id} lead={lead} onCall={onCall} onClick={() => onClick(lead.id!)} onEmail={() => onEmail(lead)} onNotes={() => onNotes(lead)} onAmReassign={onAmReassign} accountManagers={accountManagers} canReassign={canReassign} canUnassign={canUnassign} isPastSection={isPastSection} isNoShowSection={isNoShowSection} isPastTaskSection={isPastTaskSection} isTodayTaskSection={isTodayTaskSection} isFutureTaskSection={isFutureTaskSection} isCompletedTaskSection={isCompletedTaskSection} />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    const isTaskMode = Boolean(taskColumnHeader || isPastTaskSection || isTodayTaskSection || isFutureTaskSection || isCompletedTaskSection);

    // Default: 'table' (List layout)
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="font-bold text-[#095c7b]">{statusFilter === 'LocalMile Opportunity' ? 'Date Registration Sent' : statusFilter === 'LocalMile Pending' ? 'Date LocalMile Accepted' : 'Date Entered'}</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Company & Status</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Assigned AM</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Franchisee</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Weekly Parcels</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Service Option</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">Contact Details</TableHead>
                        <TableHead className="font-bold text-[#095c7b]">{taskColumnHeader || appointmentColumnHeader || "Upcoming Appointment"}</TableHead>
                        <TableHead className="font-bold text-[#095c7b] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedLeads.map((lead) => {
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
                        
                        const email = lead.customerServiceEmail || primaryContact?.email || '';
                        const address = [lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ');
                        
                        const now = new Date();

                        const allAppointmentsMap = new Map();
                        lead.appointments?.forEach(a => allAppointmentsMap.set(a.id, a));
                        const allAppointments = Array.from(allAppointmentsMap.values());

                        let upcomingAppointment: any = null;
                        if (isNoShowSection) {
                            upcomingAppointment = allAppointments
                                .filter(a => a.appointmentStatus === 'No Show')
                                .sort((a, b) => {
                                    const dA = parseApptDate(a)?.getTime() || 0;
                                    const dB = parseApptDate(b)?.getTime() || 0;
                                    return dB - dA;
                                })[0];
                        } else if (isPastSection) {
                            upcomingAppointment = allAppointments
                                .filter(a => {
                                    const parsed = parseApptDate(a);
                                    const status = a.appointmentStatus || 'Pending';
                                    return parsed && startOfDay(parsed).getTime() < startOfDay(now).getTime() && status === 'Pending';
                                })
                                .sort((a, b) => {
                                    const dA = parseApptDate(a)?.getTime() || 0;
                                    const dB = parseApptDate(b)?.getTime() || 0;
                                    return dB - dA;
                                })[0];
                        } else {
                            upcomingAppointment = allAppointments
                                .filter(a => {
                                    const parsed = parseApptDate(a);
                                    const status = a.appointmentStatus || 'Pending';
                                    return parsed && startOfDay(parsed).getTime() >= startOfDay(now).getTime() && status === 'Pending';
                                })
                                .sort((a, b) => {
                                    const dA = parseApptDate(a)?.getTime() || 0;
                                    const dB = parseApptDate(b)?.getTime() || 0;
                                    return dA - dB;
                                })[0];
                        }

                        if (!upcomingAppointment && allAppointments.length > 0) {
                            upcomingAppointment = allAppointments[0];
                        }

                        const allTasksMap = new Map();
                        lead.tasks?.forEach(t => allTasksMap.set(t.id, t));
                        const allTasks = Array.from(allTasksMap.values());

                        let relevantTask: any = null;
                        if (isPastTaskSection) {
                            relevantTask = allTasks
                                .filter(t => {
                                    if (t.isCompleted) return false;
                                    const parsed = parseTaskDate(t);
                                    return parsed && startOfDay(parsed).getTime() < startOfDay(now).getTime();
                                })
                                .sort((a, b) => (parseTaskDate(b)?.getTime() || 0) - (parseTaskDate(a)?.getTime() || 0))[0];
                        } else if (isTodayTaskSection) {
                            relevantTask = allTasks
                                .filter(t => {
                                    if (t.isCompleted) return false;
                                    const parsed = parseTaskDate(t);
                                    return parsed && startOfDay(parsed).getTime() === startOfDay(now).getTime();
                                })[0];
                        } else if (isFutureTaskSection) {
                            relevantTask = allTasks
                                .filter(t => {
                                    if (t.isCompleted) return false;
                                    const parsed = parseTaskDate(t);
                                    return parsed && startOfDay(parsed).getTime() > startOfDay(now).getTime();
                                })
                                .sort((a, b) => (parseTaskDate(a)?.getTime() || 0) - (parseTaskDate(b)?.getTime() || 0))[0];
                        } else if (isCompletedTaskSection) {
                            relevantTask = allTasks
                                .filter(t => t.isCompleted)
                                .sort((a, b) => (parseTaskDate(b)?.getTime() || 0) - (parseTaskDate(a)?.getTime() || 0))[0];
                        } else if (allTasks.length > 0) {
                            relevantTask = allTasks.find(t => !t.isCompleted) || allTasks[0];
                        }
                            
                        const currentStatus = lead.customerStatus || lead.status;
                        let rowBgClass = "hover:bg-slate-50/80 transition-colors";
                        if (currentStatus === "LocalMile Opportunity") {
                            rowBgClass = "bg-purple-50/60 hover:bg-purple-100/60 transition-colors";
                        } else if (currentStatus === "LocalMile Pending") {
                            rowBgClass = "bg-amber-50/60 hover:bg-amber-100/60 transition-colors";
                        }
                        
                        return (
                            <TableRow key={lead.id} className={rowBgClass}>
                                <TableCell className="text-xs text-slate-600 font-medium">
                                    {(() => {
                                        const dateVal = getLeadDisplayDateValue(lead);
                                        const parsed = dateVal ? parseDateString(dateVal) : null;
                                        return parsed ? format(parsed, 'MMM d, yyyy') : (dateVal || '-');
                                    })()}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="font-bold text-[#095c7b] hover:underline cursor-pointer"
                                            onClick={() => onClick(lead.id!)}
                                        >
                                            {lead.companyName}
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 uppercase font-semibold">
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
                                            {isFranchiseeGeneratedLead(lead) && (
                                                <Badge 
                                                    variant="outline" 
                                                    className="text-[10px] uppercase shrink-0 border bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                                                >
                                                    Franchisee Lead
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
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {canReassign && accountManagers && onAmReassign ? (
                                        <div onClick={(e) => e.stopPropagation()} className="w-[180px]">
                                            <Select 
                                                value={lead.accountManagerAssigned || 'unassigned'} 
                                                onValueChange={(val) => onAmReassign(lead.id!, val)}
                                            >
                                                <SelectTrigger className="h-8 px-2 text-xs w-full bg-white border-[#095c7b]/20">
                                                    <SelectValue placeholder="Unassigned" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {canUnassign && <SelectItem value="unassigned">Unassigned</SelectItem>}
                                                    {accountManagers.map(am => {
                                                        const name = am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email;
                                                        return <SelectItem key={am.uid} value={name}>{name}</SelectItem>
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span>{lead.accountManagerAssigned || <span className="text-slate-400 italic text-xs">Unassigned</span>}</span>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {lead.franchisee || <span className="text-slate-400 italic text-xs">Unassigned</span>}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {(lead.weeklyParcels || lead.discoveryData?.weeklyParcels) || <span className="text-slate-400 italic text-xs">-</span>}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {lead.selectedServiceOption ? (
                                        <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-200 text-purple-700 uppercase font-bold">
                                            {lead.selectedServiceOption.replace('-', ' ')}
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs gap-1 text-slate-600">
                                        <span className="font-semibold text-slate-800">{contactName}</span>
                                        {uniquePhones.length === 1 && (
                                            <div 
                                                className="flex items-center gap-1.5 hover:text-[#095c7b] cursor-pointer group w-fit"
                                                onClick={() => onCall(lead.id!, uniquePhones[0].phone)}
                                                title="Call Lead"
                                            >
                                                <Phone className="h-3 w-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                                                <span>{uniquePhones[0].phone}</span>
                                            </div>
                                        )}
                                        {uniquePhones.length > 1 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="flex items-center gap-1.5 hover:text-[#095c7b] cursor-pointer group w-fit">
                                                        <Phone className="h-3 w-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                                                        <span>{uniquePhones[0].phone} (+{uniquePhones.length - 1} more)</span>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                                    {uniquePhones.map((p, idx) => (
                                                        <DropdownMenuItem key={idx} onClick={() => onCall(lead.id!, p.phone)}>
                                                            <Phone className="mr-2 h-4 w-4 text-[#095c7b]" />
                                                            <span className="font-medium mr-1">{p.label}:</span> {p.phone}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        {email && (
                                            <div 
                                                className="flex items-center gap-1.5 hover:text-[#095c7b] cursor-pointer group w-fit max-w-[200px]"
                                                onClick={() => onEmail(lead)}
                                                title="Send Email"
                                            >
                                                <Mail className="h-3 w-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                                                <span className="truncate">{email}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell>
                                    {isTaskMode ? (
                                        relevantTask ? (
                                            <div className="flex flex-col gap-0.5 text-xs text-[#095c7b]">
                                                <div className="flex items-center gap-1.5 font-semibold">
                                                    <ListTodo className="h-3.5 w-3.5 shrink-0 text-[#095c7b]" />
                                                    <span className="line-clamp-1">{relevantTask.title}</span>
                                                    {relevantTask.isCompleted && (
                                                        <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-semibold shrink-0">
                                                            Done
                                                        </Badge>
                                                    )}
                                                </div>
                                                {relevantTask.dueDate && (
                                                    <span className="text-[11px] text-slate-500 pl-5">
                                                        Due: {(() => {
                                                            const parsed = parseTaskDate(relevantTask);
                                                            return parsed ? format(parsed, 'MMM d, yyyy') : relevantTask.dueDate;
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">-</span>
                                        )
                                    ) : upcomingAppointment ? (
                                        <div className="flex items-center gap-1.5 text-xs text-[#095c7b] font-semibold">
                                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                                            <span>
                                                {(() => {
                                                    const parsed = parseApptDate(upcomingAppointment);
                                                    return parsed ? format(parsed, 'MMM d, yyyy h:mm a') : (upcomingAppointment.date || upcomingAppointment.appointmentDate || '-');
                                                })()}
                                            </span>
                                            {upcomingAppointment.appointmentStatus === 'No Show' && (
                                                <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 uppercase font-semibold">
                                                    No Show
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {email && (
                                            <Button 
                                                size="icon" 
                                                variant="outline"
                                                className="h-8 w-8 rounded-full border-[#095c7b]/20 text-[#095c7b] hover:bg-slate-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEmail(lead);
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
                                                onNotes(lead);
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
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function LeadCard({ 
    lead, 
    onCall, 
    onClick, 
    onEmail, 
    onNotes, 
    onAmReassign, 
    accountManagers, 
    canReassign, 
    canUnassign, 
    isPastSection = false, 
    isNoShowSection = false,
    isPastTaskSection = false,
    isTodayTaskSection = false,
    isFutureTaskSection = false,
    isCompletedTaskSection = false
}: { 
    lead: Lead, 
    onCall: (id: string, phone: string) => void, 
    onClick: () => void, 
    onEmail: () => void, 
    onNotes: () => void, 
    onAmReassign?: (leadId: string, amName: string) => void, 
    accountManagers?: UserProfile[], 
    canReassign?: boolean, 
    canUnassign?: boolean, 
    isPastSection?: boolean, 
    isNoShowSection?: boolean,
    isPastTaskSection?: boolean,
    isTodayTaskSection?: boolean,
    isFutureTaskSection?: boolean,
    isCompletedTaskSection?: boolean
}) {
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
    const allAppointments = Array.from(allAppointmentsMap.values());

    let upcomingAppointment: any = null;
    if (isNoShowSection) {
        upcomingAppointment = allAppointments
            .filter(a => a.appointmentStatus === 'No Show')
            .sort((a, b) => {
                const dA = parseApptDate(a)?.getTime() || 0;
                const dB = parseApptDate(b)?.getTime() || 0;
                return dB - dA;
            })[0];
    } else if (isPastSection) {
        upcomingAppointment = allAppointments
            .filter(a => {
                const parsed = parseApptDate(a);
                const status = a.appointmentStatus || 'Pending';
                return parsed && startOfDay(parsed).getTime() < startOfDay(now).getTime() && status === 'Pending';
            })
            .sort((a, b) => {
                const dA = parseApptDate(a)?.getTime() || 0;
                const dB = parseApptDate(b)?.getTime() || 0;
                return dB - dA;
            })[0];
    } else {
        upcomingAppointment = allAppointments
            .filter(a => {
                const parsed = parseApptDate(a);
                const status = a.appointmentStatus || 'Pending';
                return parsed && status === 'Pending';
            })
            .sort((a, b) => {
                const dA = parseApptDate(a)?.getTime() || 0;
                const dB = parseApptDate(b)?.getTime() || 0;
                return dA - dB;
            })[0];
    }

    if (!upcomingAppointment && allAppointments.length > 0) {
        upcomingAppointment = allAppointments[0];
    }

    const isTaskMode = Boolean(isPastTaskSection || isTodayTaskSection || isFutureTaskSection || isCompletedTaskSection);
    const allTasksMap = new Map();
    lead.tasks?.forEach(t => allTasksMap.set(t.id, t));
    const allTasks = Array.from(allTasksMap.values());

    let relevantTask: any = null;
    if (isPastTaskSection) {
        relevantTask = allTasks
            .filter(t => {
                if (t.isCompleted) return false;
                const parsed = parseTaskDate(t);
                return parsed && startOfDay(parsed).getTime() < startOfDay(now).getTime();
            })
            .sort((a, b) => (parseTaskDate(b)?.getTime() || 0) - (parseTaskDate(a)?.getTime() || 0))[0];
    } else if (isTodayTaskSection) {
        relevantTask = allTasks
            .filter(t => {
                if (t.isCompleted) return false;
                const parsed = parseTaskDate(t);
                return parsed && startOfDay(parsed).getTime() === startOfDay(now).getTime();
            })[0];
    } else if (isFutureTaskSection) {
        relevantTask = allTasks
            .filter(t => {
                if (t.isCompleted) return false;
                const parsed = parseTaskDate(t);
                return parsed && startOfDay(parsed).getTime() > startOfDay(now).getTime();
            })
            .sort((a, b) => (parseTaskDate(a)?.getTime() || 0) - (parseTaskDate(b)?.getTime() || 0))[0];
    } else if (isCompletedTaskSection) {
        relevantTask = allTasks
            .filter(t => t.isCompleted)
            .sort((a, b) => (parseTaskDate(b)?.getTime() || 0) - (parseTaskDate(a)?.getTime() || 0))[0];
    } else if (allTasks.length > 0) {
        relevantTask = allTasks.find(t => !t.isCompleted) || allTasks[0];
    }
        
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
                            {isFranchiseeGeneratedLead(lead) && (
                                <Badge 
                                    variant="outline" 
                                    className="text-[10px] uppercase shrink-0 border bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                                >
                                    Franchisee Lead
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
                            {(lead.weeklyParcels || lead.discoveryData?.weeklyParcels) && (
                                <Badge 
                                    variant="outline" 
                                    className="text-[10px] bg-sky-50 border-sky-200 text-sky-700 uppercase shrink-0 font-medium"
                                >
                                    📦 {lead.weeklyParcels || lead.discoveryData?.weeklyParcels} / wk
                                </Badge>
                            )}
                            {lead.selectedServiceOption && (
                                <Badge 
                                    variant="outline" 
                                    className="text-[10px] bg-purple-50 border-purple-200 text-purple-700 uppercase shrink-0 font-bold"
                                >
                                    ✨ {lead.selectedServiceOption.replace('-', ' ')}
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
                                    {canUnassign && <SelectItem value="unassigned">Unassigned</SelectItem>}
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
                    {lead.dateLeadEntered && (() => {
                        const parsed = parseDateString(lead.dateLeadEntered);
                        return parsed ? (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs">Entered: {format(parsed, 'MMM d, yyyy')}</span>
                            </div>
                        ) : null;
                    })()}
                    {isTaskMode && relevantTask ? (
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#095c7b]/10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <ListTodo className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                                <div className="flex flex-col text-xs font-semibold text-[#095c7b] truncate">
                                    <span className="truncate" title={relevantTask.title}>{relevantTask.title}</span>
                                    {relevantTask.dueDate && (
                                        <span className="text-[10px] text-slate-500 font-normal">
                                            Due: {(() => {
                                                const parsed = parseTaskDate(relevantTask);
                                                return parsed ? format(parsed, 'MMM d, yyyy') : relevantTask.dueDate;
                                            })()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {relevantTask.isCompleted ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-semibold shrink-0">
                                    Done
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 uppercase font-semibold shrink-0">
                                    Task
                                </Badge>
                            )}
                        </div>
                    ) : upcomingAppointment ? (
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#095c7b]/10">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                                <span className="text-xs font-semibold text-[#095c7b]">
                                    Appt: {(() => {
                                        const parsed = parseApptDate(upcomingAppointment);
                                        return parsed ? format(parsed, 'MMM d, yyyy h:mm a') : (upcomingAppointment.date || upcomingAppointment.appointmentDate || '-');
                                    })()}
                                </span>
                            </div>
                            {upcomingAppointment.appointmentStatus === 'No Show' && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 uppercase font-semibold shrink-0">
                                    No Show
                                </Badge>
                            )}
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
