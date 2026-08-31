'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { getLeadsFromFirebase, updateLeadSingleBucket } from '@/services/firebase';
import type { Lead, LeadBucket } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ListChecks,
  X,
  Filter,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn, parseDateString } from '@/lib/utils';
import { formatBucketLabel } from '@/lib/lead-stage-analytics';

export const BUCKET_OPTIONS: { value: string; label: string }[] = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'field_sales', label: 'Field Sales' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'lpo_network', label: 'LPO Network' },
  { value: 'lpo_plus', label: 'LPO Plus' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'multisite', label: 'Multi-site' },
];

export function BulkBucketUpdater() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [amFilter, setAmFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);
  const [franchiseeFilter, setFranchiseeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(100);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [targetBucket, setTargetBucket] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeadsFromFirebase({ summary: true });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leads.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Reset pagination to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [debouncedSearchTerm, statusFilter, bucketFilter, amFilter, dialerFilter, franchiseeFilter, dateRange, pageSize]);

  // Unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(items.map(item => item.status).filter(Boolean));
    const list = Array.from(statuses).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Status' }];
  }, [items]);

  const uniqueBuckets = useMemo(() => {
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets).map(b => ({
      value: b!,
      label: formatBucketLabel(b!)
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Bucket' }];
  }, [items]);

  const uniqueAMs = useMemo(() => {
    const ams = new Set(items.map(item => item.accountManagerAssigned).filter(Boolean));
    const list = Array.from(ams).map(am => ({ value: am!, label: am! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const uniqueDialers = useMemo(() => {
    const dialers = new Set(items.map(item => item.dialerAssigned).filter(Boolean));
    const list = Array.from(dialers).map(d => ({ value: d!, label: d! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const uniqueFranchisees = useMemo(() => {
    const franchisees = new Set(items.map(item => item.franchisee).filter(Boolean));
    const list = Array.from(franchisees).map(f => ({ value: f!, label: f! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search term match
      if (debouncedSearchTerm) {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        const matchesName = item.companyName.toLowerCase().includes(lowerSearch);
        const matchesId = item.id.toLowerCase().includes(lowerSearch);
        const matchesEntityId = item.entityId?.toLowerCase().includes(lowerSearch);
        const matchesCustomerEntityId = item.customerEntityId?.toLowerCase().includes(lowerSearch);
        const matchesProspectPlusId = item.prospectPlusId?.toLowerCase().includes(lowerSearch);
        const matchesNetsuiteId = (item as any).netsuiteId?.toString().toLowerCase().includes(lowerSearch);
        const matchesInternalId = (item as any).internalid?.toString().toLowerCase().includes(lowerSearch) || (item as any).internalId?.toString().toLowerCase().includes(lowerSearch);
        if (!matchesName && !matchesId && !matchesEntityId && !matchesCustomerEntityId && !matchesProspectPlusId && !matchesNetsuiteId && !matchesInternalId) return false;
      }

      // Status match
      if (statusFilter.length > 0) {
        const statusVal = item.status || 'none';
        if (!statusFilter.includes(statusVal)) return false;
      }

      // Bucket match
      if (bucketFilter.length > 0) {
        const bucketVal = item.bucket || 'none';
        if (!bucketFilter.includes(bucketVal)) return false;
      }

      // AM match
      if (amFilter.length > 0) {
        const amVal = item.accountManagerAssigned || 'none';
        if (!amFilter.includes(amVal)) return false;
      }

      // Dialer match
      if (dialerFilter.length > 0) {
        const dialerVal = item.dialerAssigned || 'none';
        if (!dialerFilter.includes(dialerVal)) return false;
      }

      // Franchisee match
      if (franchiseeFilter.length > 0) {
        const franchiseeVal = item.franchisee || 'none';
        if (!franchiseeFilter.includes(franchiseeVal)) return false;
      }

      // Date match (Date lead created)
      if (dateRange?.from) {
        const leadDate = parseDateString(item.dateLeadEntered);
        if (!leadDate) return false;
        
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        if (leadDate < start || leadDate > end) return false;
      }

      return true;
    });
  }, [items, debouncedSearchTerm, statusFilter, bucketFilter, amFilter, dialerFilter, franchiseeFilter, dateRange]);

  const hasActiveFilters = useMemo(() => {
    return (
      !!debouncedSearchTerm ||
      statusFilter.length > 0 ||
      bucketFilter.length > 0 ||
      amFilter.length > 0 ||
      dialerFilter.length > 0 ||
      franchiseeFilter.length > 0 ||
      !!dateRange?.from
    );
  }, [debouncedSearchTerm, statusFilter, bucketFilter, amFilter, dialerFilter, franchiseeFilter, dateRange]);

  // Pagination logic
  const effectivePageSize = useMemo(() => {
    if (pageSize === 'all') return Math.max(1, filteredItems.length);
    return typeof pageSize === 'number' ? pageSize : (parseInt(String(pageSize), 10) || 100);
  }, [pageSize, filteredItems.length]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, filteredItems.length);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const displayedItemIds = useMemo(() => displayedItems.map(i => i.id), [displayedItems]);
  const filteredItemIds = useMemo(() => filteredItems.map(i => i.id), [filteredItems]);

  // Checkbox Selection States
  const isAllCurrentPageSelected = displayedItemIds.length > 0 && displayedItemIds.every(id => selectedItems.includes(id));
  const isSomeCurrentPageSelected = displayedItemIds.some(id => selectedItems.includes(id)) && !isAllCurrentPageSelected;
  const isAllMatchingSelected = filteredItemIds.length > 0 && selectedItems.length === filteredItemIds.length;

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleToggleSelectCurrentPage = (checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => Array.from(new Set([...prev, ...displayedItemIds])));
    } else {
      setSelectedItems(prev => prev.filter(id => !displayedItemIds.includes(id)));
    }
  };

  const handleSelectAllMatching = () => {
    setSelectedItems(filteredItemIds);
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Page',
        description: `Please enter a valid page number between 1 and ${totalPages}.`
      });
    }
  };

  // Single Lead Bucket Update
  const handleSingleBucketUpdate = async (leadId: string, newBucket: string) => {
    try {
      await updateLeadSingleBucket(leadId, newBucket, 'Data Management single bucket update', { source: 'data_management', isDataManagement: true });
      setItems(prev =>
        prev.map(item => (item.id === leadId ? { ...item, bucket: newBucket as LeadBucket, fieldSales: newBucket === 'field_sales' } : item))
      );
      toast({
        title: 'Bucket Updated',
        description: `Successfully updated bucket to ${formatBucketLabel(newBucket)}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update lead bucket.',
      });
    }
  };

  // Chunked Bulk Bucket Update
  const handleBulkBucketUpdate = async () => {
    if (selectedItems.length === 0 || !targetBucket) return;
    setUpdating(true);
    setUpdateProgress({ current: 0, total: selectedItems.length });

    const CHUNK_SIZE = 50;
    const selectedSet = new Set(selectedItems);
    let completedCount = 0;

    try {
      for (let i = 0; i < selectedItems.length; i += CHUNK_SIZE) {
        const chunk = selectedItems.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(leadId =>
            updateLeadSingleBucket(leadId, targetBucket, 'Data Management bulk bucket update', { source: 'data_management', isDataManagement: true })
          )
        );
        completedCount += chunk.length;
        setUpdateProgress({ current: completedCount, total: selectedItems.length });
      }

      setItems(prev =>
        prev.map(item => (selectedSet.has(item.id) ? { ...item, bucket: targetBucket as LeadBucket, fieldSales: targetBucket === 'field_sales' } : item))
      );

      toast({
        title: 'Bulk Update Complete',
        description: `Successfully moved ${selectedItems.length} leads to bucket "${formatBucketLabel(targetBucket)}".`,
      });

      setSelectedItems([]);
      setTargetBucket('');
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error during bulk update',
        description: 'Some lead buckets could not be updated. Please try again.',
      });
    } finally {
      setUpdating(false);
      setUpdateProgress(null);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setBucketFilter([]);
    setAmFilter([]);
    setDialerFilter([]);
    setFranchiseeFilter([]);
    setDateRange(undefined);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Multi-Select Filter Controls */}
      <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filter Leads for Bucket Reassignment</h3>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                Filters Active
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company, ID, ProspectPlus ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Status Filter */}
          <MultiSelectCombobox
            options={uniqueStatuses}
            selected={statusFilter}
            onSelectedChange={setStatusFilter}
            placeholder="Filter by Status..."
          />

          {/* Current Bucket Filter */}
          <MultiSelectCombobox
            options={uniqueBuckets}
            selected={bucketFilter}
            onSelectedChange={setBucketFilter}
            placeholder="Filter by Current Bucket..."
          />

          {/* Account Manager Filter */}
          <MultiSelectCombobox
            options={uniqueAMs}
            selected={amFilter}
            onSelectedChange={setAmFilter}
            placeholder="Filter by Account Manager..."
          />

          {/* Dialer Filter */}
          <MultiSelectCombobox
            options={uniqueDialers}
            selected={dialerFilter}
            onSelectedChange={setDialerFilter}
            placeholder="Filter by Dialer Assigned..."
          />

          {/* Franchisee Filter */}
          <MultiSelectCombobox
            options={uniqueFranchisees}
            selected={franchiseeFilter}
            onSelectedChange={setFranchiseeFilter}
            placeholder="Filter by Franchisee..."
          />

          {/* Date Created Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal text-sm w-full',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Created Date Range...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Selection Summary & Action Bar */}
      {selectedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-lg border bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4" />
              {selectedItems.length.toLocaleString()} {selectedItems.length === 1 ? 'lead' : 'leads'} selected
            </span>

            {!isAllMatchingSelected && filteredItems.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAllMatching}
                className="h-8 text-xs bg-primary/10 border-primary/30 hover:bg-primary/20 text-primary font-medium"
              >
                <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                Select all {filteredItems.length.toLocaleString()} matching leads
              </Button>
            )}

            {isAllMatchingSelected && (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-medium text-xs">
                All {filteredItems.length.toLocaleString()} matching leads selected across all pages
              </Badge>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDeselectAll}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear Selection
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select value={targetBucket} onValueChange={setTargetBucket} disabled={updating}>
              <SelectTrigger className="w-full sm:w-[200px] text-sm bg-background">
                <SelectValue placeholder="Select Target Bucket" />
              </SelectTrigger>
              <SelectContent>
                {BUCKET_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkBucketUpdate}
              disabled={selectedItems.length === 0 || !targetBucket || updating}
              className="flex items-center gap-2 font-medium"
            >
              {updating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Updating {updateProgress?.current}/{updateProgress?.total}...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Move to Bucket ({selectedItems.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isSomeCurrentPageSelected ? 'indeterminate' : false}
                  onCheckedChange={handleToggleSelectCurrentPage}
                  aria-label="Select all on current page"
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Company Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Bucket</TableHead>
              <TableHead>Account Manager</TableHead>
              <TableHead>Dialer Assigned</TableHead>
              <TableHead>Franchisee</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead className="text-right min-w-[180px]">Change Bucket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No leads found matching the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              displayedItems.map(item => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <TableRow key={item.id} className={cn(isSelected && 'bg-muted/40')}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={checked => handleSelectItem(item.id, Boolean(checked))}
                        aria-label={`Select ${item.companyName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <div>{item.companyName}</div>
                      {item.prospectPlusId && (
                        <div className="text-xs text-muted-foreground font-mono">{item.prospectPlusId}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.status || 'New'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      <Badge variant="secondary" className="text-xs">
                        {formatBucketLabel(item.bucket || 'outbound')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.accountManagerAssigned || 'Unassigned'}</TableCell>
                    <TableCell className="text-sm">{item.dialerAssigned || 'Unassigned'}</TableCell>
                    <TableCell className="text-sm">{item.franchisee || 'Unassigned'}</TableCell>
                    <TableCell className="text-sm">
                      {item.dateLeadEntered ? format(parseDateString(item.dateLeadEntered) || new Date(), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={item.bucket || 'outbound'}
                        onValueChange={newBkt => handleSingleBucketUpdate(item.id, newBkt)}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs ml-auto">
                          <SelectValue placeholder="Select bucket" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {BUCKET_OPTIONS.map(b => (
                            <SelectItem key={b.value} value={b.value} className="text-xs">
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {filteredItems.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredItems.length} leads</span>
          <span className="mx-1">•</span>
          <span>Page {safeCurrentPage} of {totalPages}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show</span>
            <Select
              value={String(pageSize)}
              onValueChange={val => setPageSize(val === 'all' ? 'all' : parseInt(val, 10))}
            >
              <SelectTrigger className="h-8 w-[80px] text-xs">
                <SelectValue placeholder="100" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100" className="text-xs">100</SelectItem>
                <SelectItem value="250" className="text-xs">250</SelectItem>
                <SelectItem value="500" className="text-xs">500</SelectItem>
                <SelectItem value="all" className="text-xs">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Jump to Page Form */}
            <form onSubmit={handleJumpPage} className="flex items-center gap-1 mx-1">
              <Input
                type="number"
                placeholder={String(safeCurrentPage)}
                value={jumpPageInput}
                onChange={e => setJumpPageInput(e.target.value)}
                className="h-8 w-14 text-center text-xs p-1"
                min={1}
                max={totalPages}
              />
            </form>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
