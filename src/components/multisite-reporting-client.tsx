"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, LeadStatus, Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { 
  Network, Building2, Search, RefreshCw, Download, 
  CheckCircle2, AlertCircle, Phone, Calendar, Mail, FileText, CheckSquare,
  TrendingUp, ChevronRight, ChevronDown, 
  Users, Activity as ActivityIcon, ArrowUpRight, UserCheck, Layers, MessageSquare, ShieldCheck, Clock
} from 'lucide-react';
import Link from 'next/link';
import { subDays } from 'date-fns';
import { getAllUsers } from '@/services/firebase';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export interface AmSmCategoryBreakdown {
  callsCount: number;
  appointmentsCount: number;
  tasksCount: number;
  emailsCount: number;
  notesCount: number;
  totalActivityCount: number;
  lastActivityDate?: string;
  lastActivityNotes?: string;
  lastAuthor?: string;
}

export interface MultiSiteHierarchyGroup {
  parent: Lead;
  children: Lead[];
  totalBranches: number;
  outreachCount: number;
  respondedCount: number;
  quoteSentCount: number;
  activeCount: number;
  lastOutreachDate?: string;
  overallStatus: LeadStatus;
  isSignedCustomer: boolean;
  signedAmActivityCount: number;
  signedAmCategoryBreakdown: AmSmCategoryBreakdown;
  signedAmLastActivityDate?: string;
  signedAmLastActivityNotes?: string;
  signedAmLastAuthor?: string;
}

const AM_SM_ROLES = [
  'account manager',
  'account managers',
  'sales manager',
  'sales managers',
];

const EXCLUDED_AM_SM_USERS = [
  'aleyna harnett',
  'liam pike',
  'aleyna',
  'liam',
];

const SYSTEM_NOTE_PATTERNS = [
  'account manager assigned',
  'sales rep assigned',
  'lead details updated',
  'details updated',
  'status changed',
  'stage changed',
  'territory updated',
  'address updated',
  'field updated',
  'owner updated',
  'bulk import',
  'csv upload',
  'auto-sync',
  'system update',
  'external api',
  'postal address updated',
  'record created',
  'lead created',
  'company created',
  'assigned to',
  'unassigned',
  'api.',
  'updated via',
];

const isSystemAuditNote = (noteText?: string): boolean => {
  if (!noteText) return false;
  const lower = noteText.toLowerCase().trim();
  return SYSTEM_NOTE_PATTERNS.some(pat => lower.includes(pat));
};

