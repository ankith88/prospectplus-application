'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { CustomBulkSelectControl } from '@/components/ui/custom-bulk-select-control';
import { getLeadsFromFirebase, updateLeadAccountManager } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import type { Lead } from '@/lib/types';
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
  Users,
  Shuffle,
  UserCheck,
  CheckSquare,
  Building2,
  PhoneCall,
  PieChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn, parseDateString } from '@/lib/utils';
import { formatBucketLabel } from '@/lib/lead-stage-analytics';
import { collection, getDocs } from 'firebase/firestore';

export interface StaffUser {
  id: string;
  name: string;
  role?: string;
}

export const BUCKET_OPTIONS: Option[] = [
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

/**
 * Shuffles leadIds using Fisher-Yates algorithm and assigns them
 * in round-robin fashion across target assignees for equal, random distribution.
 */
function allocateLeadsRandomlyAndEqually(
  leadIds: string[],
  assigneeNames: string[]
): Record<string, string> {
  const allocation: Record<string, string> = {};
  if (assigneeNames.length === 0 || leadIds.length === 0) return allocation;

  if (assigneeNames.length === 1) {
    leadIds.forEach(id => {
      allocation[id] = assigneeNames[0];
    });
    return allocation;
  }

  // Fisher-Yates Shuffle
  const shuffledIds = [...leadIds];
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
  }

  // Round-robin equal allocation
  shuffledIds.forEach((id, index) => {
    allocation[id] = assigneeNames[index % assigneeNames.length];
  });

  return allocation;
}

