
'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { getLeadFromFirebase, bulkDeleteSubCollectionItems } from '@/services/firebase';
import type { Lead, Contact, Note, Activity, Appointment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '../ui/checkbox';

type SubcollectionType = 'contacts' | 'notes' | 'activity' | 'appointments';
type ItemToDelete = {
    leadId: string;
    subcollection: SubcollectionType;
    itemIds: string[];
    itemDescription: string;
};

export function GranularDeletion() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<SubcollectionType, string[]>>({
      contacts: [],
      notes: [],
      activity: [],
      appointments: [],
  });

  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    setLead(null);
    setSelectedItems({ contacts: [], notes: [], activity: [], appointments: [] });
    try {
      const fetchedLead = await getLeadFromFirebase(searchTerm, true);
      if (fetchedLead) {
        setLead(fetchedLead);
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: `No lead found with ID: ${searchTerm}` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch lead data.' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleItemSelection = (subcollection: SubcollectionType, itemId: string, checked: boolean) => {
      setSelectedItems(prev => ({
          ...prev,
          [subcollection]: checked 
              ? [...prev[subcollection], itemId] 
              : prev[subcollection].filter(id => id !== itemId)
      }));
  };

  const handleSelectAll = (subcollection: SubcollectionType, items: any[], checked: boolean) => {
      const itemIds = items.map(i => i.id);
      setSelectedItems(prev => ({
          ...prev,
          [subcollection]: checked ? itemIds : []
      }));
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
        await bulkDeleteSubCollectionItems(itemToDelete.leadId, itemToDelete.subcollection, itemToDelete.itemIds);
        
        setLead(prevLead => {
            if (!prevLead) return null;
            const updatedSubcollection = (prevLead[itemToDelete.subcollection] as any[])?.filter(item => !itemToDelete.itemIds.includes(item.id));
            return { ...prevLead, [itemToDelete.subcollection]: updatedSubcollection };
        });

        setSelectedItems(prev => ({ ...prev, [itemToDelete.subcollection]: [] }));
        toast({ title: 'Success', description: `${itemToDelete.itemIds.length} item(s) deleted successfully.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete items.' });
    } finally {
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };
  
  const confirmDelete = (subcollection: SubcollectionType) => {
    const idsToDelete = selectedItems[subcollection];
    if (idsToDelete.length === 0 || !lead) return;
    
    setItemToDelete({
        leadId: lead.id,
        subcollection,
        itemIds: idsToDelete,
        itemDescription: `${idsToDelete.length} ${subcollection} item(s)`
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Lead ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader /> : 'Search'}
        </Button>
      </form>

      {lead && (
        <Card>
            <CardHeader>
                <CardTitle>{lead.companyName}</CardTitle>
                <CardDescription>ID: {lead.id}</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="contacts">
                    <TabsList>
                        <TabsTrigger value="contacts">Contacts ({lead.contacts?.length || 0})</TabsTrigger>
                        <TabsTrigger value="notes">Notes ({lead.notes?.length || 0})</TabsTrigger>
                        <TabsTrigger value="activity">Activity ({lead.activity?.length || 0})</TabsTrigger>
                        <TabsTrigger value="appointments">Appointments ({lead.appointments?.length || 0})</TabsTrigger>
                    </TabsList>
                    <SubcollectionTabContent lead={lead} subcollection="contacts" columns={['name', 'email', 'phone']} selectedItems={selectedItems.contacts} onSelect={handleItemSelection} onSelectAll={handleSelectAll} onConfirmDelete={confirmDelete} />
                    <SubcollectionTabContent lead={lead} subcollection="notes" columns={['content', 'author', 'date']} selectedItems={selectedItems.notes} onSelect={handleItemSelection} onSelectAll={handleSelectAll} onConfirmDelete={confirmDelete} />
                    <SubcollectionTabContent lead={lead} subcollection="activity" columns={['notes', 'type', 'date']} selectedItems={selectedItems.activity} onSelect={handleItemSelection} onSelectAll={handleSelectAll} onConfirmDelete={confirmDelete} />
                    <SubcollectionTabContent lead={lead} subcollection="appointments" columns={['assignedTo', 'duedate', 'starttime']} selectedItems={selectedItems.appointments} onSelect={handleItemSelection} onSelectAll={handleSelectAll} onConfirmDelete={confirmDelete} />
                </Tabs>
            </CardContent>
        </Card>
      )}

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected {itemToDelete?.itemDescription}. This action cannot be undone.
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

interface SubcollectionTabContentProps {
    lead: Lead;
    subcollection: SubcollectionType;
    columns: string[];
    selectedItems: string[];
    onSelect: (subcollection: SubcollectionType, itemId: string, checked: boolean) => void;
    onSelectAll: (subcollection: SubcollectionType, items: any[], checked: boolean) => void;
    onConfirmDelete: (subcollection: SubcollectionType) => void;
}

function SubcollectionTabContent({ lead, subcollection, columns, selectedItems, onSelect, onSelectAll, onConfirmDelete }: SubcollectionTabContentProps) {
    const items = lead[subcollection] as any[] || [];
    const allSelected = items.length > 0 && selectedItems.length === items.length;

    return (
        <TabsContent value={subcollection}>
            <div className="space-y-2">
                {selectedItems.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => onConfirmDelete(subcollection)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedItems.length})
                    </Button>
                )}
                {items.length > 0 ? (
                    <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={(checked) => onSelectAll(subcollection, items, !!checked)}
                                        />
                                    </TableHead>
                                    {columns.map(col => <TableHead key={col} className="capitalize">{col}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(item => (
                                    <TableRow key={item.id} data-state={selectedItems.includes(item.id) && "selected"}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedItems.includes(item.id)}
                                                onCheckedChange={(checked) => onSelect(subcollection, item.id, !!checked)}
                                            />
                                        </TableCell>
                                        {columns.map(col => (
                                            <TableCell key={col} className="max-w-[200px] truncate">
                                                {col === 'date' || col === 'duedate' ? new Date(item[col]).toLocaleString() : item[col]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">No items found.</div>
                )}
            </div>
        </TabsContent>
    );
}