export function MultiSiteReportingClient() {
  const { canView } = usePermissions();
  const { toast } = useToast();
  const { setPageName, setIsCustom } = usePerformance();

  const [isLoading, setIsLoading] = useState(true);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Firestore collection data
  const [multisiteLeads, setMultisiteLeads] = useState<Lead[]>([]);
  const [amSmUserIdentifiers, setAmSmUserIdentifiers] = useState<Set<string>>(new Set());

  // Filters
  const [dateRange, setDateRange] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [amFilter, setAmFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expandable table rows
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Drill-down Pop-up Modal State
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    leads: Lead[];
  }>({
    isOpen: false,
    title: '',
    description: '',
    leads: [],
  });
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  const hasAccess = canView('multisiteReporting');

  useEffect(() => {
    setIsCustom(true);
    setPageName("MultiSite Reporting");
  }, [setIsCustom, setPageName]);

  const helperGetStatus = (lead: Lead): LeadStatus => {
    const l = lead as any;
    return (l.customerStatus || l.status || l.scfStatus || l.stage || 'New') as LeadStatus;
  };

  const isSignedCustomerStatus = (lead: Lead): boolean => {
    const l = lead as any;
    const st = (l.customerStatus || l.status || l.scfStatus || l.stage || '').toString().toLowerCase().trim();
    if (['active', 'signed', 'converted', 'won', 'existing customer', 'customer', 'signed customer'].includes(st)) {
      return true;
    }
    if (l.signedUpAt || l.isSigned || l.signedDate || l.contractSignedDate) {
      return true;
    }
    return false;
  };

  const helperGetTaggedBy = (lead: Lead): string => {
    const l = lead as any;
    if (l.importedByName) return l.importedByName;
    if (l.importedBy) return l.importedBy;
    if (l.linkedByName) return l.linkedByName;
    if (l.linkedBy) return l.linkedBy;
    if (l.createdByName) return l.createdByName;
    if (l.createdBy) return l.createdBy;
    if (l.author) return l.author;
    return 'System / Bulk Import';
  };

  const helperGetAssignedAm = (lead: Lead): string => {
    const l = lead as any;
    return lead.accountManagerAssigned || lead.salesRepAssigned || l.assignedTo || 'Unassigned';
  };

  const isAuthorAmOrSm = (authorStr?: string, leadAssignedAm?: string): boolean => {
    const isExcluded = (str?: string) => {
      if (!str) return false;
      const lower = str.toLowerCase().trim();
      return EXCLUDED_AM_SM_USERS.some(ex => lower.includes(ex));
    };

    if (authorStr && authorStr.trim()) {
      const lowerAuthor = authorStr.toLowerCase().trim();
      if (
        lowerAuthor.includes('system') || 
        lowerAuthor.includes('csv_upload') || 
        lowerAuthor.includes('bulk import') || 
        lowerAuthor.includes('auto-sync') ||
        lowerAuthor.includes('admin') ||
        lowerAuthor.includes('automation') ||
        lowerAuthor.includes('webhook')
      ) {
        return false;
      }
      if (isExcluded(authorStr)) {
        return false;
      }
      if (amSmUserIdentifiers.has(lowerAuthor)) {
        return true;
      }
      for (const id of amSmUserIdentifiers) {
        if (id && (lowerAuthor.includes(id) || id.includes(lowerAuthor))) {
          return true;
        }
      }
      // CRITICAL FIX: If authorStr is provided but is NOT an AM/SM user (e.g. system, BDM, admin), return false!
      return false;
    }

    if (leadAssignedAm && leadAssignedAm !== 'Unassigned') {
      if (isExcluded(leadAssignedAm)) {
        return false;
      }
      const lowerAm = leadAssignedAm.toLowerCase().trim();
      if (amSmUserIdentifiers.has(lowerAm)) return true;
      for (const id of amSmUserIdentifiers) {
        if (id && (lowerAm.includes(id) || id.includes(lowerAm))) {
          return true;
        }
      }
    }
    return false;
  };

  const [expandedModalRows, setExpandedModalRows] = useState<Record<string, boolean>>({});

  const toggleModalRowExpand = (leadId: string) => {
    setExpandedModalRows(prev => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  const getLeadAmActivitiesList = (lead: Lead) => {
    const lAny = lead as any;
    const assignedAm = helperGetAssignedAm(lead);
    const list: { id: string; type: string; category: string; author: string; date: string; text: string }[] = [];

    // 1. Activity Subcollection
    const activities: Activity[] = lAny.activities || [];
    activities.forEach(act => {
      if (!isSystemAuditNote(act.notes) && isAuthorAmOrSm(act.author, assignedAm)) {
        const actType = (act.type || '').toLowerCase();
        const notesLower = (act.notes || '').toLowerCase();
        let cat = 'Note';
        if (actType === 'call' || notesLower.includes('call') || act.aircallStatus) cat = 'Call';
        else if (actType === 'meeting' || notesLower.includes('appointment')) cat = 'Appointment';
        else if (actType === 'email' || notesLower.includes('email')) cat = 'Email';

        list.push({
          id: act.id || Math.random().toString(),
          type: act.type || 'Activity',
          category: cat,
          author: act.author || assignedAm,
          date: act.date || lAny.updatedAt || '',
          text: act.notes || '',
        });
      }
    });

    // 2. Appointments Subcollection
    const appointments: any[] = lAny.appointments || [];
    appointments.forEach(app => {
      const appAuthor = app.author || app.createdBy || app.assignedTo || app.dialerAssigned;
      const appText = app.notes || app.title || '';
      if (!isSystemAuditNote(appText) && isAuthorAmOrSm(appAuthor, appAuthor ? undefined : assignedAm)) {
        list.push({
          id: app.id || Math.random().toString(),
          type: 'Appointment',
          category: 'Appointment',
          author: appAuthor || assignedAm,
          date: app.duedate || app.date || app.createdAt || '',
          text: appText || `Status: ${app.appointmentStatus || 'Scheduled'}`,
        });
      }
    });

    // 3. Tasks Subcollection
    const tasks: any[] = lAny.tasks || [];
    tasks.forEach(task => {
      const taskAuthor = task.createdBy || task.author || task.assignedTo || task.dialerAssigned;
      const taskText = task.title || task.notes || '';
      if (!isSystemAuditNote(taskText) && isAuthorAmOrSm(taskAuthor, taskAuthor ? undefined : assignedAm)) {
        list.push({
          id: task.id || Math.random().toString(),
          type: 'Task',
          category: 'Task',
          author: taskAuthor || assignedAm,
          date: task.dueDate || task.createdAt || '',
          text: taskText || 'Task created',
        });
      }
    });

    // 4. Notes Subcollection
    const subNotes: any[] = lAny.notesList || [];
    subNotes.forEach(n => {
      const noteAuthor = n.author || n.createdBy || n.user;
      const noteText = n.content || n.notes || n.text || '';
      if (!isSystemAuditNote(noteText) && isAuthorAmOrSm(noteAuthor, noteAuthor ? undefined : assignedAm)) {
        list.push({
          id: n.id || Math.random().toString(),
          type: 'Note',
          category: 'Note',
          author: noteAuthor || assignedAm,
          date: n.date || n.createdAt || '',
          text: noteText,
        });
      }
    });

    // 5. Lead level notes array
    if (list.length === 0 && Array.isArray(lAny.notes)) {
      lAny.notes.forEach((n: any, idx: number) => {
        const noteAuthor = typeof n === 'object' ? (n.author || n.createdBy || n.user) : undefined;
        const noteText = typeof n === 'string' ? n : (n.text || n.content || n.notes || '');
        const noteDate = typeof n === 'object' ? (n.createdAt || n.date) : undefined;

        if (!isSystemAuditNote(noteText) && isAuthorAmOrSm(noteAuthor, noteAuthor ? undefined : assignedAm)) {
          list.push({
            id: `note-${idx}`,
            type: 'Note',
            category: 'Note',
            author: noteAuthor || assignedAm,
            date: noteDate || lAny.updatedAt || '',
            text: noteText,
          });
        }
      });
    }

    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  };

  const getLeadAmSmCategorizedStats = (lead: Lead): AmSmCategoryBreakdown => {
    const lAny = lead as any;
    const assignedAm = helperGetAssignedAm(lead);

    let callsCount = 0;
    let appointmentsCount = 0;
    let tasksCount = 0;
    let emailsCount = 0;
    let notesCount = 0;

    let lastDate: string | undefined = undefined;
    let lastNotes: string | undefined = undefined;
    let lastAuthor: string | undefined = undefined;

    const updateLastActivity = (date?: string, notes?: string, author?: string) => {
      if (date && (!lastDate || new Date(date).getTime() > new Date(lastDate).getTime())) {
        lastDate = date;
        lastNotes = notes;
        lastAuthor = author;
      }
    };

    // 1. Activity Subcollection (Calls, Emails, Meetings, Notes)
    const activities: Activity[] = lAny.activities || [];
    activities.forEach(act => {
      if (!isSystemAuditNote(act.notes) && isAuthorAmOrSm(act.author, assignedAm)) {
        const actType = (act.type || '').toLowerCase();
        const notesLower = (act.notes || '').toLowerCase();

        if (actType === 'call' || notesLower.includes('call') || act.aircallStatus || (act as any).duration) {
          callsCount++;
        } else if (actType === 'meeting' || notesLower.includes('appointment') || notesLower.includes('meeting')) {
          appointmentsCount++;
        } else if (actType === 'email' || notesLower.includes('email')) {
          emailsCount++;
        } else {
          notesCount++;
        }
        updateLastActivity(act.date, act.notes, act.author || assignedAm);
      }
    });

    // 2. Appointments Subcollection
    const appointments: any[] = lAny.appointments || [];
    appointments.forEach(app => {
      const appAuthor = app.author || app.createdBy || app.assignedTo || app.dialerAssigned;
      const appText = app.notes || app.title || '';
      if (!isSystemAuditNote(appText) && isAuthorAmOrSm(appAuthor, appAuthor ? undefined : assignedAm)) {
        appointmentsCount++;
        const appDate = app.duedate || app.date || app.createdAt;
        const appNote = appText || `Appointment: ${app.appointmentStatus || 'Scheduled'}`;
        updateLastActivity(appDate, appNote, appAuthor || assignedAm);
      }
    });

    // 3. Tasks Subcollection
    const tasks: any[] = lAny.tasks || [];
    tasks.forEach(task => {
      const taskAuthor = task.createdBy || task.author || task.assignedTo || task.dialerAssigned;
      const taskText = task.title || task.notes || '';
      if (!isSystemAuditNote(taskText) && isAuthorAmOrSm(taskAuthor, taskAuthor ? undefined : assignedAm)) {
        tasksCount++;
        const taskDate = task.dueDate || task.createdAt || task.completedAt;
        const taskNote = taskText || 'Task created';
        updateLastActivity(taskDate, taskNote, taskAuthor || assignedAm);
      }
    });

    // 4. Notes Subcollection
    const subNotes: any[] = lAny.notesList || [];
    subNotes.forEach(n => {
      const noteAuthor = n.author || n.createdBy || n.user;
      const noteText = n.content || n.notes || n.text || '';
      if (!isSystemAuditNote(noteText) && isAuthorAmOrSm(noteAuthor, noteAuthor ? undefined : assignedAm)) {
        notesCount++;
        updateLastActivity(n.date || n.createdAt, noteText, noteAuthor || assignedAm);
      }
    });

    // Fallbacks if subcollections count is 0 but call counts / notes exist on lead level
    if (callsCount === 0 && (lAny.callCount || lAny.csCallCount)) {
      if (isAuthorAmOrSm(undefined, assignedAm)) {
        callsCount = (lAny.callCount || 0) + (lAny.csCallCount || 0);
        updateLastActivity(lAny.lastContacted || lAny.updatedAt, 'Call logged', assignedAm);
      }
    }
    if (notesCount === 0 && Array.isArray(lAny.notes) && lAny.notes.length > 0) {
      lAny.notes.forEach((n: any) => {
        const noteAuthor = typeof n === 'object' ? (n.author || n.createdBy || n.user) : undefined;
        const noteText = typeof n === 'string' ? n : (n.text || n.content || n.notes || '');
        const noteDate = typeof n === 'object' ? (n.createdAt || n.date) : undefined;

        if (!isSystemAuditNote(noteText) && isAuthorAmOrSm(noteAuthor, noteAuthor ? undefined : assignedAm)) {
          notesCount++;
          updateLastActivity(noteDate || lAny.updatedAt || lAny.lastContacted, noteText, noteAuthor || assignedAm);
        }
      });
    }

    const totalActivityCount = callsCount + appointmentsCount + tasksCount + emailsCount + notesCount;

    return {
      callsCount,
      appointmentsCount,
      tasksCount,
      emailsCount,
      notesCount,
      totalActivityCount,
      lastActivityDate: lastDate,
      lastActivityNotes: lastNotes,
      lastAuthor: lastAuthor,
    };
  };

  const openDrillDownModal = (title: string, description: string, leads: Lead[]) => {
    setDrillDownModal({
      isOpen: true,
      title,
      description,
      leads,
    });
    setModalSearchQuery('');
  };

  const fetchData = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    console.time("MultiSite Reporting - Load Time");

    try {
      // 0. Fetch all users to resolve Account Manager & Sales Manager roles
      const allUsers = await getAllUsers().catch(() => []);
      const amSmSet = new Set<string>();

      allUsers.forEach(u => {
        const role = (u.activeRole || u.role || '').toLowerCase().trim();
        const assigned = (u.assignedRoles || []).map(r => r.toLowerCase().trim());
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
        const displayName = (u.displayName || '').toLowerCase().trim();
        const email = (u.email || '').toLowerCase().trim();

        const isExcluded = EXCLUDED_AM_SM_USERS.some(ex => 
          fullName.includes(ex) || displayName.includes(ex) || email.includes(ex)
        );

        if (!isExcluded) {
          const isAmOrSm = AM_SM_ROLES.includes(role) || assigned.some(ar => AM_SM_ROLES.includes(ar));
          if (isAmOrSm) {
            if (u.uid) amSmSet.add(u.uid.toLowerCase());
            if (u.email) amSmSet.add(u.email.toLowerCase());
            if (u.displayName) amSmSet.add(u.displayName.toLowerCase());
            if (fullName) amSmSet.add(fullName);
          }
        }
      });
      setAmSmUserIdentifiers(amSmSet);

      // 1. Fetch leads and companies in bucket 'multisite'
      const leadsRef = collection(firestore, 'leads');
      const companiesRef = collection(firestore, 'companies');

      const leadsQuery = query(leadsRef, where('bucket', '==', 'multisite'));
      const companiesQuery = query(companiesRef, where('bucket', '==', 'multisite'));

      const [leadsSnap, companiesSnap] = await Promise.all([
        getDocs(leadsQuery).catch(() => ({ docs: [] })),
        getDocs(companiesQuery).catch(() => ({ docs: [] })),
      ]);

      const leadMap = new Map<string, Lead>();

      leadsSnap.docs.forEach(doc => {
        leadMap.set(doc.id, { id: doc.id, ...doc.data() } as Lead);
      });

      companiesSnap.docs.forEach(doc => {
        if (!leadMap.has(doc.id)) {
          leadMap.set(doc.id, { id: doc.id, ...doc.data() } as Lead);
        }
      });

      // Also include any leads flagged as campaign MultiSite or having parent IDs
      const campaignQuery = query(leadsRef, where('campaign', '==', 'MultiSite'));
      const campaignSnap = await getDocs(campaignQuery).catch(() => ({ docs: [] }));
      campaignSnap.docs.forEach(doc => {
        if (!leadMap.has(doc.id)) {
          const data = doc.data() as any;
          if (data.bucket === 'multisite' || data.isMultisite || data.parentLeadId) {
            leadMap.set(doc.id, { id: doc.id, ...data } as Lead);
          }
        }
      });

      // Resolving missing parent companies/leads referenced by child records
      const missingParentIds = Array.from(new Set(
        Array.from(leadMap.values())
          .map((l: any) => l.parentLeadId || l.parentCompanyId || l.parentProspectPlusId)
          .filter((id?: string) => id && !leadMap.has(id))
      ));

      if (missingParentIds.length > 0) {
        const parentDocs = await Promise.all(
          missingParentIds.map(async (id) => {
            try {
              const pLeadSnap = await getDoc(doc(firestore, 'leads', id));
              if (pLeadSnap.exists()) return { id: pLeadSnap.id, ...pLeadSnap.data() } as Lead;
              const pCompSnap = await getDoc(doc(firestore, 'companies', id));
              if (pCompSnap.exists()) return { id: pCompSnap.id, ...pCompSnap.data() } as Lead;
            } catch (e) {
              console.warn('Failed to fetch parent record:', id, e);
            }
            return null;
          })
        );

        parentDocs.forEach(pDoc => {
          if (pDoc) {
            leadMap.set(pDoc.id, pDoc);
          }
        });
      }

      // Fetch subcollections (activities, appointments, tasks, notes) for ALL leads (parents and children)
      const allLeadsArr = Array.from(leadMap.values());

      await Promise.all(
        allLeadsArr.map(async (leadItem) => {
          const cAny = leadItem as any;

          try {
            const [actSnap, appSnap, taskSnap, noteSnap] = await Promise.all([
              getDocs(query(collection(firestore, 'leads', leadItem.id, 'activity'))).catch(() => null)
                || getDocs(query(collection(firestore, 'companies', leadItem.id, 'activity'))).catch(() => null),
              getDocs(query(collection(firestore, 'leads', leadItem.id, 'appointments'))).catch(() => null)
                || getDocs(query(collection(firestore, 'companies', leadItem.id, 'appointments'))).catch(() => null),
              getDocs(query(collection(firestore, 'leads', leadItem.id, 'tasks'))).catch(() => null)
                || getDocs(query(collection(firestore, 'companies', leadItem.id, 'tasks'))).catch(() => null),
              getDocs(query(collection(firestore, 'leads', leadItem.id, 'notes'))).catch(() => null)
                || getDocs(query(collection(firestore, 'companies', leadItem.id, 'notes'))).catch(() => null),
            ]);

            if (actSnap && !actSnap.empty) {
              const rawActivities = actSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Activity);
              rawActivities.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
              cAny.activities = rawActivities;
            } else {
              cAny.activities = [];
            }

            if (appSnap && !appSnap.empty) {
              cAny.appointments = appSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
              cAny.appointments = [];
            }

            if (taskSnap && !taskSnap.empty) {
              cAny.tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
              cAny.tasks = [];
            }

            if (noteSnap && !noteSnap.empty) {
              cAny.notesList = noteSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
              cAny.notesList = [];
            }
          } catch (err) {
            cAny.activities = [];
            cAny.appointments = [];
            cAny.tasks = [];
            cAny.notesList = [];
          }
        })
      );

      const allMultisiteLeads = Array.from(leadMap.values());
      setMultisiteLeads(allMultisiteLeads);

    } catch (err: any) {
      console.error("Failed to load MultiSite Reporting data:", err);
      toast({
        variant: 'destructive',
        title: 'Error Loading Data',
        description: err?.message || 'Could not load MultiSite reporting metrics.',
      });
    } finally {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      setLoadTimeMs(duration);
      console.timeEnd("MultiSite Reporting - Load Time");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique Account Managers list for filter dropdown
  const uniqueAccountManagers = useMemo(() => {
    const amSet = new Set<string>();
    multisiteLeads.forEach(lead => {
      const am = helperGetAssignedAm(lead);
      if (am && am !== 'Unassigned') {
        amSet.add(am);
      }
    });
    return Array.from(amSet).sort();
  }, [multisiteLeads]);

  // Filtered dataset
  const filteredLeads = useMemo(() => {
    return multisiteLeads.filter(lead => {
      const leadAny = lead as any;

      // Date filter
      if (dateRange !== 'all') {
        const rawDate = leadAny.createdAt || leadAny.updatedAt;
        const leadDate = rawDate ? new Date(rawDate) : null;
        if (leadDate && !isNaN(leadDate.getTime())) {
          const now = new Date();
          if (dateRange === '30' && leadDate < subDays(now, 30)) return false;
          if (dateRange === '90' && leadDate < subDays(now, 90)) return false;
          if (dateRange === 'ytd') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            if (leadDate < startOfYear) return false;
          }
        }
      }

      // State filter
      if (stateFilter !== 'all') {
        const leadState = lead.address?.state || leadAny.state || '';
        if (leadState.trim().toUpperCase() !== stateFilter.toUpperCase()) return false;
      }

      // Account Manager filter (Dynamic)
      if (amFilter !== 'all') {
        const am = helperGetAssignedAm(lead).toLowerCase();
        if (!am.includes(amFilter.toLowerCase())) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const st = helperGetStatus(lead).toLowerCase();
        const isSigned = isSignedCustomerStatus(lead);
        if (statusFilter === 'signed_existing' && !isSigned) return false;
        if (statusFilter === 'active' && !['active', 'signed', 'converted', 'won'].includes(st)) return false;
        if (statusFilter === 'quote_sent' && !['quote sent', 'quotes sent', 'quote out', 'proposal sent'].includes(st)) return false;
        if (statusFilter === 'new' && !['new', 'uncontacted', 'untouched'].includes(st)) return false;
        if (statusFilter === 'contacted' && !['contacted', 'in progress', 'working'].includes(st)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const comp = (lead.companyName || '').toLowerCase();
        const city = (lead.address?.city || leadAny.suburb || '').toLowerCase();
        const abn = (leadAny.abn || '').toLowerCase();
        const ppId = (lead.prospectPlusId || lead.id || '').toLowerCase();
        const taggedBy = helperGetTaggedBy(lead).toLowerCase();
        if (!comp.includes(q) && !city.includes(q) && !abn.includes(q) && !ppId.includes(q) && !taggedBy.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [multisiteLeads, dateRange, stateFilter, amFilter, statusFilter, searchQuery]);

  // Modal filtered leads
  const filteredModalLeads = useMemo(() => {
    if (!modalSearchQuery.trim()) return drillDownModal.leads;
    const q = modalSearchQuery.toLowerCase().trim();
    return drillDownModal.leads.filter(lead => {
      const leadAny = lead as any;
      const comp = (lead.companyName || '').toLowerCase();
      const city = (lead.address?.city || leadAny.suburb || '').toLowerCase();
      const abn = (leadAny.abn || '').toLowerCase();
      const ppId = (lead.prospectPlusId || lead.id || '').toLowerCase();
      const am = helperGetAssignedAm(lead).toLowerCase();
      return comp.includes(q) || city.includes(q) || abn.includes(q) || ppId.includes(q) || am.includes(q);
    });
  }, [drillDownModal.leads, modalSearchQuery]);

  // Group into Parent & Child Hierarchy
  const hierarchyGroups = useMemo(() => {
    const parentMap = new Map<string, { parent: Lead; children: Lead[] }>();
    const standaloneChildren: Lead[] = [];

    filteredLeads.forEach(lead => {
      const lAny = lead as any;
      const isParent = lAny.isParent || lAny.isParentLead || lAny.accountType === 'parent' || (!lead.parentLeadId && !lAny.parentCompanyId && !lAny.parentProspectPlusId);

      if (isParent) {
        if (!parentMap.has(lead.id)) {
          parentMap.set(lead.id, { parent: lead, children: [] });
        } else {
          parentMap.get(lead.id)!.parent = lead;
        }
      } else {
        const parentId = lead.parentLeadId || lAny.parentCompanyId || lAny.parentProspectPlusId;
        if (parentId) {
          if (!parentMap.has(parentId)) {
            const dummyParent: any = {
              id: parentId,
              companyName: lead.companyName ? `${lead.companyName.split('-')[0].trim()} (Parent)` : 'Parent Account',
              isParent: true,
              bucket: 'multisite',
              status: helperGetStatus(lead),
            };
            parentMap.set(parentId, { parent: dummyParent as Lead, children: [lead] });
          } else {
            parentMap.get(parentId)!.children.push(lead);
          }
        } else {
          standaloneChildren.push(lead);
        }
      }
    });

    // Compute metrics for each group
    const groups: MultiSiteHierarchyGroup[] = Array.from(parentMap.values()).map(({ parent, children }) => {
      let outreachCount = 0;
      let respondedCount = 0;
      let quoteSentCount = 0;
      let activeCount = 0;
      let lastDate: string | undefined = undefined;

      const parentIsSigned = isSignedCustomerStatus(parent);
      const parentAmStats = getLeadAmSmCategorizedStats(parent);

      let groupSignedChildCount = 0;
      let groupCalls = parentIsSigned ? parentAmStats.callsCount : 0;
      let groupAppts = parentIsSigned ? parentAmStats.appointmentsCount : 0;
      let groupTasks = parentIsSigned ? parentAmStats.tasksCount : 0;
      let groupEmails = parentIsSigned ? parentAmStats.emailsCount : 0;
      let groupNotes = parentIsSigned ? parentAmStats.notesCount : 0;

      let latestSignedActivityDate: string | undefined = parentIsSigned ? parentAmStats.lastActivityDate : undefined;
      let latestSignedActivityNotes: string | undefined = parentIsSigned ? parentAmStats.lastActivityNotes : undefined;
      let latestSignedAuthor: string | undefined = parentIsSigned ? parentAmStats.lastAuthor : undefined;

      children.forEach(child => {
        const cAny = child as any;
        const statusStr = helperGetStatus(child);
        const statusLower = statusStr.toLowerCase();
        const childIsSigned = isSignedCustomerStatus(child);

        if (childIsSigned) {
          groupSignedChildCount++;
          const childStats = getLeadAmSmCategorizedStats(child);
          groupCalls += childStats.callsCount;
          groupAppts += childStats.appointmentsCount;
          groupTasks += childStats.tasksCount;
          groupEmails += childStats.emailsCount;
          groupNotes += childStats.notesCount;

          if (childStats.lastActivityDate && (!latestSignedActivityDate || childStats.lastActivityDate > latestSignedActivityDate)) {
            latestSignedActivityDate = childStats.lastActivityDate;
            latestSignedActivityNotes = childStats.lastActivityNotes;
            latestSignedAuthor = childStats.lastAuthor;
          }
        }

        if (['contacted', 'in progress', 'meeting set', 'appointment scheduled', 'quote sent', 'signed', 'active'].includes(statusLower) || child.notes?.length || cAny.callCount || cAny.csCallCount) {
          outreachCount++;
        }
        if (['meeting set', 'appointment scheduled', 'signed', 'active', 'responded', 'quote accepted'].includes(statusLower)) {
          respondedCount++;
        }
        if (['quote sent', 'quotes sent', 'quote out', 'proposal sent'].includes(statusLower)) {
          quoteSentCount++;
        }
        if (['active', 'signed', 'converted', 'won'].includes(statusLower)) {
          activeCount++;
        }

        const childDate = cAny.updatedAt || cAny.createdAt;
        if (childDate && (!lastDate || childDate > lastDate)) {
          lastDate = childDate;
        }
      });

      const parentAny = parent as any;
      const pStatus = helperGetStatus(parent);
      const isSignedCustomer = parentIsSigned || groupSignedChildCount > 0;
      const groupTotalActivity = groupCalls + groupAppts + groupTasks + groupEmails + groupNotes;

      return {
        parent,
        children,
        totalBranches: children.length,
        outreachCount,
        respondedCount,
        quoteSentCount,
        activeCount,
        lastOutreachDate: lastDate || parentAny.updatedAt || parentAny.createdAt,
        overallStatus: pStatus,
        isSignedCustomer,
        signedAmActivityCount: groupTotalActivity,
        signedAmCategoryBreakdown: {
          callsCount: groupCalls,
          appointmentsCount: groupAppts,
          tasksCount: groupTasks,
          emailsCount: groupEmails,
          notesCount: groupNotes,
          totalActivityCount: groupTotalActivity,
          lastActivityDate: latestSignedActivityDate,
          lastActivityNotes: latestSignedActivityNotes,
          lastAuthor: latestSignedAuthor,
        },
        signedAmLastActivityDate: latestSignedActivityDate,
        signedAmLastActivityNotes: latestSignedActivityNotes,
        signedAmLastAuthor: latestSignedAuthor,
      };
    });

    return groups;
  }, [filteredLeads, amSmUserIdentifiers]);

  // Key KPI Aggregations across 5 Categories
  const metrics = useMemo(() => {
    const totalParents = hierarchyGroups.length;
    let totalChildBranches = 0;
    let activeSignedBranches = 0;
    let totalOutreach = 0;
    let totalResponded = 0;
    let totalQuoteSent = 0;

    let totalSignedAccounts = 0;
    let signedAccountsWithAmActivity = 0;

    let totalSignedCalls = 0;
    let totalSignedAppointments = 0;
    let totalSignedTasks = 0;
    let totalSignedEmails = 0;
    let totalSignedNotes = 0;

    hierarchyGroups.forEach(g => {
      totalChildBranches += g.children.length;

      if (isSignedCustomerStatus(g.parent)) {
        totalSignedAccounts++;
        const pStats = getLeadAmSmCategorizedStats(g.parent);
        if (pStats.totalActivityCount > 0) {
          signedAccountsWithAmActivity++;
        }
        totalSignedCalls += pStats.callsCount;
        totalSignedAppointments += pStats.appointmentsCount;
        totalSignedTasks += pStats.tasksCount;
        totalSignedEmails += pStats.emailsCount;
        totalSignedNotes += pStats.notesCount;
      }

      g.children.forEach(c => {
        const st = helperGetStatus(c).toLowerCase();
        if (['active', 'signed', 'converted', 'won'].includes(st)) {
          activeSignedBranches++;
        }
        if (['quote sent', 'quotes sent', 'quote out', 'proposal sent'].includes(st)) {
          totalQuoteSent++;
        }

        if (isSignedCustomerStatus(c)) {
          totalSignedAccounts++;
          const cStats = getLeadAmSmCategorizedStats(c);
          if (cStats.totalActivityCount > 0) {
            signedAccountsWithAmActivity++;
          }
          totalSignedCalls += cStats.callsCount;
          totalSignedAppointments += cStats.appointmentsCount;
          totalSignedTasks += cStats.tasksCount;
          totalSignedEmails += cStats.emailsCount;
          totalSignedNotes += cStats.notesCount;
        }
      });

      totalOutreach += g.outreachCount;
      totalResponded += g.respondedCount;
    });

    const responseRate = totalChildBranches > 0 
      ? Math.round((totalResponded / Math.max(totalChildBranches, 1)) * 100) 
      : 0;

    const conversionRate = totalChildBranches > 0 
      ? Math.round((activeSignedBranches / Math.max(totalChildBranches, 1)) * 100) 
      : 0;

    const signedAmTouchpointRate = totalSignedAccounts > 0
      ? Math.round((signedAccountsWithAmActivity / Math.max(totalSignedAccounts, 1)) * 100)
      : 0;

    const totalSignedAmActivities = totalSignedCalls + totalSignedAppointments + totalSignedTasks + totalSignedEmails + totalSignedNotes;

    return {
      totalParents,
      totalChildBranches,
      activeSignedBranches,
      totalOutreach,
      totalResponded,
      totalQuoteSent,
      responseRate,
      conversionRate,
      totalSignedAccounts,
      signedAccountsWithAmActivity,
      totalSignedAmActivities,
      signedAmTouchpointRate,
      totalSignedCalls,
      totalSignedAppointments,
      totalSignedTasks,
      totalSignedEmails,
      totalSignedNotes,
    };
  }, [hierarchyGroups]);

  // Account Manager & Sales Manager Breakdown for 5 Priority Categories
  const amSignedPerformance = useMemo(() => {
    const map = new Map<string, { 
      amName: string; 
      signedCount: number; 
      touchedCount: number; 
      callsCount: number;
      appointmentsCount: number;
      tasksCount: number;
      emailsCount: number;
      notesCount: number;
      totalActivityCount: number; 
      lastDate?: string 
    }>();

    filteredLeads.forEach(lead => {
      if (isSignedCustomerStatus(lead)) {
        const amName = helperGetAssignedAm(lead);
        if (!map.has(amName)) {
          map.set(amName, { 
            amName, 
            signedCount: 0, 
            touchedCount: 0, 
            callsCount: 0,
            appointmentsCount: 0,
            tasksCount: 0,
            emailsCount: 0,
            notesCount: 0,
            totalActivityCount: 0 
          });
        }
        const stats = getLeadAmSmCategorizedStats(lead);
        const data = map.get(amName)!;
        data.signedCount++;
        if (stats.totalActivityCount > 0) {
          data.touchedCount++;
        }
        data.callsCount += stats.callsCount;
        data.appointmentsCount += stats.appointmentsCount;
        data.tasksCount += stats.tasksCount;
        data.emailsCount += stats.emailsCount;
        data.notesCount += stats.notesCount;
        data.totalActivityCount += stats.totalActivityCount;

        if (stats.lastActivityDate && (!data.lastDate || stats.lastActivityDate > data.lastDate)) {
          data.lastDate = stats.lastActivityDate;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalActivityCount - a.totalActivityCount);
  }, [filteredLeads, amSmUserIdentifiers]);

  // Recent AM / Sales Manager Activity Feed across 5 Priorities
  const recentSignedAmActivities = useMemo(() => {
    const list: { leadId: string; companyName: string; amName: string; category: string; type: string; date: string; notes: string }[] = [];

    filteredLeads.forEach(lead => {
      if (isSignedCustomerStatus(lead)) {
        const lAny = lead as any;
        const amName = helperGetAssignedAm(lead);

        // Activity subcollection
        const activities: Activity[] = lAny.activities || [];
        activities.forEach(act => {
          if (!isSystemAuditNote(act.notes) && isAuthorAmOrSm(act.author, amName)) {
            const actType = (act.type || '').toLowerCase();
            const notesLower = (act.notes || '').toLowerCase();
            let cat = 'Note';
            if (actType === 'call' || notesLower.includes('call') || act.aircallStatus) cat = 'Call';
            else if (actType === 'meeting' || notesLower.includes('appointment')) cat = 'Appointment';
            else if (actType === 'email' || notesLower.includes('email')) cat = 'Email';

            list.push({
              leadId: lead.id,
              companyName: lead.companyName || 'Signed Customer',
              amName: act.author || amName,
              category: cat,
              type: act.type || 'Activity',
              date: act.date,
              notes: act.notes || '',
            });
          }
        });

        // Appointments subcollection
        const appointments: any[] = lAny.appointments || [];
        appointments.forEach(app => {
          const appText = app.notes || app.title || '';
          if (!isSystemAuditNote(appText) && isAuthorAmOrSm(app.author || app.createdBy || app.assignedTo, amName)) {
            list.push({
              leadId: lead.id,
              companyName: lead.companyName || 'Signed Customer',
              amName: app.author || app.assignedTo || amName,
              category: 'Appointment',
              type: 'Appointment Set',
              date: app.duedate || app.date || app.createdAt,
              notes: appText || `Status: ${app.appointmentStatus || 'Scheduled'}`,
            });
          }
        });

        // Tasks subcollection
        const tasks: any[] = lAny.tasks || [];
        tasks.forEach(task => {
          const taskText = task.title || task.notes || '';
          if (!isSystemAuditNote(taskText) && isAuthorAmOrSm(task.createdBy || task.author || task.assignedTo, amName)) {
            list.push({
              leadId: lead.id,
              companyName: lead.companyName || 'Signed Customer',
              amName: task.createdBy || task.assignedTo || amName,
              category: 'Task',
              type: 'Task Created',
              date: task.dueDate || task.createdAt,
              notes: taskText || 'Task created',
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 20);
  }, [filteredLeads, amSmUserIdentifiers]);

  const toggleParentExpand = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const handleExportCSV = () => {
    try {
      const csvRows = [
        [
          'Parent Company Name',
          'Parent Lead ID',
          'Parent Status',
          'Is Signed Customer Level',
          'AM/SM Calls Count',
          'AM/SM Appointments Set',
          'AM/SM Tasks Count',
          'AM/SM Emails Count',
          'AM/SM Notes Count',
          'Total AM/SM Activity Count',
          'Last Signed AM/SM Activity Date',
          'Child Branch Name',
          'Child Lead ID',
          'Child Status',
          'Street Address',
          'Suburb / City',
          'State',
          'Postcode',
          'Franchisee',
          'Tagged / Added By',
          'Assigned AM',
          'Created Date'
        ]
      ];

      hierarchyGroups.forEach(g => {
        const parentName = g.parent.companyName || 'Parent Account';
        const parentId = g.parent.id;
        const pStatus = helperGetStatus(g.parent);
        const pAny = g.parent as any;
        const isSigned = g.isSignedCustomer ? 'Yes' : 'No';
        const pCat = g.signedAmCategoryBreakdown;
        const lastAmDate = g.signedAmLastActivityDate || '';

        if (g.children.length === 0) {
          csvRows.push([
            `"${parentName}"`,
            `"${parentId}"`,
            `"${pStatus}"`,
            `"${isSigned}"`,
            `"${pCat.callsCount}"`,
            `"${pCat.appointmentsCount}"`,
            `"${pCat.tasksCount}"`,
            `"${pCat.emailsCount}"`,
            `"${pCat.notesCount}"`,
            `"${pCat.totalActivityCount}"`,
            `"${lastAmDate}"`,
            '""',
            '""',
            '""',
            `"${g.parent.address?.street || ''}"`,
            `"${g.parent.address?.city || ''}"`,
            `"${g.parent.address?.state || ''}"`,
            `"${g.parent.address?.zip || ''}"`,
            `"${g.parent.franchisee || ''}"`,
            `"${helperGetTaggedBy(g.parent)}"`,
            `"${helperGetAssignedAm(g.parent)}"`,
            `"${pAny.createdAt || ''}"`
          ]);
        } else {
          g.children.forEach(child => {
            const cAny = child as any;
            const cStatus = helperGetStatus(child);
            const childIsSigned = isSignedCustomerStatus(child) ? 'Yes' : 'No';
            const cCat = getLeadAmSmCategorizedStats(child);
            csvRows.push([
              `"${parentName}"`,
              `"${parentId}"`,
              `"${pStatus}"`,
              `"${childIsSigned}"`,
              `"${cCat.callsCount}"`,
              `"${cCat.appointmentsCount}"`,
              `"${cCat.tasksCount}"`,
              `"${cCat.emailsCount}"`,
              `"${cCat.notesCount}"`,
              `"${cCat.totalActivityCount}"`,
              `"${cCat.lastActivityDate || ''}"`,
              `"${child.companyName || ''}"`,
              `"${child.id}"`,
              `"${cStatus}"`,
              `"${child.address?.street || ''}"`,
              `"${child.address?.city || ''}"`,
              `"${child.address?.state || ''}"`,
              `"${child.address?.zip || ''}"`,
              `"${child.franchisee || ''}"`,
              `"${helperGetTaggedBy(child)}"`,
              `"${helperGetAssignedAm(child)}"`,
              `"${cAny.createdAt || ''}"`
            ]);
          });
        }
      });

      const csvString = csvRows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MultiSite_Reporting_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: 'Export Successful', description: 'MultiSite reporting data exported to CSV.' });
    } catch (err) {
      console.error('CSV Export Error:', err);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not generate CSV file.' });
    }
  };

  const handleExportModalCSV = (title: string, modalLeads: Lead[]) => {
    try {
      const csvRows = [
        [
          'Company Name',
          'Lead ID / ProspectPlus ID',
          'Account Type',
          'Status',
          'Assigned AM',
          'Calls Count',
          'Appointments Set Count',
          'Tasks Count',
          'Emails Count',
          'Notes Count',
          'Total Activity Count',
          'Last AM/SM Activity Date',
          'Last AM/SM Activity Notes',
          'Address',
          'State'
        ]
      ];

      modalLeads.forEach(lead => {
        const lAny = lead as any;
        const isParent = lAny.isParent || lAny.isParentLead || lAny.accountType === 'parent' || (!lead.parentLeadId && !lAny.parentCompanyId && !lAny.parentProspectPlusId);
        const cat = getLeadAmSmCategorizedStats(lead);

        csvRows.push([
          `"${lead.companyName || ''}"`,
          `"${lead.prospectPlusId || lead.id}"`,
          `"${isParent ? 'Parent' : 'Child Site'}"`,
          `"${helperGetStatus(lead)}"`,
          `"${helperGetAssignedAm(lead)}"`,
          `"${cat.callsCount}"`,
          `"${cat.appointmentsCount}"`,
          `"${cat.tasksCount}"`,
          `"${cat.emailsCount}"`,
          `"${cat.notesCount}"`,
          `"${cat.totalActivityCount}"`,
          `"${cat.lastActivityDate || ''}"`,
          `"${(cat.lastActivityNotes || '').replace(/"/g, '""')}"`,
          `"${lead.address?.street || ''} ${lead.address?.city || ''}"`,
          `"${lead.address?.state || ''}"`
        ]);
      });

      const csvString = csvRows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Export Successful', description: `Exported ${modalLeads.length} leads to CSV.` });
    } catch (err) {
      console.error('Modal CSV Export Error:', err);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export modal list.' });
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Access Restricted</h1>
        <p className="text-slate-600 dark:text-slate-400">
          You do not have permission to view the MultiSite Reporting dashboard. This page is restricted to Admins, Superadmins, Marketing Manager, Customer Success, Account Managers, and Sales Managers.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                MultiSite & Existing Customer Reporting
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Tracking Account Manager & Sales Manager activities across 5 priorities (Calls, Appointments Set, Tasks, Emails, Notes) at parent & child customer levels.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loadTimeMs !== null && (
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs">
              Load: {loadTimeMs}ms
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleExportCSV} className="gap-2 bg-teal-700 hover:bg-teal-800 text-white">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Search Accounts</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Parent, branch, ABN, or tagged by..." 
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">State / Region</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-9 text-sm">
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

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Account Manager</label>
              <Select value={amFilter} onValueChange={setAmFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Account Managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Managers</SelectItem>
                  {uniqueAccountManagers.map(am => (
                    <SelectItem key={am} value={am}>{am}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="signed_existing">Signed / Existing Customers</SelectItem>
                  <SelectItem value="quote_sent">Quote Sent / Out</SelectItem>
                  <SelectItem value="active">Signed / Active</SelectItem>
                  <SelectItem value="contacted">Contacted / Working</SelectItem>
                  <SelectItem value="new">New / Untouched</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Highlights Cards Grid (7 Key Metrics - Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Total Parents */}
        <Card 
          className="bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md cursor-pointer hover:border-teal-400 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Parent Customer Accounts", "List of all parent accounts expanding multi-site customer bases.", filteredLeads.filter(l => (l as any).isParent || (l as any).isParentLead || (l as any).accountType === 'parent' || (!l.parentLeadId && !(l as any).parentCompanyId)))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Parent Customers</span>
              <Building2 className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold">{metrics.totalParents}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">Expanding customer bases <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Tagged Child Sites */}
        <Card 
          className="bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/40 shadow-sm cursor-pointer hover:border-teal-500 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Tagged Child Sites & Branch Locations", "List of all child branch locations linked to multi-site parent accounts.", filteredLeads.filter(l => Boolean(l.parentLeadId || (l as any).parentCompanyId || (l as any).parentProspectPlusId)))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Tagged Child Sites</span>
              <Network className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-400">{metrics.totalChildBranches}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Total child branches linked <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Quotes Sent / Out */}
        <Card 
          className="bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-cyan-500 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Quotes Sent / Proposals Pending", "Multi-site accounts with quotes or proposals sent pending acceptance.", filteredLeads.filter(l => ['quote sent', 'quotes sent', 'quote out', 'proposal sent'].includes(helperGetStatus(l).toLowerCase())))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Quotes Sent</span>
              <FileText className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">{metrics.totalQuoteSent}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Pending quote acceptance <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Priority #2 Highlight: AM/SM Appointments Set */}
        <Card 
          className="bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-300 dark:border-amber-700 shadow-sm cursor-pointer hover:border-amber-500 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Appointments Set", "List of signed accounts where appointments were scheduled/set by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).appointmentsCount > 0))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-xs font-bold uppercase tracking-wider">Appointments Set</span>
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-900 dark:text-amber-300">{metrics.totalSignedAppointments}</div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">By AM & Sales Managers <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Priority #1 Highlight: AM/SM Calls Made */}
        <Card 
          className="bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-sky-500 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Calls Made", "List of signed accounts with calls logged by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).callsCount > 0))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">AM/SM Calls Made</span>
              <Phone className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.totalSignedCalls}</div>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1">Signed parent & child levels <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Total Signed Touchpoints */}
        <Card 
          className="bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Signed Customer Accounts with AM / Sales Manager Touchpoints", "All signed customer accounts showing logged calls, appointments, tasks, emails, and notes.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).totalActivityCount > 0))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Signed AM/SM Activities</span>
              <ActivityIcon className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.totalSignedAmActivities}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Calls, Appts, Tasks, Emails, Notes <ChevronRight className="w-3 h-3 opacity-70" /></p>
          </CardContent>
        </Card>

        {/* Signed Customer Coverage Rate */}
        <Card 
          className="bg-gradient-to-br from-teal-900 to-emerald-950 text-white shadow-md border-teal-800 cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all active:scale-[0.99] group"
          onClick={() => openDrillDownModal("Signed Customers Touched vs Untouched", "Signed accounts categorized by AM & Sales Manager engagement.", filteredLeads.filter(l => isSignedCustomerStatus(l)))}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-xs font-semibold uppercase tracking-wider">Coverage Rate</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-300">{metrics.signedAmTouchpointRate}%</div>
            <p className="text-xs text-teal-200 mt-1 flex items-center gap-1">
              {metrics.signedAccountsWithAmActivity} of {metrics.totalSignedAccounts} signed touched <ChevronRight className="w-3 h-3 opacity-70" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="directory" className="rounded-lg gap-2 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            MultiSite Account Hierarchy
          </TabsTrigger>
          <TabsTrigger value="am_engagement" className="rounded-lg gap-2 text-xs sm:text-sm">
            <Phone className="w-4 h-4 text-sky-500" />
            AM Branch Outreach & Engagement
          </TabsTrigger>
          <TabsTrigger value="signed_activity" className="rounded-lg gap-2 text-xs sm:text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            AM & Sales Manager Activity Breakdown
          </TabsTrigger>
          <TabsTrigger value="tagging_audit" className="rounded-lg gap-2 text-xs sm:text-sm">
            <UserCheck className="w-4 h-4 text-teal-600" />
            Branch Tagging & Creator Audit
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MultiSite Directory Table */}
        <TabsContent value="directory" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="py-4 px-6 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  MultiSite Account Hierarchy Directory
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Showing {hierarchyGroups.length} parent customer bases in the <code className="text-teal-600">multisite</code> bucket.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
                  <p className="text-sm text-slate-500">Loading MultiSite accounts...</p>
                </div>
              ) : hierarchyGroups.length === 0 ? (
                <div className="p-12 text-center">
                  <Network className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No MultiSite Accounts Found</h3>
                  <p className="text-sm text-slate-500 mt-1">No leads match the current filters in the multisite bucket.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-850">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-semibold">Parent Customer Account</TableHead>
                        <TableHead className="font-semibold">Tagged Branches</TableHead>
                        <TableHead className="font-semibold">AM Outreach</TableHead>
                        <TableHead className="font-semibold">AM / Sales Manager Activity Breakdown</TableHead>
                        <TableHead className="font-semibold">State / Location</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hierarchyGroups.map((group) => {
                        const isExpanded = expandedParents[group.parent.id];
                        const parentName = group.parent.companyName || 'Parent Customer';
                        const pAny = group.parent as any;
                        const parentState = group.parent.address?.state || pAny.state || 'AU';
                        const parentStatus = group.overallStatus;
                        const parentCat = group.signedAmCategoryBreakdown;

                        return (
                          <React.Fragment key={group.parent.id}>
                            <TableRow className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <TableCell>
                                {group.children.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-7 w-7 text-slate-500"
                                    onClick={() => toggleParentExpand(group.parent.id)}
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{parentName}</span>
                                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 text-[10px]">
                                      Parent
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    ID: {group.parent.prospectPlusId || group.parent.id} {pAny.abn ? `• ABN: ${pAny.abn}` : ''}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300 font-semibold">
                                  {group.totalBranches} Branches
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                                  <span>{group.outreachCount} contacted ({group.respondedCount} responded)</span>
                                </div>
                              </TableCell>

                              <TableCell>
                                {group.isSignedCustomer ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap gap-1 items-center">
                                      <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 font-medium gap-1">
                                        <Phone className="w-2.5 h-2.5" /> {parentCat.callsCount} Calls
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium gap-1">
                                        <Calendar className="w-2.5 h-2.5" /> {parentCat.appointmentsCount} Appts
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-medium gap-1">
                                        <CheckSquare className="w-2.5 h-2.5" /> {parentCat.tasksCount} Tasks
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200 font-medium gap-1">
                                        <Mail className="w-2.5 h-2.5" /> {parentCat.emailsCount} Emails
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-medium gap-1">
                                        <FileText className="w-2.5 h-2.5" /> {parentCat.notesCount} Notes
                                      </Badge>
                                    </div>
                                    {group.signedAmLastActivityDate && (
                                      <span className="text-[10px] text-slate-400">
                                        Last AM/SM activity: {new Date(group.signedAmLastActivityDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">N/A (Prospect)</span>
                                )}
                              </TableCell>

                              <TableCell>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{parentState}</span>
                              </TableCell>

                              <TableCell>
                                <LeadStatusBadge status={parentStatus} />
                              </TableCell>

                              <TableCell className="text-right">
                                <Link href={`/leads/${group.parent.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-teal-700 hover:text-teal-800">
                                    View Account <ArrowUpRight className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Child Branch Rows */}
                            {isExpanded && group.children.map(child => {
                              const cAny = child as any;
                              const childStatus = helperGetStatus(child);
                              const taggedBy = helperGetTaggedBy(child);
                              const assignedAm = helperGetAssignedAm(child);
                              const childIsSigned = isSignedCustomerStatus(child);
                              const childCat = getLeadAmSmCategorizedStats(child);

                              return (
                                <TableRow key={child.id} className="bg-slate-50/50 dark:bg-slate-900/40 border-l-4 border-l-teal-500">
                                  <TableCell></TableCell>
                                  <TableCell className="pl-6">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400">•</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                        {child.companyName || 'Child Branch'}
                                      </span>
                                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">
                                        Child Site
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-slate-500 pl-4 mt-0.5">
                                      {child.address?.street || ''} {child.address?.city || cAny.suburb || ''} {child.address?.state || ''}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <span className="text-xs text-slate-500">Location</span>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex flex-col text-xs">
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">AM: {assignedAm}</span>
                                      <span className="text-[11px] text-slate-400">Tagged by: {taggedBy}</span>
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    {childIsSigned ? (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 font-medium">
                                          📞 {childCat.callsCount}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                                          📅 {childCat.appointmentsCount}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                                          📋 {childCat.tasksCount}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200 font-medium">
                                          ✉️ {childCat.emailsCount}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-medium">
                                          📝 {childCat.notesCount}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                      {child.address?.state || 'AU'}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    <LeadStatusBadge status={childStatus} />
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Link href={`/leads/${child.id}`}>
                                      <Button size="sm" variant="outline" className="h-7 text-[11px]">
                                        Details
                                      </Button>
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AM Branch Outreach & Engagement */}
        <TabsContent value="am_engagement" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Phone className="w-5 h-5 text-sky-500" />
                  Account Manager Outreach Metrics
                </CardTitle>
                <CardDescription className="text-xs">
                  Dynamic engagement tracking across assigned Account Managers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40">
                  <span className="text-sm font-semibold text-sky-900 dark:text-sky-300">Total Branches Contacted</span>
                  <span className="text-lg font-bold text-sky-600">{metrics.totalOutreach}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Branch Response Rate</span>
                  <span className="text-lg font-bold text-emerald-600">{metrics.responseRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Signed Branch Conversions</span>
                  <span className="text-lg font-bold text-indigo-600">{metrics.conversionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5 text-teal-600" />
                  Branch Engagement Progress
                </CardTitle>
                <CardDescription className="text-xs">
                  Outreach funnel across child branches in the multisite bucket.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Engaged / Responded ({metrics.totalResponded})</span>
                    <span>{metrics.responseRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(metrics.responseRate, 100)}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Quotes Out / Sent ({metrics.totalQuoteSent})</span>
                    <span>{metrics.totalChildBranches > 0 ? Math.round((metrics.totalQuoteSent / metrics.totalChildBranches) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${metrics.totalChildBranches > 0 ? Math.min(Math.round((metrics.totalQuoteSent / metrics.totalChildBranches) * 100), 100) : 0}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Signed Branches ({metrics.activeSignedBranches})</span>
                    <span>{metrics.conversionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(metrics.conversionRate, 100)}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Account Manager & Sales Manager 5-Priority Activity Breakdown */}
        <TabsContent value="signed_activity" className="space-y-4">
          {/* 3 Summary Metric Cards (Interactive Pop-Up Trigger Cards as shown in attached screenshot) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 shadow-xs cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Total Signed Customer Accounts", "Parents & child branch locations in signed / active status.", filteredLeads.filter(l => isSignedCustomerStatus(l)))}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                  <span className="text-xs font-bold uppercase tracking-wider">TOTAL SIGNED ACCOUNTS</span>
                  <Building2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-emerald-950 dark:text-emerald-200">{metrics.totalSignedAccounts}</div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  Parents & child branches in signed status <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 shadow-xs cursor-pointer hover:border-sky-500 hover:shadow-md transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers Touched by AM / Sales Manager", "Signed customer accounts with 1 or more calls, appointments, tasks, emails, or notes logged by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).totalActivityCount > 0))}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-sky-900 dark:text-sky-300">
                  <span className="text-xs font-bold uppercase tracking-wider">SIGNED CUSTOMERS TOUCHED</span>
                  <UserCheck className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-sky-950 dark:text-sky-200">{metrics.signedAccountsWithAmActivity}</div>
                <p className="text-xs text-sky-700 dark:text-sky-400 mt-1 flex items-center gap-1 font-medium">
                  {metrics.signedAmTouchpointRate}% coverage rate <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 shadow-xs cursor-pointer hover:border-teal-500 hover:shadow-md transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customer Accounts with AM / Sales Manager Touchpoints", "All signed accounts showing logged calls, appointments, tasks, emails, and notes.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).totalActivityCount > 0))}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-teal-900 dark:text-teal-300">
                  <span className="text-xs font-bold uppercase tracking-wider">TOTAL AM TOUCHPOINTS</span>
                  <ActivityIcon className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2 text-3xl font-extrabold text-teal-950 dark:text-teal-200">{metrics.totalSignedAmActivities}</div>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-1 flex items-center gap-1 font-medium">
                  Logged calls, notes & interactions <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 5 Priority Metric Banner (Clickable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* Priority 1: Calls */}
            <Card 
              className="bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 cursor-pointer hover:border-sky-500 hover:shadow-sm transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Calls Made", "Signed accounts with calls logged by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).callsCount > 0))}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-sky-800 dark:text-sky-300">
                  <span className="text-xs font-bold uppercase tracking-wider">1. Calls Made</span>
                  <Phone className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 text-2xl font-extrabold text-sky-900 dark:text-sky-200">{metrics.totalSignedCalls}</div>
                <p className="text-[11px] text-sky-700 dark:text-sky-400 flex items-center gap-1">AM & Sales Manager Calls <ChevronRight className="w-3 h-3 opacity-70" /></p>
              </CardContent>
            </Card>

            {/* Priority 2: Appointments Set */}
            <Card 
              className="bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs cursor-pointer hover:border-amber-500 hover:shadow-sm transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Appointments Set", "Signed accounts with appointments scheduled/set by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).appointmentsCount > 0))}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-amber-900 dark:text-amber-300">
                  <span className="text-xs font-bold uppercase tracking-wider">2. Appointments Set</span>
                  <Calendar className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 text-2xl font-extrabold text-amber-950 dark:text-amber-200">{metrics.totalSignedAppointments}</div>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium flex items-center gap-1">Main Focus Metric <ChevronRight className="w-3 h-3 opacity-70" /></p>
              </CardContent>
            </Card>

            {/* Priority 3: Tasks Created */}
            <Card 
              className="bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 cursor-pointer hover:border-indigo-500 hover:shadow-sm transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Tasks Created", "Signed accounts with tasks created or assigned by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).tasksCount > 0))}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-indigo-800 dark:text-indigo-300">
                  <span className="text-xs font-bold uppercase tracking-wider">3. Tasks Created</span>
                  <CheckSquare className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 text-2xl font-extrabold text-indigo-900 dark:text-indigo-200">{metrics.totalSignedTasks}</div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 flex items-center gap-1">Follow-ups & action items <ChevronRight className="w-3 h-3 opacity-70" /></p>
              </CardContent>
            </Card>

            {/* Priority 4: Emails Sent */}
            <Card 
              className="bg-cyan-50/60 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900 cursor-pointer hover:border-cyan-500 hover:shadow-sm transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Emails Sent", "Signed accounts with emails sent by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).emailsCount > 0))}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-cyan-800 dark:text-cyan-300">
                  <span className="text-xs font-bold uppercase tracking-wider">4. Emails Sent</span>
                  <Mail className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 text-2xl font-extrabold text-cyan-900 dark:text-cyan-200">{metrics.totalSignedEmails}</div>
                <p className="text-[11px] text-cyan-700 dark:text-cyan-400 flex items-center gap-1">Outbound communications <ChevronRight className="w-3 h-3 opacity-70" /></p>
              </CardContent>
            </Card>

            {/* Priority 5: Notes Logged */}
            <Card 
              className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer hover:border-slate-500 hover:shadow-sm transition-all active:scale-[0.99] group"
              onClick={() => openDrillDownModal("Signed Customers with AM / Sales Manager Notes Logged", "Signed accounts with notes logged by an Account Manager or Sales Manager.", filteredLeads.filter(l => isSignedCustomerStatus(l) && getLeadAmSmCategorizedStats(l).notesCount > 0))}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-xs font-bold uppercase tracking-wider">5. Notes Logged</span>
                  <FileText className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{metrics.totalSignedNotes}</div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">Account notes & updates <ChevronRight className="w-3 h-3 opacity-70" /></p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* AM & Sales Manager 5-Priority Activity Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Account Managers & Sales Managers Activity Matrix
                </CardTitle>
                <CardDescription className="text-xs">
                  Categorized breakdown of activities (Calls, Appointments, Tasks, Emails, Notes) performed for existing customer parent & child branch levels.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="font-semibold">AM / Sales Manager</TableHead>
                        <TableHead className="font-semibold">Signed Accounts</TableHead>
                        <TableHead className="font-semibold">📞 Calls</TableHead>
                        <TableHead className="font-semibold text-amber-700 dark:text-amber-400">📅 Appts</TableHead>
                        <TableHead className="font-semibold">📋 Tasks</TableHead>
                        <TableHead className="font-semibold">✉️ Emails</TableHead>
                        <TableHead className="font-semibold">📝 Notes</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amSignedPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-slate-400 text-xs">
                            No signed customer accounts recorded for Account Managers or Sales Managers.
                          </TableCell>
                        </TableRow>
                      ) : (
                        amSignedPerformance.map((item) => (
                          <TableRow key={item.amName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                              {item.amName}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {item.signedCount} ({item.touchedCount} touched)
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                              {item.callsCount}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                              {item.appointmentsCount}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                              {item.tasksCount}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                              {item.emailsCount}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {item.notesCount}
                            </TableCell>
                            <TableCell className="text-right text-xs font-extrabold text-teal-700 dark:text-teal-400">
                              {item.totalActivityCount}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent AM / Sales Manager Activity Feed */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-500" />
                  Recent AM & SM Activity Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest calls, appointments, tasks, emails & notes on existing customer accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {recentSignedAmActivities.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No recent activities recorded by AMs or Sales Managers on signed accounts.
                  </div>
                ) : (
                  recentSignedAmActivities.map((act, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-900 dark:text-white truncate max-w-[160px]">{act.companyName}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            act.category === 'Appointment' ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' :
                            act.category === 'Call' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            act.category === 'Task' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            act.category === 'Email' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {act.category}: {act.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>By: {act.amName}</span>
                        <span>{act.date ? new Date(act.date).toLocaleDateString() : ''}</span>
                      </div>
                      {act.notes && (
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 pt-0.5">
                          "{act.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: Branch Tagging & Creator Audit */}
        <TabsContent value="tagging_audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                Branch Creation & Tagging User Audit
              </CardTitle>
              <CardDescription className="text-xs">
                Dynamic breakdown of users who imported via CSV, manually created, or mass-linked child branch locations across multi-site accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="font-semibold">User / Creator</TableHead>
                      <TableHead className="font-semibold">Child Sites Linked</TableHead>
                      <TableHead className="font-semibold">Parent Customer Bases</TableHead>
                      <TableHead className="font-semibold">Status Breakdown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const userStatsMap = new Map<string, { count: number; parents: Set<string>; statuses: Record<string, number> }>();

                      filteredLeads.forEach(lead => {
                        const lAny = lead as any;
                        const isChild = Boolean(lead.parentLeadId || lAny.parentCompanyId || lAny.parentProspectPlusId);
                        if (isChild) {
                          const taggedBy = helperGetTaggedBy(lead);
                          const pId = lead.parentLeadId || lAny.parentCompanyId || lAny.parentProspectPlusId || 'Unknown';
                          const st = helperGetStatus(lead);

                          if (!userStatsMap.has(taggedBy)) {
                            userStatsMap.set(taggedBy, { count: 0, parents: new Set(), statuses: {} });
                          }
                          const uData = userStatsMap.get(taggedBy)!;
                          uData.count++;
                          uData.parents.add(pId);
                          uData.statuses[st] = (uData.statuses[st] || 0) + 1;
                        }
                      });

                      const userStats = Array.from(userStatsMap.entries()).sort((a, b) => b[1].count - a[1].count);

                      if (userStats.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                              No tagged child sites recorded yet.
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return userStats.map(([user, data]) => (
                        <TableRow key={user}>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {user}
                          </TableCell>
                          <TableCell className="font-semibold text-teal-600 text-xs">
                            {data.count} Child Sites
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {data.parents.size} Parent Accounts
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(data.statuses).map(([st, cnt]) => (
                                <Badge key={st} variant="outline" className="text-[10px]">
                                  {st}: {cnt}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Interactive Pop-Up Drill-Down Modal */}
      <Dialog open={drillDownModal.isOpen} onOpenChange={(open) => setDrillDownModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  {drillDownModal.title}
                  <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 ml-2 font-semibold">
                    {filteredModalLeads.length} {filteredModalLeads.length === 1 ? 'Account' : 'Accounts'} • {filteredModalLeads.reduce((sum, l) => sum + getLeadAmSmCategorizedStats(l).totalActivityCount, 0)} Total AM Activities
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  {drillDownModal.description}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search modal accounts..."
                    className="pl-8 h-8 text-xs"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs gap-1"
                  onClick={() => handleExportModalCSV(drillDownModal.title, filteredModalLeads)}
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-4">
            {filteredModalLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No accounts found matching "{modalSearchQuery}".
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-semibold">Company / Lead Account</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Assigned AM</TableHead>
                    <TableHead className="font-semibold">AM/SM Activity Breakdown</TableHead>
                    <TableHead className="font-semibold">Last AM/SM Activity</TableHead>
                    <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalLeads.map((lead) => {
                    const lAny = lead as any;
                    const isParent = lAny.isParent || lAny.isParentLead || lAny.accountType === 'parent' || (!lead.parentLeadId && !lAny.parentCompanyId && !lAny.parentProspectPlusId);
                    const statusStr = helperGetStatus(lead);
                    const assignedAm = helperGetAssignedAm(lead);
                    const catStats = getLeadAmSmCategorizedStats(lead);
                    const amActivitiesList = getLeadAmActivitiesList(lead);
                    const isRowExpanded = expandedModalRows[lead.id];

                    return (
                      <React.Fragment key={lead.id}>
                        <TableRow className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {amActivitiesList.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6 text-slate-500 hover:text-slate-900"
                                  onClick={() => toggleModalRowExpand(lead.id)}
                                >
                                  {isRowExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </Button>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {lead.companyName || 'Account'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ID: {lead.prospectPlusId || lead.id} {lAny.abn ? `• ABN: ${lAny.abn}` : ''}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${isParent ? 'bg-slate-100 text-slate-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                              {isParent ? 'Parent' : 'Child Site'}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <LeadStatusBadge status={statusStr} />
                          </TableCell>

                          <TableCell>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {assignedAm}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1 items-center">
                              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 font-medium">
                                📞 {catStats.callsCount}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                                📅 {catStats.appointmentsCount}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                                📋 {catStats.tasksCount}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200 font-medium">
                                ✉️ {catStats.emailsCount}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-medium">
                                📝 {catStats.notesCount}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="text-xs text-slate-500">
                              {catStats.lastActivityDate ? new Date(catStats.lastActivityDate).toLocaleDateString() : 'No activity'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {amActivitiesList.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                                  onClick={() => toggleModalRowExpand(lead.id)}
                                >
                                  {isRowExpanded ? 'Hide Notes' : `View Notes (${amActivitiesList.length})`}
                                </Button>
                              )}
                              <Link href={`/leads/${lead.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-teal-700 hover:text-teal-800 gap-1">
                                  View Account <ArrowUpRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Sub-Row for Notes & Activities */}
                        {isRowExpanded && (
                          <TableRow className="bg-slate-50/90 dark:bg-slate-900/60 border-l-4 border-l-teal-500">
                            <TableCell colSpan={7} className="p-4">
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-teal-600" />
                                  Logged Account Manager & Sales Manager Activities for {lead.companyName} ({amActivitiesList.length})
                                </h4>
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                                  {amActivitiesList.map((item, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1 shadow-2xs">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="text-slate-900 dark:text-slate-100 font-bold">By: {item.author}</span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                                            {item.category}: {item.type}
                                          </Badge>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {item.date ? new Date(item.date).toLocaleString() : ''}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                                        "{item.text || 'No text content provided'}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default MultiSiteReportingClient;
