"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, TrendingUp, CheckCircle, Download, ExternalLink, Info, Search, AlertTriangle, Building, User, PlayCircle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PrevMonthCohortSummary, CohortCustomerDetail } from '@/lib/mrr-realization';
import Link from 'next/link';

const SectionHelp = ({ content }: { content: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        type="button" 
        className="inline-flex items-center justify-center rounded-full w-4 h-4 text-slate-400 hover:text-[#095c7b] hover:bg-[#095c7b]/10 transition-colors focus:outline-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="h-3 w-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-3 text-xs space-y-1.5 shadow-lg border bg-popover text-popover-foreground z-50 leading-relaxed font-normal" onClick={(e) => e.stopPropagation()}>
      {content}
    </PopoverContent>
  </Popover>
);

interface PrevMonthCohortWidgetProps {
  summary: PrevMonthCohortSummary;
  className?: string;
  loading?: boolean;
}

export function PrevMonthCohortWidget({ summary, className = '', loading = false }: PrevMonthCohortWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { prevMonthName, signedCount, contractedMrr, actualInvoicedTotal, realizationYield, cohortDetails } = summary;

  // Realization Yield Badge Styling
  const yieldBadgeConfig = useMemo(() => {
    if (realizationYield >= 90) {
      return { label: 'High Realization Yield', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };
    }
    if (realizationYield >= 75) {
      return { label: 'Moderate Yield', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
    }
    return { label: 'Needs Billing Focus', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' };
  }, [realizationYield]);

  // Filtered Cohort Details for Modal
  const filteredDetails = useMemo(() => {
    return cohortDetails.filter((item) => {
      const matchesSearch = 
        !searchQuery ||
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.repName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ||
        item.billingStatus.toLowerCase().replace(' ', '_') === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cohortDetails, searchQuery, statusFilter]);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (cohortDetails.length === 0) return;

    const headers = [
      "Company Name",
      "Commencement Date",
      "Sign Date",
      "Assigned Rep / AM",
      "Status",
      "Contracted MRR ($)",
      "Actual Billed Invoices ($)",
      "Variance ($)",
      "Realization Yield (%)",
      "Billing Status"
    ];

    const rows = cohortDetails.map(item => [
      `"${item.companyName.replace(/"/g, '""')}"`,
      `"${item.commencementDate || 'N/A'}"`,
      `"${item.signedUpAt || 'N/A'}"`,
      `"${item.repName.replace(/"/g, '""')}"`,
      `"${item.status}"`,
      item.contractedMrr.toFixed(2),
      item.actualInvoiced.toFixed(2),
      item.variance.toFixed(2),
      item.variancePercentage.toFixed(1),
      `"${item.billingStatus}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Service_Commencement_Cohort_Realization_${prevMonthName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Card className={`border-[#095c7b]/20 shadow-md bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 overflow-hidden ${className}`}>
        <CardHeader className="pb-3 pt-4 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#095c7b]/10 bg-white/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-lg">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-[#095c7b]">
                  Service Commencement Realization Cohort ({prevMonthName})
                </CardTitle>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${yieldBadgeConfig.color}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${yieldBadgeConfig.dot}`} />
                  {realizationYield.toFixed(1)}% Realized ({yieldBadgeConfig.label})
                </Badge>
                <SectionHelp content={
                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-900 border-b pb-1">Service Commencement Cohort Performance</p>
                    <p>Tracks accounts whose <strong>Service Commencement Date</strong> fell in the target cohort window (<strong>{prevMonthName}</strong>), comparing contracted monthly recurring revenue (MRR) against <strong>actual invoices billed</strong>.</p>
                    <p className="text-slate-600">This section evaluates accounts by commencement date (ignoring page activity date window) while honoring active <strong>Franchisee, Account Manager, Bucket, and Rep</strong> filters.</p>
                  </div>
                } />
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Conversion yield &amp; billed revenue for accounts commencing services during {prevMonthName}.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white hover:bg-slate-50 text-[#095c7b] border-[#095c7b]/30 shadow-xs"
              onClick={() => setIsOpen(true)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Breakdown ({signedCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-600 hover:text-[#095c7b] hover:bg-white/80"
              onClick={handleExportCsv}
              title="Export Commencement Cohort Report"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Commenced Accounts */}
            <div 
              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-[#095c7b]/40 hover:shadow-sm transition-all group"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commenced Accounts</span>
                <div className="p-1.5 bg-sky-50 text-sky-700 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-800">{signedCount}</span>
                <span className="text-[11px] text-slate-500 font-medium">Last 3 Months</span>
              </div>
              <p className="text-[11px] text-sky-700 mt-1 flex items-center font-medium group-hover:underline">
                View commenced accounts <ExternalLink className="h-3 w-3 ml-1" />
              </p>
            </div>

            {/* Stat 2: Contracted MRR */}
            <div 
              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-[#095c7b]/40 hover:shadow-sm transition-all"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contracted MRR</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-[#095c7b]">
                  ${contractedMrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Commenced monthly value
              </p>
            </div>

            {/* Stat 3: Actual Invoiced */}
            <div 
              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-[#095c7b]/40 hover:shadow-sm transition-all"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Invoiced Value</span>
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900">
                  ${actualInvoicedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Billed invoices created ({prevMonthName})
              </p>
            </div>

            {/* Stat 4: Realization Yield */}
            <div 
              className={`p-3.5 bg-white rounded-xl border shadow-xs cursor-pointer hover:shadow-sm transition-all ${
                realizationYield >= 90 ? 'border-emerald-200 hover:border-emerald-400' : realizationYield >= 75 ? 'border-amber-200 hover:border-amber-400' : 'border-rose-200 hover:border-rose-400'
              }`}
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR Realization Yield</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${yieldBadgeConfig.color}`}>
                  {realizationYield.toFixed(1)}%
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-extrabold ${
                  realizationYield >= 90 ? 'text-emerald-700' : realizationYield >= 75 ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {realizationYield.toFixed(1)}%
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {summary.varianceTotal >= 0 ? `+$${summary.varianceTotal.toFixed(0)}` : `-$${Math.abs(summary.varianceTotal).toFixed(0)}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Actual vs Contracted MRR Variance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Breakdown Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-[#095c7b] flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#095c7b]" />
                  Service Commencement Cohort Breakdown ({prevMonthName})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Detailed list of all {signedCount} accounts whose service commenced during the last 3 months ({prevMonthName}), showing contracted MRR vs actual billed invoices.
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCsv}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </DialogHeader>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-b">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search company, rep, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500">Billing Filter:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({cohortDetails.length})</SelectItem>
                  <SelectItem value="unbilled">Unbilled ({cohortDetails.filter(c => c.billingStatus === 'Unbilled').length})</SelectItem>
                  <SelectItem value="partially_billed">Partially Billed ({cohortDetails.filter(c => c.billingStatus === 'Partially Billed').length})</SelectItem>
                  <SelectItem value="fully_billed">Fully Billed ({cohortDetails.filter(c => c.billingStatus === 'Fully Billed').length})</SelectItem>
                  <SelectItem value="over_billed">Over Billed ({cohortDetails.filter(c => c.billingStatus === 'Over Billed').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table View */}
          <div className="flex-1 overflow-hidden my-2">
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table className="w-full text-xs">
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-semibold">Company / Business</TableHead>
                    <TableHead className="font-semibold">Rep / AM</TableHead>
                    <TableHead className="font-semibold">Commencement Date</TableHead>
                    <TableHead className="font-semibold">Sign Date</TableHead>
                    <TableHead className="text-right font-semibold">Contracted MRR</TableHead>
                    <TableHead className="text-right font-semibold">Actual Invoiced</TableHead>
                    <TableHead className="text-right font-semibold">Variance</TableHead>
                    <TableHead className="text-center font-semibold">Billing Status</TableHead>
                    <TableHead className="text-right font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDetails.length > 0 ? (
                    filteredDetails.map((item) => {
                      let badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
                      if (item.billingStatus === 'Fully Billed') badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                      if (item.billingStatus === 'Partially Billed') badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                      if (item.billingStatus === 'Unbilled') badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                      if (item.billingStatus === 'Over Billed') badgeStyle = "bg-purple-100 text-purple-800 border-purple-300";

                      return (
                        <TableRow key={item.leadId} className="hover:bg-slate-50/80">
                          <TableCell className="font-medium text-slate-900">
                            <Link href={`/leads/${item.leadId}`} target="_blank" className="hover:text-[#095c7b] hover:underline flex items-center gap-1.5">
                              <span>{item.companyName}</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{item.repName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 font-mono text-[11px]">
                            <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">
                              {item.commencementDate || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono text-[11px]">
                            {item.signedUpAt ? item.signedUpAt.substring(0, 10) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#095c7b]">
                            ${item.contractedMrr.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            ${item.actualInvoiced.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {item.variance >= 0 ? `+$${item.variance.toFixed(2)}` : `-$${Math.abs(item.variance).toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${badgeStyle}`}>
                              {item.billingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/leads/${item.leadId}`} target="_blank">
                              <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-[#095c7b]">
                                View Profile
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500 text-xs">
                        No commenced accounts match the selected filters for {prevMonthName}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Modal Footer Summary */}
          <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border mt-2">
            <div className="flex items-center gap-4 text-slate-700">
              <span><strong>Showing:</strong> {filteredDetails.length} of {signedCount} commenced accounts</span>
              <span><strong>Total Contracted:</strong> ${contractedMrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span><strong>Total Billed:</strong> ${actualInvoicedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
