"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { parseDateString } from '@/lib/utils';

type LifecycleType = 'localmile' | 'shipmate' | 'quotes';

export default function LifecycleDashboard() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [lifecycle, setLifecycle] = useState<LifecycleType>('localmile');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Filters
  const [selectedFranchisee, setSelectedFranchisee] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [dateEnteredFrom, setDateEnteredFrom] = useState<string>('');
  const [dateEnteredTo, setDateEnteredTo] = useState<string>('');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [isFetchingActivities, setIsFetchingActivities] = useState<boolean>(false);

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
            bucket: data.bucket,
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
      if (status === 'lost' || status === 'won') {
        // Fallback checks or matching active campaign indicators
        const bucket = (lead.bucket || '').toLowerCase();
        if (lifecycle === 'localmile' && (bucket === 'customer_success' || lead.localMileTrialsRemaining !== undefined)) {
          matchesLifecycle = true;
        } else if (lifecycle === 'shipmate' && bucket === 'outbound') {
          matchesLifecycle = true;
        } else if (lifecycle === 'quotes' && (bucket === 'account_manager' || bucket === 'outbound')) {
          matchesLifecycle = true;
        }
      }

      if (!matchesLifecycle) return false;

      // Filter overrides
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
  }, [leads, lifecycle, selectedFranchisee, selectedRep, searchQuery, dateEnteredFrom, dateEnteredTo, selectedActivityType, leadHistory]);

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
    const active = filteredLifecycleLeads.filter(l => {
      const s = (l.customerStatus || l.status || '').toLowerCase();
      return s !== 'lost' && s !== 'won';
    }).length;
    const won = filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'won').length;
    const lost = filteredLifecycleLeads.filter(l => (l.customerStatus || l.status || '').toLowerCase() === 'lost').length;
    const nurtures = filteredLifecycleLeads.filter(l => (l.activeJourneys || []).length > 0).length;
    
    return {
      total,
      active,
      won,
      lost,
      nurtures,
      conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : '0.0',
      lostRate: total > 0 ? ((lost / total) * 100).toFixed(1) : '0.0'
    };
  }, [filteredLifecycleLeads]);

  // Unique Franchisees and Representatives for filter options
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
    if (filteredLifecycleLeads.length === 0) {
      toast({ title: 'No Data', description: 'Lifecycle lead list is empty.' });
      return;
    }
    const headers = ['Company Name', 'Franchisee', 'Status', 'Assignee', 'Active Journeys', 'Date Entered'];
    const rows = filteredLifecycleLeads.map(lead => [
      lead.companyName,
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
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-4 items-end">
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
              setSelectedFranchisee('all'); 
              setSelectedRep('all'); 
              setSearchQuery(''); 
              setDateEnteredFrom('');
              setDateEnteredTo('');
              setSelectedActivityType('all');
            }}
            className="text-xs text-[#095c7b] hover:bg-[#095c7b]/10"
          >
            <X className="h-4 w-4 mr-1" /> Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Total Tracked</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-[#095c7b]">{kpis.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Active in Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{kpis.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Signed (Won)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{kpis.won}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Lost</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-rose-600">{kpis.lost}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{kpis.conversionRate}%</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#095c7b]/10 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium">Active Nurtures</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{kpis.nurtures}</div>
          </CardContent>
        </Card>
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
          <CardDescription>Expand rows to view history logs, stage changes, Aircall notes, and nurture timelines.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center"><Loader /></div>
          ) : filteredLifecycleLeads.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Active Journeys</TableHead>
                  <TableHead>Date Entered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLifecycleLeads.map((lead) => {
                  const isExpanded = !!expandedLeads[lead.id];
                  const details = leadHistory[lead.id];
                  const assignee = lead.accountManagerAssigned || lead.customerSuccessAssigned || lead.salesRepAssigned || 'Unassigned';
                  
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
                            ${(lead.customerStatus || lead.status) === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${(lead.customerStatus || lead.status) === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                            ${!(lead.customerStatus || lead.status || '').includes('Lost') && !(lead.customerStatus || lead.status || '').includes('Won') ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                          `}>
                            {lead.customerStatus || lead.status}
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
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-slate-50/40">
                          <TableCell colSpan={7} className="p-4 border-b">
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
    </div>
  );
}
