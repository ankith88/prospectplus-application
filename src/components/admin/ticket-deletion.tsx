'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import Link from 'next/link';

interface Ticket {
  id: string;
  ticketNumber?: string;
  companyName?: string;
  enquiryType?: string;
  status?: string;
  createdAt?: any;
}

export function TicketDeletion() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Ticket[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const ticketsMap = new Map<string, Ticket>();

      // 1. Direct match by document ID
      const directDocRef = doc(firestore, 'tickets', term);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists()) {
        ticketsMap.set(directSnap.id, {
          id: directSnap.id,
          ...directSnap.data(),
        });
      }

      // 2. Query by ticket number (exact match)
      const qVal = term.toUpperCase();
      const queries = [
        query(collection(firestore, 'tickets'), where('ticketNumber', '==', qVal)),
      ];

      // If user forgot 'MP-', try querying with prefix
      if (!qVal.startsWith('MP-')) {
        queries.push(query(collection(firestore, 'tickets'), where('ticketNumber', '==', `MP-${qVal}`)));
      }

      for (const q of queries) {
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          ticketsMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      // 3. Prefix search (range query)
      const prefixQuery = query(
        collection(firestore, 'tickets'),
        where('ticketNumber', '>=', qVal),
        where('ticketNumber', '<=', qVal + '\uf8ff')
      );
      const prefixSnap = await getDocs(prefixQuery);
      prefixSnap.forEach((doc) => {
        ticketsMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        });
      });

      // Also try prefix search with MP-
      if (!qVal.startsWith('MP-')) {
        const mpPrefixQuery = query(
          collection(firestore, 'tickets'),
          where('ticketNumber', '>=', `MP-${qVal}`),
          where('ticketNumber', '<=', `MP-${qVal}` + '\uf8ff')
        );
        const mpPrefixSnap = await getDocs(mpPrefixQuery);
        mpPrefixSnap.forEach((doc) => {
          ticketsMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      setResults(Array.from(ticketsMap.values()));
      setHasSearched(true);
      setSelectedTickets([]);
    } catch (error) {
      console.error('Failed to search tickets:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not search tickets.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = (id: string, checked: boolean) => {
    setSelectedTickets((prev) =>
      checked ? [...prev, id] : prev.filter((tId) => tId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? results.map((r) => r.id) : []);
  };

  const handleDelete = async () => {
    if (selectedTickets.length === 0) return;
    setIsDeleting(true);

    try {
      for (const ticketId of selectedTickets) {
        const batch = writeBatch(firestore);

        // Delete the main ticket doc
        batch.delete(doc(firestore, 'tickets', ticketId));

        // Subcollections to clean up
        const subcollections = ['actions', 'communications', 'staffNotes', 'escalations'];
        for (const sub of subcollections) {
          const subSnap = await getDocs(collection(firestore, 'tickets', ticketId, sub));
          subSnap.forEach((subDoc) => {
            batch.delete(subDoc.ref);
          });
        }

        await batch.commit();
      }

      toast({ title: 'Success', description: `${selectedTickets.length} ticket(s) and all their associated history have been deleted.` });
      setResults((prev) => prev.filter((t) => !selectedTickets.includes(t.id)));
      setSelectedTickets([]);
    } catch (error) {
      console.error('Failed to delete tickets:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete tickets.' });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const isAllSelected = results.length > 0 && selectedTickets.length === results.length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-end gap-4">
        <div className="flex-grow max-w-sm space-y-2">
          <label htmlFor="ticket-search" className="text-sm font-medium">Ticket Number or Document ID</label>
          <Input
            id="ticket-search"
            placeholder="Enter ticket number (e.g. MP-1234 or 1234)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader /> : <><Search className="mr-2 h-4 w-4" /> Search</>}
        </Button>
      </form>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">
              Found {results.length} ticket(s) matching your search
            </h3>
            {selectedTickets.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedTickets.length})
              </Button>
            )}
          </div>

          {results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                    </TableHead>
                    <TableHead>Ticket Number</TableHead>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Enquiry Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTickets.includes(ticket.id)}
                          onChange={(e) => handleSelectTicket(ticket.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Button variant="link" asChild className="p-0 h-auto">
                          <Link href={`/admin/tickets/${ticket.id}`} target="_blank">
                            {ticket.ticketNumber || 'N/A'}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{ticket.id}</TableCell>
                      <TableCell>{ticket.companyName || 'N/A'}</TableCell>
                      <TableCell>{ticket.enquiryType || 'N/A'}</TableCell>
                      <TableCell>{ticket.status || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tickets found matching this search criteria.</p>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-bold">{selectedTickets.length}</span> ticket(s) and all their associated communications, actions, staff notes, and escalations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
