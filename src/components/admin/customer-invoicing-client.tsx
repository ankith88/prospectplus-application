"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  PlusCircle, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Layers, 
  SlidersHorizontal, 
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Clock,
  Sparkles,
  Store,
  Hash,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

import { getCompaniesFromFirebase, getLastInvoicesForCompanies } from '@/services/firebase';
import type { Lead, Invoice } from '@/lib/types';
import { safeFormatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CreateInvoiceDialog } from '@/components/create-invoice-dialog';
import { InvoiceDetailsDialog } from '@/components/invoice-details-dialog';

interface FilterState {
  franchisee: string;
  companyName: string;
  companyId: string;
  invoiceStatus: 'all' | 'invoiced_this_month' | 'not_invoiced_this_month';
}

export function CustomerInvoicingClient() {
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, Invoice | null>>({});
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active dialogs state
  const [createInvoiceCompany, setCreateInvoiceCompany] = useState<Lead | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceCompany, setSelectedInvoiceCompany] = useState<Lead | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    franchisee: 'all',
    companyName: '',
    companyId: '',
    invoiceStatus: 'all',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Fetch companies from Firebase
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompaniesFromFirebase({ skipCoordinateCheck: true });
      // Filter active signed customers (exclude lost customers)
      const activeSigned = data.filter(c => {
        const status = (c.status || c.customerStatus || '').toLowerCase();
        return !status.includes('lost');
      });
      setCompanies(activeSigned);
    } catch (error) {
      console.error('Error fetching companies for invoicing:', error);
      toast({
        title: 'Error loading companies',
        description: 'Failed to retrieve signed customers from the database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Unique sorted list of franchisees
  const uniqueFranchisees = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach(c => {
      const f = (c.franchisee || '').trim();
      if (f) {
        counts[f] = (counts[f] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  // Current month string for checking monthly invoice status: "YYYY-MM"
  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      // 1. Franchisee filter
      if (filters.franchisee !== 'all' && (c.franchisee || '').trim() !== filters.franchisee) {
        return false;
      }

      // 2. Company Name filter
      if (filters.companyName.trim()) {
        const query = filters.companyName.trim().toLowerCase();
        const name = (c.companyName || '').toLowerCase();
        if (!name.includes(query)) return false;
      }

      // 3. Company ID / NetSuite ID filter
      if (filters.companyId.trim()) {
        const query = filters.companyId.trim().toLowerCase();
        const entityId = String(c.entityId || '').toLowerCase();
        const prospectPlusId = String(c.prospectPlusId || '').toLowerCase();
        const internalId = String(c.internalId || c.internalid || '').toLowerCase();
        const docId = String(c.id || '').toLowerCase();

        const matchesId = entityId.includes(query) || 
                          prospectPlusId.includes(query) || 
                          internalId.includes(query) || 
                          docId.includes(query);
        if (!matchesId) return false;
      }

      // 4. Invoicing status filter
      if (filters.invoiceStatus !== 'all') {
        const inv = invoicesMap[c.id];
        const dateStr = inv?.invoiceDate || (inv as any)?.tranDate || (inv as any)?.createdAt;
        const hasInvoiceThisMonth = Boolean(dateStr && String(dateStr).startsWith(currentMonthPrefix));

        if (filters.invoiceStatus === 'invoiced_this_month' && !hasInvoiceThisMonth) {
          return false;
        }
        if (filters.invoiceStatus === 'not_invoiced_this_month' && hasInvoiceThisMonth) {
          return false;
        }
      }

      return true;
    });
  }, [companies, filters, invoicesMap, currentMonthPrefix]);

  // Total pages and Paginated subset
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize));
  
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  // Automatically fetch last invoices for the current visible page
  useEffect(() => {
    if (paginatedCompanies.length === 0) return;

    const missingIds = paginatedCompanies
      .map(c => c.id)
      .filter(id => invoicesMap[id] === undefined);

    if (missingIds.length === 0) return;

    let isMounted = true;
    setLoadingInvoices(true);

    getLastInvoicesForCompanies(missingIds)
      .then(fetchedMap => {
        if (!isMounted) return;
        setInvoicesMap(prev => ({ ...prev, ...fetchedMap }));
      })
      .catch(err => {
        console.error('Failed to load recent invoices:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingInvoices(false);
      });

    return () => {
      isMounted = false;
    };
  }, [paginatedCompanies, invoicesMap]);

  // Helper to handle copying Company ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast({
      title: 'Copied to clipboard',
      description: `Company ID "${id}" copied.`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      franchisee: 'all',
      companyName: '',
      companyId: '',
      invoiceStatus: 'all',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.franchisee !== 'all' || 
                           filters.companyName.trim() !== '' || 
                           filters.companyId.trim() !== '' || 
                           filters.invoiceStatus !== 'all';

  // Stats calculation
  const stats = useMemo(() => {
    let invoicedThisMonthCount = 0;
    Object.values(invoicesMap).forEach(inv => {
      const dateStr = inv?.invoiceDate || (inv as any)?.tranDate || (inv as any)?.createdAt;
      if (dateStr && String(dateStr).startsWith(currentMonthPrefix)) {
        invoicedThisMonthCount++;
      }
    });

    return {
      totalSigned: companies.length,
      filteredCount: filteredCompanies.length,
      invoicedThisMonthCount,
    };
  }, [companies.length, filteredCompanies.length, invoicesMap, currentMonthPrefix]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Banner & Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#095c7b] to-[#127fa8] p-6 rounded-2xl text-white shadow-lg shadow-[#095c7b]/10 border border-[#095c7b]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#eaf143] text-[#095c7b] font-bold text-xs hover:bg-[#eaf143]/90">
              Admin & Superadmin
            </Badge>
            <span className="text-xs text-white/80 font-medium">Direct NetSuite Invoicing</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Customer Invoicing</h1>
          <p className="text-white/85 text-sm mt-1 max-w-2xl">
            Generate and dispatch NetSuite service invoices for signed customer accounts. Filter by franchisee, company name, or customer ID to quickly bill clients.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCompanies}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium transition-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Signed Customers</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.totalSigned.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Active customer accounts</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-[#095c7b] flex items-center justify-center font-bold">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filtered Customers</p>
              <h3 className="text-2xl font-bold text-[#095c7b] mt-1">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.filteredCount.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Matching active filters</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Filter className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Franchise Territories</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {loading ? <Skeleton className="h-8 w-16" /> : uniqueFranchisees.length}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Represented franchises</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Store className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Dialog Ready</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">1-Click</h3>
              <p className="text-xs text-slate-500 mt-0.5">Direct NetSuite generation</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#095c7b]" />
              <CardTitle className="text-base font-bold text-slate-800">Filter Signed Customers</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Franchisee Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-slate-400" />
                Franchisee
              </label>
              <Select
                value={filters.franchisee}
                onValueChange={(val) => {
                  setFilters(prev => ({ ...prev, franchisee: val }));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full h-9 bg-white border-slate-200">
                  <SelectValue placeholder="All Franchisees" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all" className="font-semibold text-slate-700">
                    All Franchisees ({companies.length})
                  </SelectItem>
                  {uniqueFranchisees.map(f => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name} ({f.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Company Name Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Company Name
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by company name..."
                  value={filters.companyName}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, companyName: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 bg-white border-slate-200"
                />
                {filters.companyName && (
                  <button 
                    onClick={() => {
                      setFilters(prev => ({ ...prev, companyName: '' }));
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Company ID / NetSuite ID Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                Company ID / NetSuite ID
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="e.g. 10425, CUST-1002..."
                  value={filters.companyId}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, companyId: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 bg-white border-slate-200"
                />
                {filters.companyId && (
                  <button 
                    onClick={() => {
                      setFilters(prev => ({ ...prev, companyId: '' }));
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signed Customers Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Signed Customers</span>
              <Badge variant="secondary" className="font-semibold bg-slate-100 text-slate-700">
                {filteredCompanies.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Select any customer below to generate an invoice with pre-populated services and rates.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Show</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[140px] font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Company ID
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Company Name & Suburb
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Franchisee
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Services Configured
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Last Invoice
                  </TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider w-[170px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48 mb-1" /><Skeleton className="h-3.5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Building2 className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-base">No customers found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          {hasActiveFilters 
                            ? 'No signed customers match your current filter criteria. Try adjusting or clearing filters.' 
                            : 'No signed customer records found in the database.'}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-3 text-xs"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((company) => {
                    const primaryId = company.entityId || company.prospectPlusId || company.internalId || company.internalid || company.id;
                    const addressStr = [company.address?.city || (company.address as any)?.suburb, company.address?.state].filter(Boolean).join(', ');
                    const lastInvoice = invoicesMap[company.id];
                    const hasServices = Array.isArray(company.services) && company.services.length > 0;
                    const invoiceDateStr = lastInvoice?.invoiceDate || (lastInvoice as any)?.tranDate || (lastInvoice as any)?.createdAt;
                    const invoiceTotalVal = lastInvoice?.invoiceTotal ?? (lastInvoice as any)?.totalAmount;

                    return (
                      <TableRow key={company.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Company ID */}
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200/80">
                              {primaryId}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleCopyId(primaryId)}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {copiedId === primaryId ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Copy ID
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>

                        {/* Company Name & Location */}
                        <TableCell>
                          <div className="flex flex-col">
                            <Link 
                              href={`/leads/${company.id}`}
                              className="font-bold text-slate-900 hover:text-[#095c7b] hover:underline flex items-center gap-1.5 text-sm"
                            >
                              {company.companyName}
                              <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              {addressStr && <span>{addressStr}</span>}
                              {company.abn && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-200 font-mono text-slate-600">
                                  ABN: {company.abn}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Franchisee */}
                        <TableCell>
                          {company.franchisee ? (
                            <Badge className="bg-sky-50 text-sky-800 hover:bg-sky-100 border-sky-200 font-medium text-xs">
                              {company.franchisee}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Services Configured */}
                        <TableCell>
                          {hasServices ? (
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {company.services!.slice(0, 2).map((srv: any, idx: number) => {
                                const title = typeof srv === 'string' ? srv : (srv.name || srv.serviceName || 'Service');
                                const rate = typeof srv === 'object' && srv.rate !== undefined ? `$${srv.rate}` : '';
                                return (
                                  <Badge key={idx} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 border-slate-200">
                                    {title} {rate && <span className="text-slate-500 ml-1 font-mono">({rate})</span>}
                                  </Badge>
                                );
                              })}
                              {company.services!.length > 2 && (
                                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                  +{company.services!.length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Default Services</span>
                          )}
                        </TableCell>

                        {/* Last Invoice */}
                        <TableCell>
                          {loadingInvoices && invoicesMap[company.id] === undefined ? (
                            <Skeleton className="h-4 w-20" />
                          ) : lastInvoice ? (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => {
                                  setSelectedInvoice(lastInvoice);
                                  setSelectedInvoiceCompany(company);
                                }}
                                className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#095c7b] hover:underline"
                              >
                                <Receipt className="h-3 w-3" />
                                {lastInvoice.invoiceDocumentID || lastInvoice.documentId || lastInvoice.id || 'Invoice'}
                              </button>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>{safeFormatDate(invoiceDateStr)}</span>
                                {invoiceTotalVal !== undefined && (
                                  <span className="font-bold text-slate-700">
                                    ${Number(invoiceTotalVal).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No invoices</span>
                          )}
                        </TableCell>

                        {/* Action Button */}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => setCreateInvoiceCompany(company)}
                            className="bg-[#095c7b] hover:bg-[#084c66] text-white font-medium text-xs shadow-sm h-8 px-3"
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-[#eaf143]" />
                            Create Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredCompanies.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-800">{Math.min(filteredCompanies.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                <span className="font-semibold text-slate-800">{Math.min(filteredCompanies.length, currentPage * pageSize)}</span> of{' '}
                <span className="font-semibold text-slate-800">{filteredCompanies.length}</span> customers
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-2 text-xs font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <InvoiceDetailsDialog
          isOpen={Boolean(selectedInvoice)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedInvoice(null);
              setSelectedInvoiceCompany(null);
            }
          }}
          invoice={selectedInvoice}
          companyName={selectedInvoiceCompany?.companyName}
          companyAbn={selectedInvoiceCompany?.abn}
          companyAddress={selectedInvoiceCompany?.address}
        />
      )}

      {/* Create Invoice Dialog */}
      {createInvoiceCompany && (
        <CreateInvoiceDialog
          open={Boolean(createInvoiceCompany)}
          onOpenChange={(open) => {
            if (!open) setCreateInvoiceCompany(null);
          }}
          company={createInvoiceCompany}
          onInvoiceCreated={(invoiceId) => {
            toast({
              title: 'Invoice Created Successfully',
              description: `NetSuite invoice ${invoiceId} has been created for ${createInvoiceCompany.companyName}.`,
            });
            // Refetch recent invoice for this company
            getLastInvoicesForCompanies([createInvoiceCompany.id]).then(res => {
              setInvoicesMap(prev => ({ ...prev, ...res }));
            });
            setCreateInvoiceCompany(null);
          }}
        />
      )}
    </div>
  );
}
