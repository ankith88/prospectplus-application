"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { FullScreenLoader } from '@/components/ui/loader';
import {
  Building,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  FileText,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckSquare,
  Layers,
} from 'lucide-react';

interface Subcustomer {
  id: string;
  companyId: string;
  customerEntityId?: string;
  companyName: string;
  status: string;
  customerEmail: string;
  customerPhone: string;
  jobtype: string;
  billing: string;
  address?: string;
  ampoRate?: string;
  pmpoRate?: string;
  packageRate?: string;
  additionalBagRate?: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  jobsCount: number;
  parentLpoLeadId?: string;
  parentLpoName?: string;
  parentLpoInternalId?: string;
  parentLinkedCompanyName?: string;
}

interface LpoReportItem {
  leadId: string;
  prospectPlusId: string;
  lpoName: string;
  lpoOwnerName: string;
  email: string;
  phone: string;
  status: string;
  linkedLeadId: string;
  linkedCustomerId: string;
  linkedCompanyName: string;
  targetLpoId: string;
  hasAccess: boolean;
  portalUsersCount: number;
  portalUsers: any[];
  subcustomersCount: number;
  activeSubcustomersCount: number;
  cancelledSubcustomersCount: number;
  awaitingTncSubcustomersCount: number;
  totalJobsCount: number;
  subcustomers: Subcustomer[];
  lpoDetails?: any;
}

interface ReportSummary {
  totalLinkedLpos: number;
  lposWithLpoPlusAccess: number;
  totalSubcustomers: number;
  activeSubcustomers: number;
  cancelledSubcustomers: number;
  awaitingTncSubcustomers: number;
  totalJobsCreated: number;
  jobsByJobType: {
    scheduled: number;
    oneOff: number;
  };
  jobsByBilling: {
    lpoBilled: number;
    customerBilled: number;
  };
}

