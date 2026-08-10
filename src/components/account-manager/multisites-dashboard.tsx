"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, UserProfile, Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { 
  Network, Building2, MapPin, Search, 
  ExternalLink, ChevronRight, ChevronDown, CheckCircle2, 
  Mail, FileText, RefreshCw, User, Store,
  ShieldCheck, Sparkles, Link2, Calendar, ListTodo, CheckSquare, Plus,
  AlertCircle, UserX, Square
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllFranchisees, updateTaskCompletion, logActivity } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MULTISITE_ACCOUNT_MANAGER_UID } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { LeadEmailDialog } from './lead-email-dialog';
import { LeadNotesDialog } from './lead-notes-dialog';
import { EnterMultiSiteLeadDialog } from '@/components/enter-multisite-lead-dialog';
import { convertParentLeadToSignedCustomer } from '@/services/parent-lead-conversion';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { LossReasonPicker } from '@/components/loss-reason-picker';
import { deactivateLocalMileAccessForLead } from '@/services/localmile-deactivation';
import { updateDoc } from 'firebase/firestore';
import { startOfDay } from 'date-fns';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

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

export function MultiSitesDashboard() {
    const { userProfile, loading, isSuperAdmin } = useAuth();
    const { toast } = useToast();
    const { setPageName, setIsCustom } = usePerformance();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [franchiseesList, setFranchiseesList] = useState<string[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [accountManagers, setAccountManagers] = useState<UserProfile[]>([]);
    const [selectedAm, setSelectedAm] = useState<string>(MULTISITE_ACCOUNT_MANAGER_UID);
    const [targetAmDisplayName, setTargetAmDisplayName] = useState<string>('');

    // Tab view starts with Appointments as 1st tab
    const [viewTab, setViewTab] = useState<string>('appointments');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [stateFilter, setStateFilter] = useState<string>('all');
    const [franchiseeFilter, setFranchiseeFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'parent' | 'child'>('all');

    // Dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);

    // Child lead creation dialog state (triggered from parent rows)
    const [enterChildLeadOpen, setEnterChildLeadOpen] = useState(false);
    const [selectedParentForChild, setSelectedParentForChild] = useState<Lead | null>(null);

    // Promote parent dialog state
    const [selectedParentLeadId, setSelectedParentLeadId] = useState('');
    const [childIdsToLink, setChildIdsToLink] = useState<string[]>([]);
    const [isConvertingParent, setIsConvertingParent] = useState(false);

    // Collapsible states for hierarchy cards
    const [openParents, setOpenParents] = useState<Record<string, boolean>>({});

    // Cancellation themes for LossReasonPicker
    const [cancellationThemes, setCancellationThemes] = useState<any[]>([]);

    // Selection state for child leads per parent (parentId -> array of selected child lead IDs)
    const [selectedChildIdsByParent, setSelectedChildIdsByParent] = useState<Record<string, string[]>>({});

    // Bulk Mark as Lost dialog state
    const [bulkLostDialogOpen, setBulkLostDialogOpen] = useState(false);
    const [bulkLostParent, setBulkLostParent] = useState<Lead | null>(null);
    const [bulkLostChildLeads, setBulkLostChildLeads] = useState<Lead[]>([]);
    const [bulkLostSelectedIds, setBulkLostSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLostThemeId, setBulkLostThemeId] = useState('');
    const [bulkLostWhyId, setBulkLostWhyId] = useState('');
    const [bulkLostReasonId, setBulkLostReasonId] = useState('');
    const [bulkLostNotes, setBulkLostNotes] = useState('');
    const [isSubmittingBulkLost, setIsSubmittingBulkLost] = useState(false);

    // Fetch cancellation hierarchy for LossReasonPicker
    useEffect(() => {
        async function fetchHierarchy() {
            try {
                const snap = await getDocs(collection(firestore, 'cancellation_hierarchy'));
                setCancellationThemes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Failed to fetch cancellation hierarchy", error);
            }
        }
        fetchHierarchy();
    }, []);

    // Selection helpers for bulk actions
    const toggleSelectChild = (parentId: string, childId: string) => {
        setSelectedChildIdsByParent(prev => {
            const current = prev[parentId] || [];
            const updated = current.includes(childId)
                ? current.filter(id => id !== childId)
                : [...current, childId];
            return { ...prev, [parentId]: updated };
        });
    };

    const toggleSelectAllChildren = (parentId: string, allChildIds: string[]) => {
        setSelectedChildIdsByParent(prev => {
            const current = prev[parentId] || [];
            const isAllSelected = allChildIds.length > 0 && allChildIds.every(id => current.includes(id));
            return { ...prev, [parentId]: isAllSelected ? [] : [...allChildIds] };
        });
    };

    const openBulkLostDialog = (parent: Lead | null, availableChildren: Lead[], preselectedChildIds?: string[]) => {
        if (!parent && availableChildren.length === 0) return;

        const childIdsToSelect = (preselectedChildIds && preselectedChildIds.length > 0)
            ? preselectedChildIds
            : availableChildren.map(c => c.id);

        const initialSet = new Set<string>(childIdsToSelect);
        if (parent && parent.customerStatus !== 'Lost' && parent.status !== 'Lost' && parent.customerStatus !== 'Lost Customer') {
            initialSet.add(parent.id);
        }

        setBulkLostParent(parent);
        setBulkLostChildLeads(availableChildren);
        setBulkLostSelectedIds(initialSet);
        setBulkLostThemeId('');
        setBulkLostWhyId('');
        setBulkLostReasonId('');
        setBulkLostNotes('');
        setBulkLostDialogOpen(true);
    };

    const handleExecuteBulkMarkAsLost = async () => {
        if (bulkLostSelectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No Leads Selected',
                description: 'Please select at least one lead or site to mark as lost.'
            });
            return;
        }

        if (!bulkLostNotes.trim()) {
            toast({
                variant: 'destructive',
                title: 'Notes Required',
                description: 'Please enter notes explaining why these leads are being marked as lost.'
            });
            return;
        }

        setIsSubmittingBulkLost(true);

        try {
            let themeName = 'Unspecified';
            let whyName = 'Unspecified';
            let reasonName = 'Unspecified / Other';

            if (bulkLostThemeId) {
                const themeObj = cancellationThemes.find(t => t.id === bulkLostThemeId);
                if (themeObj) {
                    themeName = themeObj.name || 'Unspecified';
                    const whyObj = themeObj.whys?.find((w: any) => w.id === bulkLostWhyId);
                    if (whyObj) {
                        whyName = whyObj.name || 'Unspecified';
                        const reasonObj = whyObj.reasons?.find((r: any) => r.id === bulkLostReasonId);
                        if (reasonObj) {
                            reasonName = reasonObj.name || 'Unspecified';
                        }
                    }
                }
            }

            const staffName = userProfile?.displayName || userProfile?.email || 'Staff';
            const targetIds = Array.from(bulkLostSelectedIds);

            for (const targetId of targetIds) {
                const leadRef = doc(firestore, 'leads', targetId);
                const compRef = doc(firestore, 'companies', targetId);

                const [leadSnap, compSnap] = await Promise.all([
                    getDoc(leadRef),
                    getDoc(compRef)
                ]);

                const isCompany = compSnap.exists();
                const lostStatus = isCompany ? 'Lost Customer' : 'Lost';

                const updateFields: any = {
                    customerStatus: lostStatus,
                    status: lostStatus,
                    statusReason: reasonName,
                    cancellationReason: reasonName,
                    cancellationReasonId: bulkLostReasonId || '',
                    cancellationTheme: themeName,
                    cancellationThemeId: bulkLostThemeId || '',
                    cancellationCategory: whyName,
                    cancellationWhyId: bulkLostWhyId || '',
                    cancellationDate: new Date().toISOString().split('T')[0],
                    lossNotes: bulkLostNotes.trim(),
                    updatedAt: new Date().toISOString()
                };

                if (leadSnap.exists()) {
                    await updateDoc(leadRef, updateFields);
                    await logActivity(targetId, {
                        type: 'Update',
                        notes: `Bulk marked as Lost under parent "${bulkLostParent?.companyName || 'MultiSite'}". Theme: ${themeName}, Category: ${whyName}, Reason: ${reasonName}. Notes: ${bulkLostNotes.trim()}`,
                        author: staffName
                    }, 'leads');
                }

                if (compSnap.exists()) {
                    await updateDoc(compRef, updateFields);
                    await logActivity(targetId, {
                        type: 'Update',
                        notes: `Bulk marked as Lost under parent "${bulkLostParent?.companyName || 'MultiSite'}". Theme: ${themeName}, Category: ${whyName}, Reason: ${reasonName}. Notes: ${bulkLostNotes.trim()}`,
                        author: staffName
                    }, 'companies');
                }

                const leadData = leadSnap.exists() ? leadSnap.data() : compSnap.data();
                deactivateLocalMileAccessForLead(targetId, leadData?.contacts, isCompany ? 'companies' : 'leads').catch(err => {
                    console.warn(`[Bulk Lost] Failed LocalMile deactivation for ${targetId}:`, err);
                });
            }

            toast({
                title: 'Leads Marked as Lost',
                description: `Successfully marked ${targetIds.length} lead(s) under "${bulkLostParent?.companyName || 'Parent'}" as Lost.`
            });

            if (bulkLostParent) {
                setSelectedChildIdsByParent(prev => ({ ...prev, [bulkLostParent.id]: [] }));
            }

            setBulkLostDialogOpen(false);
            fetchMultiSiteData();
        } catch (err: any) {
            console.error("Failed to bulk mark leads as lost:", err);
            toast({
                variant: 'destructive',
                title: 'Bulk Update Failed',
                description: err.message || 'Failed to update selected leads to Lost status.'
            });
        } finally {
            setIsSubmittingBulkLost(false);
        }
    };

    useEffect(() => {
        setIsCustom(true);
        setPageName("MultiSites Dashboard");
    }, [setIsCustom, setPageName]);

    const canSeeAll = isSuperAdmin || userProfile?.activeRole === 'admin' || userProfile?.activeRole === 'Sales Manager';

    // Default AM selection based on role
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

    // Load MultiSite Leads, Appointments, and Franchisees
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

            // Fetch appointments subcollection
            let fetchedAppts: any[] = [];
            try {
                const apptQuery = query(collectionGroup(firestore, 'appointments'));
                const apptSnap = await getDocs(apptQuery);
                fetchedAppts = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAppointments(fetchedAppts);
            } catch (err) {
                console.error("Failed to fetch appointments:", err);
            }

            // Map appointments by leadId
            const apptsByLead: Record<string, any[]> = {};
            fetchedAppts.forEach(a => {
                if (a.leadId) {
                    if (!apptsByLead[a.leadId]) apptsByLead[a.leadId] = [];
                    apptsByLead[a.leadId].push(a);
                }
            });

            // Filter mergedLeads strictly to MultiSite bucket program records and attach appointments
            const multisiteLeads = mergedLeads
                .filter(l => explicitMultisiteIds.has(l.id))
                .map(l => {
                    const appts = apptsByLead[l.id] || [];
                    const existingAppts = l.appointments || [];
                    const combinedAppts = [...existingAppts];
                    appts.forEach(a => {
                        if (!combinedAppts.some(ex => ex.id === a.id)) {
                            combinedAppts.push(a);
                        }
                    });
                    return { ...l, appointments: combinedAppts };
                });

            setLeads(multisiteLeads);

            // Fetch franchisees for filter dropdown
            try {
                const frDocs = await getAllFranchisees();
                const frNames = new Set<string>(frDocs.map(f => f.name).filter(Boolean));
                multisiteLeads.forEach(l => {
                    const fName = (l as any).franchiseeName || l.franchisee || (l as any).franchiseeId;
                    if (fName) frNames.add(fName);
                });
                setFranchiseesList(Array.from(frNames).sort());
            } catch (err) {
                console.error("Failed to load franchisees list:", err);
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

    // Format full address from address1, street, city, state, zip fields
    const formatFullAddress = (l: Lead) => {
        const addr = l.address || {} as any;
        const address1 = (l as any).address1 || addr.address1 || '';
        const street = (l as any).street || addr.street || '';
        const city = (l as any).city || addr.city || '';
        const state = (l as any).state || addr.state || '';
        const zip = (l as any).zip || (l as any).postcode || addr.zip || '';

        const parts = [address1, street, city, state, zip].map(p => (p || '').toString().trim()).filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'No address recorded';
    };

    // Filtered Leads
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
                if (statusFilter === 'Quotes Out' && !['Quote Out', 'Quote Sent', 'Quotes Sent', 'Proposal Sent', 'Quotes Out'].includes(currentStatus)) return false;
                if (statusFilter === 'Quote Accepted' && currentStatus !== 'Quote Accepted') return false;
                if (statusFilter === 'Product Pending' && currentStatus !== 'Product Pending') return false;
                if (statusFilter === 'Trialing' && !currentStatus.toLowerCase().includes('trial')) return false;
                if (statusFilter === 'Cancellation Requested' && !['Cancellation Requested', 'Cancellation Pending', 'Save Stage'].includes(currentStatus)) return false;
                if (statusFilter === 'Future Follow-up' && currentStatus !== 'Future Follow-up') return false;
            }

            // Franchisee Filter
            if (franchiseeFilter !== 'all') {
                const leadFranchisee = ((l as any).franchiseeName || l.franchisee || (l as any).franchiseeId || '').toString().toLowerCase();
                if (leadFranchisee !== franchiseeFilter.toLowerCase()) return false;
            }

            // State Filter
            if (stateFilter !== 'all') {
                const leadState = (l.address?.state || (l as any).state || '').toString().toUpperCase();
                if (leadState !== stateFilter.toUpperCase()) return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const name = (l.companyName || '').toLowerCase();
                const id = (l.id || '').toLowerCase();
                const ppId = (l.prospectPlusId || '').toLowerCase();
                const parentId = (l.parentLeadId || '').toLowerCase();
                const fullAddr = formatFullAddress(l).toLowerCase();
                const am = (l.accountManagerAssigned || '').toLowerCase();
                const franchisee = ((l as any).franchiseeName || l.franchisee || '').toLowerCase();

                const matches = name.includes(q) || id.includes(q) || ppId.includes(q) || parentId.includes(q) ||
                                fullAddr.includes(q) || am.includes(q) || franchisee.includes(q);
                if (!matches) return false;
            }

            return true;
        });
    }, [leads, selectedAm, typeFilter, statusFilter, franchiseeFilter, stateFilter, searchQuery, targetAmDisplayName]);

    // Pipeline Leads ONLY (excludes Signed Customers and Won accounts for stage tabs & queue)
    const pipelineLeads = useMemo(() => {
        return filteredLeads.filter(l => {
            const st = l.customerStatus || l.status || '';
            return st !== 'Signed Customer' && st !== 'Won';
        });
    }, [filteredLeads]);

    // Priority Queue Leads: Status strictly 'Hot Lead', 'Priority Lead', or 'Priority Field Lead'
    const priorityQueueLeads = useMemo(() => {
        return pipelineLeads.filter(l => {
            const st = l.customerStatus || l.status || (l as any).leadType || '';
            return ['Hot Lead', 'Priority Lead', 'Priority Field Lead'].includes(st);
        });
    }, [pipelineLeads]);

    // AM Pipeline Page Categorization for Appointments
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

    // AM Pipeline Page Categorization for Tasks & Reminders
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

    // Combined counts for Appointments and Tasks tabs
    const totalAppointmentsCount = pastPendingAppointmentsLeads.length + todayAppointmentsLeads.length + futureAppointmentsLeads.length + noShowAppointmentsLeads.length;
    const totalTasksCount = pastPendingTasksLeads.length + todayTasksLeads.length + futureTasksLeads.length + completedTasksLeads.length;

    // Stage Buckets for Tab Bar
    const stageCounts = useMemo(() => {
        const counts = {
            queue: priorityQueueLeads.length,
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
            else if (['Quote Out', 'Quote Sent', 'Quotes Sent', 'Proposal Sent', 'Quotes Out'].includes(st)) counts.quotesOut++;
            else if (st === 'Quote Accepted') counts.quotesAccepted++;
            else if (st === 'Product Pending') counts.productPending++;
            else if (st.toLowerCase().includes('localmile') || st.toLowerCase().includes('trial')) counts.localMile++;
            else if (st === 'Future Follow-up') counts.futureFollowUp++;
        });

        return counts;
    }, [pipelineLeads, priorityQueueLeads]);

    // Stage Tab Specific Filtered Lead List
    const activeStageLeads = useMemo(() => {
        if (viewTab === 'queue') return priorityQueueLeads;
        if (viewTab === 'new') return pipelineLeads.filter(l => (l.customerStatus || l.status || 'New') === 'New');
        if (viewTab === 'wip') return pipelineLeads.filter(l => ['In Progress', 'Contacted', 'Contact Attempted'].includes(l.customerStatus || l.status || ''));
        if (viewTab === 'quotes-out') return pipelineLeads.filter(l => ['Quote Out', 'Quote Sent', 'Quotes Sent', 'Proposal Sent', 'Quotes Out'].includes(l.customerStatus || l.status || ''));
        if (viewTab === 'quotes-accepted') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Quote Accepted');
        if (viewTab === 'product-pending') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Product Pending');
        if (viewTab === 'localmile') return pipelineLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase().includes('localmile') || (l.customerStatus || l.status || '').toLowerCase().includes('trial'));
        if (viewTab === 'future-follow-up') return pipelineLeads.filter(l => (l.customerStatus || l.status) === 'Future Follow-up');
        return pipelineLeads;
    }, [pipelineLeads, priorityQueueLeads, viewTab]);

    // Metric Calculations
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
        const activePipelines = pipelineLeads.filter(l => ['New', 'In Progress', 'Contacted', 'Appointment Booked', 'Trialing', 'Quote Out', 'Quote Sent', 'Quotes Sent', 'Proposal Sent', 'Quote Accepted'].includes(l.customerStatus || l.status || '')).length;

        return { totalMultiSites, totalParents, totalChildren, assignedToTargetAm, activePipelines };
    }, [pipelineLeads, targetAmDisplayName]);

    const toggleParentOpen = (parentId: string) => {
        setOpenParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
    };

    const handleCompleteTask = async (lead: Lead, taskId: string, taskTitle: string) => {
        setLeads(prev => prev.map(l => {
            if (l.id === lead.id && l.tasks) {
                return {
                    ...l,
                    tasks: l.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t)
                };
            }
            return l;
        }));
        toast({ title: 'Task Completed', description: `Completed "${taskTitle}"` });

        try {
            await updateTaskCompletion(lead.id, taskId, true);
            await logActivity(lead.id, {
                type: 'Update',
                notes: `Completed task: "${taskTitle}"`
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task completion.' });
            fetchMultiSiteData();
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

    // Helper component to render leads grouped by parent account hierarchy
    const renderHierarchyGroups = (targetLeads: Lead[], mode: 'leads' | 'appointments' | 'tasks' = 'leads') => {
        // Group targetLeads by parent account
        const parentMap = new Map<string, { parent: Lead | null; children: Lead[]; parentName: string }>();

        // 1. All parents in targetLeads
        targetLeads.filter(l => !l.parentLeadId).forEach(p => {
            parentMap.set(p.id, { parent: p, children: [], parentName: p.companyName });
        });

        const orphanChildren: Lead[] = [];

        // 2. Assign target child leads to their parent groups
        targetLeads.filter(l => l.parentLeadId).forEach(c => {
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
                    orphanChildren.push(c);
                }
            }
        });

        const groups = Array.from(parentMap.values());

        if (groups.length === 0 && orphanChildren.length === 0) {
            return (
                <Card className="p-8 text-center bg-white border border-slate-200">
                    <Network className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-700">No Records Found</h3>
                    <p className="text-sm text-slate-500 mt-1">There are no multi-site accounts matching the current tab and filter selection.</p>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {groups.map(({ parent, children, parentName }) => {
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-lg text-slate-900">{parentName}</span>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Parent Account
                                            </Badge>
                                            {parent?.customerStatus && (
                                                <LeadStatusBadge status={parent.customerStatus as any} />
                                            )}
                                            {parent?.prospectPlusId && (
                                                <Badge variant="secondary" className="text-xs">
                                                    ID: {parent.prospectPlusId}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                            {parent && (
                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    {formatFullAddress(parent)}
                                                </span>
                                            )}
                                            {(parent as any)?.franchiseeName || parent?.franchisee ? (
                                                <span className="flex items-center gap-1">
                                                    <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    {(parent as any)?.franchiseeName || parent?.franchisee}
                                                </span>
                                            ) : null}
                                            <span className="flex items-center gap-1">
                                                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                AM: <strong className="text-slate-700">{parent?.accountManagerAssigned || 'Unassigned'}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                                    <Badge className="bg-[#095c7b] text-white">
                                        {children.length} Child Site{children.length !== 1 ? 's' : ''}
                                    </Badge>

                                    {parent && (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => {
                                                    setSelectedParentForChild(parent);
                                                    setEnterChildLeadOpen(true);
                                                }}
                                                className="h-8 text-xs gap-1 bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold"
                                            >
                                                <Plus className="h-3.5 w-3.5 text-emerald-600" /> Add Child Site
                                            </Button>

                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => openBulkLostDialog(parent, children, selectedChildIdsByParent[parentId])}
                                                className="h-8 text-xs gap-1 bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold"
                                            >
                                                <UserX className="h-3.5 w-3.5 text-amber-700" /> Bulk Mark as Lost
                                            </Button>

                                            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1 bg-white">
                                                <Link href={`/leads/${parent.id}`}>
                                                    <ExternalLink className="h-3.5 w-3.5" /> View Profile
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Content */}
                            {isOpen && (
                                <div className="p-4 bg-white">
                                    {mode === 'leads' && (
                                        children.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">
                                                No linked child locations matching the current criteria.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Selection Toolbar Bar */}
                                                {(selectedChildIdsByParent[parentId] || []).length > 0 && (
                                                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                                                            <CheckSquare className="h-4 w-4 text-amber-700" />
                                                            {(selectedChildIdsByParent[parentId] || []).length} of {children.length} child site(s) selected
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openBulkLostDialog(parent, children, selectedChildIdsByParent[parentId])}
                                                                className="h-7 text-xs bg-amber-800 text-white hover:bg-amber-900 font-semibold gap-1"
                                                            >
                                                                <UserX className="h-3.5 w-3.5" /> Mark {(selectedChildIdsByParent[parentId] || []).length} Selected as Lost
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleSelectAllChildren(parentId, [])}
                                                                className="h-7 text-xs text-slate-600 hover:bg-amber-100"
                                                            >
                                                                Clear Selection
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                <Table>
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow>
                                                            <TableHead className="w-10 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={children.length > 0 && children.every(c => (selectedChildIdsByParent[parentId] || []).includes(c.id))}
                                                                    onChange={() => toggleSelectAllChildren(parentId, children.map(c => c.id))}
                                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    title="Select all child sites"
                                                                />
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold">Child Site Name</TableHead>
                                                            <TableHead className="text-xs font-semibold">Full Address</TableHead>
                                                            <TableHead className="text-xs font-semibold">Local Contact</TableHead>
                                                            <TableHead className="text-xs font-semibold">Servicing Franchisee</TableHead>
                                                            <TableHead className="text-xs font-semibold">Status</TableHead>
                                                            <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {children.map(child => {
                                                            const isChecked = (selectedChildIdsByParent[parentId] || []).includes(child.id);
                                                            return (
                                                                <TableRow key={child.id} className={isChecked ? 'bg-amber-50/50 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'}>
                                                                    <TableCell className="w-10 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => toggleSelectChild(parentId, child.id)}
                                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="font-medium text-sm text-slate-800">
                                                                        <div className="flex flex-col">
                                                                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                                                <Store className="h-3.5 w-3.5 text-indigo-500" />
                                                                                {child.companyName}
                                                                            </div>
                                                                            {child.prospectPlusId && (
                                                                                <span className="text-[10px] text-slate-400 font-mono">ID: {child.prospectPlusId}</span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600 max-w-[280px]">
                                                                        {formatFullAddress(child)}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600">
                                                                        {child.customerServiceEmail || child.customerPhone || child.contacts?.[0]?.name ? (
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium text-slate-800">{child.contacts?.[0]?.name || child.customerServiceEmail || '-'}</span>
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
                                            </div>
                                        )
                                    )}

                                    {mode === 'appointments' && (
                                        <div className="space-y-3">
                                            {/* Parent appointments */}
                                            {parent && (
                                                <div className="border rounded-md p-3 bg-slate-50/50 mb-2">
                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                                        Parent Account Appointments ({parent.companyName})
                                                    </span>
                                                    {parent.appointments && parent.appointments.length > 0 ? (
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="text-xs">Date / Time</TableHead>
                                                                    <TableHead className="text-xs">Type / Status</TableHead>
                                                                    <TableHead className="text-xs">Assigned Rep</TableHead>
                                                                    <TableHead className="text-xs">Notes / Details</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {parent.appointments.map(appt => (
                                                                    <TableRow key={appt.id}>
                                                                        <TableCell className="text-xs font-semibold text-slate-800">
                                                                            {appt.duedate || appt.appointmentDate || appt.date || '-'} {appt.starttime ? `@ ${appt.starttime}` : ''}
                                                                        </TableCell>
                                                                        <TableCell className="text-xs">
                                                                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                                                                                {appt.type || appt.appointmentStatus || 'Appointment'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-slate-600">
                                                                            {appt.amName || appt.assignedTo || parent.accountManagerAssigned || 'Unassigned'}
                                                                        </TableCell>
                                                                        <TableCell className="text-xs text-slate-500">
                                                                            {(appt as any).notes || (appt as any).description || 'No appointment notes'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 italic">No appointments scheduled for parent account.</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Child site appointments */}
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mt-2">
                                                Child Sites Appointments ({children.length} locations)
                                            </span>
                                            {children.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No child locations found.</p>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow>
                                                            <TableHead className="text-xs">Child Site Name</TableHead>
                                                            <TableHead className="text-xs">Full Address</TableHead>
                                                            <TableHead className="text-xs">Appointment Schedule</TableHead>
                                                            <TableHead className="text-xs">Status / Rep</TableHead>
                                                            <TableHead className="text-xs text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {children.map(child => {
                                                            const childAppts = child.appointments || [];
                                                            return (
                                                                <TableRow key={child.id}>
                                                                    <TableCell className="text-xs font-semibold text-slate-900">
                                                                        {child.companyName}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600">
                                                                        {formatFullAddress(child)}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-700">
                                                                        {childAppts.length > 0 ? (
                                                                            childAppts.map(a => (
                                                                                <div key={a.id} className="font-medium text-indigo-700">
                                                                                    📅 {a.duedate || a.appointmentDate || a.date} {a.starttime ? `@ ${a.starttime}` : ''}
                                                                                </div>
                                                                            ))
                                                                        ) : (child as any).nextAppointmentDate ? (
                                                                            <span className="text-indigo-600 font-medium">📅 {(child as any).nextAppointmentDate}</span>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">None scheduled</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        <Badge variant="outline" className="bg-slate-100 text-slate-800">
                                                                            {childAppts[0]?.appointmentStatus || child.customerStatus || child.status || 'Scheduled'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button variant="outline" size="sm" asChild className="h-7 text-[11px] px-2">
                                                                            <Link href={`/leads/${child.id}`}>Open</Link>
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </div>
                                    )}

                                    {mode === 'tasks' && (
                                        <div className="space-y-3">
                                            {/* Parent tasks */}
                                            {parent && parent.tasks && parent.tasks.length > 0 && (
                                                <div className="border rounded-md p-3 bg-amber-50/30 mb-2">
                                                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-2">
                                                        Parent Account Tasks ({parent.companyName})
                                                    </span>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="text-xs">Task Title</TableHead>
                                                                <TableHead className="text-xs">Due Date</TableHead>
                                                                <TableHead className="text-xs">Status</TableHead>
                                                                <TableHead className="text-xs text-right">Action</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {parent.tasks.map((task: Task) => (
                                                                <TableRow key={task.id}>
                                                                    <TableCell className="text-xs font-semibold text-slate-800">
                                                                        {task.title}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-slate-600">
                                                                        {task.dueDate || 'No due date'}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {task.isCompleted ? (
                                                                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">Completed</Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">Pending</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {!task.isCompleted && (
                                                                            <Button 
                                                                                variant="outline" 
                                                                                size="sm" 
                                                                                onClick={() => handleCompleteTask(parent, task.id, task.title)}
                                                                                className="h-6 text-[11px] bg-white gap-1 text-emerald-700 border-emerald-300"
                                                                            >
                                                                                <CheckSquare className="h-3 w-3" /> Complete
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}

                                            {/* Child site tasks */}
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mt-2">
                                                Child Sites Tasks ({children.length} locations)
                                            </span>
                                            {children.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No child locations found.</p>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow>
                                                            <TableHead className="text-xs">Child Site Name</TableHead>
                                                            <TableHead className="text-xs">Full Address</TableHead>
                                                            <TableHead className="text-xs">Task Description</TableHead>
                                                            <TableHead className="text-xs">Due Date</TableHead>
                                                            <TableHead className="text-xs">Status</TableHead>
                                                            <TableHead className="text-xs text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {children.map(child => {
                                                            const childTasks = child.tasks || [];
                                                            return (
                                                                <React.Fragment key={child.id}>
                                                                    {childTasks.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell className="text-xs font-semibold text-slate-800">{child.companyName}</TableCell>
                                                                            <TableCell className="text-xs text-slate-600">{formatFullAddress(child)}</TableCell>
                                                                            <TableCell colSpan={3} className="text-xs text-slate-400 italic">No pending tasks</TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                                                                                    <Link href={`/leads/${child.id}`}>Open</Link>
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        childTasks.map((task: Task, tIdx: number) => (
                                                                            <TableRow key={`${child.id}-task-${task.id || tIdx}`}>
                                                                                <TableCell className="text-xs font-semibold text-slate-900">
                                                                                    {tIdx === 0 ? child.companyName : ''}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs text-slate-600">
                                                                                    {tIdx === 0 ? formatFullAddress(child) : ''}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs text-slate-800 font-medium">
                                                                                    {task.title}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs text-slate-600">
                                                                                    {task.dueDate || '-'}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs">
                                                                                    {task.isCompleted ? (
                                                                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>
                                                                                    ) : (
                                                                                        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">Pending</Badge>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        {!task.isCompleted && (
                                                                                            <Button 
                                                                                                variant="outline" 
                                                                                                size="sm" 
                                                                                                onClick={() => handleCompleteTask(child, task.id, task.title)}
                                                                                                className="h-6 text-[11px] bg-white text-emerald-700 border-emerald-300 gap-1"
                                                                                            >
                                                                                                <CheckSquare className="h-3 w-3" /> Complete
                                                                                            </Button>
                                                                                        )}
                                                                                        <Button variant="outline" size="sm" asChild className="h-6 text-[11px] px-2">
                                                                                            <Link href={`/leads/${child.id}`}>Open</Link>
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}

                {/* Orphan Child Sites without Parent loaded */}
                {orphanChildren.length > 0 && (
                    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden mt-4">
                        <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                            <span className="font-bold text-slate-800">Standalone / Unlinked Child Locations</span>
                            <Badge variant="outline">{orphanChildren.length} Sites</Badge>
                        </div>
                        <div className="p-4">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-xs font-semibold">Child Site Name</TableHead>
                                        <TableHead className="text-xs font-semibold">Full Address</TableHead>
                                        <TableHead className="text-xs font-semibold">Franchisee</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orphanChildren.map(child => (
                                        <TableRow key={child.id}>
                                            <TableCell className="font-medium text-xs text-slate-800">{child.companyName}</TableCell>
                                            <TableCell className="text-xs text-slate-600">{formatFullAddress(child)}</TableCell>
                                            <TableCell className="text-xs text-slate-600">{(child as any).franchiseeName || child.franchisee || '-'}</TableCell>
                                            <TableCell className="text-xs"><LeadStatusBadge status={(child.customerStatus || child.status || 'New') as any} /></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                                                    <Link href={`/leads/${child.id}`}>Open Profile</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}
            </div>
        );
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
                        Centralized dashboard for multi-site parent accounts, child site locations, stage pipeline tracking, appointments, and tasks.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
                    <Button variant="outline" size="sm" onClick={fetchMultiSiteData} disabled={isLoadingData} className="gap-2 bg-white">
                        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPromoteDialogOpen(true)} className="gap-2 bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100">
                        <Sparkles className="h-4 w-4 text-indigo-600" /> Promote MultiSite Parent
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

            {/* Comprehensive Filters Bar */}
            <Card className="shadow-sm border border-slate-200">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-center">
                        
                        {/* Search Input */}
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search Company, Address, AM, Suburb..."
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

                        {/* Franchisee Filter */}
                        <div>
                            <Select value={franchiseeFilter} onValueChange={setFranchiseeFilter}>
                                <SelectTrigger className="bg-white text-xs md:text-sm">
                                    <SelectValue placeholder="All Franchisees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Franchisees</SelectItem>
                                    {franchiseesList.map(fr => (
                                        <SelectItem key={fr} value={fr}>{fr}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* State Filter */}
                        <div>
                            <Select value={stateFilter} onValueChange={setStateFilter}>
                                <SelectTrigger className="bg-white text-xs md:text-sm">
                                    <SelectValue placeholder="All States" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All States</SelectItem>
                                    {AUSTRALIAN_STATES.map(st => (
                                        <SelectItem key={st} value={st}>{st}</SelectItem>
                                    ))}
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

            {/* Main Tabs (Appointments and Tasks are 1st two tabs, matching AM Pipeline style) */}
            <Tabs value={viewTab} onValueChange={setViewTab} className="space-y-4">
                <div className="bg-white/80 p-1.5 rounded-t-xl border border-slate-200 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-3">
                    <TabsList className="bg-transparent overflow-x-auto flex w-full lg:w-auto justify-start shrink-0 gap-1.5 p-0">
                        {/* 1st Tab: Appointments */}
                        <TabsTrigger value="appointments" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Appointments <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b] font-bold">{totalAppointmentsCount}</Badge>
                        </TabsTrigger>
                        {/* 2nd Tab: Tasks & Reminders */}
                        <TabsTrigger value="tasks" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Tasks & Reminders <Badge variant="secondary" className="ml-2 bg-[#eaf143] text-[#095c7b] font-bold">{totalTasksCount}</Badge>
                        </TabsTrigger>
                        {/* 3rd Tab: Priority Queue */}
                        <TabsTrigger value="queue" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                            Priority Queue <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-800 font-bold">{priorityQueueLeads.length}</Badge>
                        </TabsTrigger>
                        {/* Pipeline Stage Tabs */}
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

                {/* 1st TAB: APPOINTMENTS (Sub-sections matching AM Pipeline UI style) */}
                <TabsContent value="appointments" className="space-y-6">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
                            <Loader />
                            <p className="text-sm text-slate-500 mt-2">Loading MultiSite Appointments...</p>
                        </div>
                    ) : (
                        <>
                            {/* Past Pending Appointments */}
                            {pastPendingAppointmentsLeads.length > 0 && (
                                <div className="space-y-3 pb-4 border-b border-rose-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Past Pending Appointments (Action Required)</h3>
                                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs">
                                            {pastPendingAppointmentsLeads.length}
                                        </Badge>
                                    </div>
                                    {renderHierarchyGroups(pastPendingAppointmentsLeads, 'appointments')}
                                </div>
                            )}

                            {/* Today's Appointments */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Calendar className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Today's Appointments</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {todayAppointmentsLeads.length}
                                    </Badge>
                                </div>
                                {renderHierarchyGroups(todayAppointmentsLeads, 'appointments')}
                            </div>

                            {/* Future Appointments */}
                            <div className="space-y-3 pt-4 border-t border-slate-200/80">
                                <div className="flex items-center gap-2 px-1">
                                    <Calendar className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Future Appointments</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {futureAppointmentsLeads.length}
                                    </Badge>
                                </div>
                                {renderHierarchyGroups(futureAppointmentsLeads, 'appointments')}
                            </div>

                            {/* No Show Appointments */}
                            {noShowAppointmentsLeads.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-amber-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                        <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">No Show Appointments</h3>
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs">
                                            {noShowAppointmentsLeads.length}
                                        </Badge>
                                    </div>
                                    {renderHierarchyGroups(noShowAppointmentsLeads, 'appointments')}
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                {/* 2nd TAB: TASKS & REMINDERS (Sub-sections matching AM Pipeline UI style) */}
                <TabsContent value="tasks" className="space-y-6">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
                            <Loader />
                            <p className="text-sm text-slate-500 mt-2">Loading MultiSite Tasks...</p>
                        </div>
                    ) : (
                        <>
                            {/* Overdue Tasks */}
                            {pastPendingTasksLeads.length > 0 && (
                                <div className="space-y-3 pb-4 border-b border-rose-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider">Overdue Tasks & Reminders (Action Required)</h3>
                                        <Badge variant="secondary" className="bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs">
                                            {pastPendingTasksLeads.length}
                                        </Badge>
                                    </div>
                                    {renderHierarchyGroups(pastPendingTasksLeads, 'tasks')}
                                </div>
                            )}

                            {/* Today's Tasks */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <ListTodo className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Today's Tasks & Reminders</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {todayTasksLeads.length}
                                    </Badge>
                                </div>
                                {renderHierarchyGroups(todayTasksLeads, 'tasks')}
                            </div>

                            {/* Future Tasks */}
                            <div className="space-y-3 pt-4 border-t border-slate-200/80">
                                <div className="flex items-center gap-2 px-1">
                                    <ListTodo className="h-4 w-4 text-[#095c7b]" />
                                    <h3 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider">Future Tasks & Reminders</h3>
                                    <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] border-none font-bold text-xs">
                                        {futureTasksLeads.length}
                                    </Badge>
                                </div>
                                {renderHierarchyGroups(futureTasksLeads, 'tasks')}
                            </div>

                            {/* Completed Tasks */}
                            {completedTasksLeads.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-emerald-200/80">
                                    <div className="flex items-center gap-2 px-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Completed Tasks & Reminders</h3>
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                                            {completedTasksLeads.length}
                                        </Badge>
                                    </div>
                                    {renderHierarchyGroups(completedTasksLeads, 'tasks')}
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                {/* 3rd TAB: PRIORITY QUEUE */}
                <TabsContent value="queue" className="space-y-4">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
                            <Loader />
                            <p className="text-sm text-slate-500 mt-2">Loading Priority Queue MultiSites...</p>
                        </div>
                    ) : (
                        renderHierarchyGroups(priorityQueueLeads, 'leads')
                    )}
                </TabsContent>

                {/* STAGE TABS (New, WIP, Quotes Out, Quotes Accepted, Product Pending, LocalMile, Future Follow-up) */}
                {['new', 'wip', 'quotes-out', 'quotes-accepted', 'product-pending', 'localmile', 'future-follow-up'].map(tabKey => (
                    <TabsContent key={tabKey} value={tabKey} className="space-y-4">
                        {isLoadingData ? (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
                                <Loader />
                                <p className="text-sm text-slate-500 mt-2">Loading MultiSite Accounts...</p>
                            </div>
                        ) : (
                            renderHierarchyGroups(activeStageLeads, 'leads')
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* ADD CHILD SITE DIALOG (PRE-LINKED TO PARENT) */}
            {selectedParentForChild && enterChildLeadOpen && (
                <EnterMultiSiteLeadDialog
                    isOpen={enterChildLeadOpen}
                    onOpenChange={setEnterChildLeadOpen}
                    parentCompany={selectedParentForChild}
                    onSuccess={() => {
                        fetchMultiSiteData();
                    }}
                />
            )}

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

            {/* BULK MARK AS LOST DIALOG */}
            <Dialog open={bulkLostDialogOpen} onOpenChange={setBulkLostDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <UserX className="h-5 w-5" /> Bulk Mark MultiSite Leads as Lost
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Select the leads and site locations under <strong className="text-slate-800">{bulkLostParent?.companyName || 'Parent Account'}</strong> to mark as lost, select the loss reason, and enter required notes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Lead Selection Box */}
                        <div className="border rounded-md p-3 bg-slate-50 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <CheckSquare className="h-4 w-4 text-red-600" />
                                    Accounts to Mark as Lost ({bulkLostSelectedIds.size} selected)
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const allIds = bulkLostChildLeads.map(c => c.id);
                                            if (bulkLostParent) allIds.push(bulkLostParent.id);
                                            setBulkLostSelectedIds(new Set(allIds));
                                        }}
                                        className="h-6 text-[11px] px-2 bg-white"
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setBulkLostSelectedIds(new Set())}
                                        className="h-6 text-[11px] px-2 bg-white"
                                    >
                                        Deselect All
                                    </Button>
                                </div>
                            </div>

                            {/* Parent Lead Checkbox */}
                            {bulkLostParent && (
                                <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer font-medium hover:bg-slate-100/70">
                                    <input
                                        type="checkbox"
                                        checked={bulkLostSelectedIds.has(bulkLostParent.id)}
                                        onChange={(e) => {
                                            const next = new Set(bulkLostSelectedIds);
                                            if (e.target.checked) next.add(bulkLostParent.id);
                                            else next.delete(bulkLostParent.id);
                                            setBulkLostSelectedIds(next);
                                        }}
                                        className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                        Parent Account
                                    </Badge>
                                    <span className="font-bold text-slate-900">{bulkLostParent.companyName}</span>
                                    <span className="text-slate-400 text-[11px]">({bulkLostParent.customerStatus || bulkLostParent.status || 'Lead'})</span>
                                </label>
                            )}

                            {/* Child Leads Checkboxes */}
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                                <span className="text-[11px] font-semibold text-slate-500 block px-1">
                                    Child Site Locations ({bulkLostChildLeads.length}):
                                </span>
                                {bulkLostChildLeads.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic px-1">No child sites found.</p>
                                ) : (
                                    bulkLostChildLeads.map(child => {
                                        const isChecked = bulkLostSelectedIds.has(child.id);
                                        return (
                                            <label key={child.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const next = new Set(bulkLostSelectedIds);
                                                        if (e.target.checked) next.add(child.id);
                                                        else next.delete(child.id);
                                                        setBulkLostSelectedIds(next);
                                                    }}
                                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                                />
                                                <Store className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                                <span className="font-semibold text-slate-800">{child.companyName}</span>
                                                <span className="text-slate-400 text-[11px] truncate max-w-[240px]">({formatFullAddress(child)})</span>
                                                <Badge variant="outline" className="text-[10px] ml-auto shrink-0 bg-slate-50">
                                                    {child.customerStatus || child.status || 'New'}
                                                </Badge>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Loss Reason Picker */}
                        <div className="space-y-1.5 border rounded-md p-3 bg-white border-slate-200">
                            <Label className="text-xs font-bold text-slate-800 block mb-1">
                                Reason for Loss / Cancellation <span className="text-red-500">*</span>
                            </Label>
                            <LossReasonPicker
                                cancellationThemes={cancellationThemes}
                                selectedThemeId={bulkLostThemeId}
                                selectedWhyId={bulkLostWhyId}
                                selectedReasonId={bulkLostReasonId}
                                onSelect={(themeId, whyId, reasonId) => {
                                    setBulkLostThemeId(themeId);
                                    setBulkLostWhyId(whyId);
                                    setBulkLostReasonId(reasonId);
                                }}
                            />
                        </div>

                        {/* Notes Input */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-800">
                                Detailed Notes & Rationale <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                placeholder="Enter detailed notes explaining why these multi-site leads are being marked as lost..."
                                value={bulkLostNotes}
                                onChange={(e) => setBulkLostNotes(e.target.value)}
                                rows={3}
                                className="bg-white text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">
                            <strong className="text-red-700 font-bold">{bulkLostSelectedIds.size}</strong> account(s) will be updated to status <strong className="text-red-700 font-bold">Lost</strong>.
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkLostDialogOpen(false)}
                                disabled={isSubmittingBulkLost}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExecuteBulkMarkAsLost}
                                disabled={isSubmittingBulkLost || bulkLostSelectedIds.size === 0 || !bulkLostNotes.trim()}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
                            >
                                {isSubmittingBulkLost ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin" /> Updating Leads...
                                    </>
                                ) : (
                                    <>
                                        <UserX className="h-4 w-4" /> Mark {bulkLostSelectedIds.size} Lead(s) as Lost
                                    </>
                                )}
                            </Button>
                        </div>
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
        </div>
    );
}

export default MultiSitesDashboard;
