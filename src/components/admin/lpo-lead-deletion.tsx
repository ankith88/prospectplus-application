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
import { collection, getDocs, doc, writeBatch, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import Link from 'next/link';

interface LpoLead {
  id: string;
  prospectPlusId?: string;
  lpoName?: string;
  lpoOwnerName?: string;
  email?: string;
  status?: string;
  createdAt?: any;
}

export function LpoLeadDeletion() {
  const [lpoNameSearch, setLpoNameSearch] = useState('');
  const [leadIdSearch, setLeadIdSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LpoLead[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTerm = lpoNameSearch.trim().toLowerCase();
    const idTerm = leadIdSearch.trim().toLowerCase();

    if (!nameTerm && !idTerm) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter an LPO Name or Lead ID to search.' });
      return;
    }

    setLoading(true);
    try {
      const q = collection(firestore, 'lpo_leads');
      const snap = await getDocs(q);
      
      const allLeads: LpoLead[] = [];
      snap.forEach((doc) => {
        allLeads.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      const filtered = allLeads.filter((lead) => {
        const matchesName = nameTerm ? lead.lpoName?.toLowerCase().includes(nameTerm) : true;
        const matchesId = idTerm ? (
          lead.id?.toLowerCase().includes(idTerm) || 
          lead.prospectPlusId?.toLowerCase().includes(idTerm)
        ) : true;
        return matchesName && matchesId;
      });

      setResults(filtered);
      setHasSearched(true);
      setSelectedLeads([]);
    } catch (error) {
      console.error('Failed to search LPO leads:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not search LPO leads.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    setSelectedLeads((prev) =>
      checked ? [...prev, id] : prev.filter((lId) => lId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedLeads(checked ? results.map((r) => r.id) : []);
  };

  const handleDelete = async () => {
    if (selectedLeads.length === 0) return;
    setIsDeleting(true);

    try {
      for (const leadId of selectedLeads) {
        const batch = writeBatch(firestore);

        // Delete LPO Lead document
        batch.delete(doc(firestore, 'lpo_leads', leadId));

        // Delete activity sub-collection
        const activitySnap = await getDocs(collection(firestore, 'lpo_leads', leadId, 'activity'));
        activitySnap.forEach((activityDoc) => {
          batch.delete(activityDoc.ref);
        });

        await batch.commit();
      }

      toast({ title: 'Success', description: `${selectedLeads.length} LPO lead(s) and their activity logs have been deleted.` });
      setResults((prev) => prev.filter((l) => !selectedLeads.includes(l.id)));
      setSelectedLeads([]);
    } catch (error) {
      console.error('Failed to delete LPO leads:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete LPO leads.' });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const isAllSelected = results.length > 0 && selectedLeads.length === results.length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="lpo-name-search" className="text-sm font-medium">LPO Name</label>
          <Input
            id="lpo-name-search"
            placeholder="Search by LPO Name..."
            value={lpoNameSearch}
            onChange={(e) => setLpoNameSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="lpo-id-search" className="text-sm font-medium">Lead ID or Prospect+ ID</label>
          <Input
            id="lpo-id-search"
            placeholder="Search by Lead/Prospect+ ID..."
            value={leadIdSearch}
            onChange={(e) => setLeadIdSearch(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader /> : <><Search className="mr-2 h-4 w-4" /> Search</>}
        </Button>
      </form>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">
              Found {results.length} LPO lead(s) matching your criteria
            </h3>
            {selectedLeads.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedLeads.length})
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
                    <TableHead>LPO Name</TableHead>
                    <TableHead>Lead ID / Doc ID</TableHead>
                    <TableHead>Prospect+ ID</TableHead>
                    <TableHead>Owner Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Button variant="link" asChild className="p-0 h-auto">
                          <Link href={`/lpo-leads/${lead.id}`} target="_blank">
                            {lead.lpoName || 'N/A'}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{lead.id}</TableCell>
                      <TableCell className="font-mono text-xs">{lead.prospectPlusId || 'N/A'}</TableCell>
                      <TableCell>{lead.lpoOwnerName || 'N/A'}</TableCell>
                      <TableCell>{lead.status || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No LPO leads found matching these criteria.</p>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-bold">{selectedLeads.length}</span> LPO lead(s) and all their activity history.
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
