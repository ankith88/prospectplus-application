
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader } from '../ui/loader';
import { getLeadsFromFirebase, getCompaniesFromFirebase, deleteLead, deleteCompany } from '@/services/firebase';
import type { Lead, LeadStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  CheckCircle2, 
  CheckSquare 
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '../ui/checkbox';
import { MultiSelectCombobox, type Option } from '../ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataDeletionTableProps {
  collectionName: 'leads' | 'companies';
}

const leadStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Trialing ShipMate', 'Reschedule', 'Qualified', 'Pre Qualified', 'Won', 'Lost', 'LPO Review', 'Unqualified', 'LocalMile Pending', 'LocalMile Opportunity', 'Quote Sent', 'Quote Accepted'];

export function DataDeletionTable({ collectionName }: DataDeletionTableProps) {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Selection & Deletion State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedCampaignFilter = useDebounce(campaignFilter, 300);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = collectionName === 'leads'
          ? await getLeadsFromFirebase({ summary: true, includeDuplicates: true })
          : await getCompaniesFromFirebase({ skipCoordinateCheck: true });
        setItems(data);
      } catch (error) {
        console.error(`Failed to fetch ${collectionName}:`, error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not fetch ${collectionName}.` });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [collectionName, toast]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [debouncedSearchTerm, debouncedCampaignFilter, statusFilter, bucketFilter, sourceFilter, pageSize]);

  const uniqueSources = useMemo(() => {
    if (collectionName !== 'leads') return [];
    const sources = new Set(items.map(item => item.customerSource).filter(Boolean));
    const list = Array.from(sources).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Source' }];
  }, [items, collectionName]);

  const uniqueBuckets = useMemo(() => {
    if (collectionName !== 'leads') return [];
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets)
      .filter((b): b is NonNullable<typeof b> => !!b)
      .map(b => ({
        value: b,
        label: b === 'field_sales' ? 'Field Sales' : b.charAt(0).toUpperCase() + b.slice(1)
      })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Bucket' }];
  }, [items, collectionName]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const lowercasedSearchTerm = debouncedSearchTerm.trim().toLowerCase();
        const lowercasedCampaignFilter = debouncedCampaignFilter.trim().toLowerCase();
        
        const companyName = item.companyName || '';
        const nameMatch = lowercasedSearchTerm
          ? (
              companyName.toLowerCase().includes(lowercasedSearchTerm) ||
              (item.id && item.id.toLowerCase().includes(lowercasedSearchTerm)) ||
              (item.entityId && item.entityId.toLowerCase().includes(lowercasedSearchTerm)) ||
              (item.salesRecordInternalId && String(item.salesRecordInternalId).toLowerCase().includes(lowercasedSearchTerm)) ||
              (item.prospectPlusId && String(item.prospectPlusId).toLowerCase().includes(lowercasedSearchTerm))
            )
          : true;
        
        let campaignMatch = true;
        if (lowercasedCampaignFilter) {
            const campaign = item.campaign?.toLowerCase();
            if (lowercasedCampaignFilter === 'd2d') {
                campaignMatch = campaign === 'door-to-door field sales' || campaign === 'door-to-door field sales';
            } else {
                campaignMatch = campaign?.includes(lowercasedCampaignFilter) || false;
            }
        }
        
        const statusMatch = statusFilter.length > 0 ? statusFilter.includes(item.status) : true;
        
        const bucketMatch = collectionName === 'leads' && bucketFilter.length > 0
          ? (item.bucket ? bucketFilter.includes(item.bucket) : bucketFilter.includes('none'))
          : true;

        const sourceMatch = collectionName === 'leads' && sourceFilter.length > 0
          ? (item.customerSource ? sourceFilter.includes(item.customerSource) : sourceFilter.includes('none'))
          : true;
        
        return nameMatch && campaignMatch && statusMatch && bucketMatch && sourceMatch;
    });
  }, [items, debouncedSearchTerm, debouncedCampaignFilter, statusFilter, bucketFilter, sourceFilter, collectionName]);

  // Pagination calculations
  const effectivePageSize = useMemo(() => {
    if (pageSize === 'all') return Math.max(1, filteredItems.length);
    return typeof pageSize === 'number' ? pageSize : (parseInt(String(pageSize), 10) || 50);
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

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    setIsDeleting(true);
    try {
      const deleteFunction = collectionName === 'leads' ? deleteLead : deleteCompany;
      await deleteFunction(selectedItems);
      setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      toast({ title: 'Success', description: `${selectedItems.length.toLocaleString()} item(s) and all their data have been deleted.` });
    } catch (error) {
      console.error(`Failed to delete ${collectionName}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not delete items.` });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const leadStatusOptions: Option[] = leadStatuses.map(s => ({ value: s, label: s }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-medium">Search by Name or ID</label>
            <Input
              placeholder={`Search by name or ID...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        {collectionName === 'leads' && (
             <>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Campaign Name</label>
                    <Input
                        placeholder="Filter by campaign..."
                        value={campaignFilter}
                        onChange={(e) => setCampaignFilter(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <MultiSelectCombobox
                        options={leadStatusOptions}
                        selected={statusFilter}
                        onSelectedChange={setStatusFilter}
                        placeholder="Filter by status..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Bucket</label>
                    <MultiSelectCombobox
                        options={uniqueBuckets}
                        selected={bucketFilter}
                        onSelectedChange={setBucketFilter}
                        placeholder="Filter by bucket..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Source</label>
                    <MultiSelectCombobox
                        options={uniqueSources}
                        selected={sourceFilter}
                        onSelectedChange={setSourceFilter}
                        placeholder="Filter by source..."
                    />
                </div>
             </>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>
            Matching Records: <strong className="font-semibold text-foreground">{filteredItems.length.toLocaleString()}</strong>
          </span>
          {filteredItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllMatching}
              disabled={isAllMatchingSelected}
              className="h-7 text-xs"
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              Select All {filteredItems.length.toLocaleString()} Records
            </Button>
          )}
        </div>
        {selectedItems.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedItems.length.toLocaleString()})
          </Button>
        )}
      </div>

      {/* Interactive Gmail-style Select All Across Pages Banner */}
      {!loading && isAllCurrentPageSelected && filteredItems.length > displayedItems.length && (
        <div className="px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-md text-xs flex items-center justify-between flex-wrap gap-2 transition-all">
          {isAllMatchingSelected ? (
            <div className="flex items-center gap-2 text-primary font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>All <strong>{filteredItems.length.toLocaleString()}</strong> records across all <strong>{totalPages}</strong> pages are selected.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-foreground">
              <span>All <strong>{displayedItems.length}</strong> records on page <strong>{safeCurrentPage}</strong> are selected.</span>
              <Button
                variant="link"
                size="sm"
                onClick={handleSelectAllMatching}
                className="h-auto p-0 text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                Select all {filteredItems.length.toLocaleString()} matching records
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

      <div className="rounded-md border overflow-hidden">
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
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Campaign</TableHead>
              {collectionName === 'leads' && <TableHead>Bucket</TableHead>}
              {collectionName === 'leads' && <TableHead>Source</TableHead>}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={collectionName === 'leads' ? 7 : 5} className="text-center py-8"><Loader /></TableCell>
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
                    <TableCell className="font-medium">{item.companyName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{item.id}</TableCell>
                    <TableCell>{item.campaign || 'N/A'}</TableCell>
                    {collectionName === 'leads' && <TableCell className="capitalize">{item.bucket || 'N/A'}</TableCell>}
                    {collectionName === 'leads' && <TableCell>{item.customerSource || 'N/A'}</TableCell>}
                    <TableCell>{item.status}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={collectionName === 'leads' ? 7 : 5} className="h-24 text-center text-muted-foreground text-sm">
                  No results found.
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

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedItems.length.toLocaleString()} record(s) and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : `Delete (${selectedItems.length.toLocaleString()})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

