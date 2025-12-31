
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { getLeadsFromFirebase, deleteLeadsByCampaign } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Link from 'next/link';

export function CampaignDeletion() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedCampaign, setSearchedCampaign] = useState('');
  const [leadsInCampaign, setLeadsInCampaign] = useState<Lead[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) {
      setLeadsInCampaign([]);
      setSearchedCampaign('');
      return;
    }
    setLoading(true);
    try {
      const allLeads = await getLeadsFromFirebase({ summary: true });
      const filteredLeads = allLeads.filter(lead => lead.campaign?.toLowerCase() === searchTerm.toLowerCase());
      setLeadsInCampaign(filteredLeads);
      setSearchedCampaign(searchTerm);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch lead data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!searchedCampaign) return;
    setIsDeleting(true);
    
    try {
        await deleteLeadsByCampaign(searchedCampaign);
        toast({ title: 'Success', description: `All leads from the "${searchedCampaign}" campaign have been deleted.` });
        setLeadsInCampaign([]);
        setSearchedCampaign('');
        setSearchTerm('');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete leads.' });
    } finally {
        setIsDeleting(false);
        setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex items-end gap-4">
            <div className="flex-grow max-w-sm space-y-2">
                <label htmlFor="campaign-search" className="text-sm font-medium">Campaign Name</label>
                <Input
                    id="campaign-search"
                    placeholder="Enter campaign name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? <Loader /> : <><Search className="mr-2 h-4 w-4" /> Search</>}
            </Button>
        </form>

        {searchedCampaign && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">
                        Found {leadsInCampaign.length} lead(s) in campaign "{searchedCampaign}"
                    </h3>
                    {leadsInCampaign.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={() => setShowConfirm(true)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All ({leadsInCampaign.length})
                        </Button>
                    )}
                </div>

                {leadsInCampaign.length > 0 ? (
                    <div className="rounded-md border max-h-[50vh] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Lead ID</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leadsInCampaign.map(lead => (
                                    <TableRow key={lead.id}>
                                        <TableCell>
                                            <Button variant="link" asChild className="p-0 h-auto">
                                                <Link href={`/leads/${lead.id}`} target="_blank">{lead.companyName}</Link>
                                            </Button>
                                        </TableCell>
                                        <TableCell>{lead.id}</TableCell>
                                        <TableCell>{lead.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No leads found matching this campaign name.</p>
                )}
            </div>
        )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-bold">{leadsInCampaign.length}</span> lead(s) from the campaign "{searchedCampaign}". 
              This action cannot be undone and will delete all associated sub-collections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader /> : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
