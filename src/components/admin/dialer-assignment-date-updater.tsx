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
import { Search, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn, parseDateString } from '@/lib/utils';

export function DialerAssignmentDateUpdater() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [franchiseeFilter, setFranchiseeFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);

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

  // Selections
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? filteredItems.map(i => i.id) : []);
  };

  const isAllSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;

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
        description: `Successfully updated Dialer Assignment Date for ${selectedItems.length} leads.`,
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              Total Filtered Leads: <span className="text-primary font-bold">{filteredItems.length}</span>
            </span>
            {filteredItems.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedItems(filteredItems.map(i => i.id))}
                className="h-8 text-xs"
              >
                Select All {filteredItems.length} Leads
              </Button>
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
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="font-medium text-sm">
              {selectedItems.length} Lead(s) Selected for Date Update
            </span>
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
              className="shrink-0"
            >
              {updating ? <Loader /> : 'Apply Date'}
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
                  <TableCell className="text-sm">{item.franchisee || 'N/A'}</TableCell>
                  <TableCell className="capitalize text-sm">{item.bucket || 'N/A'}</TableCell>
                  <TableCell className="text-sm">{item.dialerAssigned || 'Unassigned'}</TableCell>
                  <TableCell className="text-sm font-mono">{item.dateLeadEntered || '-'}</TableCell>
                  <TableCell className="text-sm font-mono text-amber-600 font-bold">
                    {item.assignedToDialerAt ? format(new Date(item.assignedToDialerAt), "yyyy-MM-dd") : 'Not Set'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
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