export function BulkAccountManagerUpdater() {
  const [items, setItems] = useState<Lead[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [amFilter, setAmFilter] = useState<string[]>([]);
  const [franchiseeFilter, setFranchiseeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(100);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [targetAssignees, setTargetAssignees] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number } | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const fetchLeadsAndUsers = async () => {
    setLoading(true);
    try {
      const [leadsData, usersSnap] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getDocs(collection(firestore, 'users')).catch(() => ({ docs: [] }))
      ]);

      setItems(leadsData);

      const users: StaffUser[] = [];
      if ('docs' in usersSnap) {
        usersSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const name = (data.displayName || `${data.firstName || ''} ${data.lastName || ''}`).trim() || data.email || docSnap.id;
          if (name) {
            users.push({
              id: docSnap.id,
              name,
              role: data.activeRole || data.role
            });
          }
        });
      }
      setStaffUsers(users);
    } catch (error) {
      console.error('Failed to fetch leads or users:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load leads or user list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadsAndUsers();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [debouncedSearchTerm, bucketFilter, dialerFilter, statusFilter, amFilter, franchiseeFilter, dateRange, pageSize]);

  // Unique values for filter dropdowns
  const uniqueBuckets = useMemo(() => {
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets).map(b => ({
      value: b!,
      label: formatBucketLabel(b!)
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Bucket' }];
  }, [items]);

  const uniqueDialers = useMemo(() => {
    const dialerSet = new Set<string>();
    items.forEach(item => { if (item.dialerAssigned) dialerSet.add(item.dialerAssigned); });
    const list = Array.from(dialerSet).map(d => ({ value: d, label: d })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const uniqueStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    items.forEach(item => { if (item.customerStatus) statusSet.add(item.customerStatus); });
    const list = Array.from(statusSet).map(s => ({ value: s, label: s })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Status' }];
  }, [items]);

  const uniqueAMs = useMemo(() => {
    const amSet = new Set<string>();
    items.forEach(item => { if (item.accountManagerAssigned) amSet.add(item.accountManagerAssigned); });
    staffUsers.forEach(u => {
      const r = (u.role || '').toLowerCase();
      if (r.includes('account manager') || r.includes('am') || r.includes('admin') || r.includes('superadmin')) {
        amSet.add(u.name);
      }
    });
    const list = Array.from(amSet).map(am => ({ value: am, label: am })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items, staffUsers]);

  const uniqueFranchisees = useMemo(() => {
    const franSet = new Set<string>();
    items.forEach(item => { if (item.franchisee) franSet.add(item.franchisee); });
    const list = Array.from(franSet).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const targetAMOptions = useMemo(() => {
    const optionsMap = new Map<string, Option>();
    staffUsers.forEach(u => {
      optionsMap.set(u.name, { value: u.name, label: u.name });
    });
    items.forEach(item => {
      if (item.accountManagerAssigned && item.accountManagerAssigned !== 'Unassigned') {
        if (!optionsMap.has(item.accountManagerAssigned)) {
          optionsMap.set(item.accountManagerAssigned, {
            value: item.accountManagerAssigned,
            label: item.accountManagerAssigned
          });
        }
      }
    });
    return Array.from(optionsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [staffUsers, items]);

  // Filtered Leads
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

      // Customer Status match
      if (statusFilter.length > 0) {
        const statusVal = item.customerStatus || 'none';
        if (!statusFilter.includes(statusVal)) return false;
      }

      // Current AM match
      if (amFilter.length > 0) {
        const amVal = item.accountManagerAssigned || 'none';
        if (!amFilter.includes(amVal)) return false;
      }

      // Franchisee match
      if (franchiseeFilter.length > 0) {
        const franchiseeVal = item.franchisee || 'none';
        if (!franchiseeFilter.includes(franchiseeVal)) return false;
      }

      // Date Range match (dateLeadEntered)
      if (dateRange?.from) {
        if (!item.dateLeadEntered) return false;
        const leadDate = parseDateString(item.dateLeadEntered);
        if (!leadDate) return false;
        
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        if (leadDate < fromDate || leadDate > toDate) return false;
      }

      return true;
    });
  }, [items, debouncedSearchTerm, bucketFilter, dialerFilter, statusFilter, amFilter, franchiseeFilter, dateRange]);

  const allFilteredIds = useMemo(() => filteredItems.map(i => i.id), [filteredItems]);

  // Pagination calculation
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Selection state helpers
  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedItems.map(i => i.id);
      setSelectedItems(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedItems.map(i => i.id));
      setSelectedItems(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedItems.includes(i.id));

  // Single inline lead update
  const handleSingleReassign = async (leadId: string, newAM: string) => {
    try {
      await updateLeadAccountManager(leadId, newAM === 'none' ? null : newAM);
      setItems(prev => prev.map(item => item.id === leadId ? { ...item, accountManagerAssigned: newAM === 'none' ? undefined : newAM } : item));
      toast({
        title: 'Account Manager Updated',
        description: `Lead updated to ${newAM === 'none' ? 'Unassigned' : newAM}.`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update Account Manager.'
      });
    }
  };

  // Bulk Reassign operation
  const executeBulkReassign = async (leadIdsToUpdate: string[]) => {
    if (leadIdsToUpdate.length === 0) {
      toast({ variant: 'destructive', title: 'No leads selected', description: 'Please select at least one lead to reassign.' });
      return;
    }

    if (targetAssignees.length === 0) {
      toast({ variant: 'destructive', title: 'No Account Manager selected', description: 'Please select at least one target Account Manager.' });
      return;
    }

    const allocation = allocateLeadsRandomlyAndEqually(leadIdsToUpdate, targetAssignees);
    
    setUpdating(true);
    setUpdateProgress({ current: 0, total: leadIdsToUpdate.length });

    let successCount = 0;
    let failCount = 0;
    const chunkSize = 15;

    for (let i = 0; i < leadIdsToUpdate.length; i += chunkSize) {
      const chunk = leadIdsToUpdate.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (leadId) => {
          const am = allocation[leadId];
          try {
            await updateLeadAccountManager(leadId, am);
            successCount++;
          } catch (err) {
            console.error(`Failed to update ${leadId}:`, err);
            failCount++;
          }
        })
      );
      setUpdateProgress({ current: Math.min(i + chunkSize, leadIdsToUpdate.length), total: leadIdsToUpdate.length });
    }

    // Refresh lead list
    await fetchLeadsAndUsers();

    setUpdating(false);
    setUpdateProgress(null);
    setSelectedItems([]);

    if (failCount === 0) {
      toast({
        title: 'Bulk Reassignment Complete',
        description: `Successfully reassigned ${successCount} leads across ${targetAssignees.length} Account Manager(s).`
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Partial Completion',
        description: `Reassigned ${successCount} leads. ${failCount} failed.`
      });
    }
  };

  // Preview breakdown of equal allocation
  const allocationPreview = useMemo(() => {
    if (targetAssignees.length === 0 || selectedItems.length === 0) return null;
    const allocation = allocateLeadsRandomlyAndEqually(selectedItems, targetAssignees);
    const counts: Record<string, number> = {};
    targetAssignees.forEach(name => { counts[name] = 0; });
    Object.values(allocation).forEach(name => {
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [selectedItems, targetAssignees]);

  // Clear all filters
  const hasActiveFilters = Boolean(
    debouncedSearchTerm ||
    bucketFilter.length > 0 ||
    dialerFilter.length > 0 ||
    statusFilter.length > 0 ||
    amFilter.length > 0 ||
    franchiseeFilter.length > 0 ||
    dateRange
  );

  const clearFilters = () => {
    setSearchTerm('');
    setBucketFilter([]);
    setDialerFilter([]);
    setStatusFilter([]);
    setAmFilter([]);
    setFranchiseeFilter([]);
    setDateRange(undefined);
  };

  return (
    <div className="space-y-6">
      {/* FILTER BAR */}
      <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filter Leads</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Term */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name, Entity ID, Internal ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Bucket Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Bucket</label>
            <MultiSelectCombobox
              options={uniqueBuckets}
              selected={bucketFilter}
              onSelectedChange={setBucketFilter}
              placeholder="All Buckets"
              className="w-full"
            />
          </div>

          {/* Dialer Assigned Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Dialer Assigned</label>
            <MultiSelectCombobox
              options={uniqueDialers}
              selected={dialerFilter}
              onSelectedChange={setDialerFilter}
              placeholder="All Dialers"
              className="w-full"
            />
          </div>

          {/* Customer Status Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Customer Status</label>
            <MultiSelectCombobox
              options={uniqueStatuses}
              selected={statusFilter}
              onSelectedChange={setStatusFilter}
              placeholder="All Statuses"
              className="w-full"
            />
          </div>

          {/* Current Account Manager Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Current Account Manager</label>
            <MultiSelectCombobox
              options={uniqueAMs}
              selected={amFilter}
              onSelectedChange={setAmFilter}
              placeholder="All Account Managers"
              className="w-full"
            />
          </div>

          {/* Franchisee Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Franchisee</label>
            <MultiSelectCombobox
              options={uniqueFranchisees}
              selected={franchiseeFilter}
              onSelectedChange={setFranchiseeFilter}
              placeholder="All Franchisees"
              className="w-full"
            />
          </div>

          {/* Date Range Picker */}
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Date Entered Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full h-9 justify-start text-left font-normal text-xs',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
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

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Found <strong>{filteredItems.length}</strong> matching leads</span>
          {selectedItems.length > 0 && (
            <span className="text-primary font-medium">{selectedItems.length} leads currently selected</span>
          )}
        </div>
      </div>

      {/* BULK REASSIGNMENT CONTROL PANEL */}
      <div className="bg-muted/40 border border-primary/20 rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Reassign Account Managers
            </h3>
            <p className="text-xs text-muted-foreground">
              Select one or multiple target Account Managers. If multiple are selected, leads are randomly & equally distributed among them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Custom Bulk Select Control */}
            <CustomBulkSelectControl
              allAvailableIds={allFilteredIds}
              selectedIds={selectedItems}
              onSelect={setSelectedItems}
              onClear={() => setSelectedItems([])}
              label="Leads"
              compact={true}
            />

            {/* Target Account Managers Multi-Select */}
            <div className="w-64">
              <MultiSelectCombobox
                options={targetAMOptions}
                selected={targetAssignees}
                onSelectedChange={setTargetAssignees}
                placeholder="Select Target AM(s)..."
                className="w-full bg-background"
              />
            </div>

            {/* Action Buttons */}
            <Button
              disabled={selectedItems.length === 0 || targetAssignees.length === 0 || updating}
              onClick={() => executeBulkReassign(selectedItems)}
              className="h-9 text-xs gap-1.5"
            >
              {updating ? <Loader className="h-3.5 w-3.5" /> : <Shuffle className="h-3.5 w-3.5" />}
              Reassign Selected ({selectedItems.length})
            </Button>

            <Button
              variant="outline"
              disabled={allFilteredIds.length === 0 || targetAssignees.length === 0 || updating}
              onClick={() => executeBulkReassign(allFilteredIds)}
              className="h-9 text-xs gap-1.5 border-primary/40 hover:bg-primary/5"
            >
              Reassign All Filtered ({allFilteredIds.length})
            </Button>
          </div>
        </div>

        {/* EQUAL RANDOM DISTRIBUTION PREVIEW */}
        {targetAssignees.length > 0 && selectedItems.length > 0 && allocationPreview && (
          <div className="bg-background border rounded-md p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <PieChart className="h-3.5 w-3.5 text-primary" />
              <span>Random & Equal Distribution Breakdown ({selectedItems.length} leads across {targetAssignees.length} AMs):</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(allocationPreview).map(([name, count]) => (
                <Badge key={name} variant="secondary" className="px-2.5 py-1 text-xs gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{name}:</span> {count} lead{count !== 1 ? 's' : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar during updates */}
        {updateProgress && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Reassigning leads in progress...</span>
              <span>{updateProgress.current} / {updateProgress.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-200"
                style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* DATA TABLE & PAGINATION */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={handleSelectAllOnPage}
                    aria-label="Select page"
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">Lead / Company Name</TableHead>
                <TableHead className="min-w-[130px]">Customer Status</TableHead>
                <TableHead className="min-w-[130px]">Bucket</TableHead>
                <TableHead className="min-w-[140px]">Dialer Assigned</TableHead>
                <TableHead className="min-w-[160px]">Current Account Manager</TableHead>
                <TableHead className="min-w-[130px]">Franchisee</TableHead>
                <TableHead className="min-w-[180px]">Quick Reassign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader />
                      <span className="text-xs">Loading leads database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
                    No leads match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map(item => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <TableRow key={item.id} className={cn(isSelected && 'bg-primary/5')}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(prev => [...prev, item.id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{item.companyName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>ID: {item.id}</span>
                          {item.entityId && <span>• Entity: {item.entityId}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {item.customerStatus || 'Unassigned'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {formatBucketLabel(item.bucket || '')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {item.dialerAssigned || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">
                          {item.accountManagerAssigned || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {item.franchisee || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.accountManagerAssigned || 'none'}
                          onValueChange={(val) => handleSingleReassign(item.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Assign AM..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs text-muted-foreground">Unassigned</SelectItem>
                            {targetAMOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
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

        {/* PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-t gap-3 text-xs bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages} ({filteredItems.length} total leads)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={val => setPageSize(val === 'all' ? 'all' : Number(val))}
              >
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || pageSize === 'all'}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageSize === 'all'}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || pageSize === 'all'}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || pageSize === 'all'}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-muted-foreground">Jump:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={e => setJumpPageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const pageNum = parseInt(jumpPageInput, 10);
                      if (pageNum >= 1 && pageNum <= totalPages) {
                        setCurrentPage(pageNum);
                        setJumpPageInput('');
                      }
                    }
                  }}
                  placeholder="Page #"
                  className="h-7 w-16 text-xs text-center px-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
