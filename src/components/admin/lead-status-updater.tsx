'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { getLeadsFromFirebase, updateLeadStatus } from '@/services/firebase';
import type { Lead, LeadStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Search, Calendar as CalendarIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn, parseDateString } from '@/lib/utils';

const LEAD_STATUSES: LeadStatus[] = [
  'New', 'Hot Lead', 'Priority Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch',
  'Trialing ShipMate', 'Reschedule', 'Qualified', 'Pre Qualified', 'Won', 'Lost',
  'Lost Customer', 'LPO Review', 'Unqualified', 'LocalMile Pending', 'LocalMile Opportunity',
  'Trialing LocalMile', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity',
  'Priority Field Lead', 'Email Brush Off', 'In Qualification', 'Quote Sent', 'Quote Accepted',
  'Out of Territory', 'Future Follow-up'
];

export function LeadStatusUpdater() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [amFilter, setAmFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
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

  // Compute unique values for filters from items list
  const uniqueSources = useMemo(() => {
    const sources = new Set(items.map(item => item.customerSource).filter(Boolean));
    const list = Array.from(sources).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Source' }];
  }, [items]);

  const uniqueBuckets = useMemo(() => {
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets).map(b => ({
      value: b!,
      label: b === 'field_sales' ? 'Field Sales' : b!.charAt(0).toUpperCase() + b!.slice(1)
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

      // Source match
      if (sourceFilter.length > 0) {
        const sourceVal = item.customerSource || 'none';
        if (!sourceFilter.includes(sourceVal)) return false;
      }

      // Bucket match
      if (bucketFilter.length > 0) {
        const bucketVal = item.bucket || 'none';
        if (!bucketFilter.includes(bucketVal)) return false;
      }

      // Status match
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(item.status)) return false;
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

      // Date match
      if (dateRange?.from) {
        const leadDate = parseDateString(item.dateLeadEntered);
        if (!leadDate) return false;
        
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        if (leadDate < start || leadDate > end) return false;
      }

      return true;
    });
  }, [items, debouncedSearchTerm, sourceFilter, bucketFilter, statusFilter, amFilter, dialerFilter, dateRange]);

  // Selections
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? filteredItems.slice(0, 100).map(i => i.id) : []);
  };

  const isAllSelected = filteredItems.length > 0 && selectedItems.length === Math.min(filteredItems.length, 100);

  // Single Status Update
  const handleSingleStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      setItems(prev =>
        prev.map(item => (item.id === leadId ? { ...item, status: newStatus } : item))
      );
      toast({
        title: 'Status Updated',
        description: `Successfully updated status to ${newStatus}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update lead status.',
      });
    }
  };

  // Bulk Status Update
  const handleBulkStatusUpdate = async () => {
    if (selectedItems.length === 0 || !bulkStatus) return;
    setUpdating(true);
    try {
      await Promise.all(
        selectedItems.map(leadId => updateLeadStatus(leadId, bulkStatus as LeadStatus))
      );
      setItems(prev =>
        prev.map(item =>
          selectedItems.includes(item.id) ? { ...item, status: bulkStatus as LeadStatus } : item
        )
      );
      toast({
        title: 'Bulk Update Successful',
        description: `Successfully updated ${selectedItems.length} leads to status: ${bulkStatus}.`,
      });
      setSelectedItems([]);
      setBulkStatus('');
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to perform bulk status update.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSourceFilter([]);
    setBucketFilter([]);
    setStatusFilter([]);
    setAmFilter([]);
    setDialerFilter([]);
    setDateRange(undefined);
  };

  const leadStatusOptions: Option[] = LEAD_STATUSES.map(s => ({ value: s, label: s }));

  return (
    <div className="space-y-6">
      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        
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

        {/* Current Status */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Status</label>
          <MultiSelectCombobox
            options={leadStatusOptions}
            selected={statusFilter}
            onSelectedChange={setStatusFilter}
            placeholder="Select Statuses"
          />
        </div>

        {/* Lead Source */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</label>
          <MultiSelectCombobox
            options={uniqueSources}
            selected={sourceFilter}
            onSelectedChange={setSourceFilter}
            placeholder="Select Sources"
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

        {/* Account Manager */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Manager</label>
          <MultiSelectCombobox
            options={uniqueAMs}
            selected={amFilter}
            onSelectedChange={setAmFilter}
            placeholder="Select AMs"
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

        {/* Date Lead Entered */}
        <div className="space-y-2 xl:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Date Entered</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="start">
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

        {/* Clear Filters */}
        <div className="flex items-end">
          <Button variant="ghost" onClick={clearFilters} className="w-full h-10 border border-dashed hover:border-solid">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bulk Status Update Card */}
      {selectedItems.length > 0 && (
        <div className="p-4 bg-muted/40 rounded-lg border border-primary/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 animate-bounce" />
            <span className="font-medium text-sm">
              {selectedItems.length} Lead(s) Selected
            </span>
          </div>
          <div className="flex flex-1 sm:flex-initial items-center gap-2 w-full sm:w-auto">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-full sm:w-[220px] bg-background">
                <SelectValue placeholder="Select New Status" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {LEAD_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleBulkStatusUpdate} 
              disabled={updating || !bulkStatus}
              className="shrink-0"
            >
              {updating ? <Loader /> : 'Apply Status'}
            </Button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items on this page"
                />
              </TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>AM Assigned</TableHead>
              <TableHead>Dialer Assigned</TableHead>
              <TableHead>Date Entered</TableHead>
              <TableHead className="w-[200px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader />
                    <span>Loading leads...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length > 0 ? (
              filteredItems.slice(0, 100).map((item) => (
                <TableRow key={item.id} data-state={selectedItems.includes(item.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
                    <div className="flex flex-col">
                      <span>{item.companyName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{item.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{item.bucket || 'N/A'}</TableCell>
                  <TableCell className="text-sm">{item.customerSource || 'N/A'}</TableCell>
                  <TableCell className="text-sm">{item.accountManagerAssigned || 'Unassigned'}</TableCell>
                  <TableCell className="text-sm">{item.dialerAssigned || 'Unassigned'}</TableCell>
                  <TableCell className="text-sm font-mono">{item.dateLeadEntered || '-'}</TableCell>
                  <TableCell>
                    <Select 
                      value={item.status} 
                      onValueChange={(val) => handleSingleStatusUpdate(item.id, val as LeadStatus)}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {LEAD_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-sm">
                  No leads match your selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {filteredItems.length > 100 && (
          <div className="p-4 text-xs text-muted-foreground border-t bg-muted/10">
            Showing first 100 results. Refine your search filters to narrow down the records list.
          </div>
        )}
      </div>
    </div>
  );
}
