
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
import { Trash2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '../ui/checkbox';
import { MultiSelectCombobox, type Option } from '../ui/multi-select-combobox';

interface DataDeletionTableProps {
  collectionName: 'leads' | 'companies';
}

const leadStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Trialing ShipMate', 'Reschedule', 'Qualified', 'Pre Qualified', 'Won', 'Lost', 'LPO Review', 'Unqualified', 'LocalMile Pending', 'LocalMile Opportunity', 'Quote Sent'];

export function DataDeletionTable({ collectionName }: DataDeletionTableProps) {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
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
          ? await getLeadsFromFirebase({ summary: true })
          : await getCompaniesFromFirebase();
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
        const lowercasedSearchTerm = debouncedSearchTerm.toLowerCase();
        const lowercasedCampaignFilter = debouncedCampaignFilter.toLowerCase();
        
        const nameMatch = debouncedSearchTerm ? item.companyName.toLowerCase().includes(lowercasedSearchTerm) || item.id.toLowerCase().includes(lowercasedSearchTerm) : true;
        
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

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev =>
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? filteredItems.slice(0, 50).map(i => i.id) : []);
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    setIsDeleting(true);
    try {
      const deleteFunction = collectionName === 'leads' ? deleteLead : deleteCompany;
      await deleteFunction(selectedItems);
      setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      toast({ title: 'Success', description: `${selectedItems.length} item(s) and all their data have been deleted.` });
    } catch (error) {
      console.error(`Failed to delete ${collectionName}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not delete items.` });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const isAllSelected = filteredItems.length > 0 && selectedItems.length === Math.min(filteredItems.length, 50);
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
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
            Showing {Math.min(50, filteredItems.length)} of {filteredItems.length} records.
        </div>
        {selectedItems.length > 0 && (
          <Button variant="destructive" onClick={() => setShowConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedItems.length})
          </Button>
        )}
      </div>


      <div className="rounded-md border">
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
                <TableCell colSpan={collectionName === 'leads' ? 7 : 5} className="text-center"><Loader /></TableCell>
              </TableRow>
            ) : filteredItems.length > 0 ? (
              filteredItems.slice(0, 50).map((item) => ( // Limit to 50 results for performance
                <TableRow key={item.id} data-state={selectedItems.includes(item.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                    </TableCell>
                  <TableCell className="font-medium">{item.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.id}</TableCell>
                  <TableCell>{item.campaign || 'N/A'}</TableCell>
                  {collectionName === 'leads' && <TableCell className="capitalize">{item.bucket || 'N/A'}</TableCell>}
                  {collectionName === 'leads' && <TableCell>{item.customerSource || 'N/A'}</TableCell>}
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={collectionName === 'leads' ? 7 : 5} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredItems.length > 50 && (
            <div className="p-4 text-sm text-muted-foreground">Showing first 50 results. Refine your search for more specific results.</div>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedItems.length} record(s) and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