export function LpoReportingClient() {
  const { toast } = useToast();
  const [data, setData] = useState<{
    summary: ReportSummary;
    lpoLeadsReport: LpoReportItem[];
    allSubcustomers: Subcustomer[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<'lpo_view' | 'subcustomer_view'>('lpo_view');
  const [searchTerm, setSearchTerm] = useState('');
  const [lpoStatusFilter, setLpoStatusFilter] = useState('all');
  const [subcustStatusFilter, setSubcustStatusFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [expandedLpoIds, setExpandedLpoIds] = useState<Record<string, boolean>>({});

  const fetchReportData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lpo-reporting', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData({
          summary: json.summary,
          lpoLeadsReport: json.lpoLeadsReport || [],
          allSubcustomers: json.allSubcustomers || [],
        });
        if (isManualRefresh) {
          toast({
            title: 'Report Refreshed',
            description: 'Latest data from LPO.Plus database updated successfully.',
          });
        }
      } else {
        throw new Error(json.error || 'Failed to load report data.');
      }
    } catch (err: any) {
      console.error('Error fetching LPO report:', err);
      setError(err.message || 'An error occurred while fetching report data.');
      toast({
        variant: 'destructive',
        title: 'Report Error',
        description: err.message || 'Failed to load report data.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const toggleExpandLpo = (leadId: string) => {
    setExpandedLpoIds((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
  };

  // Filtered LPO Leads List
  const filteredLpoLeads = useMemo(() => {
    if (!data?.lpoLeadsReport) return [];

    return data.lpoLeadsReport.filter((item) => {
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesLpo =
          item.lpoName.toLowerCase().includes(term) ||
          item.prospectPlusId.toLowerCase().includes(term) ||
          (item.linkedCompanyName && item.linkedCompanyName.toLowerCase().includes(term)) ||
          item.linkedLeadId.toLowerCase().includes(term) ||
          item.targetLpoId.toLowerCase().includes(term);

        const matchesSubcust = item.subcustomers.some(
          (s) =>
            s.companyName.toLowerCase().includes(term) ||
            s.companyId.toLowerCase().includes(term) ||
            (s.customerEntityId && s.customerEntityId.toLowerCase().includes(term)) ||
            s.customerEmail.toLowerCase().includes(term)
        );

        if (!matchesLpo && !matchesSubcust) return false;
      }

      // LPO Status Filter
      if (lpoStatusFilter !== 'all') {
        if (lpoStatusFilter === 'logged_in' && item.status !== 'LPO.Plus Logged In') return false;
        if (lpoStatusFilter === 'access_sent' && item.status !== 'LPO.Plus Access Sent') return false;
        if (lpoStatusFilter === 'has_access' && !item.hasAccess) return false;
      }

      // Subcustomer Status Filter
      if (subcustStatusFilter !== 'all') {
        const hasMatchingSubcustStatus = item.subcustomers.some((s) => {
          const st = s.status.toLowerCase();
          if (subcustStatusFilter === 'active') return st === 'active';
          if (subcustStatusFilter === 'cancelled') return st === 'cancelled';
          if (subcustStatusFilter === 'awaiting_tnc') return st.includes('awaiting');
          return true;
        });
        if (!hasMatchingSubcustStatus && item.subcustomersCount > 0) return false;
      }

      // Billing Filter
      if (billingFilter !== 'all') {
        const hasMatchingBilling = item.subcustomers.some((s) => s.billing.toLowerCase() === billingFilter);
        if (!hasMatchingBilling && item.subcustomersCount > 0) return false;
      }

      return true;
    });
  }, [data, searchTerm, lpoStatusFilter, subcustStatusFilter, billingFilter]);

  // Filtered Flat Subcustomers List
  const filteredSubcustomers = useMemo(() => {
    if (!data?.allSubcustomers) return [];

    return data.allSubcustomers.filter((sub) => {
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = sub.companyName.toLowerCase().includes(term);
        const matchesId = sub.companyId.toLowerCase().includes(term);
        const matchesEntity = sub.customerEntityId && sub.customerEntityId.toLowerCase().includes(term);
        const matchesEmail = sub.customerEmail.toLowerCase().includes(term);
        const matchesParentLpo = sub.parentLpoName && sub.parentLpoName.toLowerCase().includes(term);
        const matchesParentCompany = sub.parentLinkedCompanyName && sub.parentLinkedCompanyName.toLowerCase().includes(term);

        if (!matchesName && !matchesId && !matchesEntity && !matchesEmail && !matchesParentLpo && !matchesParentCompany) {
          return false;
        }
      }

      // Subcustomer Status Filter
      if (subcustStatusFilter !== 'all') {
        const st = sub.status.toLowerCase();
        if (subcustStatusFilter === 'active' && st !== 'active') return false;
        if (subcustStatusFilter === 'cancelled' && st !== 'cancelled') return false;
        if (subcustStatusFilter === 'awaiting_tnc' && !st.includes('awaiting')) return false;
      }

      // Billing Filter
      if (billingFilter !== 'all') {
        if (sub.billing.toLowerCase() !== billingFilter) return false;
      }

      return true;
    });
  }, [data, searchTerm, subcustStatusFilter, billingFilter]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      'LPO Lead Name',
      'ProspectPlus ID',
      'LPO Status',
      'Linked Company Name',
      'Linked Company ID',
      'Subcustomer Name',
      'Subcustomer Entity ID',
      'Subcustomer Status',
      'Subcustomer Billing',
      'Subcustomer Job Type',
      'AMPO Rate',
      'PMPO Rate',
      'Package Rate',
      'Additional Bag Rate',
      'Jobs Created',
      'Subcustomer Email',
      'Subcustomer Phone',
    ];

    const rows: string[][] = [];

    data.lpoLeadsReport.forEach((lpo) => {
      if (lpo.subcustomers && lpo.subcustomers.length > 0) {
        lpo.subcustomers.forEach((sub) => {
          rows.push([
            `"${lpo.lpoName.replace(/"/g, '""')}"`,
            `"${lpo.prospectPlusId}"`,
            `"${lpo.status}"`,
            `"${(lpo.linkedCompanyName || '').replace(/"/g, '""')}"`,
            `"${lpo.linkedLeadId}"`,
            `"${sub.companyName.replace(/"/g, '""')}"`,
            `"${sub.companyId}"`,
            `"${sub.status}"`,
            `"${sub.billing}"`,
            `"${sub.jobtype}"`,
            `"${sub.ampoRate || 0}"`,
            `"${sub.pmpoRate || 0}"`,
            `"${sub.packageRate || 0}"`,
            `"${sub.additionalBagRate || 0}"`,
            `"${sub.jobsCount}"`,
            `"${sub.customerEmail}"`,
            `"${sub.customerPhone}"`,
          ]);
        });
      } else {
        rows.push([
          `"${lpo.lpoName.replace(/"/g, '""')}"`,
          `"${lpo.prospectPlusId}"`,
          `"${lpo.status}"`,
          `"${(lpo.linkedCompanyName || '').replace(/"/g, '""')}"`,
          `"${lpo.linkedLeadId}"`,
          '"No Subcustomers"',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '"0"',
          '""',
          '""',
        ]);
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LPO_Plus_Reporting_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report Exported',
      description: 'CSV file downloaded successfully.',
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setLpoStatusFilter('all');
    setSubcustStatusFilter('all');
    setBillingFilter('all');
  };

  const hasActiveFilters = Boolean(searchTerm || lpoStatusFilter !== 'all' || subcustStatusFilter !== 'all' || billingFilter !== 'all');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <FullScreenLoader message="Loading LPO.Plus application reporting & subcustomer analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-600 mx-auto" />
            <h3 className="text-xl font-bold text-rose-900">Failed to Load LPO Reporting Data</h3>
            <p className="text-sm text-rose-700 max-w-lg mx-auto">{error}</p>
            <Button variant="outline" className="border-rose-300 text-rose-800 hover:bg-rose-100" onClick={() => fetchReportData()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-400">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                LPO.<i>Plus</i> Linked Accounts & Subcustomer Report
              </h1>
              <p className="text-sm text-slate-300">
                Reporting for LPO Leads linked to companies with active LPO.Plus portal access, subcustomer breakdown & job generation metrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReportData(true)}
            disabled={refreshing}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-sky-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Linked LPO Accounts</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{summary?.totalLinkedLpos || 0}</span>
                  <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                    {summary?.lposWithLpoPlusAccess || 0} Portal Active
                  </span>
                </div>
              </div>
              <div className="p-3 bg-sky-100 text-sky-700 rounded-xl">
                <Building className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Linked with parent company & provisioned
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Total Subcustomers</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{summary?.totalSubcustomers || 0}</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {summary?.activeSubcustomers || 0} Active
                  </span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
              <span className="text-rose-600 font-medium">{summary?.cancelledSubcustomers || 0} Cancelled</span>
              <span>•</span>
              <span className="text-amber-600 font-medium">{summary?.awaitingTncSubcustomers || 0} Awaiting T&C</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-indigo-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Total Jobs Created</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-indigo-950">{summary?.totalJobsCreated || 0}</span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Manifests & Jobs
                  </span>
                </div>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
              <span className="font-semibold text-slate-700">{summary?.jobsByJobType?.scheduled || 0} Scheduled</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{summary?.jobsByJobType?.oneOff || 0} One-Off</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-purple-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Billing Structure</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-purple-950">{summary?.jobsByBilling?.lpoBilled || 0}</span>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    LPO Billed Jobs
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <span className="font-bold text-slate-700">{summary?.jobsByBilling?.customerBilled || 0}</span> Customer Billed Jobs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search LPO name, company, subcustomer name, ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters:</span>
              </div>

              {/* LPO Status Filter */}
              <Select value={lpoStatusFilter} onValueChange={setLpoStatusFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="LPO Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LPO Statuses</SelectItem>
                  <SelectItem value="logged_in">LPO.Plus Logged In</SelectItem>
                  <SelectItem value="access_sent">LPO.Plus Access Sent</SelectItem>
                  <SelectItem value="has_access">Has Portal Access</SelectItem>
                </SelectContent>
              </Select>

              {/* Subcustomer Status Filter */}
              <Select value={subcustStatusFilter} onValueChange={setSubcustStatusFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Subcustomer Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcustomer Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="awaiting_tnc">Awaiting T&Cs</SelectItem>
                </SelectContent>
              </Select>

              {/* Billing Filter */}
              <Select value={billingFilter} onValueChange={setBillingFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Billing Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Billing Models</SelectItem>
                  <SelectItem value="lpo">LPO Billed</SelectItem>
                  <SelectItem value="customer">Customer Billed</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs text-slate-500 hover:text-slate-900 h-9">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="lpo_view" className="text-xs md:text-sm font-semibold rounded-lg px-4 py-2">
              <Building className="h-4 w-4 mr-2" />
              LPO Leads Breakdown ({filteredLpoLeads.length})
            </TabsTrigger>
            <TabsTrigger value="subcustomer_view" className="text-xs md:text-sm font-semibold rounded-lg px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              Master Subcustomers Table ({filteredSubcustomers.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: LPO LEADS BREAKDOWN */}
        <TabsContent value="lpo_view" className="space-y-4 focus-visible:outline-none">
          {filteredLpoLeads.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="py-12 text-center space-y-3">
                <Building className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="text-lg font-bold text-slate-800">No LPO Leads Found</h4>
                <p className="text-sm text-slate-500">No linked LPO leads match your current search or filter criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="font-bold text-slate-700">LPO Lead / Location</TableHead>
                    <TableHead className="font-bold text-slate-700">Linked Company</TableHead>
                    <TableHead className="font-bold text-slate-700">LPO.Plus Status</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Portal Users</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Subcustomers</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Active Subcust.</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Jobs Created</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLpoLeads.map((lpo) => {
                    const isExpanded = Boolean(expandedLpoIds[lpo.leadId]);

                    return (
                      <React.Fragment key={lpo.leadId}>
                        <TableRow className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-sky-50/40' : ''}`}>
                          {/* Expand Icon */}
                          <TableCell className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500"
                              onClick={() => toggleExpandLpo(lpo.leadId)}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-sky-600" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>

                          {/* LPO Lead Name */}
                          <TableCell>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{lpo.lpoName}</span>
                                <Badge variant="outline" className="text-[10px] font-mono text-slate-600 bg-slate-100 border-slate-200">
                                  {lpo.prospectPlusId}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Owner: {lpo.lpoOwnerName || 'N/A'}</span>
                                <span>•</span>
                                <span className="text-slate-400">{lpo.email}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Linked Company */}
                          <TableCell>
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Building className="h-3.5 w-3.5 text-sky-600" />
                                {lpo.linkedCompanyName || 'Unspecified Company'}
                              </div>
                              {lpo.targetLpoId && (
                                <div className="text-xs text-slate-500 font-mono">
                                  NetSuite ID: <span className="font-semibold text-slate-700">{lpo.targetLpoId}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {lpo.status === 'LPO.Plus Logged In' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Logged In
                              </Badge>
                            ) : lpo.status === 'LPO.Plus Access Sent' ? (
                              <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3 text-sky-600" />
                                Access Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold">
                                {lpo.status}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Portal Users */}
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer">
                                    <Users className="h-3 w-3 mr-1 text-slate-600" />
                                    {lpo.portalUsersCount} Users
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="p-3 max-w-xs space-y-1 text-xs">
                                  <p className="font-bold text-slate-900 border-b pb-1">Portal Users for {lpo.lpoName}:</p>
                                  {lpo.portalUsers && lpo.portalUsers.length > 0 ? (
                                    lpo.portalUsers.map((u, i) => (
                                      <div key={i} className="text-slate-700">
                                        • {u.firstName} {u.lastName} ({u.email}) - <span className="font-semibold">{u.role}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-500 italic">No registered users in portal yet</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          {/* Subcustomers Count */}
                          <TableCell className="text-center">
                            <span className="font-bold text-slate-900">{lpo.subcustomersCount}</span>
                          </TableCell>

                          {/* Active Subcustomers */}
                          <TableCell className="text-center">
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                              {lpo.activeSubcustomersCount} Active
                            </span>
                          </TableCell>

                          {/* Jobs Created */}
                          <TableCell className="text-right">
                            <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-xs font-extrabold px-3 py-1">
                              {lpo.totalJobsCount} Jobs
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => toggleExpandLpo(lpo.leadId)} className="text-xs text-sky-700 hover:bg-sky-50">
                                {isExpanded ? 'Hide Customers' : 'View Customers'}
                              </Button>
                              <Button asChild variant="outline" size="sm" className="h-8 text-xs border-slate-300">
                                <Link href={`/lpo-leads/${lpo.leadId}`} target="_blank">
                                  Profile <ArrowUpRight className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Subcustomers Row */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/90 border-b border-slate-200">
                            <TableCell colSpan={9} className="p-4 md:p-6">
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-inner">
                                <div className="flex items-center justify-between border-b pb-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-sky-600" />
                                    <h4 className="font-extrabold text-slate-900 text-sm">
                                      Subcustomers in LPO.Plus for {lpo.lpoName} ({lpo.subcustomers.length})
                                    </h4>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    Total Jobs Generated: <strong className="text-indigo-900">{lpo.totalJobsCount}</strong>
                                  </span>
                                </div>

                                {lpo.subcustomers.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-3 text-center">
                                    No subcustomers have been added to the LPO.Plus database for this LPO yet.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <Table className="text-xs">
                                      <TableHeader className="bg-slate-100/80">
                                        <TableRow>
                                          <TableHead className="font-bold text-slate-700">Subcustomer Name</TableHead>
                                          <TableHead className="font-bold text-slate-700">Entity ID</TableHead>
                                          <TableHead className="font-bold text-slate-700">Status</TableHead>
                                          <TableHead className="font-bold text-slate-700">Billing Model</TableHead>
                                          <TableHead className="font-bold text-slate-700">Job Type</TableHead>
                                          <TableHead className="font-bold text-slate-700">Service Rates (AMPO / PMPO / Pkg / Bag)</TableHead>
                                          <TableHead className="font-bold text-slate-700 text-right">Jobs Created</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lpo.subcustomers.map((sub) => (
                                          <TableRow key={sub.id} className="hover:bg-slate-50">
                                            <TableCell className="font-bold text-slate-900">
                                              {sub.companyName}
                                              {sub.customerEmail && (
                                                <div className="text-[11px] font-normal text-slate-500">{sub.customerEmail}</div>
                                              )}
                                            </TableCell>
                                            <TableCell className="font-mono text-slate-600">{sub.companyId}</TableCell>
                                            <TableCell>
                                              {sub.status === 'Active' ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px]">
                                                  Active
                                                </Badge>
                                              ) : sub.status === 'cancelled' ? (
                                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-[10px]">
                                                  Cancelled
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-[10px]">
                                                  {sub.status}
                                                </Badge>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline" className="capitalize text-slate-700 border-slate-300 bg-slate-50 text-[10px]">
                                                {sub.billing === 'lpo' ? 'LPO Billed' : 'Direct Customer'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="capitalize text-slate-700">{sub.jobtype}</TableCell>
                                            <TableCell className="font-mono text-[11px] text-slate-700">
                                              ${sub.ampoRate || 0} / ${sub.pmpoRate || 0} / ${sub.packageRate || 0} / ${sub.additionalBagRate || 0}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-indigo-900">
                                              <Badge className="bg-indigo-50 text-indigo-900 border-indigo-200">
                                                {sub.jobsCount} Jobs
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: MASTER SUBCUSTOMERS TABLE */}
        <TabsContent value="subcustomer_view" className="space-y-4 focus-visible:outline-none">
          {filteredSubcustomers.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="py-12 text-center space-y-3">
                <Users className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="text-lg font-bold text-slate-800">No Subcustomers Found</h4>
                <p className="text-sm text-slate-500">No subcustomers match your current search or filter criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Subcustomer Name</TableHead>
                    <TableHead className="font-bold text-slate-700">Entity ID</TableHead>
                    <TableHead className="font-bold text-slate-700">Parent LPO Lead</TableHead>
                    <TableHead className="font-bold text-slate-700">Linked Parent Company</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="font-bold text-slate-700">Billing Model</TableHead>
                    <TableHead className="font-bold text-slate-700">Job Type</TableHead>
                    <TableHead className="font-bold text-slate-700">Service Rates (AMPO / PMPO / Pkg / Bag)</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Jobs Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcustomers.map((sub) => (
                    <TableRow key={`${sub.parentLpoInternalId}_${sub.companyId}_${sub.id}`} className="hover:bg-slate-50 transition-colors">
                      {/* Subcustomer Name */}
                      <TableCell>
                        <div>
                          <div className="font-bold text-slate-900">{sub.companyName}</div>
                          {sub.customerEmail && <div className="text-xs text-slate-500">{sub.customerEmail}</div>}
                          {sub.customerPhone && <div className="text-[11px] text-slate-400">{sub.customerPhone}</div>}
                        </div>
                      </TableCell>

                      {/* Entity ID */}
                      <TableCell className="font-mono text-slate-700 text-xs font-semibold">{sub.companyId}</TableCell>

                      {/* Parent LPO */}
                      <TableCell>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-sky-600" />
                          {sub.parentLpoName}
                        </div>
                        {sub.parentLpoLeadId && (
                          <Link href={`/lpo-leads/${sub.parentLpoLeadId}`} target="_blank" className="text-[11px] text-sky-600 hover:underline flex items-center gap-1">
                            View Lead Profile <ArrowUpRight className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </TableCell>

                      {/* Linked Parent Company */}
                      <TableCell className="text-xs text-slate-700">
                        {sub.parentLinkedCompanyName || '—'}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {sub.status === 'Active' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs">
                            Active
                          </Badge>
                        ) : sub.status === 'cancelled' ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                            Cancelled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-xs">
                            {sub.status}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Billing */}
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-slate-700 border-slate-300 bg-slate-50 text-xs">
                          {sub.billing === 'lpo' ? 'LPO Billed' : 'Direct Customer'}
                        </Badge>
                      </TableCell>

                      {/* Job Type */}
                      <TableCell className="capitalize text-xs font-medium text-slate-700">{sub.jobtype}</TableCell>

                      {/* Service Rates */}
                      <TableCell className="font-mono text-xs text-slate-700">
                        ${sub.ampoRate || 0} / ${sub.pmpoRate || 0} / ${sub.packageRate || 0} / ${sub.additionalBagRate || 0}
                      </TableCell>

                      {/* Jobs Created */}
                      <TableCell className="text-right">
                        <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-xs font-extrabold px-3 py-1">
                          {sub.jobsCount} Jobs
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
