
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
import { getLeadFromFirebase, deleteSubCollectionItem } from '@/services/firebase';
import type { Lead, Contact, Note, Activity, Appointment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type SubcollectionType = 'contacts' | 'notes' | 'activity' | 'appointments';
type ItemToDelete = {
    leadId: string;
    subcollection: SubcollectionType;
    itemId: string;
    itemDescription: string;
};

export function GranularDeletion() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    setLead(null);
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

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
        await deleteSubCollectionItem(itemToDelete.leadId, itemToDelete.subcollection, itemToDelete.itemId);
        
        // Optimistically update UI
        setLead(prevLead => {
            if (!prevLead) return null;
            const updatedSubcollection = (prevLead[itemToDelete.subcollection] as any[])?.filter(item => item.id !== itemToDelete.itemId);
            return { ...prevLead, [itemToDelete.subcollection]: updatedSubcollection };
        });

        toast({ title: 'Success', description: `Item deleted successfully.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete item.' });
    } finally {
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };
  
  const confirmDelete = (subcollection: SubcollectionType, item: any, description: string) => {
    if(!lead) return;
    setItemToDelete({
        leadId: lead.id,
        subcollection,
        itemId: item.id,
        itemDescription: description
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
                    <TabsContent value="contacts">
                        <SubcollectionTable items={lead.contacts || []} columns={['name', 'email', 'phone']} onDelete={(item) => confirmDelete('contacts', item, `contact: ${item.name}`)} />
                    </TabsContent>
                    <TabsContent value="notes">
                        <SubcollectionTable items={lead.notes || []} columns={['content', 'author', 'date']} onDelete={(item) => confirmDelete('notes', item, `note: ${item.content.substring(0,20)}...`)} />
                    </TabsContent>
                    <TabsContent value="activity">
                        <SubcollectionTable items={lead.activity || []} columns={['notes', 'type', 'date']} onDelete={(item) => confirmDelete('activity', item, `activity: ${item.notes.substring(0,20)}...`)} />
                    </TabsContent>
                    <TabsContent value="appointments">
                        <SubcollectionTable items={lead.appointments || []} columns={['assignedTo', 'duedate', 'starttime']} onDelete={(item) => confirmDelete('appointments', item, `appointment on ${item.duedate}`)} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      )}

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected item: <span className="font-bold">{itemToDelete?.itemDescription}</span>. This action cannot be undone.
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

interface SubcollectionTableProps {
    items: any[];
    columns: string[];
    onDelete: (item: any) => void;
}

function SubcollectionTable({ items, columns, onDelete }: SubcollectionTableProps) {
    if (items.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No items found.</div>
    }
    return (
        <div className="rounded-md border max-h-[50vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map(col => <TableHead key={col} className="capitalize">{col}</TableHead>)}
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            {columns.map(col => (
                                <TableCell key={col} className="max-w-[200px] truncate">
                                    {col === 'date' || col === 'duedate' ? new Date(item[col]).toLocaleString() : item[col]}
                                </TableCell>
                            ))}
                            <TableCell className="text-right">
                                <Button variant="destructive" size="icon" onClick={() => onDelete(item)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
