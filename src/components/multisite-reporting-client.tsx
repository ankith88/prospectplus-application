"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { usePerformance } from '@/hooks/use-performance';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead, LeadStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { 
  Network, Building2, Search, RefreshCw, Download, 
  CheckCircle2, AlertCircle, Phone, 
  TrendingUp, ChevronRight, ChevronDown, 
  Users, Activity, ArrowUpRight, FileText, UserCheck, Layers
} from 'lucide-react';
import Link from 'next/link';
import { subDays } from 'date-fns';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

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
}

export function MultiSiteReportingClient() {
  const { canView } = usePermissions();
  const { toast } = useToast();
  const { setPageName, setIsCustom } = usePerformance();

  const [isLoading, setIsLoading] = useState(true);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Firestore collection data
  const [multisiteLeads, setMultisiteLeads] = useState<Lead[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [amFilter, setAmFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expandable table rows
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const hasAccess = canView('multisiteReporting');

  useEffect(() => {
    setIsCustom(true);
    setPageName("MultiSite Reporting");
  }, [setIsCustom, setPageName]);

  const helperGetStatus = (lead: Lead): LeadStatus => {
    const l = lead as any;
    return (l.customerStatus || l.status || l.scfStatus || l.stage || 'New') as LeadStatus;
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

  const fetchData = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    console.time("MultiSite Reporting - Load Time");

    try {
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

      // Resolving creator / importer / mass-linker for child leads via activity history
      const childLeads = Array.from(leadMap.values()).filter((l: any) => 
        l.parentLeadId || l.parentCompanyId || l.parentProspectPlusId
      );

      await Promise.all(
        childLeads.map(async (child) => {
          const cAny = child as any;
          if (cAny.importedByName || cAny.importedBy || cAny.linkedByName || cAny.linkedBy || cAny.createdByName || cAny.createdBy) {
            return;
          }

          try {
            // Fetch activity subcollection under leads or companies
            let actSnap = await getDocs(query(collection(firestore, 'leads', child.id, 'activity'))).catch(() => null);
            if (!actSnap || actSnap.empty) {
              actSnap = await getDocs(query(collection(firestore, 'companies', child.id, 'activity'))).catch(() => null);
            }

            if (actSnap && !actSnap.empty) {
              const activities = actSnap.docs.map(d => d.data());
              
              // 1. Check for CSV import activity
              const importAct = activities.find(a => a.source === 'csv_upload' || a.isCsvUpload || (a.notes && a.notes.toLowerCase().includes('imported')));
              if (importAct && importAct.author) {
                cAny.importedByName = importAct.author;
                return;
              }

              // 2. Check for Mass link activity
              const massLinkAct = activities.find(a => a.notes && a.notes.toLowerCase().includes('mass-linked'));
              if (massLinkAct) {
                if (massLinkAct.author) {
                  cAny.linkedByName = massLinkAct.author;
                  return;
                }
                const match = massLinkAct.notes.match(/by\s+(Superadmin\s+)?([^\s\.\,]+@[^\s\.\,]+|[A-Z][a-z]+\s+[A-Z][a-z]+)/i);
                if (match && match[2]) {
                  cAny.linkedByName = match[2];
                  return;
                }
              }

              // 3. Check for Creation activity
              const creationAct = activities.find(a => a.type === 'Creation' || (a.notes && a.notes.toLowerCase().includes('created')));
              if (creationAct && creationAct.author) {
                cAny.createdByName = creationAct.author;
                return;
              }

              // 4. Fallback to earliest activity author
              const earliest = activities[0];
              if (earliest && earliest.author && earliest.author !== 'System') {
                cAny.createdByName = earliest.author;
                return;
              }
            }

            // Bucket history subcollection fallback
            let bhSnap = await getDocs(query(collection(firestore, 'leads', child.id, 'bucket_history'))).catch(() => null);
            if (!bhSnap || bhSnap.empty) {
              bhSnap = await getDocs(query(collection(firestore, 'companies', child.id, 'bucket_history'))).catch(() => null);
            }

            if (bhSnap && !bhSnap.empty) {
              const firstBh = bhSnap.docs[0].data();
              if (firstBh && firstBh.author) {
                cAny.createdByName = firstBh.author;
                return;
              }
            }
          } catch (err) {
            console.warn('Failed to resolve activity creator for child lead:', child.id, err);
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
            // Placeholder parent if parent lead record hasn't loaded yet
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

      children.forEach(child => {
        const cAny = child as any;
        const statusStr = helperGetStatus(child);
        const statusLower = statusStr.toLowerCase();

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
      };
    });

    return groups;
  }, [filteredLeads]);

  // Key KPI Aggregations
  const metrics = useMemo(() => {
    const totalParents = hierarchyGroups.length;
    let totalChildBranches = 0;
    let activeSignedBranches = 0;
    let totalOutreach = 0;
    let totalResponded = 0;
    let totalQuoteSent = 0;

    hierarchyGroups.forEach(g => {
      totalChildBranches += g.children.length;
      g.children.forEach(c => {
        const st = helperGetStatus(c).toLowerCase();
        if (['active', 'signed', 'converted', 'won'].includes(st)) {
          activeSignedBranches++;
        }
        if (['quote sent', 'quotes sent', 'quote out', 'proposal sent'].includes(st)) {
          totalQuoteSent++;
        }
      });

      totalOutreach += g.outreachCount;
      totalResponded += g.respondedCount;
    });

    // Response Rate calculation
    const responseRate = totalChildBranches > 0 
      ? Math.round((totalResponded / Math.max(totalChildBranches, 1)) * 100) 
      : 0;

    const conversionRate = totalChildBranches > 0 
      ? Math.round((activeSignedBranches / Math.max(totalChildBranches, 1)) * 100) 
      : 0;

    return {
      totalParents,
      totalChildBranches,
      activeSignedBranches,
      totalOutreach,
      totalResponded,
      totalQuoteSent,
      responseRate,
      conversionRate,
    };
  }, [hierarchyGroups]);

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

        if (g.children.length === 0) {
          csvRows.push([
            `"${parentName}"`,
            `"${parentId}"`,
            `"${pStatus}"`,
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
            csvRows.push([
              `"${parentName}"`,
              `"${parentId}"`,
              `"${pStatus}"`,
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
      {/* Top Header & Audit Timer */}
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
                Engagement and response tracking across multi-sites in the <Badge variant="outline" className="text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200">multisite</Badge> bucket.
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

      {/* KPI Highlights Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Parents */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Parent Customers</span>
              <Building2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold">{metrics.totalParents}</div>
            <p className="text-xs text-slate-400 mt-1">Expanding customer bases</p>
          </CardContent>
        </Card>

        {/* Tagged Child Sites */}
        <Card className="bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/40 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Tagged Child Sites</span>
              <Network className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-400">{metrics.totalChildBranches}</div>
            <p className="text-xs text-slate-500 mt-1">Total child branches linked</p>
          </CardContent>
        </Card>

        {/* Quotes Sent / Out */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Quotes Sent</span>
              <FileText className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">{metrics.totalQuoteSent}</div>
            <p className="text-xs text-slate-500 mt-1">Pending quote acceptance</p>
          </CardContent>
        </Card>

        {/* AM Branch Outreach */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">AM Outreach</span>
              <Phone className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.totalOutreach}</div>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">Branches contacted</p>
          </CardContent>
        </Card>

        {/* Branch Response Rate */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Response Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.responseRate}%</div>
            <p className="text-xs text-slate-500 mt-1">{metrics.totalResponded} branches responded</p>
          </CardContent>
        </Card>

        {/* Converted Signed Branches */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Signed Branches</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{metrics.activeSignedBranches}</div>
            <p className="text-xs text-indigo-500 mt-1">{metrics.conversionRate}% branch conversion</p>
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
                  <Activity className="w-5 h-5 text-teal-600" />
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

        {/* TAB 3: Branch Tagging & Creator Audit */}
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
    </div>
  );
}
export default MultiSiteReportingClient;
