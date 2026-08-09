'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { getLeadsFromFirebase, bulkUpdateDialerAssignmentDate } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ListChecks, 
  X, 
  CheckSquare, 
  Filter 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn, parseDateString } from '@/lib/utils';

export function DialerAssignmentDateUpdater() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseeFilter, setFranchiseeFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(100);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newAssignmentDate, setNewAssignmentDate] = useState<Date | undefined>(new Date());
  const [updating, setUpdating] = useState(false);

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
  }, [debouncedSearchTerm, franchiseeFilter, bucketFilter, dialerFilter, pageSize]);

  // Compute unique values for filters from items list
  const uniqueFranchisees = useMemo(() => {
    const franchisees = new Set(items.map(item => item.franchisee).filter(Boolean));
    const list = Array.from(franchisees).map(f => ({ value: f!, label: f! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const uniqueBuckets = useMemo(() => {
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets).map(b => ({
      value: b!,
      label: b === 'field_sales' ? 'Field Sales' : b!.charAt(0).toUpperCase() + b!.slice(1)
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Bucket' }];
  }, [items]);

  const uniqueDialers = useMemo(() => {
    const dialers = new Set(items.map(item => item.dialerAssigned).filter(Boolean));
    const list = Array.from(dialers).map(d => ({ value: d!, label: d! })).sort((a, b) => a.label.localeCompare(b.label));
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
        if (!matchesName && !matchesId && !matchesEntityId) return false;
      }

      // Franchisee match
      if (franchiseeFilter.length > 0) {
        const franchiseeVal = item.franchisee || 'none';
        if (!franchiseeFilter.includes(franchiseeVal)) return false;
      }

      // Bucket match
      if (bucketFilter.length > 0) {
        const bucketVal = item.bucket || 'none';
        if (!bucketFilter.includes(bucketVal)) return false;
      }

      // Dialer match
      if (dialerFilter.length > 0) {
        const dialerVal = item.dialerAssigned || 'none';
        if (!dialerFilter.includes(dialerVal)) return false;
      }

      return true;
    });
  }, [items, debouncedSearchTerm, franchiseeFilter, bucketFilter, dialerFilter]);

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

  const handleSelectCurrentPageOnly = () => {
    setSelectedItems(displayedItemIds);
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

  // Bulk Assignment Date Update
  const handleBulkDateUpdate = async () => {
    if (selectedItems.length === 0 || !newAssignmentDate) return;
    setUpdating(true);
    try {
      const isoDate = newAssignmentDate.toISOString();
      await bulkUpdateDialerAssignmentDate(selectedItems, isoDate);
      setItems(prev =>
        prev.map(item =>
          selectedItems.includes(item.id) ? { ...item, assignedToDialerAt: isoDate } : item
        )
      );
      toast({
        title: 'Bulk Update Successful',
        description: `Successfully updated Dialer Assignment Date for ${selectedItems.length.toLocaleString()} leads.`,
      });
      setSelectedItems([]);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to perform bulk date update.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFranchiseeFilter([]);
    setBucketFilter([]);
    setDialerFilter([]);
  };

  return (
    <div className="space-y-6">
      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Name/ID</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-10"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Franchisee */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Franchisee</label>
          <MultiSelectCombobox
            options={uniqueFranchisees}
            selected={franchiseeFilter}
            onSelectedChange={setFranchiseeFilter}
            placeholder="Select Franchisees"
          />
        </div>

        {/* Lead Bucket */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bucket</label>
          <MultiSelectCombobox
            options={uniqueBuckets}
            selected={bucketFilter}
            onSelectedChange={setBucketFilter}
            placeholder="Select Buckets"
          />
        </div>

        {/* Dialer */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dialer Assigned</label>
          <MultiSelectCombobox
            options={uniqueDialers}
            selected={dialerFilter}
            onSelectedChange={setDialerFilter}
            placeholder="Select Dialers"
          />
        </div>

        {/* Clear Filters & Count Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between md:col-span-4 gap-4 mt-2 pt-4 border-t">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-muted-foreground">
              Total Filtered Leads: <span className="text-primary font-bold">{filteredItems.length.toLocaleString()}</span>
            </span>
            {filteredItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllMatching}
                  disabled={isAllMatchingSelected}
                  className="h-8 text-xs font-medium"
                >
                  <CheckSquare className="mr-1 h-3.5 w-3.5" />
                  Select All {filteredItems.length.toLocaleString()} Matching Leads
                </Button>
                {selectedItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={clearFilters} className="h-10 border border-dashed hover:border-solid w-full sm:w-auto">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bulk Date Update Card */}
      {selectedItems.length > 0 && (
        <div className="p-4 bg-muted/40 rounded-lg border border-primary/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 animate-bounce" />
              <span className="font-semibold text-sm">
                {selectedItems.length.toLocaleString()} Lead(s) Selected for Date Update
              </span>
            </div>
            {isAllMatchingSelected && (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-medium text-xs">
                All {filteredItems.length.toLocaleString()} matching leads selected across all pages
              </Badge>
            )}
          </div>

          <div className="flex flex-1 sm:flex-initial items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[220px] justify-start text-left font-normal h-10 bg-background",
                    !newAssignmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {newAssignmentDate ? format(newAssignmentDate, "PPP") : <span>Pick Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[70]" align="start">
                <Calendar
                  mode="single"
                  selected={newAssignmentDate}
                  onSelect={setNewAssignmentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button 
              onClick={handleBulkDateUpdate} 
              disabled={updating || !newAssignmentDate}
              className="shrink-0 font-medium"
            >
              {updating ? <Loader /> : `Apply Date (${selectedItems.length.toLocaleString()})`}
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Gmail-style Select All Across Pages Banner */}
      {!loading && isAllCurrentPageSelected && filteredItems.length > displayedItems.length && (
        <div className="px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-md text-xs flex items-center justify-between flex-wrap gap-2 transition-all">
          {isAllMatchingSelected ? (
            <div className="flex items-center gap-2 text-primary font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>All <strong>{filteredItems.length.toLocaleString()}</strong> matching leads across all <strong>{totalPages}</strong> pages are selected.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-foreground">
              <span>All <strong>{displayedItems.length}</strong> leads on page <strong>{safeCurrentPage}</strong> are selected.</span>
              <Button
                variant="link"
                size="sm"
                onClick={handleSelectAllMatching}
                className="h-auto p-0 text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                Select all {filteredItems.length.toLocaleString()} leads matching search results
              </Button>
            </div>
          )}
          {isAllMatchingSelected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Selection
            </Button>
          )}
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-md border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllMatchingSelected ? true : (isAllCurrentPageSelected ? true : (isSomeCurrentPageSelected ? 'indeterminate' : false))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleSelectCurrentPage(true);
                    } else {
                      handleDeselectAll();
                    }
                  }}
                  aria-label="Select all items on current page"
                />
              </TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Franchisee</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead>Dialer Assigned</TableHead>
              <TableHead>Date Entered</TableHead>
              <TableHead>Dialer Assignment Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader />
                    <span>Loading leads...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayedItems.length > 0 ? (
              displayedItems.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <TableRow key={item.id} data-state={isSelected && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      <div className="flex flex-col">
                        <span>{item.companyName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.franchisee || 'N/A'}</TableCell>
                    <TableCell className="capitalize text-sm">{item.bucket || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{item.dialerAssigned || 'Unassigned'}</TableCell>
                    <TableCell className="text-sm font-mono">{item.dateLeadEntered || '-'}</TableCell>
                    <TableCell className="text-sm font-mono text-amber-600 font-bold">
                      {item.assignedToDialerAt ? format(new Date(item.assignedToDialerAt), "yyyy-MM-dd") : 'Not Set'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                  No leads match your selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Table Pagination Footer */}
        {!loading && filteredItems.length > 0 && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="font-medium text-foreground">{startIndex + 1}</strong> to{' '}
                <strong className="font-medium text-foreground">{endIndex}</strong> of{' '}
                <strong className="font-medium text-foreground">{filteredItems.length.toLocaleString()}</strong> results
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2">
                <span className="font-medium">Per page:</span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(val) => setPageSize(val === 'all' ? 'all' : Number(val))}
                >
                  <SelectTrigger className="h-8 w-[90px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="all">All ({filteredItems.length.toLocaleString()})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direct Jump to Page Form */}
              {pageSize !== 'all' && totalPages > 1 && (
                <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 border-l border-border/60 pl-4">
                  <span className="font-medium text-xs">Go to:</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={safeCurrentPage.toString()}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    className="h-8 w-14 text-xs px-2 text-center"
                  />
                  <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs px-2 font-medium">
                    Go
                  </Button>
                </form>
              )}

              {/* Page navigation controls */}
              {pageSize !== 'all' && (
                <div className="flex items-center gap-1 border-l border-border/60 pl-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="h-8 w-8 p-0"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="h-8 w-8 p-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="font-medium text-foreground px-2 whitespace-nowrap">
                    Page {safeCurrentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

