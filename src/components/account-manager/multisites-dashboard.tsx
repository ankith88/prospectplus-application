"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, doc, getDoc, documentId, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile, Contact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { 
  Building, Network, Building2, MapPin, Search, Filter, PlusCircle, 
  ExternalLink, ChevronRight, ChevronDown, CheckCircle2, ListTodo, 
  Mail, FileText, Layers, RefreshCw, User, Phone, Store, ArrowUpDown, X,
  ShieldCheck, AlertCircle, HelpCircle, Table as TableIcon, ListChecks,
  Sparkles, Link2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { updateLeadDetails, logActivity } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MULTISITE_ACCOUNT_MANAGER_UID, isMultisiteCampaign } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { LeadEmailDialog } from './lead-email-dialog';
import { LeadNotesDialog } from './lead-notes-dialog';
import { QuickAddLeadDialog } from '@/components/quick-add-lead-dialog';
import { AmQueueView } from './am-queue-view';
import { convertParentLeadToSignedCustomer } from '@/services/parent-lead-conversion';
import { LeadStatusBadge } from '@/components/lead-status-badge';

export function MultiSitesDashboard() {
    const { userProfile, loading, isSuperAdmin } = useAuth();
    const { toast } = useToast();
    const { setLoadTime, setPageName, setIsCustom } = usePerformance();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>(MULTISITE_ACCOUNT_MANAGER_UID);
    const [targetAmDisplayName, setTargetAmDisplayName] = useState<string>('');

    const [viewTab, setViewTab] = useState<string>('hierarchy');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'parent' | 'child'>('all');

    // Dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);

    // Promote parent dialog state
    const [selectedParentLeadId, setSelectedParentLeadId] = useState('');
    const [childIdsToLink, setChildIdsToLink] = useState<string[]>([]);
    const [isConvertingParent, setIsConvertingParent] = useState(false);

    // Collapsible states for hierarchy cards
    const [openParents, setOpenParents] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setIsCustom(true);
        setPageName("MultiSites Dashboard");
    }, [setIsCustom, setPageName]);

    const canSeeAll = isSuperAdmin || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';

    // Default AM selection based on role: Admins/Sales Managers see 'all', AMs see their own assigned leads
    useEffect(() => {
        if (loading || !userProfile) return;
        if (canSeeAll) {
            setSelectedAm('all');
        } else {
            setSelectedAm(userProfile.uid || userProfile.displayName || MULTISITE_ACCOUNT_MANAGER_UID);
        }
    }, [userProfile, loading, isSuperAdmin, canSeeAll]);

    // Fetch Account Managers list and resolve target AM display name
    useEffect(() => {
        async function loadAMs() {
            try {
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'));
                const snap = await getDocs(q);
                const ams = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                setAccountManagers(ams);

                // Target AM lookup
                const targetAm = ams.find(u => u.uid === MULTISITE_ACCOUNT_MANAGER_UID || (u as any).id === MULTISITE_ACCOUNT_MANAGER_UID);
                if (targetAm) {
                    const resolvedName = targetAm.displayName || `${targetAm.firstName || ''} ${targetAm.lastName || ''}`.trim();
                    setTargetAmDisplayName(resolvedName);
                } else {
                    const targetDoc = await getDoc(doc(firestore, 'users', MULTISITE_ACCOUNT_MANAGER_UID));
                    if (targetDoc.exists()) {
                        const data = targetDoc.data();
                        const resolvedName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || MULTISITE_ACCOUNT_MANAGER_UID;
                        setTargetAmDisplayName(resolvedName);
                    } else {
                        setTargetAmDisplayName(MULTISITE_ACCOUNT_MANAGER_UID);
                    }
                }
            } catch (error) {
                console.error("Failed to load account managers", error);
            }
        }
        loadAMs();
    }, []);

    // Load MultiSite Leads & Appointments
    const fetchMultiSiteData = async () => {
        setIsLoadingData(true);
        try {
            const leadsRef = collection(firestore, 'leads');
            const snap = await getDocs(leadsRef);
            const allLeads = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Lead));

            // Also check companies collection for signed customer parent accounts
            const compRef = collection(firestore, 'companies');
            const compSnap = await getDocs(compRef);
            const allCompanies = compSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), customerStatus: 'Signed Customer' } as any));

            // Merge companies into leads pool if not present
            const leadIdSet = new Set(allLeads.map(l => l.id));
            const mergedLeads = [...allLeads];
            allCompanies.forEach(c => {
                if (!leadIdSet.has(c.id)) {
                    mergedLeads.push(c as Lead);
                }
            });

            // Identify parent IDs that exist in the system
            const parentIdsWithChildren = new Set<string>();
            mergedLeads.forEach(l => {
                if (l.parentLeadId) {
                    parentIdsWithChildren.add(l.parentLeadId);
                }
            });

            // Identify explicit MultiSite lead IDs strictly where bucket === 'multisite'
            const explicitMultisiteIds = new Set<string>();
            mergedLeads.forEach(l => {
                if (l.bucket === 'multisite') {
                    explicitMultisiteIds.add(l.id);
                    if (l.parentLeadId) {
                        explicitMultisiteIds.add(l.parentLeadId);
                    }
                }
            });

            // Include child site locations whose parent is in explicitMultisiteIds
            mergedLeads.forEach(l => {
                if (l.parentLeadId && explicitMultisiteIds.has(l.parentLeadId)) {
                    explicitMultisiteIds.add(l.id);
                }
            });

            // Filter mergedLeads strictly to MultiSite bucket program records
            const multisiteLeads = mergedLeads.filter(l => explicitMultisiteIds.has(l.id));

            setLeads(multisiteLeads);

            // Fetch appointments subcollection
            try {
                const apptQuery = query(collectionGroup(firestore, 'appointments'));
                const apptSnap = await getDocs(apptQuery);
                const fetchedAppts = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAppointments(fetchedAppts);
            } catch (err) {
                console.error("Failed to fetch appointments:", err);
            }

            // Default open top 5 parent cards
            const initialOpen: Record<string, boolean> = {};
            multisiteLeads.forEach((l, idx) => {
                if (!l.parentLeadId && idx < 5) {
                    initialOpen[l.id] = true;
                }
            });
            setOpenParents(initialOpen);
        } catch (error) {
            console.error("Failed to fetch multisite leads", error);
            toast({
                variant: 'destructive',
                title: 'Error Loading MultiSites',
                description: 'Could not load multi-site lead records.'
            });
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchMultiSiteData();
    }, []);

    // Filtered Leads (including Signed Customers for Hierarchy Tree view)
    const filteredLeads = useMemo(() => {
        let targetAmLeadIds: Set<string> | null = null;
        let targetParentIds: Set<string> | null = null;

        if (selectedAm !== 'all') {
            targetAmLeadIds = new Set<string>();
            targetParentIds = new Set<string>();

            const targetAmObj = accountManagers.find(a => a.uid === selectedAm || a.displayName === selectedAm || a.email === selectedAm || (a as any).id === selectedAm);
            const targetUid = targetAmObj?.uid || (targetAmObj as any)?.id || selectedAm;
            const targetName = targetAmObj?.displayName || (targetAmObj ? `${targetAmObj.firstName || ''} ${targetAmObj.lastName || ''}`.trim() : selectedAm);

            leads.forEach(l => {
                const amAssigned = (l.accountManagerAssigned || '').trim();
                const amUid = ((l as any).accountManagerUid || (l as any).assignedTo || '').trim();
                const salesRep = ((l as any).salesRepAssigned || '').trim();

                const isTargetAm = 
                    amAssigned === selectedAm || 
                    amUid === selectedAm || 
                    salesRep === selectedAm ||
                    (targetUid && (amUid === targetUid || salesRep === targetUid)) ||
                    (targetName && (amAssigned === targetName || salesRep === targetName)) ||
                    (userProfile?.uid && (selectedAm === userProfile.uid || selectedAm === userProfile.displayName) && (amUid === userProfile.uid || amAssigned === userProfile.displayName)) ||
                    (selectedAm === MULTISITE_ACCOUNT_MANAGER_UID && (
                        amAssigned === targetAmDisplayName || 
                        amAssigned === MULTISITE_ACCOUNT_MANAGER_UID || 
                        amUid === MULTISITE_ACCOUNT_MANAGER_UID ||
                        salesRep === MULTISITE_ACCOUNT_MANAGER_UID
                    ));

                if (isTargetAm) {
                    targetAmLeadIds!.add(l.id);
                    if (l.parentLeadId) {
                        targetParentIds!.add(l.parentLeadId);
                    }
                }
            });
        }

        return leads.filter(l => {
            // AM Filter
            if (selectedAm !== 'all' && targetAmLeadIds) {
                const isDirectMatch = targetAmLeadIds.has(l.id);
                const isParentOfMatch = targetParentIds?.has(l.id);
                const isChildOfMatch = l.parentLeadId ? targetAmLeadIds.has(l.parentLeadId) : false;

                if (!isDirectMatch && !isParentOfMatch && !isChildOfMatch) {
                    return false;
                }
            }

            // Type Filter
            if (typeFilter === 'parent' && l.parentLeadId) return false;
            if (typeFilter === 'child' && !l.parentLeadId) return false;

            // Status Filter
            if (statusFilter !== 'all') {
                const currentStatus = l.customerStatus || l.status || '';
                if (statusFilter === 'New' && currentStatus !== 'New') return false;
                if (statusFilter === 'In Progress' && !['In Progress', 'Contacted', 'Contact Attempted'].includes(currentStatus)) return false;
                if (statusFilter === 'Quotes Out' && !['Quote Out', 'Proposal Sent', 'Quotes Out'].includes(currentStatus)) return false;
                if (statusFilter === 'Quote Accepted' && currentStatus !== 'Quote Accepted') return false;
                if (statusFilter === 'Product Pending' && currentStatus !== 'Product Pending') return false;
                if (statusFilter === 'Trialing' && !currentStatus.toLowerCase().includes('trial')) return false;
                if (statusFilter === 'Cancellation Requested' && !['Cancellation Requested', 'Cancellation Pending', 'Save Stage'].includes(currentStatus)) return false;
                if (statusFilter === 'Future Follow-up' && currentStatus !== 'Future Follow-up') return false;
            }

            // State Filter
            if (stateFilter !== 'all') {
                const leadState = l.address?.state || (l as any).state || '';
                if (leadState.toUpperCase() !== stateFilter.toUpperCase()) return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const name = (l.companyName || '').toLowerCase();
                const id = (l.id || '').toLowerCase();
                const ppId = (l.prospectPlusId || '').toLowerCase();
                const parentId = (l.parentLeadId || '').toLowerCase();
                const city = (l.address?.city || (l as any).city || '').toLowerCase();
                const state = (l.address?.state || (l as any).state || '').toLowerCase();
                const zip = (l.address?.zip || (l as any).zip || '').toLowerCase();
                const am = (l.accountManagerAssigned || '').toLowerCase();
                const franchisee = ((l as any).franchiseeName || l.franchisee || '').toLowerCase();

                const matches = name.includes(q) || id.includes(q) || ppId.includes(q) || parentId.includes(q) ||
                                city.includes(q) || state.includes(q) || zip.includes(q) || am.includes(q) || franchisee.includes(q);
                if (!matches) return false;
            }

            return true;
        });
    }, [leads, selectedAm, typeFilter, statusFilter, stateFilter, searchQuery, targetAmDisplayName]);

    // Pipeline Leads ONLY (excludes Signed Customers and Won accounts for stage tabs & queue)
    const pipelineLeads = useMemo(() => {
        return filteredLeads.filter(l => {
            const st = l.customerStatus || l.status || '';
            return st !== 'Signed Customer' && st !== 'Won';
        });
    }, [filteredLeads]);

    // Stage Buckets for Tab Bar (using pipelineLeads)
    const stageCounts = useMemo(() => {
        const counts = {
            new: 0,
            wip: 0,
            quotesOut: 0,
            quotesAccepted: 0,
            productPending: 0,
            localMile: 0,
            futureFollowUp: 0,
            total: pipelineLeads.length
        };

        pipelineLeads.forEach(l => {
            const st = l.customerStatus || l.status || 'New';
            if (st === 'New') counts.new++;
            else if (['In Progress', 'Contacted', 'Contact Attempted'].includes(st)) counts.wip++;
            else if (['Quote Out', 'Proposal Sent', 'Quotes Out'].includes(st)) counts.quotesOut++;
            else if (st === 'Quote Accepted') counts.quotesAccepted++;
            else if (st === 'Product Pending') counts.productPending++;
            else if (st.toLowerCase().includes('localmile') || st.toLowerCase().includes('trial')) counts.localMile++;
            else if (st === 'Future Follow-up') counts.futureFollowUp++;
        });

        return counts;
    }, [pipelineLeads]);

    // Stage Tab Specific Filtered Lead List
    const activeStageLeads = useMemo(() => {
        if (viewTab === 'new') return pipelineLeads.filter(l => (l.customerStatus || l.status || 'New') === 'New');
        if (viewTab === 'wip') return pipelineLeads.filter(l => ['In Progress', 'Contacted', 'Contact Attempted'].includes(l.customerStatus || l.status || ''));
        if (viewTab === 'quotes-out') return pipelineLeads.filter(l => ['Quote Out', 'Proposal Sent', 'Quotes Out'].includes(l.customerStatus || l.status || ''));
        if (viewTab === 'quotes-accepted') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Quote Accepted');
        if (viewTab === 'product-pending') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Product Pending');
        if (viewTab === 'localmile') return pipelineLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase().includes('localmile') || (l.customerStatus || l.status || '').toLowerCase().includes('trial'));
        if (viewTab === 'future-follow-up') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Future Follow-up');
        return pipelineLeads;
    }, [pipelineLeads, viewTab]);

    // Parent Accounts vs Child Locations Grouping for Hierarchy View
    const { parentLeadGroups, orphanChildren } = useMemo(() => {
        const parentMap = new Map<string, { parent: Lead | null; children: Lead[]; parentName: string }>();

        // Find all parent accounts in filteredLeads (includes signed/won customers)
        const parents = filteredLeads.filter(l => !l.parentLeadId);
        parents.forEach(p => {
            parentMap.set(p.id, { parent: p, children: [], parentName: p.companyName });
        });

        const orphans: Lead[] = [];

        // Assign children to parent groups
        filteredLeads.filter(l => l.parentLeadId).forEach(c => {
            if (parentMap.has(c.parentLeadId!)) {
                parentMap.get(c.parentLeadId!)!.children.push(c);
            } else {
                const fullParent = leads.find(p => p.id === c.parentLeadId);
                if (fullParent) {
                    if (!parentMap.has(fullParent.id)) {
                        parentMap.set(fullParent.id, { parent: fullParent, children: [c], parentName: fullParent.companyName });
                    } else {
                        parentMap.get(fullParent.id)!.children.push(c);
                    }
                } else {
                    orphans.push(c);
                }
            }
        });

        return {
            parentLeadGroups: Array.from(parentMap.values()),
            orphanChildren: orphans
        };
    }, [filteredLeads, leads]);

    // Metric Calculations over pipelineLeads (active leads only)
    const metrics = useMemo(() => {
        const totalMultiSites = pipelineLeads.length;
        const totalParents = pipelineLeads.filter(l => !l.parentLeadId).length;
        const totalChildren = pipelineLeads.filter(l => l.parentLeadId).length;
        const assignedToTargetAm = pipelineLeads.filter(l => 
            l.accountManagerAssigned === targetAmDisplayName || 
            l.accountManagerAssigned === MULTISITE_ACCOUNT_MANAGER_UID ||
            (l as any).accountManagerUid === MULTISITE_ACCOUNT_MANAGER_UID ||
            (l as any).assignedTo === MULTISITE_ACCOUNT_MANAGER_UID
        ).length;
        const activePipelines = pipelineLeads.filter(l => ['New', 'In Progress', 'Contacted', 'Appointment Booked', 'Trialing', 'Quote Out', 'Quote Accepted'].includes(l.customerStatus || l.status || '')).length;

        return { totalMultiSites, totalParents, totalChildren, assignedToTargetAm, activePipelines };
    }, [pipelineLeads, targetAmDisplayName]);

    const toggleParentOpen = (parentId: string) => {
        setOpenParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
    };

    const handleCall = (leadId: string, phone: string) => {
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            toast({
                title: 'No Phone Number',
                description: 'This lead does not have a recorded phone number.'
            });
        }
    };

    const handleExecutePromoteParent = async () => {
        if (!selectedParentLeadId) {
            toast({
                variant: 'destructive',
                title: 'Parent Required',
                description: 'Please select a parent lead or company ID to promote.'
            });
            return;
        }

        setIsConvertingParent(true);
        try {
            const res = await convertParentLeadToSignedCustomer(selectedParentLeadId, childIdsToLink);
            if (res.success) {
                toast({
                    title: 'MultiSite Parent Promoted & Linked',
                    description: `Parent customer "${res.companyName}" was converted and linked with ${childIdsToLink.length} child account(s).`
                });
                setPromoteDialogOpen(false);
                setSelectedParentLeadId('');
                setChildIdsToLink([]);
                fetchMultiSiteData();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Promotion Failed',
                    description: res.error || 'Failed to convert parent lead.'
                });
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Could not complete parent promotion.'
            });
        } finally {
            setIsConvertingParent(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Network className="h-8 w-8 text-[#095c7b]" /> MultiSite Leads & Accounts
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Centralized dashboard for multi-site parent accounts, child site locations, stage pipeline tracking, and AM priority queue.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
                    <Button variant="outline" size="sm" onClick={fetchMultiSiteData} disabled={isLoadingData} className="gap-2 bg-white">
                        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPromoteDialogOpen(true)} className="gap-2 bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100">
                        <Sparkles className="h-4 w-4 text-indigo-600" /> Promote MultiSite Parent
                    </Button>
                    <Button variant="outline" size="sm" asChild className="gap-2 border-slate-300">
                        <Link href="/admin/marketing/import-leads">
                            <Layers className="h-4 w-4 text-[#095c7b]" /> Import MultiSites CSV
                        </Link>
                    </Button>
                    <Button size="sm" onClick={() => setQuickAddOpen(true)} className="bg-[#095c7b] hover:bg-[#07465e] text-white gap-2 shadow-sm">
                        <PlusCircle className="h-4 w-4" /> Add MultiSite Lead
                    </Button>
                </div>
            </header>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MultiSite Leads</span>
                            <Network className="h-4 w-4 text-[#095c7b]" />
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mt-2">{metrics.totalMultiSites}</div>
                        <p className="text-[11px] text-muted-foreground mt-1">Active multi-site leads</p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Parent Accounts</span>
                            <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-900 mt-2">{metrics.totalParents}</div>
                        <p className="text-[11px] text-muted-foreground mt-1">Head office / parent leads</p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Child Sites</span>
                            <Store className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-bold text-indigo-900 mt-2">{metrics.totalChildren}</div>
                        <p className="text-[11px] text-muted-foreground mt-1">Branch & site lead locations</p>
                    </CardContent>
                </Card>

                <Card className="border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/40 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Target AM Assigned</span>
                            <ShieldCheck className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-2xl font-bold text-amber-900 mt-2">{metrics.assignedToTargetAm}</div>
                        <p className="text-[11px] text-amber-700 mt-1 truncate" title={targetAmDisplayName || MULTISITE_ACCOUNT_MANAGER_UID}>
                            Assigned to {targetAmDisplayName || 'AR2TfLJJ...'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/30 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Deals</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-900 mt-2">{metrics.activePipelines}</div>
                        <p className="text-[11px] text-emerald-700 mt-1">Active opportunity pipeline</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="shadow-sm border border-slate-200">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
                        
                        {/* Search Input */}
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by Company, Suburb, Postcode, AM, Prospect+ ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white text-sm"
                            />
                        </div>

                        {/* Account Manager Filter */}
                        <div>
                            <Select value={selectedAm} onValueChange={setSelectedAm} disabled={!canSeeAll}>
                                <SelectTrigger className="bg-white text-xs md:text-sm">
                                    <SelectValue placeholder={canSeeAll ? "All Account Managers" : (userProfile?.displayName || "My Assigned Leads")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {canSeeAll && <SelectItem value="all">All Account Managers</SelectItem>}
                                    <SelectItem value={MULTISITE_ACCOUNT_MANAGER_UID}>
                                        ★ {targetAmDisplayName || 'Primary MultiSite AM'} (Michael O'Halloran)
                                    </SelectItem>
                                    {accountManagers
                                        .filter(am => am.uid !== MULTISITE_ACCOUNT_MANAGER_UID && (am as any).id !== MULTISITE_ACCOUNT_MANAGER_UID && (am.displayName || am.email) !== targetAmDisplayName)
                                        .map(am => (
                                            <SelectItem key={am.uid || (am as any).id} value={am.uid || am.displayName || am.email}>
                                                {am.displayName || `${am.firstName || ''} ${am.lastName || ''}`.trim() || am.email}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Record Type Filter */}
                        <div>
                            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                                <SelectTrigger className="bg-white text-xs md:text-sm">
                                    <SelectValue placeholder="All Record Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Record Types</SelectItem>
                                    <SelectItem value="parent">Parent Accounts Only</SelectItem>
                                    <SelectItem value="child">Child Sites Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Comprehensive Pipeline Status Filter */}
                        <div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="bg-white text-xs md:text-sm">
                                    <SelectValue placeholder="All Pipeline Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Pipeline Statuses</SelectItem>
                                    <SelectItem value="New">New</SelectItem>
                                    <SelectItem value="In Progress">Work in Progress (WIP)</SelectItem>
                                    <SelectItem value="Quotes Out">Quotes Out</SelectItem>
                                    <SelectItem value="Quote Accepted">Quote Accepted</SelectItem>
                                    <SelectItem value="Product Pending">Product Pending</SelectItem>
                                    <SelectItem value="Trialing">Trialing (LocalMile/ShipMate)</SelectItem>
                                    <SelectItem value="Future Follow-up">Future Follow-up</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Tabs Styled Matching AM Pipeline Page */}
            <Tabs value={viewTab} onValueChange={setViewTab} className="space-y-4">
                <div className="bg-white/80 p-1.5 rounded-t-xl border border-slate-200 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-3">
                    <TabsList className="bg-transparent overflow-x-auto flex w-full lg:w-auto justify-start shrink-0 gap-1.5 p-0">
                        <TabsTrigger value="hierarchy" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Hierarchy Tree <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b] font-bold">{parentLeadGroups.length} Groups</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Priority Queue <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{pipelineLeads.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="new" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            New <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.new}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="wip" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            WIP <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.wip}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="quotes-out" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Quotes Out <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.quotesOut}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="quotes-accepted" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Quotes Accepted <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">{stageCounts.quotesAccepted}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="product-pending" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Product Pending <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.productPending}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="localmile" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            LocalMile <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.localMile}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="future-follow-up" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Future Follow-up <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800">{stageCounts.futureFollowUp}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* PRIORITY ACTION QUEUE VIEW */}
                <TabsContent value="queue" className="space-y-4">
                    <Card className="border border-slate-200 shadow-sm bg-white p-4">
                        <AmQueueView 
                            leads={pipelineLeads}
                            appointments={appointments}
                            onCall={handleCall}
                            onEmail={(l) => { setActiveLead(l); setEmailDialogOpen(true); }}
                            onNotes={(l) => { setActiveLead(l); setNotesDialogOpen(true); }}
                            onClickLead={(id) => window.open(`/leads/${id}`, '_blank')}
                            setLeads={setLeads}
                        />
                    </Card>
                </TabsContent>

                {/* HIERARCHY / TREE VIEW (Shows full parent & child tree including signed customers) */}
                <TabsContent value="hierarchy" className="space-y-4">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
                            <Loader />
                            <p className="text-sm text-slate-500 mt-2">Loading MultiSite Account Hierarchy...</p>
                        </div>
                    ) : parentLeadGroups.length === 0 && orphanChildren.length === 0 ? (
                        <Card className="p-8 text-center bg-white border">
                            <Network className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-slate-700">No MultiSite Records Found</h3>
                            <p className="text-sm text-slate-500 mt-1">Try resetting your filters or promote a new parent account.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {parentLeadGroups.map(({ parent, children, parentName }) => {
                                const parentId = parent?.id || children[0]?.parentLeadId || 'unknown';
                                const isOpen = !!openParents[parentId];

                                return (
                                    <Card key={parentId} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                                        <div className="p-4 bg-slate-50/70 border-b flex flex-col md:flex-row justify-between md:items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-1 h-8 w-8 text-slate-500 hover:text-slate-800"
                                                    onClick={() => toggleParentOpen(parentId)}
                                                >
                                                    {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                                </Button>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg text-slate-900">{parentName}</span>
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            Parent Account
                                                        </Badge>
                                                        {parent?.prospectPlusId && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                ID: {parent.prospectPlusId}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                                        {parent?.address?.city && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                                {parent.address.city}, {parent.address.state} {parent.address.zip}
                                                            </span>
                                                        )}
                                                        {(parent as any)?.franchiseeName && (
                                                            <span className="flex items-center gap-1">
                                                                <Store className="h-3.5 w-3.5 text-slate-400" />
                                                                {(parent as any).franchiseeName}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                                            AM: <strong className="text-slate-700">{parent?.accountManagerAssigned || 'Unassigned'}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                <Badge className="bg-[#095c7b] text-white">
                                                    {children.length} Child Site{children.length !== 1 ? 's' : ''}
                                                </Badge>

                                                {parent && (
                                                    <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1 bg-white">
                                                        <Link href={`/leads/${parent.id}`}>
                                                            <ExternalLink className="h-3.5 w-3.5" /> View Profile
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Collapsible Child Sites Table */}
                                        {isOpen && (
                                            <div className="p-4 bg-white">
                                                {children.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic py-2">
                                                        No linked child locations found under this parent account.
                                                    </p>
                                                ) : (
                                                    <Table>
                                                        <TableHeader className="bg-slate-50">
                                                            <TableRow>
                                                                <TableHead className="text-xs font-semibold">Child Site Name</TableHead>
                                                                <TableHead className="text-xs font-semibold">Address / Location</TableHead>
                                                                <TableHead className="text-xs font-semibold">Local Site Manager</TableHead>
                                                                <TableHead className="text-xs font-semibold">Servicing Franchisee</TableHead>
                                                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                                                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {children.map(child => {
                                                                const childAddr = child.address || {} as any;
                                                                const fullAddrParts = [
                                                                    (child as any).address1 || childAddr.address1,
                                                                    (child as any).street || childAddr.street,
                                                                    childAddr.city || (child as any).city,
                                                                    childAddr.state || (child as any).state,
                                                                    childAddr.zip || (child as any).zip
                                                                ].filter(Boolean);
                                                                const fullAddrStr = fullAddrParts.length > 0 ? fullAddrParts.join(', ') : '-';

                                                                return (
                                                                    <TableRow key={child.id} className="hover:bg-slate-50/80">
                                                                        <TableCell className="font-medium text-sm text-slate-800">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Store className="h-3.5 w-3.5 text-indigo-500" />
                                                                                {child.companyName}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-slate-600">
                                                                            {fullAddrStr}
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-slate-600">
                                                                            {child.customerServiceEmail || child.customerPhone ? (
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium">{child.customerServiceEmail || '-'}</span>
                                                                                    <span className="text-[11px] text-slate-400">{child.customerPhone || ''}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-slate-400 italic">Not set</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-slate-600">
                                                                            <Badge variant="outline" className="bg-slate-50 border-slate-300">
                                                                                {(child as any).franchiseeName || child.franchisee || 'MailPlus Pty Ltd'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs">
                                                                            <LeadStatusBadge status={(child.customerStatus || child.status || 'New') as any} />
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setActiveLead(child); setNotesDialogOpen(true); }}>
                                                                                    <FileText className="h-3.5 w-3.5 text-slate-600" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setActiveLead(child); setEmailDialogOpen(true); }}>
                                                                                    <Mail className="h-3.5 w-3.5 text-slate-600" />
                                                                                </Button>
                                                                                <Button variant="outline" size="sm" asChild className="h-7 text-[11px] px-2">
                                                                                    <Link href={`/leads/${child.id}`}>
                                                                                        Open
                                                                                    </Link>
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* STAGE TAB CONTENT (Clean Lead Table for New, WIP, Quotes Out, Quotes Accepted, Product Pending, LocalMile, Future Follow-up) */}
                {viewTab !== 'hierarchy' && viewTab !== 'queue' && (
                    <TabsContent value={viewTab}>
                        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-xs">Company Name</TableHead>
                                        <TableHead className="font-semibold text-xs">Type</TableHead>
                                        <TableHead className="font-semibold text-xs">Parent Account Link</TableHead>
                                        <TableHead className="font-semibold text-xs">Suburb / State / Postcode</TableHead>
                                        <TableHead className="font-semibold text-xs">Servicing Franchisee</TableHead>
                                        <TableHead className="font-semibold text-xs">Account Manager</TableHead>
                                        <TableHead className="font-semibold text-xs">Status</TableHead>
                                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingData ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                <Loader />
                                            </TableCell>
                                        </TableRow>
                                    ) : activeStageLeads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                                                No lead records currently in this stage tab.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        activeStageLeads.map(l => {
                                            const isChild = Boolean(l.parentLeadId);
                                            const addr = l.address || {} as any;
                                            return (
                                                <TableRow key={l.id} className="hover:bg-slate-50/80">
                                                    <TableCell className="font-medium text-slate-800">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{l.companyName}</span>
                                                            {l.prospectPlusId && <span className="text-[11px] text-slate-400">ID: {l.prospectPlusId}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={isChild ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                                                            {isChild ? "Child Site" : "Parent Account"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {l.parentLeadId ? (
                                                            <span className="truncate max-w-[140px] inline-block font-mono text-[11px]">
                                                                {l.parentLeadId}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Self (Parent)</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {addr.city ? `${addr.city}, ${addr.state} ${addr.zip}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {(l as any).franchiseeName || l.franchisee || 'MailPlus Pty Ltd'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-700">
                                                        {l.accountManagerAssigned || 'Unassigned'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20 font-medium">
                                                            {l.customerStatus || l.status || 'New'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setActiveLead(l); setNotesDialogOpen(true); }}>
                                                                <FileText className="h-3.5 w-3.5 text-slate-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setActiveLead(l); setEmailDialogOpen(true); }}>
                                                                <Mail className="h-3.5 w-3.5 text-slate-600" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" asChild className="h-7 text-xs bg-white">
                                                                <Link href={`/leads/${l.id}`}>
                                                                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Profile
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* PROMOTE TO MULTISITE PARENT DIALOG */}
            <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Sparkles className="h-5 w-5 text-indigo-600" /> Promote & Link MultiSite Parent
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Convert a parent lead into a Parent Signed Customer and link child customer accounts.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-700">Select Parent Account (Lead or Customer ID)</Label>
                            <Select value={selectedParentLeadId} onValueChange={setSelectedParentLeadId}>
                                <SelectTrigger className="bg-white text-xs">
                                    <SelectValue placeholder="Choose parent account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leads.filter(l => !l.parentLeadId).map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.companyName} ({p.customerStatus || p.status || 'Lead'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-700">Link Child Locations (Select multiple)</Label>
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1 bg-slate-50">
                                {leads.filter(l => l.id !== selectedParentLeadId).map(child => {
                                    const isChecked = childIdsToLink.includes(child.id);
                                    return (
                                        <label key={child.id} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setChildIdsToLink(prev => [...prev, child.id]);
                                                    } else {
                                                        setChildIdsToLink(prev => prev.filter(id => id !== child.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="font-medium text-slate-800">{child.companyName}</span>
                                            <span className="text-[10px] text-slate-400">({child.customerStatus || child.status})</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleExecutePromoteParent} disabled={isConvertingParent} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            {isConvertingParent && <Loader />}
                            <Link2 className="h-4 w-4" /> Link & Convert Parent
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialogs */}
            {activeLead && emailDialogOpen && (
                <LeadEmailDialog
                    lead={activeLead}
                    isOpen={emailDialogOpen}
                    onClose={() => setEmailDialogOpen(false)}
                />
            )}

            {activeLead && notesDialogOpen && (
                <LeadNotesDialog
                    lead={activeLead}
                    isOpen={notesDialogOpen}
                    onClose={() => setNotesDialogOpen(false)}
                />
            )}

            {quickAddOpen && (
                <QuickAddLeadDialog
                    isOpen={quickAddOpen}
                    onOpenChange={setQuickAddOpen}
                />
            )}
        </div>
    );
}

export default MultiSitesDashboard;
