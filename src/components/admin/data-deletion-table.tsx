
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
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface DataDeletionTableProps {
  collectionName: 'leads' | 'companies';
}

export function DataDeletionTable({ collectionName }: DataDeletionTableProps) {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
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

  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm) {
      return items;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return items.filter(item =>
      item.companyName.toLowerCase().includes(lowercasedTerm) ||
      item.id.toLowerCase().includes(lowercasedTerm)
    );
  }, [items, debouncedSearchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const deleteFunction = collectionName === 'leads' ? deleteLead : deleteCompany;
      await deleteFunction(itemToDelete.id);
      setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast({ title: 'Success', description: `${itemToDelete.companyName} and all its data has been deleted.` });
    } catch (error) {
      console.error(`Failed to delete ${collectionName}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not delete item.` });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search by name or ID...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center"><Loader /></TableCell>
              </TableRow>
            ) : filteredItems.length > 0 ? (
              filteredItems.slice(0, 50).map((item) => ( // Limit to 50 results for performance
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.id}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => setItemToDelete(item)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
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

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <span className="font-bold">{itemToDelete?.companyName}</span> and all of its associated data, including contacts, notes, activities, and appointments.
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
