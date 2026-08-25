"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, getDocs, doc, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, Activity, UserProfile, LeadStatus, BucketHistory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Activity as ActivityIcon, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  Filter, 
  X, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Flame,
  Search,
  Download,
  Calendar,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Zap,
  Clock,
  PlayCircle,
  StopCircle,
  Repeat
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { parseDateString } from '@/lib/utils';

type LifecycleType = 'localmile' | 'shipmate' | 'quotes';
type SortField = 'companyName' | 'status' | 'franchisee' | 'assignee' | 'dateLeadEntered';
type SortOrder = 'asc' | 'desc';
type KpiCardType = 
  | 'total' 
  | 'active' 
  | 'lm_opportunity'
  | 'lm_pending'
  | 'trialing_lm'
  | 'won' 
  | 'lost' 
  | 'lm_converted_other'
  | 'lm_stopped'
  | 'conversion' 
  | 'nurtures' 
  | null;

function formatBucketName(raw?: string): string {
  if (!raw || raw === 'N/A') return 'Unassigned';
  const formatted = raw.replace(/_/g, ' ').trim();
  if (!formatted) return 'Unassigned';
  return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const isLmOpportunity = (l: Lead) => (l.customerStatus || l.status) === 'LocalMile Opportunity';
const isLmPending = (l: Lead) => (l.customerStatus || l.status) === 'LocalMile Pending';
const isTrialingLm = (l: Lead) => {
  const s = l.customerStatus || l.status;
  return s === 'Trialing LocalMile' || s === 'Free Trial';
};

const checkStartedLocalMile = (lead: Lead, details?: { activities: Activity[], bucketHistory: BucketHistory[] }) => {
  const s = (lead.customerStatus || lead.status || '').toLowerCase();
  if (s.includes('localmile') || s === 'free trial') return true;
  if (!!lead.firstJobCreatedAt || (lead.jobCount !== undefined && lead.jobCount > 0) || lead.localMileTrialsRemaining !== undefined) return true;
  if (details) {
    const hasHistory = details.bucketHistory.some(h => (h.oldBucket || '').toLowerCase().includes('localmile') || (h.newBucket || '').toLowerCase().includes('localmile'));
    const hasAct = details.activities.some(a => (a.notes || '').toLowerCase().includes('localmile'));
    if (hasHistory || hasAct) return true;
  }
  return false;
};

const checkConvertedOtherService = (lead: Lead, details?: { activities: Activity[], bucketHistory: BucketHistory[] }) => {
  const s = (lead.customerStatus || lead.status || '').toLowerCase();
  if (s !== 'won' && s !== 'signed') return false;

  const startedLM = checkStartedLocalMile(lead, details);
  if (!startedLM) return false;

  const isPureLM = (lead.customerStatus || lead.status || '') === 'Won LocalMile' || (lead.customerStatus || lead.status || '') === 'LocalMile Customer';
  const journeys = lead.activeJourneys || [];
  const campaign = (lead.campaign || '').toLowerCase();
  
  return !isPureLM || journeys.some(j => !j.toLowerCase().includes('localmile')) || campaign.includes('shipmate') || campaign.includes('freight');
};

const checkLmTrialStopped = (lead: Lead, details?: { activities: Activity[], bucketHistory: BucketHistory[] }) => {
  const s = (lead.customerStatus || lead.status || '');
  if (s === 'LocalMile Trial Stopped') return true;
  if (s === 'Lost') {
    const reason = ((lead.statusReason || '') + ' ' + (lead.cancellationReason || '')).toLowerCase();
    if (reason.includes('localmile') || checkStartedLocalMile(lead, details)) {
      return true;
    }
  }
  return false;
};

export default function LifecycleDashboard() {
  const { userProfile } = useAuth();
  const isFranchisee = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee' || userProfile?.role?.toLowerCase() === 'franchisee';
  const { toast } = useToast();
  
  const [lifecycle, setLifecycle] = useState<LifecycleType>('localmile');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFranchisee, setSelectedFranchisee] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [dateEnteredFrom, setDateEnteredFrom] = useState<string>('');
  const [dateEnteredTo, setDateEnteredTo] = useState<string>('');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [isFetchingActivities, setIsFetchingActivities] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // KPI Modal State
  const [selectedKpiCard, setSelectedKpiCard] = useState<KpiCardType>(null);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [isFetchingModalDetails, setIsFetchingModalDetails] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(firestore, 'users'));
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setAllUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  const fetchLeadsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const leadsSnap = await getDocs(collection(firestore, 'leads'));
      const fetchedLeads = await Promise.all(
        leadsSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const leadId = docSnap.id;
          
          // Get basic properties
          const leadData = {
            id: leadId,
            companyName: data.companyName || 'Unknown Company',
            status: data.customerStatus || data.status || 'New',
            customerStatus: data.customerStatus,
            salesRepAssigned: data.salesRepAssigned,
            dialerAssigned: data.dialerAssigned,
            accountManagerAssigned: data.accountManagerAssigned,
            customerSuccessAssigned: data.customerSuccessAssigned,
            franchisee: data.franchisee,
            dateLeadEntered: data.dateLeadEntered,
            campaign: data.campaign,
            activeJourneys: data.activeJourneys || [],
            statusReason: data.statusReason,
            cancellationReason: data.cancellationReason,
            localMileTrialsRemaining: data.localMileTrialsRemaining,
            firstJobCreatedAt: data.firstJobCreatedAt,
            jobCount: data.jobCount,
            bucket: data.bucket,
            prospectPlusId: data.prospectPlusId,
            initialAppointmentBucket: data.initialAppointmentBucket,
          } as unknown as Lead;

          return leadData;
        })
      );
      
      setLeads(fetchedLeads);
    } catch (error: any) {
      console.error("Error fetching lifecycle leads:", error);
      toast({
        variant: 'destructive',
        title: 'Error loading leads',
        description: error.message || 'Could not load lead pipeline data.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile) {
      fetchLeadsData();
      fetchUsers();
    }
  }, [userProfile, fetchLeadsData, fetchUsers]);

  // Load subcollection history on lead expansion
  const [leadHistory, setLeadHistory] = useState<Record<string, { activities: Activity[], bucketHistory: BucketHistory[] }>>({});
  
  const toggleExpand = async (leadId: string) => {
    const isExpanded = !expandedLeads[leadId];
    setExpandedLeads(prev => ({ ...prev, [leadId]: isExpanded }));
    
    if (isExpanded && !leadHistory[leadId]) {
      try {
        const [activitySnap, historySnap] = await Promise.all([
          getDocs(collection(firestore, 'leads', leadId, 'activity')),
          getDocs(collection(firestore, 'leads', leadId, 'bucket_history'))
        ]);
        
        const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
        const bucketHistory = historySnap.docs.map(d => ({ id: d.id, ...d.data() } as BucketHistory))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
        setLeadHistory(prev => ({
          ...prev,
          [leadId]: { activities, bucketHistory }
        }));
      } catch (err) {
        console.error('Failed to load lead details:', err);
      }
    }
  };

  // Lazy-load activities for filter if needed
  const ensureActivitiesLoaded = useCallback(async () => {
    const missingLeads = leads.filter(l => !leadHistory[l.id]);
    if (missingLeads.length === 0) return;
    
    setIsFetchingActivities(true);
    try {
      const results = await Promise.all(
        missingLeads.map(async (lead) => {
          try {
            const [activitySnap, historySnap] = await Promise.all([
              getDocs(collection(firestore, 'leads', lead.id, 'activity')),
              getDocs(collection(firestore, 'leads', lead.id, 'bucket_history'))
            ]);
            
            const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
            const bucketHistory = historySnap.docs.map(d => ({ id: d.id, ...d.data() } as BucketHistory))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
            return { id: lead.id, activities, bucketHistory };
          } catch (err) {
            console.error('Failed to load lead details for', lead.id, err);
            return { id: lead.id, activities: [], bucketHistory: [] };
          }
        })
      );
      
      setLeadHistory(prev => {
        const next = { ...prev };
        results.forEach(res => {
          next[res.id] = { activities: res.activities, bucketHistory: res.bucketHistory };
        });
        return next;
      });
    } catch (err) {
      console.error('Error batch fetching activities:', err);
    } finally {
      setIsFetchingActivities(false);
    }
  }, [leads, leadHistory]);

  useEffect(() => {
    if (selectedActivityType !== 'all' && leads.length > 0) {
      ensureActivitiesLoaded();
    }
  }, [selectedActivityType, leads, ensureActivitiesLoaded]);

  // Filter criteria depending on selected lifecycle tab
  const filteredLifecycleLeads = useMemo(() => {
    return leads.filter(lead => {
      const status = (lead.customerStatus || lead.status || '').toLowerCase();
      
      // Determine if lead matches lifecycle category
      let matchesLifecycle = false;
      if (lifecycle === 'localmile') {
        matchesLifecycle = status.includes('localmile') || status.includes('free trial');
      } else if (lifecycle === 'shipmate') {
        matchesLifecycle = status.includes('shipmate');
      } else if (lifecycle === 'quotes') {
        matchesLifecycle = status.includes('quote') || status.includes('prospect opportunity');
      }
      
      // Also match Lost / Won leads if they were originally part of this process (indicated by bucketHistory or current status)
      if (status === 'lost' || status === 'won' || status === 'localmile trial stopped') {
        // Fallback checks or matching active campaign indicators
        const bucket = (lead.bucket || '').toLowerCase();
        if (lifecycle === 'localmile' && (bucket === 'customer_success' || lead.localMileTrialsRemaining !== undefined || checkStartedLocalMile(lead, leadHistory[lead.id]))) {
          matchesLifecycle = true;
        } else if (lifecycle === 'shipmate' && bucket === 'outbound') {
          matchesLifecycle = true;
        } else if (lifecycle === 'quotes' && (bucket === 'account_manager' || bucket === 'outbound')) {
          matchesLifecycle = true;
        }
      }

      if (!matchesLifecycle) return false;

      // Filter overrides
      if (selectedStatus !== 'all') {
        const leadStatus = lead.customerStatus || lead.status || '';
        if (leadStatus !== selectedStatus) return false;
      }

      if (selectedFranchisee !== 'all' && lead.franchisee !== selectedFranchisee) return false;
      
      const repName = lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned';
      if (selectedRep !== 'all' && repName !== selectedRep) return false;

      if (dateEnteredFrom) {
        const parsed = parseDateString(lead.dateLeadEntered);
        if (!parsed || parsed < new Date(dateEnteredFrom)) return false;
      }
      if (dateEnteredTo) {
        const parsed = parseDateString(lead.dateLeadEntered);
        if (!parsed || parsed > new Date(dateEnteredTo)) return false;
      }

      if (selectedActivityType !== 'all') {
        const details = leadHistory[lead.id];
        if (!details) return false; // wait for async load
        
        if (selectedActivityType === 'no_activity') {
          if (details.activities.length > 0) return false;
        } else if (selectedActivityType === 'has_activity') {
          if (details.activities.length === 0) return false;
        } else {
          const matches = details.activities.some(act => act.type?.toLowerCase() === selectedActivityType.toLowerCase());
          if (!matches) return false;
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.companyName.toLowerCase().includes(q);
        const matchesStatus = (lead.customerStatus || lead.status || '').toLowerCase().includes(q);
        const matchesFranchisee = (lead.franchisee || '').toLowerCase().includes(q);
        return matchesName || matchesStatus || matchesFranchisee;
      }

      return true;
    });
  }, [leads, lifecycle, selectedStatus, selectedFranchisee, selectedRep, searchQuery, dateEnteredFrom, dateEnteredTo, selectedActivityType, leadHistory]);

  // Handle Sort toggling
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sorted leads
  const sortedLifecycleLeads = useMemo(() => {
    if (!sortField) return filteredLifecycleLeads;

    return [...filteredLifecycleLeads].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'companyName') {
        valA = a.companyName || '';
        valB = b.companyName || '';
      } else if (sortField === 'status') {
        valA = a.customerStatus || a.status || '';
        valB = b.customerStatus || b.status || '';
      } else if (sortField === 'franchisee') {
        valA = a.franchisee || '';
        valB = b.franchisee || '';
      } else if (sortField === 'assignee') {
        valA = a.accountManagerAssigned || a.customerSuccessAssigned || a.salesRepAssigned || 'Unassigned';
        valB = b.accountManagerAssigned || b.customerSuccessAssigned || b.salesRepAssigned || 'Unassigned';
      } else if (sortField === 'dateLeadEntered') {
        valA = a.dateLeadEntered || '';
        valB = b.dateLeadEntered || '';
      }

      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredLifecycleLeads, sortField, sortOrder]);

  // Stage aggregates
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredLifecycleLeads.forEach(lead => {
      const status = lead.customerStatus || lead.status || 'New';
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  }, [filteredLifecycleLeads]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredLifecycleLeads.length;
    const lmOpportunity = filteredLifecycleLeads.filter(isLmOpportunity).length;
    const lmPending = filteredLifecycleLeads.filter(isLmPending).length;
    const trialingLm = filteredLifecycleLeads.filter(isTrialingLm).length;
    const active = filteredLifecycleLeads.filter(l => {
      const s = (l.customerStatus || l.status || '').toLowerCase();
      return s !== 'lost' && s !== 'won' && s !== 'localmile trial stopped';
    }).length;
    const won = filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'won').length;
    const lost = filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'lost').length;
    const lmConvertedOther = filteredLifecycleLeads.filter(l => checkConvertedOtherService(l, leadHistory[l.id])).length;
    const lmStopped = filteredLifecycleLeads.filter(l => checkLmTrialStopped(l, leadHistory[l.id])).length;
    const nurtures = filteredLifecycleLeads.filter(l => (l.activeJourneys || []).length > 0).length;
    
    return {
      total,
      active,
      lmOpportunity,
      lmPending,
      trialingLm,
      won,
      lost,
      lmConvertedOther,
      lmStopped,
      nurtures,
      conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : '0.0',
      lostRate: total > 0 ? ((lost / total) * 100).toFixed(1) : '0.0'
    };
  }, [filteredLifecycleLeads, leadHistory]);

  // Modal leads list based on selected KPI card
  const modalLeads = useMemo(() => {
    if (!selectedKpiCard) return [];
    if (selectedKpiCard === 'total') return filteredLifecycleLeads;
    if (selectedKpiCard === 'active') {
      return filteredLifecycleLeads.filter(l => {
        const s = (l.customerStatus || l.status || '').toLowerCase();
        return s !== 'lost' && s !== 'won' && s !== 'localmile trial stopped';
      });
    }
    if (selectedKpiCard === 'lm_opportunity') {
      return filteredLifecycleLeads.filter(isLmOpportunity);
    }
    if (selectedKpiCard === 'lm_pending') {
      return filteredLifecycleLeads.filter(isLmPending);
    }
    if (selectedKpiCard === 'trialing_lm') {
      return filteredLifecycleLeads.filter(isTrialingLm);
    }
    if (selectedKpiCard === 'won' || selectedKpiCard === 'conversion') {
      return filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'won');
    }
    if (selectedKpiCard === 'lost') {
      return filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'lost');
    }
    if (selectedKpiCard === 'lm_converted_other') {
      return filteredLifecycleLeads.filter(l => checkConvertedOtherService(l, leadHistory[l.id]));
    }
    if (selectedKpiCard === 'lm_stopped') {
      return filteredLifecycleLeads.filter(l => checkLmTrialStopped(l, leadHistory[l.id]));
    }
    if (selectedKpiCard === 'nurtures') {
      return filteredLifecycleLeads.filter(l => (l.activeJourneys || []).length > 0);
    }
    return [];
  }, [selectedKpiCard, filteredLifecycleLeads, leadHistory]);

  // Auto-fetch bucket history for leads shown in KPI modal
  useEffect(() => {
    if (selectedKpiCard && modalLeads.length > 0) {
      const missingLeads = modalLeads.filter(l => !leadHistory[l.id]);
      if (missingLeads.length > 0) {
        setIsFetchingModalDetails(true);
        Promise.all(
          missingLeads.map(async (lead) => {
            try {
              const [activitySnap, historySnap] = await Promise.all([
                getDocs(collection(firestore, 'leads', lead.id, 'activity')),
                getDocs(collection(firestore, 'leads', lead.id, 'bucket_history'))
              ]);
              const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const bucketHistory = historySnap.docs.map(d => ({ id: d.id, ...d.data() } as BucketHistory))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return { id: lead.id, activities, bucketHistory };
            } catch (err) {
              return { id: lead.id, activities: [], bucketHistory: [] };
            }
          })
        ).then((results) => {
          setLeadHistory(prev => {
            const next = { ...prev };
            results.forEach(res => {
              next[res.id] = { activities: res.activities, bucketHistory: res.bucketHistory };
            });
            return next;
          });
        }).finally(() => {
          setIsFetchingModalDetails(false);
        });
      }
    }
  }, [selectedKpiCard, modalLeads, leadHistory]);

  // Helper to extract origin bucket & current bucket
  const getLeadBucketDetails = useCallback((lead: Lead) => {
    const details = leadHistory[lead.id];
    let originBucket = lead.initialAppointmentBucket || lead.bucket || 'N/A';
    let currentBucket = lead.bucket || 'N/A';

    if (details && details.bucketHistory && details.bucketHistory.length > 0) {
      const sortedAsc = [...details.bucketHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortedAsc[0]?.oldBucket) {
        originBucket = sortedAsc[0].oldBucket;
      }
      const sortedDesc = [...details.bucketHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedDesc[0]?.newBucket) {
        currentBucket = sortedDesc[0].newBucket;
      }
    }

    return {
      originBucket: formatBucketName(originBucket),
      currentBucket: formatBucketName(currentBucket),
    };
  }, [leadHistory]);

  // Searched modal leads
  const searchedModalLeads = useMemo(() => {
    if (!modalSearch.trim()) return modalLeads;
    const q = modalSearch.toLowerCase();
    return modalLeads.filter(lead => {
      const { originBucket, currentBucket } = getLeadBucketDetails(lead);
      const assignee = lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned';
      const reason = lead.statusReason || lead.cancellationReason || '';
      return (
        lead.companyName.toLowerCase().includes(q) ||
        (lead.customerStatus || lead.status || '').toLowerCase().includes(q) ||
        (lead.franchisee || '').toLowerCase().includes(q) ||
        assignee.toLowerCase().includes(q) ||
        originBucket.toLowerCase().includes(q) ||
        currentBucket.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q)
      );
    });
  }, [modalLeads, modalSearch, getLeadBucketDetails]);

  // KPI Modal Title & Subtitle helper
  const kpiModalTitle = useMemo(() => {
    if (selectedKpiCard === 'total') return `Total Tracked Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'active') return `Active Pipeline Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'lm_opportunity') return `LocalMile Opportunity Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'lm_pending') return `LocalMile Pending Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'trialing_lm') return `Trialing LocalMile Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'won') return `Signed (Won) Customers (${modalLeads.length})`;
    if (selectedKpiCard === 'lost') return `Lost Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'lm_converted_other') return `LocalMile Trial → Signed for Other Service (${modalLeads.length})`;
    if (selectedKpiCard === 'lm_stopped') return `LocalMile Trial Stopped (${modalLeads.length})`;
    if (selectedKpiCard === 'conversion') return `Converted (Won) Leads (${modalLeads.length})`;
    if (selectedKpiCard === 'nurtures') return `Active Nurture Leads (${modalLeads.length})`;
    return 'Lead Breakdown';
  }, [selectedKpiCard, modalLeads.length]);

  // Unique Statuses, Franchisees and Representatives for filter options
  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const s = l.customerStatus || l.status;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueFranchisees = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.franchisee) set.add(l.franchisee); });
    return Array.from(set).sort();
  }, [leads]);

  const uniqueReps = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const rep = l.accountManagerAssigned || l.customerSuccessAssigned || l.salesRepAssigned;
      if (rep) set.add(rep);
    });
    return Array.from(set).sort();
  }, [leads]);

  const exportToCsv = () => {
    if (sortedLifecycleLeads.length === 0) {
      toast({ title: 'No Data', description: 'Lifecycle lead list is empty.' });
      return;
    }
    const headers = ['Company Name', 'Prospect+ ID', 'Franchisee', 'Status', 'Assignee', 'Active Journeys', 'Date Entered'];
    const rows = sortedLifecycleLeads.map(lead => [
      lead.companyName,
      lead.prospectPlusId || lead.id || 'N/A',
      lead.franchisee || 'N/A',
      lead.customerStatus || lead.status,
      lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned',
      (lead.activeJourneys || []).join('; '),
      lead.dateLeadEntered || 'N/A'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `lifecycle_${lifecycle}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#d0dfcd]/50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            <ActivityIcon className="h-8 w-8 text-[#095c7b]" />
            Trial & Deal Lifecycle Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Consolidated overview of LocalMile trials, ShipMate trials, quotes, nurture progression, and conversions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeadsData} className="bg-white border-[#095c7b]/20">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={exportToCsv} className="bg-[#095c7b] text-white hover:bg-[#053647]">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </header>

      {/* Selector Tabs */}
      <Tabs value={lifecycle} onValueChange={(val) => setLifecycle(val as LifecycleType)} className="w-full">
        <TabsList className="bg-white border border-[#095c7b]/20 p-1 w-full max-w-md grid grid-cols-3">
          <TabsTrigger value="localmile" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
            LocalMile Trial
          </TabsTrigger>
          <TabsTrigger value="shipmate" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
            ShipMate Trial
          </TabsTrigger>
          <TabsTrigger value="quotes" className="data-[state=active]:bg-[#095c7b] data-[state=active]:text-white">
            Quotes Sent
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Row */}
      <Card className="border-[#095c7b]/10 bg-white/95 shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Search className="h-3 w-3" /> Search Leads
            </label>
            <Input 
              placeholder="Search company, status, franchisee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-slate-50 border-[#095c7b]/20">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {!isFranchisee && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Franchisee</label>
              <Select value={selectedFranchisee} onValueChange={setSelectedFranchisee}>
                <SelectTrigger className="bg-slate-50 border-[#095c7b]/20">
                  <SelectValue placeholder="All Franchisees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Franchisees</SelectItem>
                  {uniqueFranchisees.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Assigned Representative</label>
            <Select value={selectedRep} onValueChange={setSelectedRep}>
              <SelectTrigger className="bg-slate-50 border-[#095c7b]/20">
                <SelectValue placeholder="All Representatives" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Representatives</SelectItem>
                {uniqueReps.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Lead Entered From</label>
            <Input 
              type="date"
              value={dateEnteredFrom}
              onChange={(e) => setDateEnteredFrom(e.target.value)}
              className="bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Lead Entered To</label>
            <Input 
              type="date"
              value={dateEnteredTo}
              onChange={(e) => setDateEnteredTo(e.target.value)}
              className="bg-slate-50 border-[#095c7b]/20 focus:border-[#095c7b]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              Lead Activity {isFetchingActivities && <Loader className="h-3 w-3 animate-spin text-[#095c7b]" />}
            </label>
            <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
              <SelectTrigger className="bg-slate-50 border-[#095c7b]/20">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="has_activity">Has Any Activity</SelectItem>
                <SelectItem value="no_activity">No Activity</SelectItem>
                <SelectItem value="Call">Calls Only</SelectItem>
                <SelectItem value="Email">Emails Only</SelectItem>
                <SelectItem value="Meeting">Meetings Only</SelectItem>
                <SelectItem value="Update">Updates Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => { 
              setSelectedStatus('all');
              setSelectedFranchisee('all'); 
              setSelectedRep('all'); 
              setSearchQuery(''); 
              setDateEnteredFrom('');
              setDateEnteredTo('');
              setSelectedActivityType('all');
              setSortField(null);
              setSortOrder('asc');
            }}
            className="text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
          >
            <X className="h-4 w-4 mr-1" /> Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* KPI & Active Status Breakdown Section */}
      <div className="space-y-4">
        {/* Row 1: Primary Pipeline & Active Statuses Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card 
            onClick={() => setSelectedKpiCard('total')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-[#095c7b]/40 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-[#095c7b] transition-colors">Total Tracked</CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#095c7b] transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-[#095c7b]">{kpis.total}</div>
              <p className="text-[10px] text-slate-400 mt-1">Click to view all leads</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('lm_opportunity')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-amber-700 transition-colors flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> LM Opportunity
              </CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-amber-600">{kpis.lmOpportunity}</div>
              <p className="text-[10px] text-slate-400 mt-1">LocalMile Opportunity</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('lm_pending')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-blue-700 transition-colors flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" /> LM Pending
              </CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-blue-600">{kpis.lmPending}</div>
              <p className="text-[10px] text-slate-400 mt-1">LocalMile Pending</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('trialing_lm')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-indigo-700 transition-colors flex items-center gap-1">
                <PlayCircle className="h-3.5 w-3.5 text-indigo-500" /> Trialing LocalMile
              </CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-indigo-600">{kpis.trialingLm}</div>
              <p className="text-[10px] text-slate-400 mt-1">Active Trialing LocalMile</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('won')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-emerald-700 transition-colors">Signed (Won)</CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{kpis.won}</div>
              <p className="text-[10px] text-slate-400 mt-1">Click to view signed deals</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('lost')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-rose-700 transition-colors">Lost</CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-rose-600">{kpis.lost}</div>
              <p className="text-[10px] text-slate-400 mt-1">Click to view lost leads</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Trial Conversions & Special Trial Reports */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            onClick={() => setSelectedKpiCard('lm_converted_other')}
            className="bg-white border-purple-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-600 font-bold group-hover:text-purple-700 transition-colors flex items-center gap-1.5">
                <Repeat className="h-4 w-4 text-purple-600" />
                LM → Signed Other Service
              </CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-purple-300 group-hover:text-purple-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-purple-700">{kpis.lmConvertedOther}</div>
              <p className="text-[10px] text-purple-600 font-medium mt-1">Started LM Trial → Signed Other Product</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('lm_stopped')}
            className="bg-white border-rose-200 shadow-sm hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-600 font-bold group-hover:text-rose-700 transition-colors flex items-center gap-1.5">
                <StopCircle className="h-4 w-4 text-rose-600" />
                LocalMile Trial Stopped
              </CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-rose-300 group-hover:text-rose-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-rose-600">{kpis.lmStopped}</div>
              <p className="text-[10px] text-rose-600 font-medium mt-1">Report where trial was stopped</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('conversion')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-emerald-700 transition-colors">Conversion Rate</CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{kpis.conversionRate}%</div>
              <p className="text-[10px] text-slate-400 mt-1">Click to view converted leads</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setSelectedKpiCard('nurtures')}
            className="bg-white border-[#095c7b]/10 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-slate-500 font-medium group-hover:text-blue-700 transition-colors">Active Nurtures</CardTitle>
              <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-blue-600">{kpis.nurtures}</div>
              <p className="text-[10px] text-slate-400 mt-1">Click to view nurture journeys</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stage Progression Flow pipeline */}
      <Card className="border-[#095c7b]/10 bg-white shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-700">Sub-Status Aggregates</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            {Object.keys(stageStats).length > 0 ? (
              Object.entries(stageStats).map(([stage, count]) => (
                <div key={stage} className="flex items-center gap-2 bg-[#095c7b]/5 px-3 py-1.5 rounded-lg border border-[#095c7b]/10">
                  <span className="text-xs font-semibold text-slate-700">{stage}</span>
                  <Badge className="bg-[#095c7b] text-white hover:bg-[#095c7b] text-xs font-bold rounded-full px-2 py-0.5">{count}</Badge>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-xs italic">No leads matching lifecycle parameters.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Unified Tracking Table */}
      <Card className="border-[#095c7b]/10 bg-white shadow-sm overflow-hidden flex-1">
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-[#095c7b]">Lead Progression & History Tracker</CardTitle>
          <CardDescription>Click column headers to sort. Expand rows to view history logs, stage changes, Aircall notes, and nurture timelines.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center"><Loader /></div>
          ) : sortedLifecycleLeads.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors select-none font-bold text-slate-700"
                    onClick={() => handleSort('companyName')}
                  >
                    <div className="flex items-center gap-1.5">
                      Company Name
                      {sortField === 'companyName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors select-none font-bold text-slate-700"
                    onClick={() => handleSort('franchisee')}
                  >
                    <div className="flex items-center gap-1.5">
                      Franchisee
                      {sortField === 'franchisee' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors select-none font-bold text-slate-700"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors select-none font-bold text-slate-700"
                    onClick={() => handleSort('assignee')}
                  >
                    <div className="flex items-center gap-1.5">
                      Assignee
                      {sortField === 'assignee' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Active Journeys</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors select-none font-bold text-slate-700"
                    onClick={() => handleSort('dateLeadEntered')}
                  >
                    <div className="flex items-center gap-1.5">
                      Date Entered
                      {sortField === 'dateLeadEntered' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-[#095c7b]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#095c7b]" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLifecycleLeads.map((lead) => {
                  const isExpanded = !!expandedLeads[lead.id];
                  const details = leadHistory[lead.id];
                  const assignee = lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned';
                  const leadStatus = lead.customerStatus || lead.status || '';
                  const profileUrl = (leadStatus === 'Won' || lead.status === 'Won') ? `/companies/${lead.id}` : `/leads/${lead.id}`;
                  
                  return (
                    <React.Fragment key={lead.id}>
                      <TableRow 
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors border-b"
                        onClick={() => toggleExpand(lead.id)}
                      >
                        <TableCell className="text-center">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">{lead.companyName}</TableCell>
                        <TableCell className="text-slate-600 text-xs">{lead.franchisee || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`
                            ${leadStatus === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${leadStatus === 'Lost' || leadStatus === 'LocalMile Trial Stopped' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                            ${leadStatus === 'Trialing LocalMile' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                            ${leadStatus === 'LocalMile Opportunity' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                            ${leadStatus === 'LocalMile Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          `}>
                            {leadStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs">{assignee}</TableCell>
                        <TableCell>
                          {lead.activeJourneys && lead.activeJourneys.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.activeJourneys.map(j => (
                                <Badge key={j} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-50">
                                  {j}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">{lead.dateLeadEntered || 'N/A'}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b] hover:text-white transition-colors"
                          >
                            <Link
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span>View Profile</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-slate-50/40">
                          <TableCell colSpan={8} className="p-4 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                              {/* Left side: Transition History */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                  <TrendingUp className="h-3.5 w-3.5 text-[#095c7b]" />
                                  Lifecycle Stage Transitions
                                </h4>
                                
                                {details ? (
                                  details.bucketHistory.length > 0 ? (
                                    <div className="space-y-3 border-l-2 border-[#095c7b]/20 pl-4 py-1">
                                      {details.bucketHistory.map((h, i) => (
                                        <div key={h.id || i} className="relative text-xs">
                                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#095c7b]" />
                                          <div className="flex justify-between items-start text-slate-500 mb-1">
                                            <span className="font-semibold text-slate-700">
                                              {h.oldBucket.replace('_', ' ')} <ArrowRight className="inline h-3 w-3 mx-1" /> {h.newBucket.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px]">{h.date ? format(new Date(h.date), 'PP p') : 'N/A'}</span>
                                          </div>
                                          {h.author && <p className="text-[10px] text-slate-400">Author: {h.author}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 text-xs italic p-2 border rounded bg-white">No bucket transitions recorded.</div>
                                  )
                                ) : (
                                  <div className="text-xs text-slate-500">Loading history details...</div>
                                )}
                                
                                {/* Status Reason / Cancelation Reason */}
                                {(lead.statusReason || lead.cancellationReason) && (
                                  <div className="p-3 border border-red-200 bg-red-50/30 rounded-lg space-y-1 mt-4">
                                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                      Pipeline Details / Lost Reasons
                                    </p>
                                    {lead.statusReason && <p className="text-xs text-slate-600"><span className="font-semibold">Reason:</span> {lead.statusReason}</p>}
                                    {lead.cancellationReason && <p className="text-xs text-slate-600"><span className="font-semibold">Cancellation:</span> {lead.cancellationReason}</p>}
                                  </div>
                                )}
                              </div>

                              {/* Right Side: Logged Activities / AirCall / Nurture Notes */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5 text-[#095c7b]" />
                                  Recent Interactions
                                </h4>
                                
                                {details ? (
                                  details.activities.length > 0 ? (
                                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-2">
                                      {details.activities.slice(0, 5).map((act, i) => (
                                        <div key={act.id || i} className="p-2.5 border border-slate-100 bg-white rounded-lg space-y-1">
                                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-slate-50">
                                              {act.type}
                                            </Badge>
                                            <span>{act.date ? format(new Date(act.date), 'PP p') : 'N/A'}</span>
                                          </div>
                                          <p className="text-xs text-slate-700">{act.notes}</p>
                                          {act.author && <p className="text-[9px] text-slate-400">By: {act.author}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 text-xs italic p-2 border rounded bg-white">No interactions logged.</div>
                                  )
                                ) : (
                                  <div className="text-xs text-slate-500">Loading activities...</div>
                                )}
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
          ) : (
            <div className="p-16 text-center text-slate-500 italic">No leads match the filters.</div>
          )}
        </CardContent>
      </Card>

      {/* KPI Detail Pop-up Modal */}
      <Dialog open={selectedKpiCard !== null} onOpenChange={(open) => { if (!open) { setSelectedKpiCard(null); setModalSearch(''); } }}>
        <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-xl font-bold text-[#095c7b] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#095c7b]" />
                  {kpiModalTitle}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  {selectedKpiCard === 'lm_converted_other'
                    ? 'Leads that originally initiated or engaged in a LocalMile Trial but subsequently signed up for another service or product (e.g. ShipMate, Standard Freight, Custom Contract).'
                    : selectedKpiCard === 'lm_stopped'
                    ? 'Reporting on leads where the LocalMile trial was stopped or cancelled, including logged reasons.'
                    : 'Detailed list of companies & leads associated with this metric, showing origin bucket vs. current bucket location.'}
                </DialogDescription>
              </div>
              {isFetchingModalDetails && (
                <div className="flex items-center gap-1.5 text-xs text-[#095c7b] bg-[#095c7b]/10 px-2.5 py-1 rounded-full animate-pulse">
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading bucket histories...</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Modal Toolbar Search */}
          <div className="py-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search leads by company, franchisee, assignee, reason, or bucket name..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-xs focus:border-[#095c7b]"
              />
            </div>
            {modalSearch && (
              <Button variant="ghost" size="sm" onClick={() => setModalSearch('')} className="text-xs text-slate-500">
                Clear
              </Button>
            )}
          </div>

          {/* Modal Leads Table */}
          <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
            {searchedModalLeads.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Company Name</TableHead>
                    <TableHead className="font-bold text-slate-700">Franchisee</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="font-bold text-slate-700">Assignee</TableHead>
                    <TableHead className="font-bold text-slate-700">Origin Bucket</TableHead>
                    <TableHead className="font-bold text-slate-700">Current Bucket</TableHead>
                    {(selectedKpiCard === 'lm_stopped' || selectedKpiCard === 'lm_converted_other') && (
                      <TableHead className="font-bold text-slate-700">
                        {selectedKpiCard === 'lm_stopped' ? 'Stopped Reason / Notes' : 'Converted Product / Journey'}
                      </TableHead>
                    )}
                    <TableHead className="text-right font-bold text-slate-700">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedModalLeads.map((lead) => {
                    const { originBucket, currentBucket } = getLeadBucketDetails(lead);
                    const assignee = lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned';
                    const leadStatus = lead.customerStatus || lead.status || 'New';
                    const profileUrl = (leadStatus === 'Won' || lead.status === 'Won') ? `/companies/${lead.id}` : `/leads/${lead.id}`;

                    return (
                      <TableRow key={lead.id} className="hover:bg-slate-50">
                        <TableCell className="font-semibold text-slate-800">{lead.companyName}</TableCell>
                        <TableCell className="text-xs text-slate-600">{lead.franchisee || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`
                            ${leadStatus === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${leadStatus === 'Lost' || leadStatus === 'LocalMile Trial Stopped' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                            ${leadStatus === 'Trialing LocalMile' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                            ${leadStatus === 'LocalMile Opportunity' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                            ${leadStatus === 'LocalMile Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          `}>
                            {leadStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{assignee}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px] font-medium border border-slate-200">
                            {originBucket}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b]/10 text-[11px] font-semibold border border-[#095c7b]/20 flex items-center gap-1 w-fit">
                            <ArrowRight className="h-3 w-3 text-[#095c7b]" />
                            {currentBucket}
                          </Badge>
                        </TableCell>

                        {/* Special Details column for LM Stopped or LM Converted to Other */}
                        {selectedKpiCard === 'lm_stopped' && (
                          <TableCell className="text-xs text-slate-600 max-w-[220px] truncate" title={lead.statusReason || lead.cancellationReason || ''}>
                            {lead.statusReason || lead.cancellationReason || <span className="text-slate-400 italic">No reason specified</span>}
                          </TableCell>
                        )}

                        {selectedKpiCard === 'lm_converted_other' && (
                          <TableCell className="text-xs max-w-[220px]">
                            <div className="flex flex-wrap gap-1">
                              {lead.activeJourneys && lead.activeJourneys.length > 0 ? (
                                lead.activeJourneys.map(j => (
                                  <Badge key={j} variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                    {j}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {lead.campaign || lead.status || 'Signed Deal'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}

                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-[#095c7b]/30 text-[#095c7b] hover:bg-[#095c7b] hover:text-white transition-colors"
                          >
                            <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
                              <span>View Profile</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-slate-400 italic text-sm">
                No leads match your search criteria in this breakdown.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
